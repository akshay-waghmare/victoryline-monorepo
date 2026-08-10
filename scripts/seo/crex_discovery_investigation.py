#!/usr/bin/env python3
import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.robotparser
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


UA = "Mozilla/5.0 (compatible; CrickzenSeoInvestigation/1.0; +https://crickzen.com)"
NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "news": "http://www.google.com/schemas/sitemap-news/0.9",
}


def fetch(session, url, timeout=30):
    started = time.time()
    try:
        response = session.get(url, timeout=timeout, allow_redirects=True)
        elapsed_ms = int((time.time() - started) * 1000)
        return {
            "url": url,
            "final_url": response.url,
            "status": response.status_code,
            "content_type": response.headers.get("content-type", ""),
            "elapsed_ms": elapsed_ms,
            "text": response.text,
        }
    except Exception as exc:
        return {"url": url, "status": None, "error": str(exc), "text": ""}


def parse_xml(text):
    return ET.fromstring(text.encode("utf-8"))


def sitemap_kind(root):
    tag = root.tag.split("}", 1)[-1]
    if tag == "sitemapindex":
        return "sitemapindex"
    if tag == "urlset":
        return "urlset"
    return tag


def extract_sitemap_entries(xml_text):
    root = parse_xml(xml_text)
    kind = sitemap_kind(root)
    if kind == "sitemapindex":
        entries = []
        for node in root.findall("sm:sitemap", NS):
            entries.append({
                "loc": text_or_none(node.find("sm:loc", NS)),
                "lastmod": text_or_none(node.find("sm:lastmod", NS)),
            })
        return kind, entries
    urls = []
    for node in root.findall("sm:url", NS):
        news_node = node.find("news:news", NS)
        urls.append({
            "loc": text_or_none(node.find("sm:loc", NS)),
            "lastmod": text_or_none(node.find("sm:lastmod", NS)),
            "has_news": news_node is not None,
            "news_publication": text_or_none(node.find("news:news/news:publication/news:name", NS)),
            "news_publication_date": text_or_none(node.find("news:news/news:publication_date", NS)),
            "news_title": text_or_none(node.find("news:news/news:title", NS)),
        })
    return kind, urls


def text_or_none(node):
    return node.text.strip() if node is not None and node.text else None


def classify_url(url):
    path = urllib.parse.urlparse(url).path.lower()
    slug = path.rsplit("/", 1)[-1]
    if "/fixtures/match-detail" in path or "/scoreboard/" in path or "/live-score" in path or "/cricket-live-score" in path:
        return "match"
    if "/cricket-news/" in path:
        return classify_article_slug(slug, "news article")
    if "/cricket-analysis/" in path:
        return classify_article_slug(slug, "analysis article")
    if "/news" in path:
        return "news hub"
    if "/schedule" in path:
        return "schedule"
    if "/series" in path:
        return "series"
    if "/team" in path:
        return "team"
    return "other"


def classify_article_slug(slug, fallback):
    checks = [
        ("prediction", "prediction"),
        ("predict", "prediction"),
        ("pitch", "pitch report"),
        ("weather", "weather"),
        ("playing-xi", "playing XI"),
        ("probable-xi", "playing XI"),
        ("stream", "streaming information"),
        ("injury", "injury news"),
        ("squad", "squad news"),
        ("record", "records/statistics"),
        ("stats", "records/statistics"),
        ("preview", "match preview"),
        ("report", "match report"),
        ("analysis", "tactical analysis"),
        ("head-to-head", "head-to-head"),
    ]
    for needle, label in checks:
        if needle in slug:
            return label
    return fallback


def page_evidence(session, url):
    data = fetch(session, url)
    soup = BeautifulSoup(data.get("text", ""), "html.parser")
    canonical = soup.find("link", rel=lambda value: value and "canonical" in value)
    robots = soup.find("meta", attrs={"name": re.compile("^robots$", re.I)})
    title = soup.find("title")
    meta_desc = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    h1s = [clean_text(h.get_text(" ")) for h in soup.find_all("h1")]
    schemas = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text()
        try:
            parsed = json.loads(raw)
            schemas.extend(schema_types(parsed))
        except Exception:
            schemas.append("INVALID_JSON_LD")
    anchors = []
    for a in soup.find_all("a", href=True):
        href = urllib.parse.urljoin(data.get("final_url") or url, a["href"])
        parsed = urllib.parse.urlparse(href)
        if parsed.netloc.endswith(("crex.com", "crickzen.com")):
            anchors.append({"href": href.split("#", 1)[0], "text": clean_text(a.get_text(" "))[:120]})
    body_text = clean_text(soup.get_text(" "))
    return {
        "url": url,
        "final_url": data.get("final_url"),
        "status": data.get("status"),
        "content_type": data.get("content_type"),
        "html_bytes": len((data.get("text") or "").encode("utf-8", errors="ignore")),
        "title": clean_text(title.get_text(" ")) if title else None,
        "description": meta_desc.get("content") if meta_desc else None,
        "canonical": canonical.get("href") if canonical else None,
        "robots": robots.get("content") if robots else None,
        "h1": h1s,
        "schema_types": sorted(set(schemas)),
        "anchor_count": len(anchors),
        "match_links": [a for a in anchors if is_match_link(a["href"])][:30],
        "article_links": [a for a in anchors if "/cricket-news/" in a["href"] or "/cricket-analysis/" in a["href"]][:30],
        "word_count": len(body_text.split()),
    }


