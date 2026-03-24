"""Helpers for analyzing CREX stats pages and crawler payloads."""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict, Iterable, Iterator, List, Optional, Sequence
from urllib.parse import urljoin
import re

from bs4 import BeautifulSoup, NavigableString, Tag

HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
PROFILE_FIELDS = (
    "Name",
    "Gender",
    "Birth",
    "Birth Place",
    "Height",
    "Nationality",
    "Role",
    "Bats",
    "Bowls",
)
PLAYER_IGNORE_TOKENS = {
    "Continue Reading",
    "Latest Updates",
    "See All Matches",
    "Series wise, team wise & more",
}
KNOWN_RANKING_SECTIONS = {"ODI", "T20", "T20I", "TEST", "TESTS", "FIRST CLASS", "LIST A"}
KNOWN_BATTING_HEADERS = [
    "Format",
    "Mat",
    "Inn",
    "R",
    "100s",
    "50s",
    "HS",
    "SR",
    "Avg",
    "Fours",
    "Sixes",
    "Duck",
    "Rank",
]
KNOWN_BOWLING_HEADERS = [
    "Format",
    "Mat",
    "Inn",
    "W",
    "Econ",
    "Avg",
    "Best",
    "3W",
    "5W",
    "SR",
    "Maiden",
    "Rank",
]


