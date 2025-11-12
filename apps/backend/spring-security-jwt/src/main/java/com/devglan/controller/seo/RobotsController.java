package com.devglan.controller.seo;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@RestController
public class RobotsController {

    @GetMapping(value = "/api/v1/seo/robots", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getRobots() throws IOException {
        ClassPathResource resource = new ClassPathResource("seo/robots.txt");
        String content;
        try (InputStream in = resource.getInputStream()) {
            byte[] bytes = StreamUtils.copyToByteArray(in);
            content = new String(bytes, StandardCharsets.UTF_8);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
                .body(content);
    }
}
