"""DOM match page extraction utilities.

Parses HTML from an individual match page and extracts required fields.
Designed to be independent of Playwright so tests can validate coverage
without launching a browser.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any
from bs4 import BeautifulSoup

# Canonical selector list preserving synchronous scraper coverage
REQUIRED_SELECTORS: List[str] = [
    ".odds-view-btn .view:nth-child(2)",
    ".result-box span",
    ".team-run-rate .data",
    ".final-result.m-none",
    ".team-content",
    ".team-content .team-name",
    ".team-content .runs span:nth-child(1)",
    ".team-content .runs span:nth-child(2)",
    "div#slideOver .overs-slide",
    "div#slideOver .overs-slide span",
    "div#slideOver .overs-slide .over-ball",
    "div#slideOver .overs-slide .total",
    ".fav-odd .d-flex",
    ".fav-odd .d-flex .team-name span",
    ".fav-odd .d-flex .odd div",
    "span.ds-text-title-xs.ds-font-bold.ds-capitalize",
    "div.ds-w-full.ds-bg-fill-content-prime.ds-overflow-hidden.ds-rounded-xl.ds-border.ds-border-line.ds-mb-4",
    "a[href*='cricket-grounds']",
    "div.ds-px-4.ds-pb-3 p",
    "div.ds-px-4.ds-pb-3 span",
    "div.ds-text-tight-s.ds-font-bold.ds-ml-1",
]


def get_missing_selectors(html: str) -> List[str]:
    """Return selectors from REQUIRED_SELECTORS not found in HTML.

    For nth-child selectors we apply a tolerant presence check by evaluating
    parent selector existence when direct match fails.
    """
    soup = BeautifulSoup(html, "html.parser")
    missing = []
    for sel in REQUIRED_SELECTORS:
        # Basic lookup first
        found = soup.select(sel)
        if found:
            continue
        # Tolerant fallback for nth-child: strip :nth-child segment
        if ":nth-child" in sel:
            base = sel.split(":nth-child")[0].rstrip()
            if soup.select(base):
                continue
        missing.append(sel)
    return missing


def extract_match_dom_fields(html: str) -> Dict[str, Any]:
    """Extract structured match data from HTML.

    Returns keys: result, run_rate, teams (list), overs (list), odds (list), venue.
    Missing sections produce empty lists/None but selectors still validated via tests.
    """
    soup = BeautifulSoup(html, "html.parser")

    result_spans = [s.get_text(strip=True) for s in soup.select(".result-box span")]
    final_result = next((s.get_text(strip=True) for s in soup.select(".final-result.m-none")), None)
    run_rate = next((s.get_text(strip=True) for s in soup.select(".team-run-rate .data")), None)
    venue = next((a.get_text(strip=True) for a in soup.select("a[href*='cricket-grounds']")), None)

    team_blocks = soup.select(".team-content")
    teams = []
    for block in team_blocks:
        name_el = block.select_one(".team-name")
        runs_el = block.select_one(".runs span:nth-child(1)") or block.select_one(".runs span")
        overs_el = block.select_one(".runs span:nth-child(2)")
        teams.append({
            "name": name_el.get_text(strip=True) if name_el else None,
            "runs": runs_el.get_text(strip=True) if runs_el else None,
            "overs": overs_el.get_text(strip=True) if overs_el else None,
        })

    over_slides = soup.select("div#slideOver .overs-slide")
    overs = []
    for slide in over_slides:
        over_number_el = slide.select_one("span")
        total_el = slide.select_one(".total")
        ball_els = slide.select(".over-ball")
        overs.append({
            "over": over_number_el.get_text(strip=True) if over_number_el else None,
            "balls": [b.get_text(strip=True) for b in ball_els],
            "total": total_el.get_text(strip=True) if total_el else None,
        })

    fav_blocks = soup.select(".fav-odd .d-flex")
    odds = []
    for fav in fav_blocks:
        team_name_el = fav.select_one(".team-name span")
        odd_values = [d.get_text(strip=True) for d in fav.select(".odd div")]
        odds.append({
            "team": team_name_el.get_text(strip=True) if team_name_el else None,
            "values": odd_values,
        })

    return {
        "result": final_result or result_spans,
        "run_rate": run_rate,
        "teams": teams,
        "overs": overs,
        "odds": odds,
        "venue": venue,
    }


__all__ = [
    "REQUIRED_SELECTORS",
    "get_missing_selectors",
    "extract_match_dom_fields",
]
