package com.devglan.service.seo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

@Service
public class LiveMatchesService {
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${app.backend.url:http://localhost:8099}")
    private String backendUrl;
    
    public LiveMatchesService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    public List<LiveMatchEntry> getLiveMatches() {
        // First try to get all matches for comprehensive sitemap
        List<LiveMatchEntry> allMatches = getAllMatches();
        if (allMatches != null && !allMatches.isEmpty()) {
            return allMatches;
        }
        
        // Fallback to live-only endpoint
        return getLiveMatchesOnly();
    }
    
    /**
     * Fetch ALL matches (live, scheduled, finished) for comprehensive sitemap generation.
     * Google Search Console requires all indexable URLs to be in sitemap.
     */
    public List<LiveMatchEntry> getAllMatches() {
        try {
            // Call internal API for all matches - use configured backend URL
            String url = backendUrl + "/cricket-data/matches";
            String response = restTemplate.getForObject(url, String.class);
            
            if (response == null || response.isEmpty()) {
                return new ArrayList<>();
            }
            
            return parseMatchesResponse(response);
        } catch (Exception e) {
            // Log error but don't fail - return empty list
            System.err.println("Error fetching all matches for sitemap: " + e.getMessage());
            return new ArrayList<>();
        }
    }
    
    /**
     * Fetch only live matches (fallback method).
     */
    public List<LiveMatchEntry> getLiveMatchesOnly() {
        try {
            // Call internal API - use configured backend URL
            String url = backendUrl + "/cricket-data/live-matches";
            String response = restTemplate.getForObject(url, String.class);
            
            if (response == null || response.isEmpty()) {
                return new ArrayList<>();
            }
            
            JsonNode jsonArray = objectMapper.readTree(response);
            List<LiveMatchEntry> matches = new ArrayList<>();
            
            for (JsonNode node : jsonArray) {
                LiveMatchEntry entry = new LiveMatchEntry();
                entry.setUrl(node.has("url") ? node.get("url").asText() : null);
                entry.setLastKnownState(node.has("lastKnownState") ? node.get("lastKnownState").asText() : null);
                entry.setId(node.has("id") ? node.get("id").asLong() : null);
                // Parse startDate from various possible field names (Google GSC requires startDate for SportsEvent)
                String startDate = null;
                if (node.has("match_date")) {
                    startDate = node.get("match_date").asText();
                } else if (node.has("matchDate")) {
                    startDate = node.get("matchDate").asText();
                } else if (node.has("start_date")) {
                    startDate = node.get("start_date").asText();
                } else if (node.has("startDate")) {
                    startDate = node.get("startDate").asText();
                }
                entry.setStartDate(startDate);
                matches.add(entry);
            }
            
            return matches;
        } catch (Exception e) {
            // Log error but don't fail - return empty list
            System.err.println("Error fetching live matches for sitemap: " + e.getMessage());
            return new ArrayList<>();
        }
    }
    
    public String extractSlugFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }
        
        try {
            // Extract the slug from URLs like:
            // https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025/live
            String[] parts = url.split("/");
            
            // Find the slug (usually second to last part before "live" or "scorecard")
            for (int i = parts.length - 1; i >= 0; i--) {
                String part = parts[i].toLowerCase();
                if ("live".equals(part) || "scorecard".equals(part)) {
                    if (i > 0) {
                        return parts[i - 1];
                    }
                }
            }
            
            // Fallback: last non-empty part
            for (int i = parts.length - 1; i >= 0; i--) {
                if (parts[i] != null && !parts[i].isEmpty() && 
                    !"live".equals(parts[i].toLowerCase()) && 
                    !"scorecard".equals(parts[i].toLowerCase())) {
                    return parts[i];
                }
            }
        } catch (Exception e) {
            System.err.println("Error extracting slug: " + e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Parse JSON response into LiveMatchEntry list.
     * Handles both array and object responses.
     */
    private List<LiveMatchEntry> parseMatchesResponse(String response) {
        List<LiveMatchEntry> matches = new ArrayList<>();
        try {
            JsonNode jsonArray = objectMapper.readTree(response);
            
            for (JsonNode node : jsonArray) {
                LiveMatchEntry entry = new LiveMatchEntry();
                entry.setUrl(node.has("url") ? node.get("url").asText() : null);
                entry.setLastKnownState(node.has("lastKnownState") ? node.get("lastKnownState").asText() : null);
                entry.setId(node.has("id") ? node.get("id").asLong() : null);
                // Parse startDate from various possible field names (Google GSC requires startDate for SportsEvent)
                String startDate = null;
                if (node.has("match_date")) {
                    startDate = node.get("match_date").asText();
                } else if (node.has("matchDate")) {
                    startDate = node.get("matchDate").asText();
                } else if (node.has("start_date")) {
                    startDate = node.get("start_date").asText();
                } else if (node.has("startDate")) {
                    startDate = node.get("startDate").asText();
                }
                entry.setStartDate(startDate);
                matches.add(entry);
            }
        } catch (Exception e) {
            System.err.println("Error parsing matches response: " + e.getMessage());
        }
        return matches;
    }
    
    public static class LiveMatchEntry {
        private String url;
        private String lastKnownState;
        private Long id;
        private String startDate;
        
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        
        public String getLastKnownState() { return lastKnownState; }
        public void setLastKnownState(String lastKnownState) { this.lastKnownState = lastKnownState; }
        
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        
        public boolean isLive() {
            return lastKnownState != null && lastKnownState.toLowerCase().contains("live");
        }
    }
}
