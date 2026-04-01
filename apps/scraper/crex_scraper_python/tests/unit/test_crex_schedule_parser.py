from src.parsers.crex_schedule_parser import (
    _match_page_candidates,
    build_team_name_lookup,
    expand_team_names,
    extract_external_match_key,
    extract_team_names,
)


def test_extract_team_names_prefers_json_ld_event_name():
    team_names = extract_team_names(
        "Ireland vs Bangladesh, 1st ODI, Bangladesh tour of Ireland, 2025",
        "IRE vs BAN 2025",
    )

    assert team_names == {
        "team1Name": "Ireland",
        "team2Name": "Bangladesh",
    }


def test_extract_team_names_handles_match_label_after_second_team():
    team_names = extract_team_names(
        None,
        "England U19 vs West Indies U19 6th ODI",
    )

    assert team_names == {
        "team1Name": "England U19",
        "team2Name": "West Indies U19",
    }


def test_expand_team_names_uses_local_storage_full_names_for_short_labels():
    lookup = build_team_name_lookup(
        {
            "t_16C_short": "IRE",
            "t_16C_name": "Ireland",
            "t_99A_short": "BAN",
            "t_99A_name": "Bangladesh",
        }
    )

    team_names = expand_team_names(
        extract_team_names("IRE vs BAN 2025"),
        lookup,
    )

    assert team_names == {
        "team1Name": "Ireland",
        "team2Name": "Bangladesh",
    }


def test_extract_external_match_key_supports_new_crex_live_score_urls():
    url = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"
    assert extract_external_match_key(url) == "abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"


def test_match_page_candidates_support_new_crex_live_score_variants():
    url = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"
    assert _match_page_candidates(url) == [
        "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/match-details",
        "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/match-scorecard",
        url,
    ]
