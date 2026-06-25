package com.devglan.seo;

import com.devglan.scheduler.SitemapScheduler;
import com.devglan.service.seo.GoogleSearchConsoleService;
import org.junit.Test;
import org.springframework.scheduling.annotation.Scheduled;

import java.lang.reflect.Method;

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
}
