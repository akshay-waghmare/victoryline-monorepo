package com.devglan.controller.seo;

import com.devglan.service.seo.SitemapService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SitemapController {
    private final SitemapService sitemapService;

    public SitemapController(SitemapService sitemapService) {
        this.sitemapService = sitemapService;
    }

    @GetMapping(value = "/api/v1/seo/sitemap", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getSitemap(@RequestParam(value = "part", required = false) Integer part) {
        String xml = (part == null)
                ? sitemapService.getSitemapIndexXml()
                : sitemapService.getPartitionXml(part);
        return ResponseEntity.ok(xml);
    }
}
