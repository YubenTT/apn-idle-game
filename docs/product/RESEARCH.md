> **Imported V3 design authority** — reviewed baseline `efc5f22`, subordinate to plan v2 per the law stack (owner answers → AUDIT → plan v2 → *these V3 docs, as reconciled* → code). Terminology, rights-taxonomy, prestige-model and display-name deltas are recorded in [RECONCILIATION.md](./RECONCILIATION.md); where this document and plan v2 disagree, **plan v2 wins**. Imported verbatim in PR-0 (issue #17) — the body is *not* rewritten to match plan v2; the reconciliation layer carries the overrides.

---

# Research Sources

**Checked:** 2026-07-16  
**Use:** design and engineering guidance, not a substitute for product testing or legal advice.

## 1. Idle and incremental system design

### Idle Game Maker Handbook — Orteil

- Source: https://orteil.dashnet.org/igm/help.html
- Used for: the value of a compact, declarative relationship among resources, generators, upgrades, visibility and conditions.
- APN decision: keep Pack content data-driven and avoid Pack-specific runtime code; do not mistake a scripting handbook for a complete production, save, Live Ops or rights framework.

### Idle Games: The Mechanics and Monetization of Self-Playing Games — Anthony Pecorella, GDC

- Source: https://media.gdcvault.com/gdc2015/presentations/Pecorella_Anthony_Idle_Games_The.pdf
- Used for: exponential cost/output curves, pacing walls, prestige and simulation thinking.
- APN decision: every balance change is exercised through seeded active/idle/offline profiles and percentile reports.

### Tap Titans 2 prestige guidance — Game Hive

- Source: https://gamehive.helpshift.com/hc/en/3-tap-titans-2/faq/75-should-i-prestige-when/
- Used for: prestige converts temporary progress into permanent strength and should make the rebound meaningfully faster.
- APN decision: `Ship This Drop` communicates the full gain/reset/keep transaction and shows the next Pack.

## 2. Motivation and ethical engagement

### Self-determination theory in games — research literature

- Used for: treating autonomy, competence and relatedness as hypotheses to test rather than buttons that mechanically guarantee satisfaction.
- APN decision: genuine branch choices, visible causality, build ownership and APN-linked context; measure satisfied returns rather than only repeat opens.

### Constructive disengagement research

- Used for: designing completeable sessions and respectful stopping points instead of endless obligation.
- APN decision: a Drop is a clean closure; offline returns are generous; no broken-streak punishment or loss-shaming.

### FTC — Bringing Dark Patterns to Light

- Source: https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers
- Used for: red-team review of disguised advertising, fake scarcity, buried terms, difficult cancellation and manipulative consent.
- APN decision: free baseline first, no fake urgency, commercial effects stated plainly, no sold progression power.

## 3. Accessibility and interaction

### WCAG 2.2 — Target Size (Minimum)

- Source: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Used for: minimum pointer target requirements and exceptions.
- APN decision: practical primary target floor 44×44 CSS px, with 48 dp target on Android-class surfaces.

### Apple Human Interface Guidelines — Accessibility

- Source: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Used for: readable controls, alternative interactions, motion preferences and meaningful labels.
- APN decision: keyboard/screen-reader parity, Reduced Motion and controls that do not rely on color alone.

## 4. Data contracts and provenance

### JSON Schema Draft 2020-12

- Source: https://json-schema.org/draft/2020-12
- Used for: a machine-validated, extensible Pack contract.
- APN decision: generator source, generated catalog and changed Pack data fail CI when rights, mechanics, fallback, assets or provenance are invalid.

### C2PA Technical Specification / Content Credentials

- Source: https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
- Used for: auditable provenance concepts for generated and edited assets.
- APN decision: every approved asset records hashes, generation tool/model, prompt hashes, edits, review and optional Content Credentials reference. Provenance is evidence, not automatic quality or legal clearance.

## 5. Browser asset performance

### web.dev — Serve images in modern formats

- Source: https://web.dev/articles/serve-images-webp
- Used for: compact runtime image delivery.
- APN decision: WebP atlases and bounded warm-Pack budgets.

### MDN — `HTMLImageElement.decode()`

- Source: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode
- Used for: decoding before visual swap.
- APN decision: current and next Pack are predecoded; decode failure routes to a local fallback rather than blanking the stage.

### MDN — Optimizing canvas

- Source: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- Used for: limiting expensive per-frame work and using pre-rendered assets.
- APN decision: semantic game state remains independent from asset scale; only current/next Pack images remain hot.

## 6. Copyright, trademarks and fan policies

### U.S. Copyright Office — Fair Use Index

- Source: https://www.copyright.gov/fair-use/
- Used for: the four-factor, case-specific nature of fair use and the warning that no fixed percentage or formula guarantees permission.
- APN decision: fair use is not the content pipeline. APN creates original Runtime Echo art/mechanics; specific risky uses receive legal review.

### Riot Games — Legal Jibber Jabber

- Source: https://www.riotgames.com/en/legal
- Relevant guidance: the policy primarily supports free/noncommercial community projects; it prohibits unauthorized games/apps using characters, abilities, maps, icons, items and marks without the applicable authorization.
- APN decision: a Valorant editorial signal does not authorize Valorant gameplay art. Runtime becomes original **Tactical Echo** unless written rights exist.

### Epic Games — Fan Content Policy

- Source: https://legal.epicgames.com/epicgames/fan-art-policy
- Relevant guidance: fan content is personal/noncommercial, permission is revocable, endorsement confusion is prohibited and marks are constrained.
- APN decision: a Fortnite-inspired Pack uses an original runtime identity; official marks/art are not treated as a default commercial asset source.

### Electronic Arts — User Agreement

- Source: https://www.ea.com/legal/user-agreement
- Last updated on the source: 2026-05-14.
- Relevant guidance: EA services/content are licensed for personal noncommercial use and may not be copied, modified or distributed unless authorized or permitted by law.
- APN decision: `EA Sports FC 26` may be factual editorial context; gameplay uses original **Floodlight XI** assets unless licensed.

### Mattel — Terms and Conditions

- Source: https://mattelsupport.com/terms-conditions/
- Relevant guidance: Mattel content and marks are protected and the ordinary site license is limited/personal/noncommercial.
- APN decision: Barbie is not used as a runtime Pack title, logo, character or look. The original example is **Fashion Dream**, based on broad fashion/play-pattern abstractions.

## 7. Repository evidence reviewed

Current `main` reviewed at:

```text
efc5f223b2e149d8a6b523be415510c1580a5edf
```

Key repository sources:

- `docs/GAME-PACK-ROUTE.md` — persistent Route, 20 clean Packs, scheduler and budgets;
- `js/route.js` — save-stable state and deterministic scheduling;
- `js/generated/game-packs.js` — current twenty-Pack generated catalog;
- `js/game.js` — current separate Ship and End Season mutations;
- `js/ui.js` — current separate controls and Run/Build labels;
- PR #14 — current full-bleed Run polish;
- PR #15 — fail-fast Host asset gates.

The supplied current-main screenshot is the visual baseline. The supplied four-view Host turnaround is geometry evidence for this playbook; the repository’s canonical GLB remains the runtime authority.

## Research limits

- Publisher policies can change and do not replace a project-specific written license.
- Trademark, copyright, publicity and trade-dress questions are jurisdiction- and fact-specific.
- Popularity lists identify possible editorial subjects; they do not grant rights and do not dictate route order.
- Motivation research informs hypotheses; only player tests and product data validate APN’s actual emotional outcome.
