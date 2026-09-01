package com.devglan.scheduler;

import com.devglan.service.seo.GoogleSearchConsoleService;
import com.devglan.service.seo.events.SitemapManifestChangedEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import javax.annotation.PreDestroy;

/**
 * Scheduled job for automated sitemap submission to Google Search Console
 * Feature 008 - Match Page Title SEO Optimization
 * 
 * T034: Create SitemapScheduler class
 * T035: @Scheduled annotation for daily 3 AM execution
 * T036: Wire GoogleSearchConsoleService via constructor injection
 * T037: Call submitSitemap() in scheduled job
 * T038: Logging for GSC API calls
 */
@Component
public class SitemapScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(SitemapScheduler.class);
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    private final GoogleSearchConsoleService googleSearchConsoleService;
    private final ScheduledExecutorService changeSubmissionExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "crickzen-sitemap-submitter");
        thread.setDaemon(true);
        return thread;
    });
    private final Object changeSubmissionLock = new Object();
    private volatile long latestPriorityGeneration;
    private ScheduledFuture<?> pendingChangeSubmission;
    
    @Value("${gsc.sitemap-url:https://www.crickzen.com/sitemap.xml}")
    private String sitemapUrl = "https://www.crickzen.com/sitemap.xml";
    
    @Value("${gsc.enabled:false}")
    private boolean gscEnabled = false;

    @Value("${seo.sitemap-change-submit-delay-ms:30000}")
    private long changeSubmissionDelayMs = 30000L;

    /**
     * Constructor injection for GoogleSearchConsoleService (T036)
     */
    @Autowired
    public SitemapScheduler(GoogleSearchConsoleService googleSearchConsoleService) {
        this.googleSearchConsoleService = googleSearchConsoleService;
    }

    /**
     * Submit a newly generated priority sitemap after a short quiet period.
     * Multiple score/lifecycle updates during the quiet period coalesce into
     * one root-sitemap submission; the hourly job remains the backstop.
     */
    @EventListener
    public void onSitemapManifestChanged(SitemapManifestChangedEvent event) {
        if (event == null || !event.isPrioritySitemapChanged() || !gscEnabled) {
            return;
        }

        synchronized (changeSubmissionLock) {
            latestPriorityGeneration = event.getGenerationId();
            if (pendingChangeSubmission != null) {
                pendingChangeSubmission.cancel(false);
            }
            final long generation = latestPriorityGeneration;
            pendingChangeSubmission = changeSubmissionExecutor.schedule(
                    () -> submitStablePrioritySitemap(generation),
                    Math.max(0L, changeSubmissionDelayMs), TimeUnit.MILLISECONDS);
        }
    }

    private void submitStablePrioritySitemap(long generation) {
        synchronized (changeSubmissionLock) {
            if (generation != latestPriorityGeneration) {
                return;
            }
            pendingChangeSubmission = null;
        }

        if (!gscEnabled || !googleSearchConsoleService.isInitialized()) {
            logger.warn("[SitemapScheduler] Skipping change-triggered submission for generation {} because GSC is unavailable", generation);
            return;
        }

        boolean success = googleSearchConsoleService.submitSitemap(sitemapUrl);
        if (success) {
            logger.info("[SitemapScheduler] Change-triggered sitemap submission SUCCESSFUL for stable generation {}", generation);
        } else {
            logger.error("[SitemapScheduler] Change-triggered sitemap submission FAILED for stable generation {}", generation);
        }
    }

    @PreDestroy
    public void shutdownChangeSubmissionExecutor() {
        changeSubmissionExecutor.shutdownNow();
    }
    
    /**
     * Submit sitemap to Google Search Console every hour.
     *
     * Cron expression: "0 0 * * * *"
     * - Second: 0
     * - Minute: 0
     * - Hour: * (every hour)
     * - Day of Month: * (every day)
     * - Month: * (every month)
     * - Day of Week: * (every day)
     *
     * Search Console API quota is 200 req/100s and 200,000/day; hourly
     * submission (24/day) is well within the ceiling and ensures newly
     * discovered fixtures prompt a re-fetch within ~1 hour instead of ~24.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void submitHourlySitemap() {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMAT);
        
        // T038: INFO logging for job start
        logger.info("[SitemapScheduler] Starting hourly sitemap submission at {}", timestamp);
        
        if (!gscEnabled) {
            logger.info("[SitemapScheduler] GSC integration disabled (gsc.enabled=false), skipping submission");
            return;
        }
        
        if (!googleSearchConsoleService.isInitialized()) {
            // T038: ERROR logging for initialization failure
            logger.error("[SitemapScheduler] GSC service not initialized, cannot submit sitemap");
            return;
        }
        
        try {
            // T037: Call submitSitemap method
            boolean success = googleSearchConsoleService.submitSitemap(sitemapUrl);
            
            if (success) {
                // T038: INFO logging for successful submission
                logger.info("[SitemapScheduler] Hourly sitemap submission SUCCESSFUL: {} at {}", 
                    sitemapUrl, timestamp);
            } else {
                // T038: ERROR logging for failed submission
                logger.error("[SitemapScheduler] Hourly sitemap submission FAILED: {} at {}", 
                    sitemapUrl, timestamp);
            }
            
        } catch (Exception e) {
            // T038: ERROR logging with exception details
            logger.error("[SitemapScheduler] Unexpected error during sitemap submission: {}", 
                e.getMessage(), e);
        }
    }
    
    /**
     * Manual trigger for sitemap submission (useful for testing)
     * Can be called from a controller endpoint or management actuator
     * 
     * @return true if submission was successful
     */
    public boolean triggerManualSubmission() {
        logger.info("[SitemapScheduler] Manual sitemap submission triggered");
        
        if (!gscEnabled) {
            logger.warn("[SitemapScheduler] GSC integration disabled, cannot perform manual submission");
            return false;
        }
        
        return googleSearchConsoleService.submitSitemap(sitemapUrl);
    }
    
    /**
     * Check the status of the scheduler and GSC integration
     * 
     * @return Status information string
     */
    public String getStatus() {
        StringBuilder status = new StringBuilder();
        status.append("SitemapScheduler Status:\n");
        status.append("  GSC Enabled: ").append(gscEnabled).append("\n");
        status.append("  GSC Initialized: ").append(googleSearchConsoleService.isInitialized()).append("\n");
        status.append("  Sitemap URL: ").append(sitemapUrl).append("\n");
        status.append("  Site URL: ").append(googleSearchConsoleService.getSiteUrl()).append("\n");
        status.append("  Schedule: Every hour at :00\n");
        return status.toString();
    }
}
