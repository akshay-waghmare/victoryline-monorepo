package com.devglan.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devglan.model.LiveMatch;
import com.devglan.service.LiveMatchService;

/**
 * Match Controller
 * Purpose: REST API endpoints for match data
 * Created: December 7, 2025
 * Feature: 008-completed-matches (US1)
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/matches")
public class MatchController {

	private static final Logger logger = LoggerFactory.getLogger(MatchController.class);

	@Autowired
	private LiveMatchService liveMatchService;

	/**
	 * Get up to 20 most recently completed matches
	 * Endpoint: GET /api/v1/matches/completed
	 * Feature: 008-completed-matches (US1 - T013)
	 * 
	 * @return List of completed matches (isDeleted=true) ordered by most recent first
	 */
	@GetMapping("/completed")
	public ResponseEntity<?> getCompletedMatches() {
		try {
			logger.info("Fetching completed matches");
			
			// Use service method that queries with LIMIT 20 and ORDER BY id DESC
			List<LiveMatch> completedMatches = liveMatchService.getCompletedMatches();
			
			logger.info("Returning {} completed matches", completedMatches.size());
			return ResponseEntity.ok(completedMatches);
			
		} catch (Exception e) {
			logger.error("Error fetching completed matches: ", e);
			// Feature 008-completed-matches (US1 - T014: Error handling)
			return ResponseEntity
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body("Unable to load completed matches. Please try again later.");
		}
	}
}
