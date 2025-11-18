package com.devglan.service;

import com.devglan.model.CompletedMatchDTO;
import com.devglan.repository.MatchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for match-related operations
 * Feature: 006-completed-matches-display
 */
@Service
public class MatchService {

    private static final Logger logger = LoggerFactory.getLogger(MatchService.class);
    private static final int COMPLETED_MATCHES_LIMIT = 20;

    @Autowired
    private MatchRepository matchRepository;

    /**
     * Get the last 20 completed matches with series information
     * Results are cached in Redis for 5 minutes
     * 
     * @return List of completed matches with series names
     */
    @Cacheable(value = "completedMatches", key = "'last20'")
    @Transactional(readOnly = true)
    public List<CompletedMatchDTO> getCompletedMatches() {
        logger.debug("Fetching top 20 completed matches from database");
        
        Pageable pageable = PageRequest.of(0, COMPLETED_MATCHES_LIMIT);
        List<CompletedMatchDTO> matches = matchRepository.findTop20CompletedMatches(pageable);
        
        logger.info("Retrieved {} completed matches", matches.size());
        return matches;
    }
}
