package com.devglan.controller.seo;

import com.devglan.service.seo.SitemapService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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
        String xml = sitemapService.getSitemapIndexXml();
        if (xml == null || xml.isEmpty()) {
            log.error("No valid sitemap manifest is available; returning 503 without caching");
            return unavailable();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/xml;charset=UTF-8")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300, stale-while-revalidate=60")
                .body(xml);
    }

    @GetMapping(value = "/sitemaps/{name}.xml", produces = "application/xml")
    public ResponseEntity<String> getSitemapPartition(@PathVariable("name") String name) {
        log.debug("Received request for sitemap partition {}", name);
        if (name == null || !name.matches("sitemap-matches-\\d{4}")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .build();
        }
        Integer part = Integer.parseInt(name.substring(name.length() - 4));

        String xml = sitemapService.getPartitionXml(part);
        if (xml == null || xml.isEmpty()) {
            if (!sitemapService.hasPublishedManifest()) {
                log.error("No valid sitemap manifest is available for partition {}; returning 503 without caching", part);
                return unavailable();
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/xml;charset=UTF-8")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300, stale-while-revalidate=60")
                .body(xml);
    }

    private ResponseEntity<String> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header(HttpHeaders.CONTENT_TYPE, "application/xml;charset=UTF-8")
                .body("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>temporary sitemap generation failure</error>");
    }
}
