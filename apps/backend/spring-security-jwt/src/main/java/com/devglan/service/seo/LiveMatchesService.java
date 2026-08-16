package com.devglan.service.seo;

import com.devglan.service.CrexMatchUrlHelper;
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
     * Strict source for sitemap publication.  Sitemap generation must be able
     * to distinguish an upstream failure from a valid list; silently turning a
     * failed fetch into an empty list can otherwise replace a good manifest.
     */
    public List<LiveMatchEntry> getSitemapMatches() {
        try {
            String url = backendUrl + "/cricket-data/matches";
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.trim().isEmpty()) {
                throw new IllegalStateException("Sitemap match source returned an empty body");
            }

            JsonNode jsonArray = objectMapper.readTree(response);
            if (!jsonArray.isArray()) {
                throw new IllegalStateException("Sitemap match source returned a non-array payload");
            }

            List<LiveMatchEntry> matches = new ArrayList<>();
            for (JsonNode node : jsonArray) {
                matches.add(toLiveMatchEntry(node));
            }
            if (matches.isEmpty()) {
                throw new IllegalStateException("Sitemap match source returned zero records");
            }
            return matches;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to load the sitemap match source", ex);
        }
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
                matches.add(toLiveMatchEntry(node));
            }
            
            return matches;
        } catch (Exception e) {
            // Log error but don't fail - return empty list
            System.err.println("Error fetching live matches for sitemap: " + e.getMessage());
            return new ArrayList<>();
        }
    }
    
    public String extractSlugFromUrl(String url) {
        return CrexMatchUrlHelper.extractMatchKey(url);
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
                matches.add(toLiveMatchEntry(node));
            }
        } catch (Exception e) {
            System.err.println("Error parsing matches response: " + e.getMessage());
        }
        return matches;
    }

    private LiveMatchEntry toLiveMatchEntry(JsonNode node) {
        LiveMatchEntry entry = new LiveMatchEntry();
        entry.setUrl(node.has("url") ? node.get("url").asText() : null);
        entry.setExternalMatchKey(node.has("externalMatchKey") ? node.get("externalMatchKey").asText() : null);
        entry.setLastKnownState(node.has("lastKnownState") ? node.get("lastKnownState").asText() : null);
        entry.setStatus(node.has("status") ? node.get("status").asText() : null);
        entry.setResultSummary(node.has("resultSummary") ? node.get("resultSummary").asText() : null);
        entry.setFinished(node.has("finished") && node.get("finished").asBoolean(false));
        entry.setScheduledStartTime(node.has("scheduledStartTime") ? node.get("scheduledStartTime").asLong() : null);
        entry.setLastStateUpdatedAt(readLong(node, "lastStateUpdatedAt", "last_state_updated_at"));
        entry.setSeoContentModifiedAt(readLong(node, "seoContentModifiedAt", "seo_content_modified_at"));
        entry.setId(node.has("id") ? node.get("id").asLong() : null);
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
        return entry;
    }

    private Long readLong(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            if (node.has(fieldName) && !node.get(fieldName).isNull()) {
                JsonNode value = node.get(fieldName);
                if (value.isNumber()) {
                    return value.asLong();
                }

                String text = value.asText();
                if (text != null && !text.trim().isEmpty()) {
                    try {
                        return Long.parseLong(text.trim());
                    } catch (NumberFormatException ignored) {
                        // try next field
                    }
                }
            }
        }

        return null;
    }
    
    public static class LiveMatchEntry {
        private String url;
        private String externalMatchKey;
        private String lastKnownState;
        private String status;
        private String resultSummary;
        private boolean finished;
        private Long scheduledStartTime;
        private Long lastStateUpdatedAt;
        private Long seoContentModifiedAt;
        private Long id;
        private String startDate;
        
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }

        public String getExternalMatchKey() { return externalMatchKey; }
        public void setExternalMatchKey(String externalMatchKey) { this.externalMatchKey = externalMatchKey; }
        
        public String getLastKnownState() { return lastKnownState; }
        public void setLastKnownState(String lastKnownState) { this.lastKnownState = lastKnownState; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getResultSummary() { return resultSummary; }
        public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }

        public boolean isFinished() { return finished; }
        public void setFinished(boolean finished) { this.finished = finished; }

        public Long getScheduledStartTime() { return scheduledStartTime; }
        public void setScheduledStartTime(Long scheduledStartTime) { this.scheduledStartTime = scheduledStartTime; }

        public Long getLastStateUpdatedAt() { return lastStateUpdatedAt; }
        public void setLastStateUpdatedAt(Long lastStateUpdatedAt) { this.lastStateUpdatedAt = lastStateUpdatedAt; }

        public Long getSeoContentModifiedAt() { return seoContentModifiedAt; }
        public void setSeoContentModifiedAt(Long seoContentModifiedAt) { this.seoContentModifiedAt = seoContentModifiedAt; }
        
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        
        public boolean isLive() {
            return (status != null && status.equalsIgnoreCase("LIVE"))
                    || (lastKnownState != null && lastKnownState.toLowerCase().contains("live"));
        }
    }
}
