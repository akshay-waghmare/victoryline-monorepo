-- The scraper intentionally refreshes a bounded live slate. Rows outside that
-- slate remain canonical catalogue/history records but are not fresh live cards.
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS live_feed_managed BOOLEAN DEFAULT FALSE;
