from importlib.metadata import version


def test_persistent_page_runtime_avoids_playwright_140_frame_close_bug():
    """Persistent pages must not ship the Playwright 1.40.0 close-handler defect."""
    installed = tuple(int(part) for part in version("playwright").split(".")[:3])
    assert installed >= (1, 41, 2)
