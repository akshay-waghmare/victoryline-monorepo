"""Read-only technical SEO integrity agent for Crickzen production routes.

Deterministic checks are the source of truth. Optional OpenCode triage may
only summarise the structured evidence produced here; it never receives page
HTML or changes deterministic findings.
"""

from __future__ import annotations

import argparse
import html as html_module
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

import requests
from pydantic import BaseModel, Field


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BASE_URL = "https://www.crickzen.com"
DEFAULT_OPENCODE_MODEL = "opencode-go/deepseek-v4-flash"
DEFAULT_OPENCODE_AGENT = "seo-triage"
STATIC_TARGETS = (
    {"path": "/", "sampleType": "hub", "source": "permanent-fixture", "lifecycle": "hub"},
    {"path": "/live-score", "sampleType": "hub", "source": "permanent-fixture", "lifecycle": "live-discovery"},
    {"path": "/live-score/today", "sampleType": "hub", "source": "permanent-fixture", "lifecycle": "today-discovery"},
    {"path": "/cricket-schedule/today", "sampleType": "hub", "source": "permanent-fixture", "lifecycle": "schedule-discovery"},
)
INVALID_SLUG = "seo-audit-invalid-fixture-vs-never-exists-00000000"
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


class SeoFinding(BaseModel):
    severity: str = Field(pattern="^(critical|high|medium|low)$")
    title: str
    evidence: str
    recommendation: str
    urls: List[str] = Field(default_factory=list)


class AuditSynthesis(BaseModel):
    executive_summary: str
    findings: List[SeoFinding] = Field(default_factory=list)
    next_run_focus: str


AuditSynthesis.model_rebuild(_types_namespace={"List": List, "SeoFinding": SeoFinding})


class AuditState(TypedDict, total=False):
    base_url: str
    max_urls: int
    use_llm: bool
    force_triage: bool
    triage_model: str
    output_dir: str
    output_root: str
    urls: List[Dict[str, Any]]
    selection_warnings: List[str]
    evidence: Dict[str, Any]
    comparison: Dict[str, Any]
    synthesis: Dict[str, Any]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_target(url: str, sample_type: str, source: str, lifecycle: str, expected_route: str = "valid") -> Dict[str, Any]:
    return {
        "url": url.rstrip("/"),
        "sampleType": sample_type,
        "source": source,
        "lifecycle": lifecycle,
        "expectedRoute": expected_route,
        "selectedAt": utc_now(),
    }


def fetch_json(url: str) -> Any:
    response = requests.get(url, timeout=20, headers={"User-Agent": "CrickzenSeoAuditAgent/2.0"})
    response.raise_for_status()
    return response.json()


def canonical_url(match: Dict[str, Any], base_url: str) -> str:
    slug = str(match.get("externalMatchKey") or match.get("url") or "").rstrip("/").split("/")[-1]
    return f"{base_url}/cric-live/{slug}" if slug else ""


def target_from_match(match: Dict[str, Any], base_url: str, lifecycle: str, source: str) -> Optional[Dict[str, Any]]:
    url = canonical_url(match, base_url)
    if not url:
        return None
    return make_target(url, "canonical-match", source, lifecycle)


def load_fixture_targets(path: Optional[str], base_url: str) -> List[Dict[str, Any]]:
    if not path:
        return []
    fixture_path = Path(path)
    if not fixture_path.exists():
        raise ValueError(f"Fixture file does not exist: {fixture_path}")
    parsed = json.loads(fixture_path.read_text(encoding="utf-8"))
    rows = parsed.get("fixtures", parsed) if isinstance(parsed, dict) else parsed
    if not isinstance(rows, list):
        raise ValueError("Fixture file must contain a list or a 'fixtures' list")
    targets: List[Dict[str, Any]] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or not row.get("url"):
            raise ValueError(f"Fixture {index} must provide a url")
        url = str(row["url"])
        if url.startswith("/"):
            url = base_url + url
        targets.append(make_target(
            url,
            str(row.get("sampleType", "benchmark")),
            str(row.get("source", "fixture-file")),
            str(row.get("lifecycle", "benchmark")),
            str(row.get("expectedRoute", "valid")),
        ))
    return targets


