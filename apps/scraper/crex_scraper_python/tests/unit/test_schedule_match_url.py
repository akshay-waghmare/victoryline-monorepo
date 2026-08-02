from src.parsers.crex_schedule_parser import is_canonical_schedule_match_url


def test_rejects_nested_schedule_fragment_without_a_left_hand_team_slug():
    assert not is_canonical_schedule_match_url(
        "https://crex.com/cricket-live-score/vs-bt-7th-match-asian-legends-league-t20-2026"
    )


def test_keeps_canonical_schedule_match_url():
    assert is_canonical_schedule_match_url(
        "https://crex.com/cricket-live-score/as-vs-bt-7th-match-asian-legends-league-t20-2026"
    )