def clean_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def slugify_label(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", clean_text(value).lower()).strip("_")


def dedupe_keep_order(values: Iterable[str]) -> List[str]:
    seen = set()
    items: List[str] = []
    for value in values:
        normalized = clean_text(value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        items.append(normalized)
    return items


def heading_level(tag: Tag) -> int:
    return int(tag.name[1]) if tag.name in HEADING_TAGS else 7


def is_descendant_of(element: Any, ancestor: Tag) -> bool:
    parent = getattr(element, "parent", None)
    while parent is not None:
        if parent is ancestor:
            return True
        parent = getattr(parent, "parent", None)
    return False


def find_heading(soup: BeautifulSoup, pattern: str) -> Optional[Tag]:
    regex = re.compile(pattern, re.IGNORECASE)
    for tag in soup.find_all(HEADING_TAGS):
        if regex.search(clean_text(tag.get_text(" ", strip=True))):
            return tag
    return None


def iter_section_elements(start_heading: Tag) -> Iterator[Any]:
    root_level = heading_level(start_heading)
    for element in start_heading.next_elements:
        if element is start_heading:
            continue
        if is_descendant_of(element, start_heading):
            continue
        if isinstance(element, Tag) and element.name in HEADING_TAGS and heading_level(element) <= root_level:
            break
        yield element


def section_tokens(start_heading: Optional[Tag]) -> List[str]:
    if start_heading is None:
        return []
    tokens: List[str] = []
    for element in iter_section_elements(start_heading):
        if not isinstance(element, NavigableString):
            continue
        parent_name = getattr(element.parent, "name", "")
        if parent_name in {"script", "style"}:
            continue
        text = clean_text(str(element))
        if text and (not tokens or tokens[-1] != text):
            tokens.append(text)
    return tokens


def section_links(start_heading: Optional[Tag], base_url: Optional[str] = None) -> List[Dict[str, str]]:
    if start_heading is None:
        return []
    links: List[Dict[str, str]] = []
    seen = set()
    for element in iter_section_elements(start_heading):
        if not isinstance(element, Tag) or element.name != "a":
            continue
        text = clean_text(element.get_text(" ", strip=True))
        href = clean_text(element.get("href"))
        if not text or not href:
            continue
        resolved = urljoin(base_url or "", href) if base_url else href
        key = (text, resolved)
        if key in seen:
            continue
        seen.add(key)
        links.append({"text": text, "href": resolved})
    return links


def table_to_summary(table: Tag) -> Optional[Dict[str, Any]]:
    rows = table.find_all("tr")
    if not rows:
        return None

    headers = [
        clean_text(cell.get_text(" ", strip=True))
        for cell in rows[0].find_all(["th", "td"])
        if clean_text(cell.get_text(" ", strip=True))
    ]
    if not headers:
        return None

    data_rows: List[Dict[str, str]] = []
    for row in rows[1:]:
        cells = [
            clean_text(cell.get_text(" ", strip=True))
            for cell in row.find_all(["th", "td"])
            if clean_text(cell.get_text(" ", strip=True))
        ]
        if not cells:
            continue
        if len(cells) < len(headers):
            cells.extend([""] * (len(headers) - len(cells)))
        if len(cells) > len(headers):
            cells = cells[: len(headers)]
        data_rows.append(dict(zip(headers, cells)))

    return {"headers": headers, "rows": data_rows}


def _is_section_label(element: Tag, root_level: int) -> Optional[str]:
    """Detect section label elements: sub-headings or short <p>/<div> with label-like classes."""
    if element.name in HEADING_TAGS and heading_level(element) > root_level:
        return clean_text(element.get_text(" ", strip=True)) or None
    # CREX uses <p class="formTitle careerTitle">Batting</p> as section labels
    if element.name in ("p", "div", "span"):
        classes = " ".join(element.get("class") or []).lower()
        text = clean_text(element.get_text(" ", strip=True))
        if text and len(text) <= 30 and ("title" in classes or "label" in classes or "header" in classes):
            return text
    return None


def labeled_tables_in_section(start_heading: Optional[Tag]) -> List[Dict[str, Any]]:
    if start_heading is None:
        return []
    tables: List[Dict[str, Any]] = []
    current_label: Optional[str] = None
    seen = set()
    root_level = heading_level(start_heading)

    for element in iter_section_elements(start_heading):
        if not isinstance(element, Tag):
            continue
        label = _is_section_label(element, root_level)
        if label is not None:
            current_label = label
            continue
        if element.name != "table" or id(element) in seen:
            continue
        summary = table_to_summary(element)
        if summary is None:
            continue
        summary["label"] = current_label or f"table_{len(tables) + 1}"
        tables.append(summary)
        seen.add(id(element))
    return tables


def labeled_tables_in_document(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    tables: List[Dict[str, Any]] = []
    current_label: Optional[str] = None

    for element in soup.find_all(list(HEADING_TAGS) + ["table"]):
        if element.name in HEADING_TAGS:
            current_label = clean_text(element.get_text(" ", strip=True))
            continue
        summary = table_to_summary(element)
        if summary is None:
            continue
        summary["label"] = current_label or f"table_{len(tables) + 1}"
        tables.append(summary)
    return tables


def parse_profile_tokens(tokens: Sequence[str]) -> Dict[str, Any]:
    profile: Dict[str, Any] = {}
    biography: List[str] = []
    index = 0

    while index < len(tokens):
        token = tokens[index]
        if token in PROFILE_FIELDS and index + 1 < len(tokens):
            profile[slugify_label(token)] = tokens[index + 1]
            index += 2
            continue
        if token not in PLAYER_IGNORE_TOKENS:
            biography.append(token)
        index += 1

    if biography:
        profile["bio"] = " ".join(biography)
    return profile


def parse_recent_form(tokens: Sequence[str], links: Sequence[Dict[str, str]]) -> Dict[str, List[Dict[str, Any]]]:
    recent_form = {"batting": [], "bowling": []}
    current_section: Optional[str] = None
    pending_match: Optional[str] = None
    link_iter = iter(link.get("href") for link in links if link.get("href"))

    for token in tokens:
        lowered = token.lower()
        if lowered in {"batting", "bowling"}:
            current_section = lowered
            pending_match = None
            continue
        if token in PLAYER_IGNORE_TOKENS or current_section is None:
            continue
        if pending_match is None:
            pending_match = token
            continue
        recent_form[current_section].append(
            {
                "match": pending_match,
                "performance": token,
                "scorecard_url": next(link_iter, None),
            }
        )
        pending_match = None

    return recent_form


def parse_career_from_tokens(tokens: Sequence[str]) -> Dict[str, Any]:
    career: Dict[str, Any] = {}
    section_specs = {
        "batting": KNOWN_BATTING_HEADERS,
        "bowling": KNOWN_BOWLING_HEADERS,
    }

    for label, headers in section_specs.items():
        marker = label.capitalize()
        try:
            start = list(tokens).index(marker)
        except ValueError:
            continue

        end = len(tokens)
        for other_marker in section_specs:
            capitalized = other_marker.capitalize()
            if capitalized == marker:
                continue
            try:
                end = min(end, list(tokens).index(capitalized, start + 1))
            except ValueError:
                continue

        block = list(tokens)[start + 1 : end]
        if block[: len(headers)] == headers:
            block = block[len(headers) :]

        rows: List[Dict[str, str]] = []
        width = len(headers)
        for index in range(0, len(block), width):
            chunk = block[index : index + width]
            if len(chunk) < width:
                break
            rows.append(dict(zip(headers, chunk)))

        career[label] = {"headers": headers, "rows": rows}

    return career


def parse_teams_played_for(tokens: Sequence[str], links: Sequence[Dict[str, str]]) -> List[str]:
    linked_names = [link["text"] for link in links if link.get("text")]
    if linked_names:
        return dedupe_keep_order(linked_names)
    return dedupe_keep_order(token for token in tokens if token not in PLAYER_IGNORE_TOKENS)


def analyze_player_page_html(html: str, source_url: Optional[str] = None) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    about_heading = find_heading(soup, r"^about\b")
    recent_heading = find_heading(soup, r"recent form")
    career_heading = find_heading(soup, r"career stats")
    teams_heading = find_heading(soup, r"teams played for")

    player_name = None
    if about_heading is not None:
        heading_text = clean_text(about_heading.get_text(" ", strip=True))
        match = re.match(r"about\s+(.*)", heading_text, re.IGNORECASE)
        if match:
            player_name = match.group(1).strip()

    career_tables = labeled_tables_in_section(career_heading)
    career_stats = (
        {
            slugify_label(table["label"]): {
                "headers": table["headers"],
                "rows": table["rows"],
            }
            for table in career_tables
        }
        if career_tables
        else parse_career_from_tokens(section_tokens(career_heading))
    )

    return {
        "kind": "player_page",
        "page_title": clean_text(soup.title.string if soup.title else ""),
        "player_name": player_name,
        "profile": parse_profile_tokens(section_tokens(about_heading)),
        "recent_form": parse_recent_form(
            section_tokens(recent_heading),
            section_links(recent_heading, source_url),
        ),
        "career_stats": career_stats,
        "teams_played_for": parse_teams_played_for(
            section_tokens(teams_heading),
            section_links(teams_heading, source_url),
        ),
    }


def looks_like_ranking_section(value: str) -> bool:
    normalized = clean_text(value).upper()
    if normalized in KNOWN_RANKING_SECTIONS:
        return True
    if re.match(r"^GROUP\s+[A-Z0-9]+$", normalized):
        return True
    if re.match(r"^SUPER\s+\d+$", normalized):
        return True
    return False


def parse_rankings_from_tokens(tokens: Sequence[str]) -> List[Dict[str, Any]]:
    sections: List[Dict[str, Any]] = []
    index = 0

    while index < len(tokens):
        token = tokens[index]
        if not looks_like_ranking_section(token):
            index += 1
            continue

        header_index = None
        for candidate in range(index + 1, min(index + 15, len(tokens) - 2)):
            if list(tokens[candidate : candidate + 3]) == ["Rank", "Team", "Rating"]:
                header_index = candidate
                break
        if header_index is None:
            index += 1
            continue

        pre_header = list(tokens[index + 1 : header_index])
        leader = None
        if pre_header:
            rating_position = next(
                (position for position, value in enumerate(pre_header) if value.upper() == "RATING"),
                None,
            )
            if rating_position is not None:
                team_tokens = dedupe_keep_order(pre_header[:rating_position])
                leader = {
                    "team": " ".join(team_tokens) if team_tokens else None,
                    "rating": pre_header[rating_position + 1] if rating_position + 1 < len(pre_header) else None,
                }

        rows: List[Dict[str, str]] = []
        index = header_index + 3
        while index + 2 < len(tokens):
            if looks_like_ranking_section(tokens[index]):
                break
            if tokens[index].startswith("View Full List"):
                index += 1
                break
            if list(tokens[index : index + 3]) == ["Rank", "Team", "Rating"]:
                break

            row = {
                "Rank": tokens[index],
                "Team": tokens[index + 1],
                "Rating": tokens[index + 2],
            }
            rows.append(row)
            index += 3

        sections.append(
            {
                "label": token,
                "headers": ["Rank", "Team", "Rating"],
                "leader": leader,
                "rows": rows,
            }
        )

    return sections


def analyze_standings_html(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    heading = find_heading(soup, r"ranking|points table|standings")
    tables = labeled_tables_in_document(soup)
    sections = [
        {
            "label": table["label"],
            "headers": table["headers"],
            "rows": table["rows"],
        }
        for table in tables
    ]
    if not sections:
        sections = parse_rankings_from_tokens([clean_text(text) for text in soup.stripped_strings if clean_text(text)])

    return {
        "kind": "standings_page",
        "page_title": clean_text(soup.title.string if soup.title else ""),
        "page_heading": clean_text(heading.get_text(" ", strip=True)) if heading else "",
        "section_count": len(sections),
        "sections": sections,
    }


def summarize_debug_capture_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    captures = payload.get("captures") or []
    counts = Counter(capture.get("type", "unknown") for capture in captures)
    sv3_captures = [capture for capture in captures if capture.get("type") == "sV3"]
    ball_values = sorted(
        {str(capture.get("B_raw")) for capture in sv3_captures if capture.get("B_raw") is not None}
    )
    top_level_keys = sorted(
        {
            key
            for capture in sv3_captures
            for key in (capture.get("top_level_keys") or [])
            if isinstance(key, str)
        }
    )

    return {
        "kind": "crex_debug_capture",
        "captured_at": payload.get("captured_at"),
        "total_captures": len(captures),
        "capture_types": dict(counts),
        "unique_ball_values": ball_values,
        "recent_over_summaries": [
            capture.get("A_raw")
            for capture in sv3_captures
            if capture.get("A_raw")
        ][-5:],
        "top_level_keys": top_level_keys,
    }


def summarize_normalized_player_stats_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    teams = payload.get("teams") or []
    team_summaries = []
    total_players = 0

    for team in teams:
        squad = team.get("squad") or []
        total_players += len(squad)
        categories = Counter()
        captains: List[str] = []
        wicket_keepers: List[str] = []

        for player in squad:
            if player.get("captain"):
                captains.append(player.get("name"))
            if player.get("wicketKeeper"):
                wicket_keepers.append(player.get("name"))
            for stat in player.get("stats") or []:
                category = stat.get("category")
                if category:
                    categories[str(category)] += 1

        team_summaries.append(
            {
                "name": team.get("name"),
                "squad_count": len(squad),
                "captains": dedupe_keep_order(captains),
                "wicket_keepers": dedupe_keep_order(wicket_keepers),
                "stat_categories": dict(categories),
            }
        )

    return {
        "kind": "normalized_player_stats_payload",
        "match_external_key": payload.get("matchExternalKey"),
        "series_name": ((payload.get("series") or {}).get("name")),
        "team_count": len(teams),
        "player_count": total_players,
        "teams": team_summaries,
    }


def summarize_live_stats_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    batsmen = payload.get("batsman_data") or []
    bowlers = payload.get("bowler_data") or []
    return {
        "kind": "live_stats_payload",
        "batsman_count": len(batsmen),
        "bowler_count": len(bowlers),
        "batsmen": [
            {
                "name": entry.get("name"),
                "score": entry.get("score") or entry.get("runs"),
                "balls": entry.get("ballsFaced") or entry.get("balls_faced"),
            }
            for entry in batsmen
        ],
        "bowlers": [
            {
                "name": entry.get("name"),
                "score": entry.get("score"),
                "balls": entry.get("ballsBowled") or entry.get("balls_bowled"),
                "wickets": entry.get("wicketsTaken") or entry.get("wickets_taken"),
            }
            for entry in bowlers
        ],
    }


def analyze_crawler_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    if "captures" in payload:
        return summarize_debug_capture_payload(payload)
    if "teams" in payload and "matchExternalKey" in payload:
        return summarize_normalized_player_stats_payload(payload)
    if "batsman_data" in payload or "bowler_data" in payload:
        return summarize_live_stats_payload(payload)
    return {
        "kind": "generic_payload",
        "top_level_keys": sorted(payload.keys()),
    }


__all__ = [
    "analyze_crawler_payload",
    "analyze_player_page_html",
    "analyze_standings_html",
    "clean_text",
]
