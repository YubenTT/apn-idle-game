# Synthetic authored-motion browser fixture

This directory contains deterministic, non-production QA art. It is not an APN
character identity, an approved GAF2D export, or provider output. The atlas uses
simple geometric color blocks so Chrome QA can prove exact frame selection and
track a cyan limb region across three poses without private media or network
access.

Regenerate from repository-owned geometry with:

```console
node qa/fixtures/browser-motion/generate.mjs
```

The generator requires `cwebp 1.6.0`, invokes it with the descriptor-locked
`-exact -q 90` arguments, writes both tiny WebP atlases, updates their atlas
hashes in the descriptors, and rewrites `integrity.json`. The browser harness
checks the committed descriptor and atlas SHA-256 values before Chrome starts,
then the real motion store independently verifies both request hashes.

Run the generator twice and compare its JSON output whenever its geometry or
encoder changes. Identical output is the deterministic-build gate.
