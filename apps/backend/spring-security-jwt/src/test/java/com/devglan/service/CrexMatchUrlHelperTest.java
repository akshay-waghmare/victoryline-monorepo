package com.devglan.service;

import org.junit.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class CrexMatchUrlHelperTest {

    @Test
    public void extractMatchKeySupportsNewCrexLiveUrls() {
        String baseUrl = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC";

        assertThat(CrexMatchUrlHelper.extractMatchKey(baseUrl))
                .isEqualTo("abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC");
        assertThat(CrexMatchUrlHelper.extractMatchKey(baseUrl + "/match-scorecard"))
                .isEqualTo("abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC");
        assertThat(CrexMatchUrlHelper.extractMatchKey(baseUrl + "/match-details"))
                .isEqualTo("abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC");
    }

    @Test
    public void extractMatchKeySupportsLegacyCrexUrls() {
        String legacyBaseUrl = "https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025";

        assertThat(CrexMatchUrlHelper.extractMatchKey(legacyBaseUrl + "/live"))
                .isEqualTo("ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025");
        assertThat(CrexMatchUrlHelper.extractMatchKey(legacyBaseUrl + "/scorecard"))
                .isEqualTo("ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025");
        assertThat(CrexMatchUrlHelper.extractMatchKey(legacyBaseUrl + "/info"))
                .isEqualTo("ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025");
    }

    @Test
    public void convertsBetweenLegacyAndNewDetailPagesWithoutChangingSlug() {
        String newBaseUrl = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC";
        String legacyLiveUrl = "https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025/live";

        assertThat(CrexMatchUrlHelper.toMatchDetailsUrl(newBaseUrl))
                .isEqualTo(newBaseUrl + "/match-details");
        assertThat(CrexMatchUrlHelper.toMatchDetailsUrl(newBaseUrl + "/match-scorecard"))
                .isEqualTo(newBaseUrl + "/match-details");
        assertThat(CrexMatchUrlHelper.toMatchDetailsUrl(legacyLiveUrl))
                .isEqualTo("https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025/info");

        assertThat(CrexMatchUrlHelper.toMatchScorecardUrl(newBaseUrl))
                .isEqualTo(newBaseUrl + "/match-scorecard");
        assertThat(CrexMatchUrlHelper.toMatchScorecardUrl(newBaseUrl + "/match-details"))
                .isEqualTo(newBaseUrl + "/match-scorecard");
        assertThat(CrexMatchUrlHelper.toMatchScorecardUrl("https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025/info"))
                .isEqualTo("https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025/scorecard");
    }
}
