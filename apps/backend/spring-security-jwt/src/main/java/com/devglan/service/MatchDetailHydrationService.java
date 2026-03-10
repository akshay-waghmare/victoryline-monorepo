package com.devglan.service;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.devglan.model.LiveMatch;
import com.devglan.repository.LiveMatchRepository;

@Service
public class MatchDetailHydrationService {

    private static final Logger log = LoggerFactory.getLogger(MatchDetailHydrationService.class);

    private final RestTemplate restTemplate;
    private final LiveMatchRepository liveMatchRepository;

    @Value("${SCRAPER_HYDRATE_URL:${scraper.hydrate.url:http://127.0.0.1:5000/hydrate-match-details}}")
    private String scraperHydrateUrl;

    public MatchDetailHydrationService(RestTemplate restTemplate, LiveMatchRepository liveMatchRepository) {
        this.restTemplate = restTemplate;
        this.liveMatchRepository = liveMatchRepository;
    }

    public boolean hydrate(String requestedUrl) {
        String matchUrl = resolveMatchUrl(requestedUrl);
        if (matchUrl == null || matchUrl.trim().isEmpty()) {
            return false;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> payload = new HashMap<>();
        payload.put("url", matchUrl);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    scraperHydrateUrl,
                    new HttpEntity<>(payload, headers),
                    String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ex) {
            log.warn("Failed to hydrate match details for {} via {}: {}", requestedUrl, scraperHydrateUrl, ex.getMessage());
            return false;
        }
    }

    private String resolveMatchUrl(String requestedUrl) {
        if (requestedUrl == null || requestedUrl.trim().isEmpty()) {
            return null;
        }

        String trimmedUrl = requestedUrl.trim();
        LiveMatch directMatch = liveMatchRepository.findByUrlContaining(trimmedUrl);
        if (directMatch != null && directMatch.getUrl() != null && !directMatch.getUrl().trim().isEmpty()) {
            return directMatch.getUrl();
        }

        String slug = extractScoreboardSlug(trimmedUrl);
        if (slug != null) {
            LiveMatch slugMatch = liveMatchRepository.findByUrlContaining(slug);
            if (slugMatch != null && slugMatch.getUrl() != null && !slugMatch.getUrl().trim().isEmpty()) {
                return slugMatch.getUrl();
            }
        }

        return normalizeScoreboardUrl(trimmedUrl);
    }

    private String normalizeScoreboardUrl(String url) {
        String normalized = url;
        if (normalized.endsWith("/info")) {
            return normalized.substring(0, normalized.length() - "/info".length()) + "/scorecard";
        }
        if (normalized.endsWith("/live") || normalized.endsWith("/scorecard")) {
            return normalized;
        }
        if (normalized.contains("/scoreboard/")) {
            return normalized.endsWith("/") ? normalized + "scorecard" : normalized + "/scorecard";
        }
        return normalized;
    }

    private String extractScoreboardSlug(String url) {
        if (url == null) {
            return null;
        }

        int scoreboardIndex = url.indexOf("/scoreboard/");
        if (scoreboardIndex < 0) {
            return null;
        }

        String remaining = url.substring(scoreboardIndex + "/scoreboard/".length());
        String[] parts = remaining.split("/");
        if (parts.length < 6) {
            return null;
        }

        String slug = parts[5];
        return slug == null || slug.trim().isEmpty() ? null : slug.trim();
    }
}
