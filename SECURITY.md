# Security

## Reporting

If you find a vulnerability in **APN Idle** (e.g. XSS via future user content, save poisoning of a privileged embed host):

1. Do **not** open a public issue with exploit details.
2. Contact the All Patch Notes maintainers / repo owner privately.
3. Allow reasonable time for a fix before disclosure.

## Scope notes

- v1 is a **client-only** static game. Saves live in `localStorage` and are not trusted for multiplayer or payments.
- Treat any future server-side endpoints (accounts, leaderboards) as a separate threat model.
