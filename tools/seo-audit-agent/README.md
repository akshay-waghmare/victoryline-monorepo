# Crickzen SEO Audit Agent

This is a read-only **technical SEO integrity** operator agent for `https://www.crickzen.com`. It combines the repository's deterministic raw-HTML audit with one optional, bounded OpenCode synthesis call.

It does not submit pages, rewrite content, deploy code, or report Search Console performance. Deterministic evidence is authoritative; the optional model can only rank and summarise it.

## Run now

```powershell
python .\tools\seo-audit-agent\seo_audit_agent.py --no-llm
python .\tools\seo-audit-agent\seo_audit_agent.py
python .\tools\seo-audit-agent\seo_audit_agent.py --force-triage
```

Configure OpenCode Go in the same Windows user account with `opencode` and `/connect`; do not put its key in this repository or environment file. The default model is `opencode-go/deepseek-v4-flash`; override it with `OPENCODE_MODEL`. Each run makes at most one model call, caps evidence at 12,000 characters, and uses the repository-local read-only `seo-triage` OpenCode agent.

The model call is skipped when no deterministic findings or regressions exist. `--force-triage` is only for a manual provider smoke check.

## Schedule

```powershell
# Install isolated dependencies once on the scheduling machine
python -m venv .\tools\seo-audit-agent\.venv
.\tools\seo-audit-agent\.venv\Scripts\python.exe -m pip install -r .\tools\seo-audit-agent\requirements.txt

.\scripts\Install-SeoAuditAgentTask.ps1
.\scripts\Install-SeoAuditAgentTask.ps1 -Hour 8 -Minute 30
.\scripts\Install-SeoAuditAgentTask.ps1 -Remove
```

The task prefers the isolated `.venv` when present, otherwise it falls back to `python` on PATH. When triage is needed, the same Windows user must also have `opencode` on `PATH` and an active OpenCode Go connection. It is local to the Windows machine that installs it, not a production deployment, and it makes no site changes.

## Artifacts

Each run writes a timestamped directory under `artifacts/seo-audit-agent/`:

- `urls.txt`: sampled targets;
- `deterministic-audit.txt`: output from `Audit-MatchSeo.ps1`;
- `evidence.json`: machine-readable target provenance, deterministic findings, schema facts, comparison, and OpenCode status;
- `run.json`: separate execution, audit, and LLM states plus the process exit code;
- `report.md`: operator-facing summary, critical findings, regressions, and evidence index.

## Fixture policy

Every run includes permanent discovery hubs and one fabricated invalid match slug. It then selects the first available canonical URL from each of the live, upcoming, and completed-match APIs. Each target records its lifecycle, source, expectation, and selection time in `evidence.json`.

For durable historical or sparse-match benchmarks, copy `fixtures.example.json` to `fixtures.json`, replace the placeholders with real canonical URLs, and run:

```powershell
python .\tools\seo-audit-agent\seo_audit_agent.py --no-llm --fixture-file .\tools\seo-audit-agent\fixtures.json
```

`fixtures.json` is deliberately ignored: benchmark selection is local operator configuration and may change over time.

## Outcome contract

- `runStatus`: whether the process reached artifact generation;
- `auditStatus`: `passed`, `degraded`, `failed`, or `partial`;
- `llmStatus`: `used:opencode`, `skipped:disabled`, `skipped:no_findings`, or `failed:opencode:<type>` without hiding deterministic evidence.

Exit codes are `0` for passed/degraded audits, `1` for execution failure, `2` for critical deterministic failures, `3` for partial collection, and `4` for artifact/filesystem failure. OpenCode triage failure never hides or changes the deterministic result.

The next run automatically compares its structured evidence with the previous immutable run, reporting new/resolved flags, metadata changes, and material HTML-size collapse.
