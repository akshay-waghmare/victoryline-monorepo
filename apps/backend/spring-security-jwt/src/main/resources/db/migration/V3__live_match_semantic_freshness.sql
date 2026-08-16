-- Keep sitemap <lastmod> tied to visible match content rather than scraper polling.
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS seo_content_fingerprint VARCHAR(64);
ALTER TABLE LIVE_MATCH ADD COLUMN IF NOT EXISTS seo_content_modified_at BIGINT;
