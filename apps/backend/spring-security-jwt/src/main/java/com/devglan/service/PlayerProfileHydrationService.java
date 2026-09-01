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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Requests a one-time CREX profile hydration when the database has no detail. */
@Service
public class PlayerProfileHydrationService {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${SCRAPER_PLAYER_PROFILE_HYDRATE_URL:${scraper.player-profile.hydrate.url:http://127.0.0.1:5000/hydrate-player-profile}}")
    private String scraperPlayerProfileHydrateUrl;

    public PlayerProfileHydrationService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
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

    /** Queue a profile hydration and return without holding the visitor request open. */
    public boolean queue(String externalId) {
        if (externalId == null || !externalId.matches("^player:[A-Za-z0-9][A-Za-z0-9-]*$")) {
            return false;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> payload = new HashMap<>();
        payload.put("externalId", externalId);
        payload.put("queueOnly", "true");
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    scraperPlayerProfileHydrateUrl, new HttpEntity<>(payload, headers), String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ignored) {
            return false;
        }
    }

    /** Resolve a scorecard name against CREX's match links and hydrate its profile. */
    public String hydrateByMatchPlayer(String matchUrl, String playerName, String role) {
        return hydrateByMatchPlayer(matchUrl, playerName, role, false);
    }

    /** Resolve the provider ID without waiting for the full profile page. */
    public String hydrateByMatchPlayer(String matchUrl, String playerName, String role, boolean resolveOnly) {
        if (matchUrl == null || matchUrl.trim().isEmpty()
                || playerName == null || playerName.trim().isEmpty()) {
            return null;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> payload = new HashMap<>();
        payload.put("matchUrl", matchUrl);
        payload.put("playerName", playerName);
        if (role != null && !role.trim().isEmpty()) {
            payload.put("role", role);
        }
        if (resolveOnly) {
            payload.put("resolveOnly", "true");
        }
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    scraperPlayerProfileHydrateUrl, new HttpEntity<>(payload, headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return null;
            }
            JsonNode root = objectMapper.readTree(response.getBody());
            String resolvedExternalId = root.path("data").path("externalId").asText(null);
            return resolvedExternalId == null || resolvedExternalId.trim().isEmpty() ? null : resolvedExternalId;
        } catch (Exception ignored) {
            return null;
        }
    }
}
