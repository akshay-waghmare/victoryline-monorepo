package com.devglan.seo;

import com.devglan.scheduler.SitemapScheduler;
import com.devglan.service.seo.GoogleSearchConsoleService;
import com.devglan.service.seo.events.SitemapManifestChangedEvent;
import org.junit.Test;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class SitemapSchedulerTest {

    @Test
    public void sitemap_submission_runs_hourly_not_daily() throws Exception {
        Method method = SitemapScheduler.class.getMethod("submitHourlySitemap");
        Scheduled scheduled = method.getAnnotation(Scheduled.class);

        assertThat(scheduled).isNotNull();
        assertThat(scheduled.cron()).isEqualTo("0 0 * * * *");
    }

    @Test
    public void daily_submission_method_is_renamed_to_hourly() throws Exception {
        boolean hasDaily = false;
        for (Method method : SitemapScheduler.class.getDeclaredMethods()) {
            if (method.getName().equals("submitDailySitemap")) {
                hasDaily = true;
                break;
            }
        }
        assertThat(hasDaily).isFalse();
        assertThat(SitemapScheduler.class.getMethod("submitHourlySitemap")).isNotNull();
    }

    @Test
    public void stable_priority_change_triggers_one_root_sitemap_submission() throws Exception {
        RecordingGoogleSearchConsoleService gsc = new RecordingGoogleSearchConsoleService();
        SitemapScheduler scheduler = new SitemapScheduler(gsc);
        ReflectionTestUtils.setField(scheduler, "gscEnabled", true);
        ReflectionTestUtils.setField(scheduler, "changeSubmissionDelayMs", 0L);

        scheduler.onSitemapManifestChanged(new SitemapManifestChangedEvent(
                7L, System.currentTimeMillis(), true,
                Collections.singletonList("https://www.crickzen.com/cric-live/a-vs-b-1st-match-test-2026-match-updates-7")));

        assertThat(gsc.submissionLatch.await(2, TimeUnit.SECONDS)).isTrue();
        assertThat(gsc.submittedUrl).isEqualTo("https://www.crickzen.com/sitemap.xml");
        scheduler.shutdownChangeSubmissionExecutor();
    }

    private static class RecordingGoogleSearchConsoleService extends GoogleSearchConsoleService {
        private final CountDownLatch submissionLatch = new CountDownLatch(1);
        private String submittedUrl;

        RecordingGoogleSearchConsoleService() {
            super(null);
        }

        @Override
        public boolean isInitialized() {
            return true;
        }

        @Override
        public boolean submitSitemap(String sitemapUrl) {
            submittedUrl = sitemapUrl;
            submissionLatch.countDown();
            return true;
        }
    }
}
