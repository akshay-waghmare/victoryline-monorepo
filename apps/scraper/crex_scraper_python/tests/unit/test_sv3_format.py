from src.services.sv3_format import normalize_sv3_format


def test_normalizes_supplied_youth_test_response():
    metadata = normalize_sv3_format({
        "fo": "Youth Test",
        "followOnRuns": 150,
        "numDays": 4,
    })

    assert metadata == {
        "label": "Youth Test",
        "type": "test",
        "variant": "youth",
        "days": 4,
        "follow_on_runs": 150,
    }


def test_unknown_format_preserves_provider_label():
    assert normalize_sv3_format({"fo": "Regional Super Format"}) == {
        "label": "Regional Super Format",
        "type": "unknown",
    }


def test_missing_format_is_omitted():
    assert normalize_sv3_format({"B": "Lunch Break"}) is None
