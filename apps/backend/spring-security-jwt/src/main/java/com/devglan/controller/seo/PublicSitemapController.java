package com.devglan.controller.seo;

import com.devglan.service.seo.GzipWriter;
import com.devglan.service.seo.SitemapService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicSitemapController {
    private final SitemapService sitemapService;

    public PublicSitemapController(SitemapService sitemapService) {
        this.sitemapService = sitemapService;
    }

    @GetMapping(value = "/sitemap.xml", produces = "application/x-gzip")
    public ResponseEntity<byte[]> getSitemapIndexGz() throws Exception {
    String xml = sitemapService.getSitemapIndexXml();
    byte[] gz = GzipWriter.gzipString(xml);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/x-gzip")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300, stale-while-revalidate=60")
                .body(gz);
    }

    @GetMapping(value = "/sitemaps/{name}.xml.gz", produces = "application/x-gzip")
    public ResponseEntity<byte[]> getSitemapPartition(@PathVariable("name") String name) throws Exception {
        // For demo purposes, read trailing digits as partition number
        int part = 1;
        try {
            String digits = name.replaceAll("^.*-(\\d+)$", "$1");
            part = Integer.parseInt(digits);
        } catch (Exception ignored) { }

    String xml = sitemapService.getPartitionXml(part);
    byte[] gz = GzipWriter.gzipString(xml);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/x-gzip")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300, stale-while-revalidate=60")
                .body(gz);
    }
}
