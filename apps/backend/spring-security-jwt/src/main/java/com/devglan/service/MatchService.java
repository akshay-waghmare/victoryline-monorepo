package com.devglan.service;

import com.devglan.model.CompletedMatchDTO;
import com.devglan.model.LiveMatch;
import com.devglan.repository.LiveMatchRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for match-related operations
 * Feature: 006-completed-matches-display (CORRECTED)
 * 
 * CRITICAL FIX: This service now correctly queries LIVE_MATCH table (isDeleted=true)
 * instead of the wrong 'matches' table. The LiveMatch entity stores match data in
 * JSON format within the 'lastKnownState' field.
 */
@Service
public class MatchService {

    private static final Logger logger = LoggerFactory.getLogger(MatchService.class);
    private static final int COMPLETED_MATCHES_LIMIT = 20;

    @Autowired
    private LiveMatchRepository liveMatchRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get the last 20 completed matches
     * Queries LIVE_MATCH table WHERE isDeleted = true
     * Caching disabled temporarily for testing
     * 
     * @return List of completed matches (max 20)
     */
    // @Cacheable(value = "completedMatches", key = "'last20'")
    @Transactional(readOnly = true)
    public List<CompletedMatchDTO> getCompletedMatches() {
        logger.debug("Fetching completed matches from LIVE_MATCH table");
        
        try {
            // Query LIVE_MATCH WHERE isDeleted = true
            List<LiveMatch> deletedMatches = liveMatchRepository.findByIsDeletedTrue();
            logger.info("Found {} completed matches in LIVE_MATCH table", deletedMatches.size());
            
            // Convert LiveMatch entities to CompletedMatchDTO
            List<CompletedMatchDTO> dtoList = deletedMatches.stream()
                .map(this::convertToDTO)
                .filter(dto -> dto != null) // Filter out failed conversions
                .sorted(Comparator.comparing(CompletedMatchDTO::getMatchId).reversed()) // Sort by ID desc (most recent first)
                .limit(COMPLETED_MATCHES_LIMIT) // Take only last 20
                .collect(Collectors.toList());
            
            logger.info("Returning {} completed matches", dtoList.size());
            return dtoList;
            
        } catch (Exception e) {
            logger.error("Error fetching completed matches", e);
            return Collections.emptyList();
        }
    }

    /**
     * Convert LiveMatch entity to CompletedMatchDTO
     * Parses JSON from lastKnownState field
     * 
     * @param liveMatch LiveMatch entity with isDeleted=true
     * @return CompletedMatchDTO or null if parsing fails
     */
    private CompletedMatchDTO convertToDTO(LiveMatch liveMatch) {
        try {
            CompletedMatchDTO dto = new CompletedMatchDTO();
            dto.setMatchId(liveMatch.getId());
            dto.setMatchUrl(liveMatch.getUrl());
            dto.setMatchLink(liveMatch.getUrl()); // For frontend compatibility
            
            // Parse lastKnownState JSON
            String lastKnownState = liveMatch.getLastKnownState();
            if (lastKnownState != null && !lastKnownState.isEmpty()) {
                JsonNode jsonNode = objectMapper.readTree(lastKnownState);
                
                // Extract match details from JSON
                // Expected JSON structure: { "battingTeam": "IND", "score": "328/5", ... }
                String teamA = extractTeamName(jsonNode, "battingTeam", "team1");
                String teamB = extractOpponentTeam(jsonNode);
                
                dto.setTeamA(teamA);
                dto.setTeamB(teamB);
                dto.setHomeTeamName(teamA); // For frontend compatibility
                dto.setAwayTeamName(teamB); // For frontend compatibility
                dto.setScoreA(extractJsonField(jsonNode, "score"));
                dto.setResult(extractJsonField(jsonNode, "final_result_text", "current_ball"));
                
                // Extract series name from competition or match info
                dto.setSeriesName(extractSeriesName(liveMatch.getUrl()));
                
                // Set completion date to current date as fallback (actual completion date not stored)
                dto.setCompletionDate(new java.util.Date());
                
                logger.debug("Converted LiveMatch {} to DTO: {} vs {}", 
                    liveMatch.getId(), dto.getTeamA(), dto.getTeamB());
            } else {
                logger.warn("LiveMatch {} has empty lastKnownState", liveMatch.getId());
                dto.setTeamA("Unknown");
                dto.setTeamB("Unknown");
                dto.setSeriesName("Series information unavailable");
            }
            
            return dto;
            
        } catch (Exception e) {
            logger.error("Error converting LiveMatch {} to DTO", liveMatch.getId(), e);
            return null;
        }
    }

    /**
     * Extract team name from JSON with fallback fields
     */
    private String extractTeamName(JsonNode json, String... fieldNames) {
        for (String fieldName : fieldNames) {
            if (json.has(fieldName)) {
                return json.get(fieldName).asText("Unknown");
            }
        }
        return "Unknown";
    }

    /**
     * Extract opponent team (heuristic approach)
     */
    private String extractOpponentTeam(JsonNode json) {
        // Try to extract from result text (e.g., "India won by 5 wickets")
        if (json.has("final_result_text")) {
            String result = json.get("final_result_text").asText();
            // Parse team name from result (basic extraction)
            String[] words = result.split(" ");
            if (words.length > 0) {
                return words[0]; // Return first word as team name
            }
        }
        return "Unknown";
    }

    /**
     * Extract field from JSON with fallback fields
     */
    private String extractJsonField(JsonNode json, String... fieldNames) {
        for (String fieldName : fieldNames) {
            if (json.has(fieldName)) {
                String value = json.get(fieldName).asText();
                if (value != null && !value.isEmpty() && !value.equals("null")) {
                    return value;
                }
            }
        }
        return null;
    }

    /**
     * Extract series name from match URL
     * Example: "/cricket-odds/india-vs-australia-odi-2025" → "India vs Australia ODI 2025"
     */
    private String extractSeriesName(String url) {
        if (url == null || url.isEmpty()) {
            return "Series information unavailable";
        }
        
        try {
            // Remove /cricket-odds/ prefix and clean up
            String cleaned = url.replace("/cricket-odds/", "")
                               .replace("-", " ")
                               .trim();
            
            // Capitalize first letter of each word
            String[] words = cleaned.split(" ");
            StringBuilder seriesName = new StringBuilder();
            for (String word : words) {
                if (!word.isEmpty()) {
                    seriesName.append(Character.toUpperCase(word.charAt(0)))
                             .append(word.substring(1).toLowerCase())
                             .append(" ");
                }
            }
            
            return seriesName.toString().trim();
        } catch (Exception e) {
            logger.warn("Error extracting series name from URL: {}", url, e);
            return "Series information unavailable";
        }
    }
}
