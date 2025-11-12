package com.devglan.controller.seo;

import com.devglan.service.seo.SeoConstants;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for OG image generation. Returns 202 Accepted with metadata about generated images.
 * In future versions, this would integrate with Sharp or similar image generation library.
 */
@RestController
@RequestMapping("/api/v1/seo")
public class OgImageController {

    @GetMapping(value = "/og-image")
    public ResponseEntity<Void> getOgImage(@RequestParam(value = "path", required = false) String path) {
        return ResponseEntity.accepted()
                .header(HttpHeaders.LOCATION, SeoConstants.OG_PLACEHOLDER_URL)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }

    @PostMapping("/og-image")
    public ResponseEntity<Map<String, Object>> generateOgImage(
            @RequestBody Map<String, Object> request) {
        
        try {
            // Extract parameters from request
            String type = (String) request.getOrDefault("type", "match");
            String id = (String) request.getOrDefault("id", "");
            String title = (String) request.getOrDefault("title", "");
            String subtitle = (String) request.getOrDefault("subtitle", "");
            
            // Validate required parameters
            if (id.isEmpty()) {
                Map<String, Object> badReq = new HashMap<>();
                badReq.put("error", "Missing required parameter: id");
                badReq.put("message", "The 'id' parameter is required for OG image generation");
                return ResponseEntity.badRequest().body(badReq);
            }
            
            // For now, return 202 Accepted with metadata about the image that would be generated
            Map<String, Object> response = new HashMap<>();
            response.put("status", "accepted");
            response.put("message", "OG image generation request received");
            response.put("imageUrl", generateImageUrl(type, id));
            Map<String, Object> dims = new HashMap<>();
            dims.put("width", 1200);
            dims.put("height", 630);
            response.put("dimensions", dims);
            response.put("format", "png");
            response.put("type", type);
            response.put("id", id);
            response.put("estimated_generation_time", "2-5 seconds");
            
            if (!title.isEmpty()) {
                response.put("title", title);
            }
            if (!subtitle.isEmpty()) {
                response.put("subtitle", subtitle);
            }
            
            return ResponseEntity.accepted().body(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to process OG image request");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/og-image/{type}/{id}")
    public ResponseEntity<Map<String, Object>> getOgImageInfo(
            @PathVariable String type,
            @PathVariable String id) {
        
        try {
            Map<String, Object> imageInfo = new HashMap<>();
            imageInfo.put("type", type);
            imageInfo.put("id", id);
            imageInfo.put("url", generateImageUrl(type, id));
            Map<String, Object> dims = new HashMap<>();
            dims.put("width", 1200);
            dims.put("height", 630);
            imageInfo.put("dimensions", dims);
            imageInfo.put("format", "png");
            imageInfo.put("last_updated", System.currentTimeMillis());
            
            return ResponseEntity.ok(imageInfo);
            
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to get OG image info");
            err.put("message", e.getMessage());
            err.put("type", type);
            err.put("id", id);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /**
     * Helper method to generate the expected OG image URL
     */
    private String generateImageUrl(String type, String id) {
        String baseUrl = "https://www.crickzen.com/images/og";
        
        switch (type.toLowerCase()) {
            case "match":
                return String.format("%s/matches/%s.png", baseUrl, id);
            case "team":
                return String.format("%s/teams/%s.png", baseUrl, id);
            case "player":
                return String.format("%s/players/%s.png", baseUrl, id);
            default:
                return String.format("%s/default/%s.png", baseUrl, id);
        }
    }
}
