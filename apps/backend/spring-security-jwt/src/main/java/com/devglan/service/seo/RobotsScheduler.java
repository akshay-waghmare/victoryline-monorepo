package com.devglan.service.seo;

import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;

/**
 * Scheduled job to flip completed live match pages to noindex after grace period
 * 
 * Strategy:
 * - During match + 7 days: keep live page indexed (preserve social shares)
 * - After 7 days: flip to noindex,follow (consolidate authority to final URL)
 * 
 * Runs daily at 3 AM server time
 */
@Service
public class RobotsScheduler {

    private static final Logger logger = LoggerFactory.getLogger(RobotsScheduler.class);
    private static final int GRACE_PERIOD_DAYS = 7;

    @Autowired(required = false)
    private MatchRepository matchRepository;

    /**
     * Scans completed matches and marks those past grace period for noindex
     * Runs daily at 3:00 AM
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void processExpiredLivePages() {
        if (matchRepository == null) {
            logger.warn("MatchRepository not available, skipping robots scheduler");
            return;
        }

        try {
            logger.info("Starting robots scheduler: checking matches for noindex flip");
            
            // Calculate cutoff date (7 days ago)
            Instant cutoff = Instant.now().minus(GRACE_PERIOD_DAYS, ChronoUnit.DAYS);
            Date cutoffDate = Date.from(cutoff);

            // Find completed matches past grace period that are still visible
            List<Matches> matches = matchRepository.findByVisibilityTrue();
            int flippedCount = 0;

            for (Matches match : matches) {
                if (shouldFlipToNoindex(match, cutoffDate)) {
                    logger.info("Flipping match {} to noindex (completed: {})", 
                        match.getMatchLink(), match.getMatchDate());
                    
                    // Mark for noindex by setting visibility flag
                    // Frontend SSR will respect this and set robots=noindex,follow
                    match.setVisibility(false);
                    matchRepository.save(match);
                    flippedCount++;
                }
            }

            logger.info("Robots scheduler completed: {} matches flipped to noindex", flippedCount);

        } catch (Exception e) {
            logger.error("Error in robots scheduler", e);
        }
    }

    /**
     * Determines if a match should be flipped to noindex
     * 
     * Criteria:
     * - Match status is "completed"
     * - Match date is before cutoff (> 7 days ago)
     * - Currently visible (indexed)
     */
    private boolean shouldFlipToNoindex(Matches match, Date cutoffDate) {
        if (match.getMatchDate() == null) {
            return false;
        }

        if (match.getMatchStatus() == null || !match.getMatchStatus().equalsIgnoreCase("completed")) {
            return false;
        }

        return match.getMatchDate().before(cutoffDate);
    }

    /**
     * Manual trigger for testing/admin purposes
     * Can be exposed via REST endpoint if needed
     */
    public void triggerManually() {
        logger.info("Manual trigger of robots scheduler");
        processExpiredLivePages();
    }
}
