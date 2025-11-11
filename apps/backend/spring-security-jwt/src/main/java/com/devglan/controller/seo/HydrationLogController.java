package com.devglan.controller.seo;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Receives client-side hydration/runtime error beacons. For now, just 204 no-content.
 */
@RestController
public class HydrationLogController {

    @PostMapping(value = "/api/v1/seo/hydration-log", consumes = {"application/json", "text/plain"})
    public ResponseEntity<Void> log(@RequestBody(required = false) String payload) {
        // Intentionally no-op; future: route to logger/metrics.
        return ResponseEntity.noContent()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }
}
