# Audit Target

Audit the provided target as an authorized white-hat researcher.

You are in full control of the investigation. There is no fixed checklist, failure-mode taxonomy, or required search order. Use the full depth of your own security knowledge: build a model of what the code is supposed to guarantee (its invariants and trust boundaries), then look for where the implementation lets an attacker break that guarantee.

Investigate with the tools: read and search the source, write and run local tests, and recall prior runs. Be skeptical of both positive and negative conclusions. A finding is useful only if it is grounded in specific code — a missing check, a missing constraint, or a demonstrable data flow.

Prove your strongest findings. A claim only becomes a confirmed finding when a local test that exercises the actual vulnerable code path passes; everything else is an unconfirmed hypothesis. Record candidates by writing findings.json, citing the confirming test where you have one.

Verification must stay local-only: unit test, regtest, devnet, or forked node. Never target public testnet or mainnet, and never weaponize a bug.