def schema_types(node):
    found = []
    if isinstance(node, list):
        for item in node:
            found.extend(schema_types(item))
    elif isinstance(node, dict):
        typ = node.get("@type")
        if isinstance(typ, list):
            found.extend(str(t) for t in typ)
        elif typ:
            found.append(str(typ))
        graph = node.get("@graph")
        if graph:
            found.extend(schema_types(graph))
    return found


def is_match_link(url):
    path = urllib.parse.urlparse(url).path
    return (
        "/cric-live/" in path
        or "/cricket-live-score/" in path
        or path.rstrip("/") == "/cricket-live-score"
        or "/fixtures/match-detail/" in path
        or "/scoreboard/" in path
    )


def clean_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


def safe_name(url):
    parsed = urllib.parse.urlparse(url)
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", parsed.netloc + parsed.path).strip("_")[:180]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default="artifacts/seo-crex-investigation")
    parser.add_argument("--article-sample", type=int, default=12)
    parser.add_argument("--page-sample", type=int, default=10)
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    raw_dir = out_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    checked_at = datetime.now(timezone.utc).isoformat()

    seed_sitemaps = [
        "https://crex.com/sitemap.xml",
        "https://crex.com/crex_sitemap/news_sitemap.xml",
        "https://a286825.sitemaphosting6.com/4510197/sitemap_4510197.xml",
    ]
    sitemap_reports = []
    sitemap_urls = []
    for sitemap in seed_sitemaps:
        data = fetch(session, sitemap)
        (raw_dir / f"{safe_name(sitemap)}.xml").write_text(data.get("text", ""), encoding="utf-8")
        report = {"url": sitemap, "status": data.get("status"), "content_type": data.get("content_type")}
        try:
            kind, entries = extract_sitemap_entries(data.get("text", ""))
            report["kind"] = kind
            report["count"] = len(entries)
            report["sample"] = entries[:25]
            report["has_news_namespace"] = any(e.get("has_news") for e in entries) if entries else False
            report["url_type_counts"] = dict(Counter(classify_url(e.get("loc") or "") for e in entries if e.get("loc")))
            if kind == "sitemapindex":
                sitemap_urls.extend(e["loc"] for e in entries if e.get("loc"))
            elif kind == "urlset":
                sitemap_urls.append(sitemap)
        except Exception as exc:
            report["parse_error"] = str(exc)
        sitemap_reports.append(report)

    # Expand one level from the primary sitemap index.
    expanded_url_entries = []
    for sitemap in sitemap_urls[:20]:
        data = fetch(session, sitemap)
        (raw_dir / f"{safe_name(sitemap)}.xml").write_text(data.get("text", ""), encoding="utf-8")
        try:
            kind, entries = extract_sitemap_entries(data.get("text", ""))
            sitemap_reports.append({
                "url": sitemap,
                "status": data.get("status"),
                "content_type": data.get("content_type"),
                "kind": kind,
                "count": len(entries),
                "sample": entries[:15],
                "has_news_namespace": any(e.get("has_news") for e in entries) if entries else False,
                "url_type_counts": dict(Counter(classify_url(e.get("loc") or "") for e in entries if e.get("loc"))),
            })
            if kind == "urlset":
                expanded_url_entries.extend(entries)
        except Exception:
            pass

    urls = [e.get("loc") for e in expanded_url_entries if e.get("loc")]
    article_urls = [u for u in urls if "/cricket-news/" in u or "/cricket-analysis/" in u]
    match_urls = [u for u in urls if is_match_link(u)]
    hub_urls = [
        "https://crex.com/",
        "https://crex.com/news",
        "https://crex.com/scoreboard",
        "https://crex.com/fixtures/match-list",
        "https://www.crickzen.com/",
        "https://www.crickzen.com/live-score",
        "https://www.crickzen.com/cricket-schedule/today",
    ]
    samples = []
    for url in (article_urls[: args.article_sample] + match_urls[: args.page_sample] + hub_urls):
        ev = page_evidence(session, url)
        samples.append(ev)
        (raw_dir / f"{safe_name(url)}.json").write_text(json.dumps(ev, indent=2), encoding="utf-8")
        time.sleep(0.2)

    crickzen_sitemap = fetch(session, "https://www.crickzen.com/sitemap.xml")
    (raw_dir / "www.crickzen.com_sitemap.xml").write_text(crickzen_sitemap.get("text", ""), encoding="utf-8")
    crickzen_report = {"url": "https://www.crickzen.com/sitemap.xml", "status": crickzen_sitemap.get("status")}
    try:
        kind, entries = extract_sitemap_entries(crickzen_sitemap.get("text", ""))
        crickzen_report.update({
            "kind": kind,
            "count": len(entries),
            "sample": entries[:30],
            "url_type_counts": dict(Counter(classify_url(e.get("loc") or "") for e in entries if e.get("loc"))),
        })
    except Exception as exc:
        crickzen_report["parse_error"] = str(exc)

    result = {
        "checked_at_utc": checked_at,
        "sitemaps": sitemap_reports,
        "crex_article_url_count_seen": len(article_urls),
        "crex_match_url_count_seen": len(match_urls),
        "crex_sampled_pages": samples,
        "crickzen_sitemap": crickzen_report,
    }
    (out_dir / "crex-discovery-evidence.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({
        "checked_at_utc": checked_at,
        "sitemaps_checked": len(sitemap_reports),
        "article_urls_seen": len(article_urls),
        "match_urls_seen": len(match_urls),
        "samples": len(samples),
        "out": str(out_dir / "crex-discovery-evidence.json"),
    }, indent=2))


if __name__ == "__main__":
    sys.exit(main())
