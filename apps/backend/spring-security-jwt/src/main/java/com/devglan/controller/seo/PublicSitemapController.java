package com.devglan.controller.seo;

import com.devglan.service.seo.SitemapService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicSitemapController {
    private static final Logger log = LoggerFactory.getLogger(PublicSitemapController.class);
    private final SitemapService sitemapService;

    public PublicSitemapController(SitemapService sitemapService) {
        this.sitemapService = sitemapService;
    }

    @GetMapping(value = "/sitemap.xml", produces = "application/xml")
    public ResponseEntity<String> getSitemapIndexXml() {
        log.debug("Received request for /sitemap.xml sitemap index");
        String xml;
        try {
            xml = sitemapService.getSitemapIndexXml();
            if (xml == null || xml.isEmpty()) {
                log.warn("Sitemap index XML was null/empty; returning minimal fallback");
                xml = minimalIndexFallback();
            }
        } catch (Exception ex) {
            log.error("Failed to generate sitemap index, returning fallback", ex);
            xml = minimalIndexFallback();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/xml;charset=UTF-8")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300, stale-while-revalidate=60")
                .body(xml);
    }

    @GetMapping(value = "/sitemaps/{name}.xml", produces = "application/xml")
    public ResponseEntity<String> getSitemapPartition(@PathVariable("name") String name) {
        log.debug("Received request for sitemap partition {}", name);
        // For demo purposes, read trailing digits as partition number
        int part = 1;
        try {
            String digits = name.replaceAll("^.*-(\\d+)$", "$1");
            part = Integer.parseInt(digits);
        } catch (Exception ignored) {
            log.debug("Could not parse partition digits from '{}', defaulting to 1", name);
        }

        String xml;
        try {
            xml = sitemapService.getPartitionXml(part);
            if (xml == null || xml.isEmpty()) {
                log.warn("Partition XML empty for part {}, returning minimal partition fallback", part);
                xml = minimalPartitionFallback();
            }
        } catch (Exception ex) {
            log.error("Failed to generate sitemap partition {}", part, ex);
            xml = minimalPartitionFallback();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/xml;charset=UTF-8")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300, stale-while-revalidate=60")
                .body(xml);
    }

    private String minimalIndexFallback() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></sitemapindex>";
    }

    private String minimalPartitionFallback() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>";
    }
}
