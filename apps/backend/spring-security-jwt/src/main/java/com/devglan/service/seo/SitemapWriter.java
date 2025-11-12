package com.devglan.service.seo;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Responsible for building sitemap XML strings (index and partitions) with ISO lastmod.
 * Later can be extended to write files or streams.
 */
public class SitemapWriter {
    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final DateTimeFormatter INDEX_LASTMOD_FMT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    public String buildIndex(List<String> partitionPaths) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.append("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        String lastmod = indexLastmod();
        for (String path : partitionPaths) {
            sb.append("<sitemap><loc>")
              .append(resolveIndexLoc(path))
              .append("</loc><lastmod>")
              .append(lastmod)
              .append("</lastmod></sitemap>");
        }
        sb.append("</sitemapindex>");
        return sb.toString();
    }

    public String buildPartition(List<SitemapUrl> urls) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        for (SitemapUrl u : urls) {
            sb.append("<url><loc>")
              .append(u.loc)
              .append("</loc><lastmod>")
              .append(u.lastmod)
              .append("</lastmod><changefreq>")
              .append(u.changefreq)
              .append("</changefreq><priority>")
              .append(u.priority)
              .append("</priority></url>");
        }
        sb.append("</urlset>");
        return sb.toString();
    }

    public SitemapUrl url(String path, String changefreq, double priority) {
        return new SitemapUrl(SeoConstants.CANONICAL_HOST + ensureLeadingSlash(path), isoNow(), changefreq, priority);
    }

    public SitemapUrl urlWithLastMod(String path, String lastmodIso, String changefreq, double priority) {
        String lm = (lastmodIso != null && !lastmodIso.isEmpty()) ? lastmodIso : isoNow();
        return new SitemapUrl(SeoConstants.CANONICAL_HOST + ensureLeadingSlash(path), lm, changefreq, priority);
    }

    private String isoNow() {
        return OffsetDateTime.now(ZoneOffset.UTC).format(ISO_FMT);
    }

    private String indexLastmod() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS).format(INDEX_LASTMOD_FMT);
    }

    public String isoFromDate(java.util.Date date) {
        if (date == null) return isoNow();
        return date.toInstant().atOffset(ZoneOffset.UTC).format(ISO_FMT);
    }

    private String ensureLeadingSlash(String path) {
        if (path == null || path.isEmpty()) {
            return "/";
        }
        return path.startsWith("/") ? path : "/" + path;
    }

    private String resolveIndexLoc(String path) {
        if (path == null || path.isEmpty()) {
            return SeoConstants.CANONICAL_HOST + "/";
        }
        String trimmed = path.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        return SeoConstants.CANONICAL_HOST + ensureLeadingSlash(trimmed);
    }

    public static class SitemapUrl {
        public final String loc;
        public final String lastmod;
        public final String changefreq;
        public final double priority;
        public SitemapUrl(String loc, String lastmod, String changefreq, double priority) {
            this.loc = loc;
            this.lastmod = lastmod;
            this.changefreq = changefreq;
            this.priority = priority;
        }
    }
}
