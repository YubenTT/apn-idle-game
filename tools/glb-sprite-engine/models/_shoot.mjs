#!/usr/bin/env node
/**
 * _shoot.mjs — dev utility: screenshot the _preview.html page via CDP.
 *
 * Why this exists: Chrome 150's `--headless=new --screenshot` does NOT wait
 * for module scripts with top-level await (it captures the CSS background
 * before the model renders). This driver instead polls document.title until
 * the page signals 'render-ready', then captures via Page.captureScreenshot.
 *
 * Usage:
 *   node _shoot.mjs --chrome "/path/to/Google Chrome" "URL=out.png" [...more]
 *
 * Requires a static server for http(s) URLs (ES modules need http).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
let chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let viewSize = 560;
const jobs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--chrome") chromePath = args[++i];
  else if (args[i] === "--size") viewSize = parseInt(args[++i], 10);
  else {
    // split on the '=' that introduces the output path (query strings also contain '=')
    const cut = args[i].search(/=[^=]*\.png$/);
    if (cut === -1) { console.error("bad job arg (want URL=out.png):", args[i]); process.exit(2); }
    jobs.push({ url: args[i].slice(0, cut), out: resolve(args[i].slice(cut + 1)) });
  }
}
if (!jobs.length) {
  console.error("no URL=out.png jobs given");
  process.exit(2);
}

const ud = mkdtempSync(join(tmpdir(), "hs-shoot-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-first-run",
  "--use-angle=swiftshader",
  "--remote-debugging-port=0",
  `--user-data-dir=${ud}`,
  `--window-size=${viewSize},${viewSize}`,
  "--hide-scrollbars",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function devtoolsPort() {
  for (let i = 0; i < 100; i++) {
    try {
      const txt = readFileSync(join(ud, "DevToolsActivePort"), "utf8");
      const port = parseInt(txt.split("\n")[0], 10);
      if (port > 0) return port;
    } catch {}
    await sleep(150);
  }
  throw new Error("DevToolsActivePort never appeared");
}

let msgId = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej, method }));
}

async function main() {
  const port = await devtoolsPort();
  let targets;
  for (let i = 0; i < 40; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (targets.some((t) => t.type === "page")) break;
    } catch {}
    await sleep(150);
  }
  const page = targets.find((t) => t.type === "page");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(p.method + ": " + m.error.message)) : p.res(m.result);
    }
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewSize, height: viewSize, deviceScaleFactor: 1, mobile: false,
  });

  for (const { url, out } of jobs) {
    await send("Page.navigate", { url });
    const deadline = Date.now() + 90000;
    let ready = false;
    while (Date.now() < deadline) {
      await sleep(400);
      const r = await send("Runtime.evaluate", {
        expression: "document.title + '|' + location.href",
        returnByValue: true,
      });
      const v = r?.result?.value || "";
      const [title, href] = v.split("|");
      if (title === "render-ready" && href === url) { ready = true; break; }
    }
    if (!ready) throw new Error("page never became render-ready: " + url);
    await sleep(250); // let the compositor settle
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(out, Buffer.from(shot.data, "base64"));
    console.log("SHOT", out);
  }
}

main()
  .catch((e) => { console.error("FAIL:", e.message); process.exitCode = 1; })
  .finally(() => {
    try { ws?.close(); } catch {}
    chrome.kill("SIGKILL");
    setTimeout(() => { try { rmSync(ud, { recursive: true, force: true }); } catch {}; process.exit(process.exitCode ?? 0); }, 300);
  });
