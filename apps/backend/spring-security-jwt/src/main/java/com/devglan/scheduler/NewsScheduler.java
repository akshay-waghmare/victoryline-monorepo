package com.devglan.scheduler;

import com.devglan.service.CricketNewsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Scheduled job to refresh cricket news from RapidAPI.
 * Runs every 4 hours (6 requests/day, well within 100/day free tier limit).
 */
@Component
public class NewsScheduler {

    private static final Logger logger = LoggerFactory.getLogger(NewsScheduler.class);

    private final CricketNewsService cricketNewsService;

    public NewsScheduler(CricketNewsService cricketNewsService) {
        this.cricketNewsService = cricketNewsService;
    }

    @Scheduled(fixedRate = 14400000) // 4 hours in milliseconds
    public void refreshNews() {
        logger.info("Scheduled news refresh started at {}",
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        try {
            int count = cricketNewsService.refreshNews();
            logger.info("Scheduled news refresh completed: {} new articles", count);
        } catch (Exception e) {
            logger.error("Scheduled news refresh failed: {}", e.getMessage(), e);
        }
    }
}
