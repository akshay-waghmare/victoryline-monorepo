package com.devglan.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/** Requests a one-time CREX profile hydration when the database has no detail. */
@Service
public class PlayerProfileHydrationService {
    private final RestTemplate restTemplate;

    @Value("${SCRAPER_PLAYER_PROFILE_HYDRATE_URL:${scraper.player-profile.hydrate.url:http://127.0.0.1:5000/hydrate-player-profile}}")
    private String scraperPlayerProfileHydrateUrl;

    public PlayerProfileHydrationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean hydrate(String externalId) {
        if (externalId == null || !externalId.matches("^player:[A-Za-z0-9][A-Za-z0-9-]*$")) {
            return false;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> payload = new HashMap<>();
        payload.put("externalId", externalId);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    scraperPlayerProfileHydrateUrl, new HttpEntity<>(payload, headers), String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ignored) {
            return false;
        }
    }
}
