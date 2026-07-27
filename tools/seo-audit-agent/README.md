# Crickzen SEO Audit Agent

This is a read-only SEO operator agent for `https://www.crickzen.com`. It combines the repository's deterministic raw-HTML audit with one optional, bounded LangGraph synthesis call.

## Run now

```powershell
python .\tools\seo-audit-agent\seo_audit_agent.py --no-llm
python .\tools\seo-audit-agent\seo_audit_agent.py
```

Set `OPENAI_API_KEY` only in the process or operating-system environment. The default model is `gpt-5-nano`; override it with `OPENAI_MODEL`. Each run makes at most one model call, caps evidence at 12,000 characters, and caps generated output at 900 tokens.

## Schedule

```powershell
# Install isolated dependencies once on the scheduling machine
python -m venv .\tools\seo-audit-agent\.venv
.\tools\seo-audit-agent\.venv\Scripts\python.exe -m pip install -r .\tools\seo-audit-agent\requirements.txt

.\scripts\Install-SeoAuditAgentTask.ps1
.\scripts\Install-SeoAuditAgentTask.ps1 -Hour 8 -Minute 30
.\scripts\Install-SeoAuditAgentTask.ps1 -Remove
```

The task prefers the isolated `.venv` when present, otherwise it falls back to `python` on PATH. It is local to the Windows machine that installs it, not a production deployment, and it makes no site changes.

## Artifacts

Each run writes a timestamped directory under `artifacts/seo-audit-agent/`:

- `urls.txt`: sampled targets;
- `deterministic-audit.txt`: output from `Audit-MatchSeo.ps1`;
- `evidence.json`: machine-readable raw findings and LLM status;
- `report.md`: operator-facing prioritized report.
