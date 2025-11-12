package com.devglan.blog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

/**
 * Optional proxy controller for Strapi blog API
 * Provides caching and consistent response envelope
 */
@RestController
@RequestMapping("/blog")
@CrossOrigin(origins = "*", maxAge = 3600)
public class BlogProxyController {

    @Value("${strapi.api.url:http://localhost:1337/api}")
    private String strapiApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * GET /blog/posts - List published blog posts with caching
     */
    @GetMapping("/posts")
    @Cacheable(cacheNames = "blog_list", key = "'page=' + #page + '&size=' + #size")
    public ResponseEntity<Map<String, Object>> listPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            String url = String.format("%s/blog-posts?pagination[page]=%d&pagination[pageSize]=%d&filters[status][$eq]=PUBLISHED&sort=publishedAt:desc&populate=*",
                    strapiApiUrl, page + 1, size);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", response.getBody(),
                    "error", (Object) null,
                    "timestamp", Instant.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "data", (Object) null,
                    "error", Map.of("code", "STRAPI_ERROR", "message", e.getMessage()),
                    "timestamp", Instant.now().toString()
            ));
        }
    }

    /**
     * GET /blog/posts/{slug} - Get single blog post by slug with caching
     */
    @GetMapping("/posts/{slug}")
    @Cacheable(cacheNames = "blog_post", key = "#slug")
    public ResponseEntity<Map<String, Object>> getPostBySlug(@PathVariable String slug) {
        try {
            String url = String.format("%s/blog-posts?filters[slug][$eq]=%s&filters[status][$eq]=PUBLISHED&populate=*",
                    strapiApiUrl, slug);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null && body.containsKey("data")) {
                Object data = body.get("data");
                if (data instanceof java.util.List && ((java.util.List<?>) data).isEmpty()) {
                    return ResponseEntity.status(404).body(Map.of(
                            "success", false,
                            "data", (Object) null,
                            "error", Map.of("code", "NOT_FOUND", "message", "Blog post not found"),
                            "timestamp", Instant.now().toString()
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", body,
                    "error", (Object) null,
                    "timestamp", Instant.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "data", (Object) null,
                    "error", Map.of("code", "STRAPI_ERROR", "message", e.getMessage()),
                    "timestamp", Instant.now().toString()
            ));
        }
    }
}