def list_targets(base_url: str, max_urls: int, explicit_urls: List[str], fixture_file: Optional[str] = None) -> tuple[List[Dict[str, Any]], List[str]]:
    targets = [make_target(base_url + row["path"], row["sampleType"], row["source"], row["lifecycle"]) for row in STATIC_TARGETS]
    targets.append(make_target(f"{base_url}/cric-live/{INVALID_SLUG}", "invalid-route", "permanent-fixture", "invalid", "invalid"))
    targets.extend(load_fixture_targets(fixture_file, base_url))
    targets.extend(make_target(url, "explicit", "command-line", "operator-selected") for url in explicit_urls)
    warnings: List[str] = []
    for endpoint, lifecycle in (("live-matches", "live"), ("upcoming-matches", "upcoming"), ("completed-matches", "completed")):
        try:
            payload = fetch_json(f"{base_url}/api/cricket-data/{endpoint}")
            rows = payload.get("data", []) if isinstance(payload, dict) else payload
            row = next((item for item in rows if isinstance(item, dict) and canonical_url(item, base_url)), None) if isinstance(rows, list) else None
            if row:
                target = target_from_match(row, base_url, lifecycle, f"{endpoint}-api:first-canonical")
                if target:
                    targets.append(target)
            else:
                warnings.append(f"NO_{endpoint.upper()}_CANONICAL_SAMPLE")
        except requests.RequestException as error:
            warnings.append(f"{endpoint.upper()}_COLLECTION_FAILED:{error.__class__.__name__}")

    unique: List[Dict[str, Any]] = []
    for target in targets:
        if target["url"] and not any(item["url"] == target["url"] for item in unique):
            unique.append(target)
    if len(unique) > max_urls:
        warnings.append(f"TARGET_CAP_APPLIED:{len(unique)}->{max_urls}")
    return unique[:max_urls], warnings


def capture(html: str, pattern: str) -> str:
    match = re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL)
    return re.sub(r"\s+", " ", html_module.unescape(match.group(1))).strip() if match else ""


