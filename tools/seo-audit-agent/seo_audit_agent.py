"""Bounded, read-only SEO audit agent for Crickzen canonical and discovery routes."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, TypedDict

import requests
from pydantic import BaseModel, Field


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BASE_URL = "https://www.crickzen.com"
STATIC_PATHS = ("/", "/live-score", "/live-score/today", "/cricket-schedule/today")


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


class AuditState(TypedDict, total=False):
    base_url: str
    max_urls: int
    use_llm: bool
    output_dir: str
    urls: List[str]
    evidence: Dict[str, Any]
    synthesis: Dict[str, Any]


def fetch_json(url: str) -> Any:
    response = requests.get(url, timeout=20, headers={"User-Agent": "CrickzenSeoAuditAgent/1.0"})
    response.raise_for_status()
    return response.json()


def canonical_url(match: Dict[str, Any], base_url: str) -> str:
    slug = str(match.get("externalMatchKey") or match.get("url") or "").rstrip("/").split("/")[-1]
    return f"{base_url}/cric-live/{slug}" if slug else ""


def list_targets(base_url: str, max_urls: int, explicit_urls: List[str]) -> List[str]:
    targets = [base_url + path for path in STATIC_PATHS] + explicit_urls
    for endpoint in ("live-matches", "upcoming-matches", "recent-matches"):
        try:
            payload = fetch_json(f"{base_url}/api/cricket-data/{endpoint}")
            rows = payload.get("data", []) if isinstance(payload, dict) else payload
            for row in rows[:2] if isinstance(rows, list) else []:
                if isinstance(row, dict):
                    url = canonical_url(row, base_url)
                    if url:
                        targets.append(url)
        except requests.RequestException:
            continue
    unique: List[str] = []
    for url in targets:
        clean = url.strip().rstrip("/")
        if clean and clean not in unique:
            unique.append(clean)
    return unique[:max_urls]


def parse_page(url: str) -> Dict[str, Any]:
    try:
        response = requests.get(url, timeout=30, headers={"User-Agent": "CrickzenSeoAuditAgent/1.0"})
        html = response.text
        status = response.status_code
    except requests.RequestException as error:
        return {"url": url, "status": 0, "flags": ["REQUEST_FAILED"], "error": str(error)}

    def capture(pattern: str) -> str:
        match = re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL)
        return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""

    title = capture(r"<title[^>]*>(.*?)</title>")
    canonical = capture(r"<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"']([^\"']+)")
    robots = capture(r"<meta[^>]+name=[\"']robots[\"'][^>]+content=[\"']([^\"']+)")
    h1_count = len(re.findall(r"<h1\b", html, flags=re.IGNORECASE))
    flags: List[str] = []
    is_match = "/cric-live/" in url
    if status != 200:
        flags.append(f"HTTP_{status}")
    if not title:
        flags.append("TITLE_MISSING")
    if h1_count != 1:
        flags.append(f"H1_COUNT_{h1_count}")
    if is_match and canonical.rstrip("/") != url.rstrip("/"):
        flags.append("CANONICAL_NOT_SELF")
    if is_match and "noindex" in robots.lower():
        flags.append("CANONICAL_MATCH_NOINDEX")
    if re.search(r"cricket match not available|team a|team b", title, flags=re.IGNORECASE):
        flags.append("GENERIC_OR_PLACEHOLDER_TITLE")
    if is_match and "SportsEvent" not in html:
        flags.append("SPORTSEVENT_MISSING")
    return {
        "url": url,
        "status": status,
        "title": title,
        "canonical": canonical,
        "robots": robots,
        "h1Count": h1_count,
        "jsonLdCount": len(re.findall(r"application/ld\\+json", html, flags=re.IGNORECASE)),
        "bodyBytes": len(html.encode("utf-8")),
        "flags": flags,
    }


def run_deterministic_audit(urls: List[str], output_dir: Path) -> str:
    url_path = output_dir / "urls.txt"
    audit_path = output_dir / "deterministic-audit.txt"
    url_path.write_text("\n".join(urls) + "\n", encoding="utf-8")
    command = [
        "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        str(REPO_ROOT / "scripts" / "Audit-MatchSeo.ps1"),
        "-UrlList", str(url_path), "-OutputPath", str(audit_path),
    ]
    result = subprocess.run(command, cwd=REPO_ROOT, capture_output=True, text=True, timeout=180)
    if not audit_path.exists():
        audit_path.write_text(result.stdout + "\n" + result.stderr, encoding="utf-8")
    return audit_path.read_text(encoding="utf-8", errors="replace")


def collect_node(state: AuditState) -> Dict[str, Any]:
    output_dir = Path(state["output_dir"])
    urls = state.get("urls") or list_targets(state["base_url"], state["max_urls"], [])
    deterministic = run_deterministic_audit(urls, output_dir)
    return {"urls": urls, "evidence": {"pages": [parse_page(url) for url in urls], "deterministicAudit": deterministic[-16000:]}}


def deterministic_summary(evidence: Dict[str, Any]) -> Dict[str, Any]:
    pages = evidence.get("pages", [])
    flagged = [page for page in pages if page.get("flags")]
    return {
        "executive_summary": f"Audited {len(pages)} URLs; {len(flagged)} have deterministic SEO flags.",
        "findings": [
            {"severity": "high" if "HTTP_" in " ".join(page["flags"]) else "medium", "title": ", ".join(page["flags"]), "evidence": page["url"], "recommendation": "Inspect the deterministic audit artifact and fix the route contract before expanding content.", "urls": [page["url"]]}
            for page in flagged[:8]
        ],
        "next_run_focus": "Recheck failing URLs after a targeted production fix.",
    }


def analyze_node(state: AuditState) -> Dict[str, Any]:
    evidence = state["evidence"]
    fallback = deterministic_summary(evidence)
    if not state.get("use_llm") or not os.getenv("OPENAI_API_KEY"):
        fallback["llmStatus"] = "skipped"
        return {"synthesis": fallback}
    try:
        from langchain_openai import ChatOpenAI

        model = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-5-nano"), temperature=0, max_tokens=900)
        structured = model.with_structured_output(AuditSynthesis)
        compact_evidence = json.dumps({"pages": evidence["pages"], "audit": evidence["deterministicAudit"][-6000:]}, ensure_ascii=False)[:12000]
        result = structured.invoke(
            "You are a read-only technical SEO triage analyst for Crickzen. Use only this evidence. "
            "Do not invent rankings, crawl results, or Google actions. Prioritize defects that block useful SSR, canonical correctness, index policy, or schema. "
            f"Evidence: {compact_evidence}"
        )
        payload = result.model_dump()
        payload["llmStatus"] = "used"
        return {"synthesis": payload}
    except Exception as error:
        fallback["llmStatus"] = f"failed: {error.__class__.__name__}"
        return {"synthesis": fallback}


def write_node(state: AuditState) -> Dict[str, Any]:
    output_dir = Path(state["output_dir"])
    payload = {"generatedAt": datetime.now(timezone.utc).isoformat(), "model": os.getenv("OPENAI_MODEL", "gpt-5-nano"), "urls": state["urls"], "evidence": state["evidence"], "synthesis": state["synthesis"]}
    (output_dir / "evidence.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    synthesis = state["synthesis"]
    lines = ["# Crickzen SEO Audit", "", f"Generated: {payload['generatedAt']}", f"LLM triage: {synthesis.get('llmStatus', 'unknown')}", "", "## Summary", "", synthesis.get("executive_summary", ""), "", "## Findings", ""]
    for finding in synthesis.get("findings", []):
        lines.extend([f"### {finding['severity'].upper()} — {finding['title']}", finding["evidence"], "", f"Recommendation: {finding['recommendation']}", ""])
    lines.extend(["## Next Run Focus", "", synthesis.get("next_run_focus", "")])
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=os.getenv("SEO_AUDIT_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--max-urls", type=int, default=int(os.getenv("SEO_AUDIT_MAX_URLS", "8")))
    parser.add_argument("--url", action="append", default=[])
    parser.add_argument("--no-llm", action="store_true")
    parser.add_argument("--scheduled", action="store_true")
    parser.add_argument("--output-root", default=str(REPO_ROOT / "artifacts" / "seo-audit-agent"))
    args = parser.parse_args()
    run_dir = Path(args.output_root) / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir.mkdir(parents=True, exist_ok=False)
    urls = list_targets(args.base_url.rstrip("/"), max(1, min(args.max_urls, 12)), args.url)
    result = build_graph().invoke({"base_url": args.base_url.rstrip("/"), "max_urls": len(urls), "use_llm": not args.no_llm, "output_dir": str(run_dir), "urls": urls})
    print(str(run_dir / "report.md"))
    return 2 if any(page.get("flags") for page in result["evidence"]["pages"]) else 0


if __name__ == "__main__":
    sys.exit(main())
