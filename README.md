<p align="center"><img src="assets/flounder-blue.png" alt="Flounder" width="280" /></p>

<h1 align="center">Flounder</h1>

<p align="center"><em>Find vulnerabilities beneath the surface.</em></p>

<p align="center"><strong>An autonomous security auditor that proves every finding by execution</strong><br/>— found blind, reproduced for real.</p>

<p align="center">
  <a href="docs/USAGE.md">Usage</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/SOLIDITY.md">Solidity</a> ·
  <a href="docs/STARKNET.md">Starknet</a> ·
  <a href="SECURITY.md">Security</a>
</p>

---

Most LLM auditors hand you a wall of "possible issues" and leave you to sort the real bugs from the confident-sounding noise. Flounder doesn't. The model investigates the source itself — reading it, writing tests, running them — and **a finding only counts when a local test actually triggers the bug.** Not because the code "looks wrong", not because it "differs from upstream", not because a model sounds sure. Because it ran.

## Why Flounder

- **🎯 Proof, not vibes.** Every finding clears an execution gate — a cited local test that exercises the vulnerable path and passes. A fix-equivalence **differential** (the exploit must break under its own minimal fix), an independent **refutation** (a fresh-context skeptic tries to debunk it), and an **appeal** round weed out vacuous PoCs. The model cannot promote a finding by assertion.
- **🔒 Found blind.** Discovery (`flounder run`) executes with **no network access**, so a finding is provably *found* — derived from the code, not looked up from a disclosure or advisory.
- **🌐 Reproduced for real.** Reproduction (`flounder confirm`) forks the **live deployed target** (e.g. mainnet at a block) and replays the exploit against real on-chain state — then consolidates duplicates into distinct bugs, checks novelty, and emits a submit / no-submit decision. Never broadcasts.
- **🧠 The model drives; the framework guarantees.** No bug-class checklist, no taxonomy, no domain playbook. Flounder supplies sandboxed tools, the confirmation gate, and replayable state — *strategy* is the model's. So it audits Solidity, ZK / proof-system circuits, protocols, consensus, cryptography, or any source — and gets sharper as the models do.
- **📊 A tracked pipeline, not a one-shot prompt.** A multi-project dashboard with live per-phase timing, scope coverage you can hand-prioritize, findings that appear as each scope lands, per-finding and project-wide confirm that resumes where it left off, and a cross-project bug board — driven from the UI or headlessly over a self-describing REST API.

## Quickstart

```bash
npm install && npm run build

# sealed discovery → open-world confirmation
flounder run     --target my-target --source ./src --corpus ./docs
flounder confirm ./runs/my-target-<timestamp> --source ./src

# …or track and drive audits from a local dashboard
flounder ui      # http://127.0.0.1:4500
```

Live runs use a pi-ai provider (`openai-codex` by default; a one-time `pi /login`). `--mock-llm` runs offline. Full commands, flags, and materials: **[docs/USAGE.md](docs/USAGE.md)**.

## How it works

**Two passes, one principle — execution decides.**

- **`flounder run` — sealed discovery.** Network-off. The model **maps** a complete, scored scope inventory, then **digs** each scope obligation-by-obligation, proving bugs with local tests. Resumable and unbounded by default; you can hand-prioritize which scope it digs next.
- **`flounder confirm` — open-world reproduction.** Network-on. It freezes the findings (pre-network provenance), reproduces each on a fork of the real target, consolidates by fix-equivalence, checks novelty, and writes a decision sheet. Finding-grained and resumable — confirm a single finding or a whole project; a re-run only picks up what's still pending.

A finding's **status is the framework's verdict from execution**, never the model's claim:

| status | meaning |
|---|---|
| `confirmed-differential` | exploit ran, passed, and is **blocked by its own minimal fix** — the strongest |
| `confirmed-executable` | a cited local test actually triggered the bug |
| `suspected` | credible but not yet proven (or debunked on refutation) |
| `refuted` | an independent skeptic broke the claim |

→ Design, flow, the confirmation boundary, and the control/execution split: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Dashboard

`flounder ui` tracks and drives audits across projects: the **prepare → map → dig → confirm** pipeline with live per-phase timing and an "auditing now" marker, a scored scope queue you can hand-order, findings that stream in as each scope lands and change status through refutation, per-finding and project-wide **Confirm** on the real target, a cross-project **Bugs** board with submission tracking, and viewable Markdown reports. Audits execute on a **daemon** (optionally another machine) so target code and provider keys never leave it; every operation is a self-describing REST call (`GET /api`), so an agent can drive the whole workflow headless. → [docs/USAGE.md#dashboard](docs/USAGE.md#dashboard).

## White-hat use

Flounder is for **authorized** auditing only — your own code or public bug-bounty scope. `run` is network-sealed; `confirm` may **fork and read** live networks but **never broadcasts**, moves funds, or writes to any live system — exploits replay against a *local* fork only. Build the smallest proof needed, report privately, coordinate disclosure. See [SECURITY.md](SECURITY.md).

## Documentation

- **[Usage](docs/USAGE.md)** — commands, flags, materials, outputs, the dashboard, the API, the library.
- **[Architecture](docs/ARCHITECTURE.md)** — the thin-layer design, agentic flow, the confirmation boundary, the control/execution split, and the tracking schema.
- **[Solidity](docs/SOLIDITY.md)** · **[Starknet](docs/STARKNET.md)** — stack-specific guidance.
- **[Domain profiles](configs/README.md)** — opt-in `--config` presets (off by default).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). MIT licensed.
