from src.adapters.crex_adapter import CrexAdapter


def test_map_commentary_entry_maps_four_boundary_payload():
    adapter = CrexAdapter()

    entry = adapter._map_commentary_entry(
        {
            "fv": 8,
            "inning": 1,
            "id": 1773064744391,
            "b": "4",
            "c1": "Rajput to S Ayub",
            "c2": "<b>FOURRRRR!!!</b> Length ball outside off stump and it races away to the fence.",
            "bf": "CZF",
            "delivery": 146,
            "o": "3.6",
            "on": 3,
        },
        {"p_CZF_name": "Daniyal Hussain Rajput"},
    )

    assert entry is not None
    assert entry["type"] == "BOUNDARY"
    assert entry["runs"] == 4
    assert entry["overBall"] == "3.6"
    assert entry["highlights"] == ["BOUNDARY"]
    assert "FOURRRRR" in entry["text"]


def test_map_commentary_entry_maps_six_boundary_payload():
    adapter = CrexAdapter()

    entry = adapter._map_commentary_entry(
        {
            "fv": 4,
            "inning": 1,
            "id": 1773064921590,
            "b": "6",
            "c1": "M Basit to S Ayub",
            "c2": "<b>SIXXXXX!!!</b> Clean strike over long on.",
            "bf": "N7M",
            "delivery": 149,
            "o": "4.3",
            "on": 4,
        },
        {"p_N7M_name": "Mohammad Basit"},
    )

    assert entry is not None
    assert entry["type"] == "BOUNDARY"
    assert entry["runs"] == 6
    assert entry["overBall"] == "4.3"
    assert entry["highlights"] == ["SIX"]
    assert "SIXXXXX" in entry["text"]


def test_merge_commentary_entries_prefers_richer_boundary_text_for_same_ball():
    adapter = CrexAdapter()

    merged_entries = adapter._merge_commentary_entries(
        [
            {
                "id": "ball-8-1",
                "inningsNumber": 2,
                "overNumber": 8,
                "ballInOver": 1,
                "type": "BALL",
                "text": "I Khan to Malik",
                "runs": 4,
                "highlights": [],
            }
        ],
        [
            {
                "id": "live-ball-2002",
                "inningsNumber": 2,
                "overNumber": 8,
                "ballInOver": 1,
                "type": "BOUNDARY",
                "text": "I Khan to Malik, FOUR!! Driven crisply through cover.",
                "runs": 4,
                "highlights": ["BOUNDARY"],
            }
        ],
    )

    assert len(merged_entries) == 1
    assert merged_entries[0]["id"] == "live-ball-2002"
    assert merged_entries[0]["type"] == "BOUNDARY"
    assert "Driven crisply through cover" in merged_entries[0]["text"]