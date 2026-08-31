package com.devglan.scheduler;

import com.devglan.service.seo.IndexNowService;
import com.devglan.service.seo.SitemapService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class PriorityMatchIndexNowScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(PriorityMatchIndexNowScheduler.class);

    private final SitemapService sitemapService;
    private final IndexNowService indexNowService;
    private volatile List<String> lastSubmittedUrls = Collections.emptyList();
    private volatile long lastSubmittedEpochMs;

    @Value("${seo.indexnow.resubmit-after-ms:3600000}")
    private long resubmitAfterMs;

    public PriorityMatchIndexNowScheduler(SitemapService sitemapService, IndexNowService indexNowService) {
        this.sitemapService = sitemapService;
        this.indexNowService = indexNowService;
    }

    @Scheduled(
            fixedDelayString = "${seo.indexnow.interval-ms:900000}",
            initialDelayString = "${seo.indexnow.initial-delay-ms:60000}")
    public void submitPriorityMatches() {
        submit(false);
    }

    public boolean triggerManualSubmission() {
        return submit(true);
    }

    private synchronized boolean submit(boolean force) {
        if (!indexNowService.isConfigured()) {
            return false;
        }
        List<String> urls = new ArrayList<>(sitemapService.getPriorityMatchUrls());
        if (urls.isEmpty()) {
            LOGGER.warn("IndexNow priority submission skipped because the priority sitemap is empty");
            return false;
        }
        long now = System.currentTimeMillis();
        boolean unchangedAndRecent = urls.equals(lastSubmittedUrls)
                && now - lastSubmittedEpochMs < Math.max(60000L, resubmitAfterMs);
        if (!force && unchangedAndRecent) {
            return true;
        }
        boolean accepted = indexNowService.submitUrls(urls);
        if (accepted) {
            lastSubmittedUrls = Collections.unmodifiableList(new ArrayList<>(urls));
            lastSubmittedEpochMs = now;
        }
        return accepted;
    }
}
