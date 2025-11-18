package com.devglan.controller;

import com.devglan.model.CompletedMatchDTO;
import com.devglan.service.MatchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for match-related endpoints
 * Feature: 006-completed-matches-display
 */
@RestController
@RequestMapping("/api/v1/matches")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MatchController {

    private static final Logger logger = LoggerFactory.getLogger(MatchController.class);

    @Autowired
    private MatchService matchService;

    /**
     * GET /api/v1/matches/completed
     * Returns the last 20 completed matches with series information
     * 
     * @return ResponseEntity with completed matches list
     */
    @GetMapping("/completed")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getCompletedMatches() {
        try {
            logger.info("Received request for completed matches");
            
            List<CompletedMatchDTO> matches = matchService.getCompletedMatches();
            
            Map<String, Object> response = new HashMap<>();
            response.put("matches", matches);
            response.put("totalCount", matches.size());
            response.put("timestamp", new Date());
            
            logger.debug("Returning {} completed matches", matches.size());
            
            // Add caching headers (T030)
            return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.maxAge(5, java.util.concurrent.TimeUnit.MINUTES))
                .eTag(String.valueOf(response.hashCode()))
                .body(response);
            
        } catch (Exception e) {
            logger.error("Error retrieving completed matches", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to retrieve completed matches");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", new Date());
            
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorResponse);
        }
    }
}