def visible_text(html: str) -> str:
    text = re.sub(r"<(script|style|noscript)\b[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    return re.sub(r"\s+", " ", html_module.unescape(re.sub(r"<[^>]+>", " ", text))).strip()


def json_ld_items(html: str) -> tuple[List[Dict[str, Any]], int]:
    items: List[Dict[str, Any]] = []
    invalid_count = 0
    for raw in re.findall(r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", html, flags=re.IGNORECASE | re.DOTALL):
        try:
            payload = json.loads(html_module.unescape(raw).strip())
        except json.JSONDecodeError:
            invalid_count += 1
            continue
        values = payload.get("@graph", []) if isinstance(payload, dict) and isinstance(payload.get("@graph"), list) else [payload]
        items.extend(item for item in values if isinstance(item, dict))
    return items, invalid_count


def schema_summary(items: List[Dict[str, Any]], invalid_count: int) -> Dict[str, Any]:
    event = next((item for item in items if item.get("@type") == "SportsEvent"), None)
    competitors = event.get("competitor") if isinstance(event, dict) else []
    competitor_names = [str(item.get("name") or "") for item in competitors if isinstance(item, dict)] if isinstance(competitors, list) else []
    home_team = str((event.get("homeTeam") or {}).get("name") if isinstance(event.get("homeTeam"), dict) else event.get("homeTeam") or "") if event else ""
    away_team = str((event.get("awayTeam") or {}).get("name") if isinstance(event.get("awayTeam"), dict) else event.get("awayTeam") or "") if event else ""
    if not home_team and len(competitor_names) >= 2:
        home_team, away_team = competitor_names[0], competitor_names[1]
    return {
        "types": sorted({str(item.get("@type")) for item in items if item.get("@type")}),
        "invalidJsonLdCount": invalid_count,
        "sportsEvent": {
            "name": str(event.get("name") or ""),
            "url": str(event.get("url") or ""),
            "startDate": str(event.get("startDate") or ""),
            "homeTeam": home_team,
            "awayTeam": away_team,
            "teamSource": "homeAway" if event.get("homeTeam") or event.get("awayTeam") else "competitor" if competitor_names else "missing",
            "eventStatus": str(event.get("eventStatus") or ""),
        } if event else None,
    }


def add_flag(flags: List[Dict[str, str]], code: str, severity: str, observed: str, expected: str) -> None:
    flags.append({"code": code, "severity": severity, "observed": observed, "expected": expected})


def meaningful_tokens(value: str) -> set[str]:
    ignored = {"vs", "v", "live", "match", "upcoming", "completed", "crickzen", "score", "cricket", "the"}
    return {token for token in re.findall(r"[a-z]{2,}", value.lower()) if token not in ignored}


def page_flags(target: Dict[str, Any], page: Dict[str, Any]) -> List[Dict[str, str]]:
    flags: List[Dict[str, str]] = []
    status = page["status"]
    expected_route = target["expectedRoute"]
    robots = page["robots"].lower()
    is_match = "/cric-live/" in target["url"]
    if status == 0:
        add_flag(flags, "REQUEST_FAILED", "critical", page.get("error", "request failed"), "HTTP response")
        return flags
    if expected_route == "invalid":
        if status != 404:
            add_flag(flags, "INVALID_ROUTE_NOT_404", "critical", str(status), "404")
        if "noindex" not in robots:
            add_flag(flags, "INVALID_ROUTE_INDEXABLE", "critical", page["robots"] or "missing", "noindex")
        if page["canonical"]:
            add_flag(flags, "INVALID_ROUTE_HAS_CANONICAL", "high", page["canonical"], "no canonical")
        return flags
    if status != 200:
        add_flag(flags, f"HTTP_{status}", "critical", str(status), "200")
    if not page["title"]:
        add_flag(flags, "TITLE_MISSING", "high", "missing", "non-empty title")
    if page["h1Count"] != 1:
        add_flag(flags, f"H1_COUNT_{page['h1Count']}", "high", str(page["h1Count"]), "exactly 1")
    if re.search(r"cricket match not available|team a|team b", page["title"], flags=re.IGNORECASE):
        add_flag(flags, "GENERIC_OR_PLACEHOLDER_TITLE", "high", page["title"], "match-specific or neutral live title")
    if re.search(r"cricket match not available|page not found", page["visibleText"], flags=re.IGNORECASE):
        add_flag(flags, "GENERIC_FALLBACK_BODY", "critical", "generic not-available/not-found body", "match lifecycle content")
    if is_match:
        if page["canonical"].rstrip("/") != target["url"].rstrip("/"):
            add_flag(flags, "CANONICAL_NOT_SELF", "critical", page["canonical"] or "missing", target["url"])
        if "noindex" in robots:
            add_flag(flags, "CANONICAL_MATCH_NOINDEX", "critical", page["robots"], "index,follow")
        schema = page["schema"]
        if schema["invalidJsonLdCount"]:
            add_flag(flags, "JSONLD_PARSE_ERROR", "high", str(schema["invalidJsonLdCount"]), "valid JSON-LD")
        event = schema["sportsEvent"]
        if not event:
            add_flag(flags, "SPORTSEVENT_MISSING", "high", ", ".join(schema["types"]) or "missing", "SportsEvent")
        else:
            if not event["name"]:
                add_flag(flags, "SPORTSEVENT_NAME_MISSING", "medium", "missing", "event name")
            if not event["startDate"]:
                add_flag(flags, "SPORTSEVENT_STARTDATE_MISSING", "medium", "missing", "start date")
            if event["url"] and event["url"].rstrip("/") != target["url"].rstrip("/"):
                add_flag(flags, "SPORTSEVENT_URL_MISMATCH", "critical", event["url"], target["url"])
            if not event["homeTeam"] or not event["awayTeam"]:
                add_flag(flags, "SPORTSEVENT_TEAM_MISSING", "medium", f"home={event['homeTeam']}; away={event['awayTeam']}", "both teams")
            event_tokens = meaningful_tokens(event["name"])
            visible_identity = meaningful_tokens(f"{page['title']} {page['h1']}")
            if len(event_tokens) >= 2 and not event_tokens.intersection(visible_identity):
                add_flag(flags, "TITLE_H1_SCHEMA_IDENTITY_MISMATCH", "high", f"schema={event['name']}; title={page['title']}; h1={page['h1']}", "title or H1 should identify the SportsEvent")
    return flags


def parse_page(target: Dict[str, Any]) -> Dict[str, Any]:
    url = target["url"]
    try:
        response = requests.get(url, timeout=30, headers={"User-Agent": "CrickzenSeoAuditAgent/2.0"})
        html = response.text
        status = response.status_code
    except requests.RequestException as error:
        return {"url": url, "status": 0, "error": str(error), "flags": [{"code": "REQUEST_FAILED", "severity": "critical", "observed": str(error), "expected": "HTTP response"}]}

    title = capture(html, r"<title[^>]*>(.*?)</title>")
    canonical = capture(html, r"<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"']([^\"']+)") or capture(html, r"<link[^>]+href=[\"']([^\"']+)[\"'][^>]+rel=[\"']canonical[\"']")
    robots = capture(html, r"<meta[^>]+name=[\"']robots[\"'][^>]+content=[\"']([^\"']+)") or capture(html, r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+name=[\"']robots[\"']")
    h1s = [re.sub(r"\s+", " ", html_module.unescape(re.sub(r"<[^>]+>", " ", item))).strip() for item in re.findall(r"<h1\b[^>]*>(.*?)</h1>", html, flags=re.IGNORECASE | re.DOTALL)]
    items, invalid_count = json_ld_items(html)
    page = {
        "url": url,
        "status": status,
        "title": title,
        "canonical": canonical,
        "robots": robots,
        "h1Count": len(h1s),
        "h1": h1s[0] if h1s else "",
        "bodyBytes": len(html.encode("utf-8")),
        "visibleText": visible_text(html)[:800],
        "schema": schema_summary(items, invalid_count),
    }
    page["flags"] = page_flags(target, page)
    return page


def run_deterministic_audit(targets: List[Dict[str, Any]], output_dir: Path) -> tuple[str, int]:
    urls = [target["url"] for target in targets]
    url_path = output_dir / "urls.txt"
    audit_path = output_dir / "deterministic-audit.txt"
    url_path.write_text("\n".join(urls) + "\n", encoding="utf-8")
    command = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(REPO_ROOT / "scripts" / "Audit-MatchSeo.ps1"), "-UrlList", str(url_path), "-OutputPath", str(audit_path)]
    result = subprocess.run(command, cwd=REPO_ROOT, capture_output=True, text=True, timeout=180)
    if not audit_path.exists():
        audit_path.write_text(result.stdout + "\n" + result.stderr, encoding="utf-8")
    return audit_path.read_text(encoding="utf-8", errors="replace"), result.returncode


def severity_counts(pages: List[Dict[str, Any]]) -> Dict[str, int]:
    counts = {severity: 0 for severity in SEVERITY_ORDER}
    for page in pages:
        for flag in page.get("flags", []):
            counts[flag["severity"]] += 1
    return counts


def audit_status(pages: List[Dict[str, Any]], selection_warnings: List[str]) -> str:
    counts = severity_counts(pages)
    if any(page.get("status") == 0 for page in pages) or any("COLLECTION_FAILED" in warning for warning in selection_warnings):
        return "partial"
    if counts["critical"]:
        return "failed"
    if counts["high"] or counts["medium"] or counts["low"]:
        return "degraded"
    return "passed"


def previous_evidence(output_root: Path, current_dir: Path) -> Optional[Dict[str, Any]]:
    candidates = sorted((path for path in output_root.glob("*/evidence.json") if path.parent != current_dir), reverse=True)
    for path in candidates:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(payload, dict) and isinstance(payload.get("evidence"), dict):
                return {"path": str(path), "payload": payload}
        except (OSError, json.JSONDecodeError):
            continue
    return None


def compare_with_previous(current_pages: List[Dict[str, Any]], previous: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not previous:
        return {"available": False, "regressions": [], "resolutions": [], "changes": []}
    old_pages = {page.get("url"): page for page in previous["payload"]["evidence"].get("pages", []) if isinstance(page, dict)}
    regressions: List[Dict[str, Any]] = []
    resolutions: List[Dict[str, Any]] = []
    changes: List[Dict[str, Any]] = []
    for page in current_pages:
        old = old_pages.get(page["url"])
        if not old:
            continue
        old_flags = {flag.get("code") if isinstance(flag, dict) else str(flag) for flag in old.get("flags", [])}
        new_flags = {flag.get("code") for flag in page.get("flags", [])}
        for code in sorted(new_flags - old_flags):
            regressions.append({"url": page["url"], "type": "new-flag", "value": code})
        for code in sorted(old_flags - new_flags):
            resolutions.append({"url": page["url"], "type": "resolved-flag", "value": code})
        for field in ("status", "canonical", "robots", "title", "h1"):
            if old.get(field) != page.get(field):
                changes.append({"url": page["url"], "field": field, "before": old.get(field), "after": page.get(field)})
        old_bytes, new_bytes = old.get("bodyBytes"), page.get("bodyBytes")
        if isinstance(old_bytes, int) and old_bytes > 0 and isinstance(new_bytes, int) and new_bytes < old_bytes * 0.6:
            regressions.append({"url": page["url"], "type": "body-size-collapse", "before": old_bytes, "after": new_bytes})
    return {"available": True, "previousArtifact": previous["path"], "regressions": regressions, "resolutions": resolutions, "changes": changes}


def deterministic_summary(evidence: Dict[str, Any], comparison: Dict[str, Any]) -> Dict[str, Any]:
    pages = evidence.get("pages", [])
    counts = severity_counts(pages)
    findings = []
    for page in pages:
        for flag in page.get("flags", []):
            findings.append({"severity": flag["severity"], "title": flag["code"], "evidence": f"{page['url']} — observed {flag['observed']}; expected {flag['expected']}", "recommendation": "Inspect the deterministic evidence and correct the route/SSR contract before expanding content.", "urls": [page["url"]]})
    findings.sort(key=lambda finding: SEVERITY_ORDER[finding["severity"]])
    return {
        "executive_summary": f"Audit status: {evidence['auditStatus']}. URLs: {len(pages)}. Critical: {counts['critical']}; high: {counts['high']}; medium: {counts['medium']}; low: {counts['low']}. Regressions: {len(comparison['regressions'])}.",
        "findings": findings[:12],
        "next_run_focus": "Fix critical deterministic failures first, then re-run the same permanent fixtures and compare the evidence artifact.",
    }


def llm_evidence(evidence: Dict[str, Any], comparison: Dict[str, Any]) -> Dict[str, Any]:
    """Return only structured, bounded, non-HTML evidence for optional triage."""
    pages = []
    for page in evidence.get("pages", []):
        pages.append({key: page.get(key) for key in ("url", "status", "title", "canonical", "robots", "h1Count", "h1", "bodyBytes", "schema", "flags")})
    return {"auditStatus": evidence["auditStatus"], "severityCounts": evidence["severityCounts"], "selectionWarnings": evidence["selectionWarnings"], "pages": pages, "comparison": comparison}


def triage_needed(evidence: Dict[str, Any], comparison: Dict[str, Any]) -> bool:
    return any(page.get("flags") for page in evidence.get("pages", [])) or bool(comparison.get("regressions"))


def extract_json_object(output: str) -> Dict[str, Any]:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", output, flags=re.IGNORECASE | re.DOTALL)
    candidates = [fenced.group(1)] if fenced else []
    candidates.append(output.strip())
    decoder = json.JSONDecoder()
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        for match in re.finditer(r"\{", candidate):
            try:
                parsed, _ = decoder.raw_decode(candidate[match.start():])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
    raise ValueError("OpenCode response did not contain a JSON object")


def opencode_triage(evidence: Dict[str, Any], comparison: Dict[str, Any], model: str) -> Dict[str, Any]:
    compact_evidence = json.dumps(llm_evidence(evidence, comparison), ensure_ascii=False)[:12000]
    prompt = (
        "Use only the following structured SEO evidence. Do not use tools or files. Do not invent rankings, crawl results, Google actions, "
        "or unsupported failures. You may rank, group, summarise, and propose investigation steps, but must not change deterministic pass/fail "
        "values. Return exactly one JSON object matching this schema: "
        '{"executive_summary":"string","findings":[{"severity":"critical|high|medium|low","title":"string","evidence":"string","recommendation":"string","urls":["string"]}],"next_run_focus":"string"}. '
        f"Evidence: {compact_evidence}"
    )
    command = [
        os.getenv("OPENCODE_BIN", "opencode"), "run", "--model", model,
        "--agent", os.getenv("OPENCODE_AGENT", DEFAULT_OPENCODE_AGENT), prompt,
    ]
    result = subprocess.run(command, cwd=REPO_ROOT, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"OpenCode exit {result.returncode}: {result.stderr[-500:]}")
    return AuditSynthesis.model_validate(extract_json_object(result.stdout)).model_dump()


def collect_node(state: AuditState) -> Dict[str, Any]:
    output_dir = Path(state["output_dir"])
    targets = state.get("urls", [])
    _, deterministic_exit_code = run_deterministic_audit(targets, output_dir)
    pages = [parse_page(target) for target in targets]
    evidence = {
        "runStatus": "completed",
        "auditStatus": audit_status(pages, state.get("selection_warnings", [])),
        "selectionWarnings": state.get("selection_warnings", []),
        "targets": targets,
        "pages": pages,
        "severityCounts": severity_counts(pages),
        "deterministicAuditArtifact": "deterministic-audit.txt",
        "deterministicAuditExitCode": deterministic_exit_code,
    }
    previous = previous_evidence(Path(state["output_root"]), output_dir)
    return {"evidence": evidence, "comparison": compare_with_previous(pages, previous)}


def analyze_node(state: AuditState) -> Dict[str, Any]:
    evidence = state["evidence"]
    comparison = state["comparison"]
    fallback = deterministic_summary(evidence, comparison)
    if not state.get("use_llm"):
        fallback["llmStatus"] = "skipped:disabled"
        return {"synthesis": fallback}
    if not state.get("force_triage") and not triage_needed(evidence, comparison):
        fallback["llmStatus"] = "skipped:no_findings"
        return {"synthesis": fallback}
    try:
        payload = opencode_triage(evidence, comparison, state.get("triage_model", DEFAULT_OPENCODE_MODEL))
        payload["llmStatus"] = "used:opencode"
        return {"synthesis": payload}
    except Exception as error:
        fallback["llmStatus"] = f"failed:opencode:{error.__class__.__name__}"
        return {"synthesis": fallback}


def write_node(state: AuditState) -> Dict[str, Any]:
    output_dir = Path(state["output_dir"])
    synthesis = state["synthesis"]
    deterministic = deterministic_summary(state["evidence"], state["comparison"])
    payload = {"generatedAt": utc_now(), "triageProvider": "opencode", "model": state.get("triage_model", DEFAULT_OPENCODE_MODEL), "evidence": state["evidence"], "comparison": state["comparison"], "synthesis": synthesis}
    (output_dir / "evidence.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    run = {"runStatus": "completed", "auditStatus": state["evidence"]["auditStatus"], "llmStatus": synthesis.get("llmStatus", "unknown"), "exitCode": exit_code(state["evidence"]["auditStatus"]), "report": "report.md"}
    (output_dir / "run.json").write_text(json.dumps(run, indent=2), encoding="utf-8")
    counts = state["evidence"]["severityCounts"]
    lines = ["# Crickzen Technical SEO Integrity Audit", "", "## Run Summary", "", f"Generated: {payload['generatedAt']}", f"Run status: {run['runStatus']}", f"Audit status: {run['auditStatus']}", f"LLM triage: {run['llmStatus']}", f"URLs audited: {len(state['evidence']['pages'])}", f"Critical: {counts['critical']}; High: {counts['high']}; Medium: {counts['medium']}; Low: {counts['low']}", "", "## Critical Deterministic Findings", ""]
    criticals = [finding for finding in deterministic.get("findings", []) if finding["severity"] == "critical"]
    if not criticals:
        lines.append("None.")
    for finding in criticals:
        lines.extend([f"### {finding['title']}", finding["evidence"], f"Recommendation: {finding['recommendation']}", ""])
    lines.extend(["## Regressions From Previous Run", ""])
    if not state["comparison"]["available"]:
        lines.append("No previous evidence artifact was available for comparison.")
    elif not state["comparison"]["regressions"]:
        lines.append("None.")
    else:
        for item in state["comparison"]["regressions"]:
            lines.append(f"- {item['url']} — {item['type']}: {item.get('value', item.get('after', 'changed'))}")
    lines.extend(["", "## Deterministic Findings", ""])
    non_critical = [finding for finding in deterministic.get("findings", []) if finding["severity"] != "critical"]
    if not non_critical:
        lines.append("None.")
    for finding in non_critical:
        lines.extend([f"### {finding['severity'].upper()} — {finding['title']}", finding["evidence"], f"Recommendation: {finding['recommendation']}", ""])
    lines.extend(["## Resolutions From Previous Run", ""])
    if not state["comparison"]["available"]:
        lines.append("No previous evidence artifact was available for comparison.")
    elif not state["comparison"]["resolutions"]:
        lines.append("None.")
    else:
        for item in state["comparison"]["resolutions"]:
            lines.append(f"- {item['url']} — {item['type']}: {item.get('value', 'resolved')}")
    lines.extend(["", "## Metadata Changes From Previous Run", ""])
    if not state["comparison"]["available"] or not state["comparison"]["changes"]:
        lines.append("None.")
    else:
        for item in state["comparison"]["changes"]:
            lines.append(f"- {item['url']} — {item['field']}: {item.get('before', '')} -> {item.get('after', '')}")
    lines.extend(["## OpenCode Prioritization", ""])
    if not str(synthesis.get("llmStatus", "")).startswith("used:"):
        lines.append("Not used.")
    else:
        lines.append(synthesis.get("executive_summary", ""))
        for finding in synthesis.get("findings", []):
            lines.extend(["", f"### {finding['severity'].upper()} — {finding['title']}", finding["evidence"], f"Recommendation: {finding['recommendation']}"])
    lines.extend(["", "## Evidence Index", ""])
    for target in state["evidence"]["targets"]:
        lines.append(f"- {target['url']} | type={target['sampleType']} | lifecycle={target['lifecycle']} | source={target['source']} | expected={target['expectedRoute']}")
    if state["evidence"]["selectionWarnings"]:
        lines.extend(["", "## Selection Warnings", ""] + [f"- {warning}" for warning in state["evidence"]["selectionWarnings"]])
    (output_dir / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {}


def build_graph():
    from langgraph.graph import END, START, StateGraph

    graph = StateGraph(AuditState)
    graph.add_node("collect", collect_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("write", write_node)
    graph.add_edge(START, "collect")
    graph.add_edge("collect", "analyze")
    graph.add_edge("analyze", "write")
    graph.add_edge("write", END)
    return graph.compile()


def exit_code(status: str) -> int:
    return {"passed": 0, "degraded": 0, "failed": 2, "partial": 3}.get(status, 1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=os.getenv("SEO_AUDIT_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--max-urls", type=int, default=int(os.getenv("SEO_AUDIT_MAX_URLS", "12")))
    parser.add_argument("--url", action="append", default=[])
    parser.add_argument("--fixture-file", default=os.getenv("SEO_AUDIT_FIXTURE_FILE"))
    parser.add_argument("--no-llm", action="store_true", help="Disable optional OpenCode triage.")
    parser.add_argument("--force-triage", action="store_true", help="Run one OpenCode triage call even when deterministic evidence is clean; intended for manual smoke checks.")
    parser.add_argument("--opencode-model", default=os.getenv("OPENCODE_MODEL", DEFAULT_OPENCODE_MODEL))
    parser.add_argument("--scheduled", action="store_true")
    parser.add_argument("--output-root", default=str(REPO_ROOT / "artifacts" / "seo-audit-agent"))
    args = parser.parse_args()
    try:
        output_root = Path(args.output_root)
        run_dir = output_root / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        run_dir.mkdir(parents=True, exist_ok=False)
        targets, warnings = list_targets(args.base_url.rstrip("/"), max(1, min(args.max_urls, 20)), args.url, args.fixture_file)
        result = build_graph().invoke({"base_url": args.base_url.rstrip("/"), "max_urls": len(targets), "use_llm": not args.no_llm, "force_triage": args.force_triage, "triage_model": args.opencode_model, "output_dir": str(run_dir), "output_root": str(output_root), "urls": targets, "selection_warnings": warnings})
        print(str(run_dir / "report.md"))
        return exit_code(result["evidence"]["auditStatus"])
    except OSError as error:
        print(f"Artifact or filesystem failure: {error}", file=sys.stderr)
        return 4
    except Exception as error:
        print(f"Execution failure: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
