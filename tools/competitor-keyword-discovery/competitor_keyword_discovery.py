#!/usr/bin/env python3
"""Discover likely competitor keyword targets for live-match SEO research.

This script does not claim to know competitor traffic. It gathers signals from
public pages and optional Google autosuggest results to build a list of likely
keyword phrases competitors are targeting.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

import requests
from playwright.sync_api import sync_playwright


DEFAULT_COMPETITORS = [
    {
        "name": "crex",
        "pages": [
            {"label": "home", "url": "https://crex.com/"},
            {"label": "live-score", "url": "https://crex.com/cricket-live-score"},
            {"label": "series", "url": "https://crex.com/series"},
            {"label": "fixtures", "url": "https://crex.com/fixtures-results"},
        ],
    },
    {
        "name": "cricbuzz",
        "pages": [
            {"label": "live-scores", "url": "https://www.cricbuzz.com/cricket-match/live-scores"},
            {"label": "series", "url": "https://www.cricbuzz.com/cricket-series"},
            {"label": "schedule", "url": "https://www.cricbuzz.com/cricket-schedule/upcoming-series"},
            {"label": "news", "url": "https://www.cricbuzz.com/cricket-news"},
        ],
    },
    {
        "name": "espncricinfo",
        "pages": [
            {"label": "live-score", "url": "https://www.espncricinfo.com/live-cricket-score"},
            {"label": "series", "url": "https://www.espncricinfo.com/ci/engine/series/index.html"},
            {"label": "fixtures", "url": "https://www.espncricinfo.com/ci/engine/match/index.html"},
            {"label": "news", "url": "https://www.espncricinfo.com/cricket-news"},
        ],
    },
    {
        "name": "sportsdunia",
        "pages": [
            {"label": "live-score", "url": "https://www.sportsdunia.com/cricket/live-score"},
            {"label": "series", "url": "https://www.sportsdunia.com/cricket/series"},
        ],
    },
]

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "is",
    "of",
    "on",
    "or",
    "the",
    "to",
    "vs",
    "v",
    "today",
    "latest",
    "more",
    "news",
    "home",
    "menu",
    "with",
    "watch",
    "cricket",
}

CRICKET_TOKENS = {
    "live",
    "score",
    "scores",
    "scorecard",
    "cricket",
    "match",
    "matches",
    "updates",
    "commentary",
    "fixture",
    "fixtures",
    "schedule",
    "squads",
    "squad",
    "playing",
    "xi",
    "toss",
    "result",
    "results",
    "preview",
    "prediction",
    "odds",
    "series",
    "table",
    "standings",
    "points",
    "venue",
    "pitch",
    "weather",
}

INTENT_TOKENS = {
    "live",
    "score",
    "scores",
    "scorecard",
    "updates",
    "commentary",
    "fixture",
    "fixtures",
    "schedule",
    "playing",
    "xi",
    "toss",
    "result",
    "results",
    "preview",
    "prediction",
    "odds",
    "table",
    "standings",
    "venue",
    "pitch",
    "weather",
}

DISALLOWED_TOKENS = {
    "app",
    "com",
    "cookie",
    "cookies",
    "download",
    "login",
    "photos",
    "privacy",
    "server",
    "sign",
    "signup",
    "terms",
    "video",
    "videos",
    "www",
    "javascript",
    "enable",
    "browser",
}

INTENT_PRIORITY = (
    ("playing_xi", {"playing", "xi", "11"}),
    ("scorecard", {"scorecard"}),
    ("commentary", {"commentary", "over", "overs"}),
    ("live_score", {"live", "score", "scores", "updates"}),
    ("prediction", {"prediction", "odds"}),
    ("toss", {"toss"}),
    ("schedule", {"schedule", "fixtures", "fixture"}),
    ("result", {"result", "results"}),
    ("series", {"series", "table", "standings", "points"}),
    ("conditions", {"pitch", "weather", "venue"}),
    ("squads", {"squad", "squads"}),
)
MATCH_PATH_HINTS = (
    "live-cricket-score",
    "cricket-live-score",
    "live-scores",
    "scorecard",
    "full-scorecard",
    "full-commentary",
    "commentary",
    "match-updates",
    "/series/",
)

TEAM_ALIASES = {
    "ind",
    "india",
    "eng",
    "england",
    "aus",
    "australia",
    "pak",
    "pakistan",
    "sl",
    "sri",
    "lanka",
    "sa",
    "south",
    "africa",
    "wi",
    "west",
    "indies",
    "ban",
    "bangladesh",
    "nz",
    "zealand",
    "afg",
    "afghanistan",
    "ire",
    "ireland",
    "uae",
    "nep",
    "nepal",
}

TEXT_SPLIT_RE = re.compile(r"[^a-z0-9]+")
MULTISPACE_RE = re.compile(r"\s+")


@dataclass
class PhraseSignal:
    competitor: str
    source: str
    phrase: str
    weight: int
    page_url: str
    page_label: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Discover likely competitor keyword targets from public pages."
    )
    parser.add_argument(
        "--competitors-file",
        type=Path,
        help="Optional JSON file with [{\"name\": ..., \"url\": ...}] entries.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("artifacts") / "competitor-keyword-discovery",
        help="Directory for JSON and CSV outputs.",
    )
    parser.add_argument(
        "--google-suggest",
        action="store_true",
        help="Expand candidate phrases using Google autosuggest.",
    )
    parser.add_argument(
        "--max-suggest-seeds",
        type=int,
        default=15,
        help="Maximum seed phrases per competitor to send to autosuggest.",
    )
    parser.add_argument(
        "--max-keywords",
        type=int,
        default=200,
        help="Maximum ranked phrases to keep per competitor.",
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=45000,
        help="Playwright navigation timeout in milliseconds.",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run Chromium in headed mode for debugging.",
    )
    return parser.parse_args()


def load_competitors(competitors_file: Path | None) -> list[dict[str, object]]:
    if competitors_file is None:
        return DEFAULT_COMPETITORS

    data = json.loads(competitors_file.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("Competitors file must be a non-empty JSON array.")

    competitors: list[dict[str, object]] = []
    for entry in data:
        if not isinstance(entry, dict) or "name" not in entry:
            raise ValueError("Each competitor entry must contain name.")
        pages = entry.get("pages")
        if pages is None and entry.get("url"):
            pages = [{"label": "default", "url": entry["url"]}]
        if not isinstance(pages, list) or not pages:
            raise ValueError("Each competitor entry must contain pages or url.")
        cleaned_pages = []
        for page in pages:
            if not isinstance(page, dict) or "url" not in page:
                raise ValueError("Each page entry must contain url.")
            cleaned_pages.append(
                {
                    "label": str(page.get("label") or "page"),
                    "url": str(page["url"]),
                }
            )
        competitors.append({"name": str(entry["name"]), "pages": cleaned_pages})
    return competitors


def fetch_page_snapshot(url: str, timeout_ms: int, headed: bool) -> dict[str, object]:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not headed)
        page = browser.new_page()
        page.set_default_timeout(timeout_ms)
        try:
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            snapshot = page.evaluate(
                """() => {
                    const pickTexts = (selector, limit = 20) =>
                      Array.from(document.querySelectorAll(selector))
                        .map((node) => (node.textContent || "").trim())
                        .filter(Boolean)
                        .slice(0, limit);

                    const anchors = Array.from(document.querySelectorAll("a[href]"))
                      .map((node) => ({
                        text: (node.textContent || "").trim(),
                        href: node.href || ""
                      }))
                      .filter((item) => item.text || item.href)
                      .slice(0, 250);

                    const metaDescription = document.querySelector('meta[name="description"]')?.content || "";
                    return {
                      title: document.title || "",
                      metaDescription,
                      h1: pickTexts("h1", 10),
                      h2: pickTexts("h2", 20),
                      nav: pickTexts("nav a, header a", 40),
                      anchors,
                      bodyText: (document.body?.innerText || "").slice(0, 20000)
                    };
                }"""
            )
            return snapshot
        finally:
            browser.close()


def same_host(url_a: str, url_b: str) -> bool:
    return urlparse(url_a).netloc.lower() == urlparse(url_b).netloc.lower()


def looks_like_match_url(url: str) -> bool:
    lowered = url.lower()
    if any(hint in lowered for hint in MATCH_PATH_HINTS):
        if any(word in lowered for word in ("live", "score", "scorecard", "commentary", "updates")):
            return True
    return False


def discover_match_pages(
    base_url: str, snapshot: dict[str, object], max_pages: int = 2
) -> list[dict[str, str]]:
    seen: set[str] = set()
    pages: list[dict[str, str]] = []
    anchors = snapshot.get("anchors") or []
    for anchor in anchors:
        if not isinstance(anchor, dict):
            continue
        href = str(anchor.get("href") or "").strip()
        if not href or href in seen:
            continue
        if not same_host(base_url, href):
            continue
        if not looks_like_match_url(href):
            continue
        seen.add(href)
        label = "match-page"
        lowered = href.lower()
        if "scorecard" in lowered:
            label = "match-scorecard"
        elif "commentary" in lowered:
            label = "match-commentary"
        elif "live" in lowered or "updates" in lowered:
            label = "match-live"
        pages.append({"label": label, "url": href})
        if len(pages) >= max_pages:
            break
    return pages


def normalize_phrase(text: str) -> str:
    lowered = text.lower().replace("&", " and ")
    lowered = MULTISPACE_RE.sub(" ", lowered)
    tokens = [token for token in TEXT_SPLIT_RE.split(lowered) if token]
    return " ".join(tokens).strip()


def phrase_tokens(phrase: str) -> list[str]:
    return [token for token in phrase.split() if token]


def looks_keywordish(phrase: str) -> bool:
    tokens = phrase_tokens(phrase)
    if len(tokens) < 2 or len(tokens) > 8:
        return False
    if all(token in STOP_WORDS for token in tokens):
        return False
    if any(token in DISALLOWED_TOKENS for token in tokens):
        return False
    token_set = set(tokens)
    has_cricket_signal = bool(token_set & CRICKET_TOKENS)
    has_team_signal = len(token_set & TEAM_ALIASES) >= 1
    has_intent_signal = bool(token_set & INTENT_TOKENS)
    if not has_intent_signal:
        return False
    if not has_cricket_signal and not has_team_signal:
        return False
    if sum(len(token) for token in tokens) < 8:
        return False
    return True


def extract_candidate_phrases(raw_text: str, max_n: int = 6) -> list[str]:
    normalized = normalize_phrase(raw_text)
    tokens = phrase_tokens(normalized)
    cleaned = [token for token in tokens if token not in STOP_WORDS]
    phrases: list[str] = []
    for n_size in range(2, max_n + 1):
        for idx in range(0, max(0, len(cleaned) - n_size + 1)):
            phrase = " ".join(cleaned[idx : idx + n_size])
            if looks_keywordish(phrase):
                phrases.append(phrase)
    return phrases


def extract_slug_phrases(url: str) -> list[str]:
    parsed = urlparse(url)
    slug_bits = [
        normalize_phrase(bit)
        for bit in parsed.path.split("/")
        if bit and len(bit) > 2 and not bit.isdigit()
    ]
    return [bit for bit in slug_bits if looks_keywordish(bit)]


def build_signals(
    competitor_name: str, page_label: str, page_url: str, snapshot: dict[str, object]
) -> list[PhraseSignal]:
    signals: list[PhraseSignal] = []

    def add_many(source: str, texts: Iterable[str], weight: int) -> None:
        for text in texts:
            for phrase in extract_candidate_phrases(text):
                signals.append(
                    PhraseSignal(
                        competitor=competitor_name,
                        source=source,
                        phrase=phrase,
                        weight=weight,
                        page_url=page_url,
                        page_label=page_label,
                    )
                )

    title = str(snapshot.get("title") or "")
    meta_description = str(snapshot.get("metaDescription") or "")
    h1_items = [str(item) for item in snapshot.get("h1") or []]
    h2_items = [str(item) for item in snapshot.get("h2") or []]
    nav_items = [str(item) for item in snapshot.get("nav") or []]
    body_text = str(snapshot.get("bodyText") or "")
    anchors = snapshot.get("anchors") or []

    add_many("title", [title], 6)
    add_many("meta_description", [meta_description], 4)
    add_many("h1", h1_items, 5)
    add_many("h2", h2_items, 4)
    add_many("nav", nav_items, 2)
    add_many("body", [body_text], 1)
    add_many("page_url", extract_slug_phrases(page_url), 5)

    for anchor in anchors:
        if not isinstance(anchor, dict):
            continue
        href = str(anchor.get("href") or "")
        text = str(anchor.get("text") or "")
        if href:
            for phrase in extract_slug_phrases(href):
                signals.append(
                    PhraseSignal(
                        competitor=competitor_name,
                        source="anchor_href",
                        phrase=phrase,
                        weight=3,
                        page_url=page_url,
                        page_label=page_label,
                    )
                )
        if text:
            for phrase in extract_candidate_phrases(text):
                signals.append(
                    PhraseSignal(
                        competitor=competitor_name,
                        source="anchor_text",
                        phrase=phrase,
                        weight=3,
                        page_url=page_url,
                        page_label=page_label,
                    )
                )

    return signals


def classify_intent(phrase: str) -> str:
    token_set = set(phrase_tokens(phrase))
    for intent, words in INTENT_PRIORITY:
        if token_set & words:
            return intent
    return "general"


def cluster_phrase(phrase: str) -> str:
    tokens = [token for token in phrase_tokens(phrase) if token not in {"today", "latest"}]
    if "vs" not in tokens and "v" not in tokens and len(set(tokens) & TEAM_ALIASES) >= 2:
        team_tokens = [token for token in tokens if token in TEAM_ALIASES]
        other_tokens = [token for token in tokens if token not in TEAM_ALIASES]
        if len(team_tokens) >= 2:
            tokens = team_tokens[:2] + ["vs"] + other_tokens
    deduped = []
    for token in tokens:
        if not deduped or deduped[-1] != token:
            deduped.append(token)
    return " ".join(deduped[:8]).strip()


def fetch_google_suggestions(seed_phrase: str) -> list[str]:
    response = requests.get(
        "https://suggestqueries.google.com/complete/search",
        params={"client": "firefox", "q": seed_phrase},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    suggestions = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
    return [normalize_phrase(item) for item in suggestions if isinstance(item, str)]


def score_phrases(signals: list[PhraseSignal], max_keywords: int) -> list[dict[str, object]]:
    weights = Counter()
    sources: dict[str, set[str]] = {}
    page_labels: dict[str, set[str]] = {}
    sample_phrases: dict[str, Counter[str]] = defaultdict(Counter)
    raw_phrase_counts = Counter()
    for signal in signals:
        cluster = cluster_phrase(signal.phrase)
        weights[cluster] += signal.weight
        sources.setdefault(cluster, set()).add(signal.source)
        page_labels.setdefault(cluster, set()).add(signal.page_label)
        sample_phrases[cluster][signal.phrase] += signal.weight
        raw_phrase_counts[signal.phrase] += signal.weight

    ranked: list[dict[str, object]] = []
    for cluster, score in weights.most_common():
        top_phrase = sample_phrases[cluster].most_common(1)[0][0]
        ranked.append(
            {
                "phrase": top_phrase,
                "cluster": cluster,
                "score": score,
                "intent": classify_intent(cluster),
                "sourceCount": len(sources.get(cluster, set())),
                "sources": sorted(sources.get(cluster, set())),
                "pageLabels": sorted(page_labels.get(cluster, set())),
                "variants": [item[0] for item in sample_phrases[cluster].most_common(5)],
            }
        )
        if len(ranked) >= max_keywords:
            break
    return ranked


def summarize_intents(keywords: list[dict[str, object]]) -> list[dict[str, object]]:
    buckets: dict[str, dict[str, object]] = {}
    for keyword in keywords:
        intent = str(keyword.get("intent") or "general")
        bucket = buckets.setdefault(
            intent,
            {"intent": intent, "score": 0, "phrases": [], "keywordCount": 0},
        )
        bucket["score"] += int(keyword.get("score") or 0)
        bucket["keywordCount"] += 1
        if len(bucket["phrases"]) < 8:
            bucket["phrases"].append(keyword.get("phrase"))
    return sorted(buckets.values(), key=lambda row: (-int(row["score"]), row["intent"]))


def summarize_pages(signals: list[PhraseSignal]) -> list[dict[str, object]]:
    page_map: dict[str, dict[str, object]] = {}
    for signal in signals:
        entry = page_map.setdefault(
            signal.page_label,
            {
                "pageLabel": signal.page_label,
                "url": signal.page_url,
                "signalScore": 0,
                "topPhrases": Counter(),
            },
        )
        entry["signalScore"] += signal.weight
        entry["topPhrases"][signal.phrase] += signal.weight

    rows = []
    for row in page_map.values():
        rows.append(
            {
                "pageLabel": row["pageLabel"],
                "url": row["url"],
                "signalScore": row["signalScore"],
                "topPhrases": [item[0] for item in row["topPhrases"].most_common(8)],
            }
        )
    return sorted(rows, key=lambda item: (-int(item["signalScore"]), item["pageLabel"]))


def write_outputs(output_dir: Path, results: list[dict[str, object]]) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "competitor-keywords.json"
    csv_path = output_dir / "competitor-keywords.csv"

    json_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "competitor",
                "intent",
                "phrase",
                "cluster",
                "score",
                "sourceCount",
                "pageLabels",
                "sources",
                "variants",
            ],
        )
        writer.writeheader()
        for competitor_result in results:
            competitor_name = str(competitor_result["competitor"])
            for keyword in competitor_result["keywords"]:
                writer.writerow(
                    {
                        "competitor": competitor_name,
                        "intent": keyword["intent"],
                        "phrase": keyword["phrase"],
                        "cluster": keyword["cluster"],
                        "score": keyword["score"],
                        "sourceCount": keyword["sourceCount"],
                        "pageLabels": ", ".join(keyword["pageLabels"]),
                        "sources": ", ".join(keyword["sources"]),
                        "variants": " | ".join(keyword["variants"]),
                    }
                )

    return json_path, csv_path


def main() -> int:
    args = parse_args()
    competitors = load_competitors(args.competitors_file)
    results: list[dict[str, object]] = []

    for competitor in competitors:
        name = str(competitor["name"])
        pages = list(competitor["pages"])
        signals: list[PhraseSignal] = []
        page_results: list[dict[str, object]] = []

        expanded_pages = list(pages)
        discovered_from_hubs: list[dict[str, str]] = []

        for page in pages:
            page_label = str(page["label"])
            url = str(page["url"])
            print(f"[info] scraping {name}/{page_label}: {url}", file=sys.stderr)
            try:
                snapshot = fetch_page_snapshot(url, timeout_ms=args.timeout_ms, headed=args.headed)
                page_signals = build_signals(name, page_label, url, snapshot)
                signals.extend(page_signals)
                if page_label in {"home", "live-score", "live-scores", "fixtures", "schedule"}:
                    discovered_from_hubs.extend(discover_match_pages(url, snapshot, max_pages=2))
                page_results.append(
                    {
                        "pageLabel": page_label,
                        "url": url,
                        "title": snapshot.get("title") or "",
                        "metaDescription": snapshot.get("metaDescription") or "",
                        "h1": snapshot.get("h1") or [],
                    }
                )
            except Exception as exc:
                print(f"[warn] failed {name}/{page_label}: {exc}", file=sys.stderr)
                page_results.append(
                    {
                        "pageLabel": page_label,
                        "url": url,
                        "error": str(exc),
                    }
                )

        unique_existing = {str(page["url"]) for page in expanded_pages}
        for discovered_page in discovered_from_hubs:
            if discovered_page["url"] not in unique_existing:
                expanded_pages.append(discovered_page)
                unique_existing.add(discovered_page["url"])

        if len(expanded_pages) > len(pages):
            for page in expanded_pages[len(pages) :]:
                page_label = str(page["label"])
                url = str(page["url"])
                print(f"[info] scraping {name}/{page_label}: {url}", file=sys.stderr)
                try:
                    snapshot = fetch_page_snapshot(url, timeout_ms=args.timeout_ms, headed=args.headed)
                    page_signals = build_signals(name, page_label, url, snapshot)
                    signals.extend(page_signals)
                    page_results.append(
                        {
                            "pageLabel": page_label,
                            "url": url,
                            "title": snapshot.get("title") or "",
                            "metaDescription": snapshot.get("metaDescription") or "",
                            "h1": snapshot.get("h1") or [],
                        }
                    )
                except Exception as exc:
                    print(f"[warn] failed {name}/{page_label}: {exc}", file=sys.stderr)
                    page_results.append(
                        {
                            "pageLabel": page_label,
                            "url": url,
                            "error": str(exc),
                        }
                    )

        if args.google_suggest:
            ranked_seed_phrases = [
                row["phrase"] for row in score_phrases(signals, args.max_suggest_seeds)
            ]
            for seed_phrase in ranked_seed_phrases:
                try:
                    for suggestion in fetch_google_suggestions(seed_phrase):
                        if looks_keywordish(suggestion):
                            signals.append(
                                PhraseSignal(
                                    competitor=name,
                                    source="google_suggest",
                                    phrase=suggestion,
                                    weight=5,
                                    page_url=url,
                                    page_label="google_suggest",
                                )
                            )
                except Exception as exc:  # pragma: no cover - best-effort enrichment
                    print(
                        f"[warn] autosuggest failed for {name} seed '{seed_phrase}': {exc}",
                        file=sys.stderr,
                    )

        keywords = score_phrases(signals, args.max_keywords)
        results.append(
            {
                "competitor": name,
                "pageCount": len(expanded_pages),
                "pages": page_results,
                "pageSummaries": summarize_pages(signals),
                "intentBreakdown": summarize_intents(keywords),
                "keywordCount": len(keywords),
                "keywords": keywords,
            }
        )

    json_path, csv_path = write_outputs(args.output_dir, results)
    print(f"[done] wrote {json_path}", file=sys.stderr)
    print(f"[done] wrote {csv_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
