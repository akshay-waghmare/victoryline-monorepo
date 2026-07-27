# Crickzen SEO Audit Agent Plan

**Status:** Implemented v1 hardened operator agent
**Scope:** Read-only production SEO audits; no route, sitemap, content, or Search Console mutations

## Outcome

`tools/seo-audit-agent/seo_audit_agent.py` runs a repeatable raw-HTML audit for Crickzen and produces a small, evidence-backed priority report. It can run directly or through an explicitly installed Windows Scheduled Task.

## Design

1. Reuse `scripts/Audit-MatchSeo.ps1` as the deterministic audit record.
2. Run permanent fixtures (stable hubs and one invalid slug), optional operator benchmarks, and a capped lifecycle sample containing live, upcoming, and recently completed canonical URLs.
3. Record the target's selection source, lifecycle, expectation, and selection time. Collect structured titles, canonicals, robots, H1 text/count, visible fallback markers, schema contents, status, body size, and deterministic flags. Check title/H1 identity against the SportsEvent name when both are available.
4. Use a LangGraph workflow with three nodes: collect evidence, optionally synthesize, write artifacts.
5. Allow exactly one low-cost model call per run. Default model: `gpt-5-nano`; `OPENAI_MODEL` can override it. The call has a 12,000-character evidence cap and 900 output-token cap.
6. Classify deterministic findings before any model call: route-validity/canonical/indexing/schema-identity failures are critical; metadata/schema completeness failures are high or medium. The model cannot alter those values.
7. When `OPENAI_API_KEY` is absent or the model fails, retain the deterministic report and mark LLM triage as skipped/failed. The agent must never hide a deterministic failure.
8. Compare each run against the previous immutable evidence artifact to expose new/resolved flags, metadata drift, and material body-size collapse; show each category separately in the report.
9. Write immutable run artifacts under `artifacts/seo-audit-agent/<UTC timestamp>/`: URL list, raw audit output, JSON evidence, a status record, and Markdown report.

## Safety boundaries

- Read-only HTTP and Search Console-adjacent audit work only.
- No indexing API submission, content rewrite, deployment, or sitemap mutation.
- No credentials in artifacts, prompts, logs, or repository files.
- The model receives structured evidence only—never page HTML, scripts, comments, or raw PowerShell audit output.
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

- A manual run creates all five artifacts and reports the exact targets and their selection rationale.
- The audit still completes with no API key.
- The model receives only bounded, structured evidence and cannot overwrite deterministic severity or pass/fail facts.
- Valid canonical matches are expected to be `200`/indexable/self-canonical while the fabricated invalid fixture is expected to be a true `404`/`noindex`/no-canonical route.
- A second run reports regressions and resolutions against the prior immutable artifact.
- A scheduled task is inspectable, removable, and never installed implicitly.
