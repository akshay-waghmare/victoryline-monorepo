package com.devglan.controller.seo;

import com.devglan.service.seo.SeoConstants;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stub for OG image generation. Returns 202 Accepted with a placeholder Location header.
 */
@RestController
public class OgImageController {

    @GetMapping(value = "/api/v1/seo/og-image")
    public ResponseEntity<Void> getOgImage(@RequestParam(value = "path", required = false) String path) {
        return ResponseEntity.accepted()
                .header(HttpHeaders.LOCATION, SeoConstants.OG_PLACEHOLDER_URL)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }
}
