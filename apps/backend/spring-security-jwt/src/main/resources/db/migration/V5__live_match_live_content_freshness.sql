-- Keep live score/state freshness separate from catalogue identity freshness.
-- The fingerprint is updated for meaningful merged snapshots; lastmod is
-- advanced by the service only after the configured throttle window.
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS seo_live_content_fingerprint VARCHAR(64);
