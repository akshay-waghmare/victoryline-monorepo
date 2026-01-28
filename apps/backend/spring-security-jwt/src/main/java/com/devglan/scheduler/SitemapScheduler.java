package com.devglan.scheduler;

import com.devglan.service.seo.GoogleSearchConsoleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

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
    
    @Value("${gsc.sitemap-url:https://www.crickzen.com/sitemap.xml}")
    private String sitemapUrl;
    
    @Value("${gsc.enabled:false}")
    private boolean gscEnabled;
    
    /**
     * Constructor injection for GoogleSearchConsoleService (T036)
     */
    public SitemapScheduler(GoogleSearchConsoleService googleSearchConsoleService) {
        this.googleSearchConsoleService = googleSearchConsoleService;
    }
    
    /**
     * Submit sitemap to Google Search Console daily at 3 AM (T035)
     * 
     * Cron expression: "0 0 3 * * *"
     * - Second: 0
     * - Minute: 0
     * - Hour: 3 (3 AM)
     * - Day of Month: * (every day)
     * - Month: * (every month)
     * - Day of Week: * (every day)
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void submitDailySitemap() {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMAT);
        
        // T038: INFO logging for job start
        logger.info("[SitemapScheduler] Starting daily sitemap submission at {}", timestamp);
        
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
                logger.info("[SitemapScheduler] Daily sitemap submission SUCCESSFUL: {} at {}", 
                    sitemapUrl, timestamp);
            } else {
                // T038: ERROR logging for failed submission
                logger.error("[SitemapScheduler] Daily sitemap submission FAILED: {} at {}", 
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
        status.append("  Schedule: Daily at 3:00 AM\n");
        return status.toString();
    }
}
