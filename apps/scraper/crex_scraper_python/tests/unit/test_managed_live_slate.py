from src.managed_live_slate import ManagedLiveSlateStore, reconcile_managed_live_slate


def _url(slug, key):
    return f"https://crex.com/cricket-live-score/{slug}-match-updates-{key}"


def test_existing_managed_matches_keep_their_slots_when_discovery_reorders():
    old_a = _url("nam-vs-zim-3rd-match-namibia-t20i", "13IO")
    old_b = _url("bat-vs-moh-3rd-match-sher-e-punjab-t20", "13O2")
    old_c = _url("cg-vs-tt-24th-match-kerala-cricket-league-t20", "13GI")
    new_match = _url("ban-w-vs-ina-w-4th-match-womens-asia-cup", "13HY")

    selected = reconcile_managed_live_slate(
        [new_match, old_c, old_a, old_b],
        [old_a, old_b, old_c],
        max_matches=3,
    )

    assert selected == [old_a, old_b, old_c]


def test_completed_owner_releases_one_slot_for_a_new_match():
    old_a = _url("nam-vs-zim-3rd-match-namibia-t20i", "13IO")
    old_b = _url("bat-vs-moh-3rd-match-sher-e-punjab-t20", "13O2")
    old_c = _url("cg-vs-tt-24th-match-kerala-cricket-league-t20", "13GI")
    new_match = _url("ban-w-vs-ina-w-4th-match-womens-asia-cup", "13HY")

    selected = reconcile_managed_live_slate(
        [new_match, old_a, old_c],
        [old_a, old_b, old_c],
        max_matches=3,
        terminal_urls=[old_b],
    )

    assert selected == [old_a, old_c, new_match]


def test_terminal_owner_present_in_provider_feed_is_not_reselected():
    old_a = _url("nam-vs-zim-3rd-match-namibia-t20i", "13IO")
    old_b = _url("bat-vs-moh-3rd-match-sher-e-punjab-t20", "13O2")
    old_c = _url("ban-vs-ina-4th-match-womens-asia-cup", "13HY")
    replacement = _url("cz-vs-ez-1st-semi-final-duleep-trophy-2026", "12X1")

    selected = reconcile_managed_live_slate(
        [old_a, old_b, old_c, replacement],
        [old_a, old_b, old_c],
        max_matches=3,
        terminal_urls=[old_a, old_b, old_c],
    )

    assert selected == [replacement]


def test_slate_store_round_trips_atomically(tmp_path):
    path = tmp_path / "managed_live_slate.json"
    store = ManagedLiveSlateStore(str(path))
    urls = [_url("bat-vs-moh-3rd-match-sher-e-punjab-t20", "13O2")]

    store.save(urls)

    assert store.load() == urls
