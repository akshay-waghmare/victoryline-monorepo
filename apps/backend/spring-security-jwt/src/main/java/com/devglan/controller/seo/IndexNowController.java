package com.devglan.controller.seo;

import com.devglan.service.seo.IndexNowService;
import com.devglan.service.seo.SitemapService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/seo/indexnow")
public class IndexNowController {
    private final IndexNowService indexNowService;
    private final SitemapService sitemapService;

    public IndexNowController(IndexNowService indexNowService, SitemapService sitemapService) {
        this.indexNowService = indexNowService;
        this.sitemapService = sitemapService;
    }

    @GetMapping(value = "/key.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getKey() {
        String key = indexNowService.getPublicKey();
        return key == null
                ? ResponseEntity.status(HttpStatus.NOT_FOUND).body("IndexNow is not configured")
                : ResponseEntity.ok(key);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>(indexNowService.getStatus());
        status.put("priorityUrls", sitemapService.getPriorityMatchUrls());
        return ResponseEntity.ok(status);
    }

}
