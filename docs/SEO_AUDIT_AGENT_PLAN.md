# Crickzen SEO Audit Agent Plan

**Status:** Implemented initial operator agent  
**Scope:** Read-only production SEO audits; no route, sitemap, content, or Search Console mutations

## Outcome

`tools/seo-audit-agent/seo_audit_agent.py` runs a repeatable raw-HTML audit for Crickzen and produces a small, evidence-backed priority report. It can run directly or through an explicitly installed Windows Scheduled Task.

## Design

1. Reuse `scripts/Audit-MatchSeo.ps1` as the deterministic audit record.
2. Sample stable discovery hubs plus a capped set of live, upcoming, and recent canonical match URLs.
3. Collect only titles, canonicals, robots, H1 count, schema presence, status, body size, and deterministic flags for the model.
4. Use a LangGraph workflow with three nodes: collect evidence, optionally synthesize, write artifacts.
5. Allow exactly one low-cost model call per run. Default model: `gpt-5-nano`; `OPENAI_MODEL` can override it. The call has a 12,000-character evidence cap and 900 output-token cap.
6. When `OPENAI_API_KEY` is absent or the model fails, retain the deterministic report and mark LLM triage as skipped/failed. The agent must never hide a deterministic failure.
7. Write immutable run artifacts under `artifacts/seo-audit-agent/<UTC timestamp>/`: URL list, raw audit output, JSON evidence, and Markdown report.

## Safety boundaries

- Read-only HTTP and Search Console-adjacent audit work only.
- No indexing API submission, content rewrite, deployment, or sitemap mutation.
- No credentials in artifacts, prompts, logs, or repository files.
- Scheduled execution is opt-in: `scripts/Install-SeoAuditAgentTask.ps1` creates or replaces a named task only when the operator runs it.

## Operating commands

```powershell
# Deterministic audit only
python .\tools\seo-audit-agent\seo_audit_agent.py --no-llm

# One bounded LLM synthesis when OPENAI_API_KEY is set
python .\tools\seo-audit-agent\seo_audit_agent.py

# Create daily local task; default 09:15 local time
.\scripts\Install-SeoAuditAgentTask.ps1
```

## Acceptance gates

- A manual run creates all four artifacts and reports the exact URLs sampled.
- The audit still completes with no API key.
- The model receives only bounded, scrubbed audit evidence.
- A scheduled task is inspectable, removable, and never installed implicitly.
