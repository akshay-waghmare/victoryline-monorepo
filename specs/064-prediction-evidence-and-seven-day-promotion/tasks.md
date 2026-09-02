# Tasks

## Evidence capture

- [x] Add full feature/input JSON and quality/provenance fields to per-ball state.
- [x] Add explicit market status/source/age and batting-team orientation checks.
- [x] Enable state recording for dashboard-launched prediction processes.
- [x] Pass the source URL and proven winner into idempotent match finalization.

## Evaluation

- [x] Add shared model/market Brier, log-loss, ECE, coverage, and segment metrics.
- [x] Add candidate manifest and same-row shadow/replay scoring.
- [x] Add seven-calendar-day window and minimum sample gates.
- [x] Add deterministic JSON/Markdown review artifacts and append-only manifest.
- [x] Add candidate-vs-market and candidate-vs-incumbent promotion gates.

## Validation and operations

- [x] Add focused unit and integration tests for the acceptance scenarios.
- [x] Run a synthetic seven-day review and repeat it for deterministic output.
- [ ] Add authenticated operator visibility if needed after artifact validation.
- [x] Record verified checkpoint in the CrickZen wiki.
- [x] Deploy telemetry/reporting only after focused tests and rollback proof.
- [ ] Promote a candidate only from a passing real seven-day decision artifact.
