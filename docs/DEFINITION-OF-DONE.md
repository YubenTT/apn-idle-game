# Definition of Done

> A task is not "done" when the code runs. It's done when this list is true. Applies
> to every change — human or agent. Product-level quality gate is separate:
> [QA-CHECKLIST](./QA-CHECKLIST.md).

## Done checklist

- [ ] **Behaves as specified** — meets the acceptance criteria written *before* the
      work started (a change with no acceptance criteria isn't ready to start).
- [ ] **Domain tests green** — `node qa/run-tests.mjs` → ALL PASS.
- [ ] **Pillars + non-goals** — passes all 5 [VISION](./VISION.md) pillars, violates
      no non-goal.
- [ ] **Tokens + components only** — no raw hex / off-scale sizes; uses
      [DESIGN-TOKENS](../brand/DESIGN-TOKENS.md) + [COMPONENTS](../brand/COMPONENTS.md).
- [ ] **Copy clean** — [NAMING](../brand/NAMING.md): object·effect·cost, no debug
      strings, no "hover", no "Upgrade Signal", no off-brand fantasy words.
- [ ] **Mobile real** — touch ≥ 44pt, safe-area respected, no portrait/landscape
      overflow, contrast floors met.
- [ ] **Mascot canon** — any mascot art matches [MASCOT-CANON](../brand/MASCOT-CANON.md)
      (Silhouette QA).
- [ ] **Domain purity kept** — combat/economy math stays in `formulas.js` /
      `game.js`; UI/render don't invent balance ([ARCHITECTURE](./ARCHITECTURE.md)).
- [ ] **No framework creep** — still zero-npm, static-file playable
      ([ADR-0001](./decisions/ADR-0001-vanilla-stack.md)).
- [ ] **Save safe** — schema changes migrate in `save.js`; no silent save-break.
- [ ] **Docs updated** — per [DOC-UPDATE-POLICY](./DOC-UPDATE-POLICY.md), in the
      *same* change.
- [ ] **No placeholders left** — no half-built economy, empty slot, or TODO in a
      player-facing surface.
- [ ] **No secrets committed** — no keys, no local save dumps.
- [ ] **Verified in the real build** — driven in a browser, not just asserted in
      tests, for anything with a runtime surface.

## Acceptance-criteria habit

Before starting a feature, write 3–6 checkable criteria. "Inventory done" is not
criteria. "Tapping a slot equips the item, updates the mascot preview, shows the
stat delta, and persists across reload" is.

## For agents specifically

- Don't guess balance numbers — they belong in `C` ([BALANCE](./BALANCE.md)).
- Don't guess terminology — use [GLOSSARY](./GLOSSARY.md).
- Don't rename save fields without a migration.
- If a decision is ambiguous or architecturally significant, ask — don't invent.
