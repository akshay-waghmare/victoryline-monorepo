package com.devglan.controller.seo;

import com.devglan.scheduler.LiveMatchIndexingScheduler;
import com.devglan.scheduler.SitemapScheduler;
import com.devglan.service.seo.GoogleSearchConsoleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for Google Search Console operations including:
 * - Manual sitemap submission trigger
 * - URL indexing requests via Indexing API
 * - Live match indexing status and trigger
 * - Status information
 * 
 * Feature 008 - Match Page Title SEO Optimization
 */
@RestController
@RequestMapping("/api/v1/seo/indexing")
public class IndexingController {
    
    private static final Logger logger = LoggerFactory.getLogger(IndexingController.class);
    
    private final GoogleSearchConsoleService gscService;
    private final SitemapScheduler sitemapScheduler;
    private final LiveMatchIndexingScheduler liveMatchIndexingScheduler;
    
    public IndexingController(
            GoogleSearchConsoleService gscService, 
            SitemapScheduler sitemapScheduler,
            LiveMatchIndexingScheduler liveMatchIndexingScheduler) {
        this.gscService = gscService;
        this.sitemapScheduler = sitemapScheduler;
        this.liveMatchIndexingScheduler = liveMatchIndexingScheduler;
    }
    
    /**
     * Get the status of GSC and Indexing API integration
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("gscInitialized", gscService.isInitialized());
        status.put("indexingInitialized", gscService.isIndexingInitialized());
        status.put("siteUrl", gscService.getSiteUrl());
        status.put("schedulerStatus", sitemapScheduler.getStatus());
        status.put("liveMatchIndexerStatus", liveMatchIndexingScheduler.getStatus());
        status.put("indexedMatchCount", liveMatchIndexingScheduler.getIndexedCount());
        
        return ResponseEntity.ok(status);
    }
    
    /**
     * Manually trigger sitemap submission to GSC
     */
    @PostMapping("/sitemap/submit")
    public ResponseEntity<Map<String, Object>> triggerSitemapSubmission() {
        logger.info("[IndexingController] Manual sitemap submission requested");
        
        Map<String, Object> result = new HashMap<>();
        boolean success = sitemapScheduler.triggerManualSubmission();
        
        result.put("success", success);
        result.put("message", success ? "Sitemap submitted successfully" : "Sitemap submission failed");
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Request indexing for a single URL
     * 
     * @param url The full URL to request indexing for
     */
    @PostMapping("/request")
    public ResponseEntity<Map<String, Object>> requestIndexing(@RequestParam String url) {
        logger.info("[IndexingController] Indexing requested for URL: {}", url);
        
        Map<String, Object> result = new HashMap<>();
        
        if (!gscService.isIndexingInitialized()) {
            result.put("success", false);
            result.put("message", "Indexing API is not initialized");
            return ResponseEntity.ok(result);
        }
        
        boolean success = gscService.requestIndexing(url);
        
        result.put("success", success);
        result.put("url", url);
        result.put("message", success ? "Indexing request submitted successfully" : "Indexing request failed");
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Request indexing for a match page by its slug
     * 
     * @param slug The match URL slug (e.g., "ind-vs-pak-world-cup-2025")
     */
    @PostMapping("/match/{slug}")
    public ResponseEntity<Map<String, Object>> requestIndexingForMatch(@PathVariable String slug) {
        logger.info("[IndexingController] Indexing requested for match slug: {}", slug);
        
        Map<String, Object> result = new HashMap<>();
        
        if (!gscService.isIndexingInitialized()) {
            result.put("success", false);
            result.put("message", "Indexing API is not initialized");
            return ResponseEntity.ok(result);
        }
        
        boolean success = gscService.requestIndexingForMatch(slug);
        
        result.put("success", success);
        result.put("slug", slug);
        result.put("fullUrl", gscService.getSiteUrl() + "/cric-live/" + slug);
        result.put("message", success ? "Indexing request submitted successfully" : "Indexing request failed");
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Request indexing for multiple URLs in batch
     * 
     * @param urls List of URLs to request indexing for
     */
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> requestIndexingBatch(@RequestBody List<String> urls) {
        logger.info("[IndexingController] Batch indexing requested for {} URLs", urls.size());
        
        Map<String, Object> result = new HashMap<>();
        
        if (!gscService.isIndexingInitialized()) {
            result.put("success", false);
            result.put("message", "Indexing API is not initialized");
            return ResponseEntity.ok(result);
        }
        
        int successCount = gscService.requestIndexingBatch(urls);
        
        result.put("success", successCount > 0);
        result.put("totalRequested", urls.size());
        result.put("successCount", successCount);
        result.put("failedCount", urls.size() - successCount);
        result.put("message", String.format("%d of %d URLs indexed successfully", successCount, urls.size()));
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Notify Google that a URL has been removed
     * 
     * @param url The URL that was removed
     */
    @DeleteMapping("/remove")
    public ResponseEntity<Map<String, Object>> notifyUrlRemoved(@RequestParam String url) {
        logger.info("[IndexingController] URL removal notification requested for: {}", url);
        
        Map<String, Object> result = new HashMap<>();
        
        if (!gscService.isIndexingInitialized()) {
            result.put("success", false);
            result.put("message", "Indexing API is not initialized");
            return ResponseEntity.ok(result);
        }
        
        boolean success = gscService.notifyUrlRemoved(url);
        
        result.put("success", success);
        result.put("url", url);
        result.put("message", success ? "URL removal notification sent successfully" : "URL removal notification failed");
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Manually trigger live match indexing (runs every 15 min automatically)
     */
    @PostMapping("/live-matches/trigger")
    public ResponseEntity<Map<String, Object>> triggerLiveMatchIndexing() {
        logger.info("[IndexingController] Manual live match indexing triggered");
        
        Map<String, Object> result = new HashMap<>();
        
        if (!gscService.isIndexingInitialized()) {
            result.put("success", false);
            result.put("message", "Indexing API is not initialized");
            return ResponseEntity.ok(result);
        }
        
        liveMatchIndexingScheduler.triggerManualIndexing();
        
        result.put("success", true);
        result.put("message", "Live match indexing triggered");
        result.put("indexedCount", liveMatchIndexingScheduler.getIndexedCount());
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Get live match indexing status
     */
    @GetMapping("/live-matches/status")
    public ResponseEntity<Map<String, Object>> getLiveMatchIndexingStatus() {
        Map<String, Object> result = new HashMap<>();
        result.put("status", liveMatchIndexingScheduler.getStatus());
        result.put("indexedCount", liveMatchIndexingScheduler.getIndexedCount());
        result.put("schedule", "Every 15 minutes");
        
        return ResponseEntity.ok(result);
    }
}
