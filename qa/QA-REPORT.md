# QA Report

**Build:** APN Idle v1 (repo `apn-idle-game`)  
**Command:** `node qa/run-tests.mjs`

## Automated

Run on every PR via GitHub Actions (`.github/workflows/ci.yml`).

Expected tail:

```text
ALL PASS
```

Coverage includes combat, weapon upgrade, skills, publish, bosses, zone progression past 20, and soft late-game HP scaling.

## Manual smoke (pre-release)

| Step | Pass? |
|------|-------|
| Title → Play | |
| Kill → Signal up | |
| Hold Sprint → energy down, hits faster | |
| Upgrade Weapon costs Signal | |
| Rank → Build SP badge | |
| Red Patch Note → Notes → Publish → Rep | |
| Zone advances past 20 without freeze | |
| Settings: SFX + reduced motion | |
| Reload keeps save | |

## Screenshots

Reference captures live under `qa/screenshots/` (human visual baselines, not pixel CI yet).
