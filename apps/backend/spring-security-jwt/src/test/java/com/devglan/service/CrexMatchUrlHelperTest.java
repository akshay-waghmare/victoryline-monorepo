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
    public void extractsStableApiKeyOnlyFromCurrentCrexMatchSlug() {
        String baseUrl = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC";

        assertThat(CrexMatchUrlHelper.extractCrexApiKey(baseUrl)).isEqualTo("11CC");
        assertThat(CrexMatchUrlHelper.extractCrexApiKey(baseUrl + "/match-details")).isNull();
        assertThat(CrexMatchUrlHelper.extractCrexApiKey("https://crex.com/cricket-live-score/vs-match-updates-")).isNull();
    }

    @Test
    public void onlyTreatsShortKeyAliasesAsTheSameMatchFamily() {
        assertThat(CrexMatchUrlHelper.isSameMatchFamily(
                "aus-vs-ban-1st-test-bangladesh-tour-of-australia-2026-match-updates-10MT",
                "aus-vs-ban-1st-match-bangladesh-tour-of-australia-2026-match-updates-10MT"))
                .isTrue();
        assertThat(CrexMatchUrlHelper.isSameMatchFamily(
                "cz-vs-ez-1st-semi-final-duleep-trophy-2026-match-updates-13HY",
                "ban-w-vs-ina-w-4th-match-womens-asia-cup-2026-match-updates-13HY"))
                .isFalse();
    }

    @Test
    public void rejectsPlaceholderCanonicalMatchSlugs() {
        assertThat(CrexMatchUrlHelper.isCanonicalMatchSlug("null-vs-null-1st-match-test-cup-2026")).isFalse();
        assertThat(CrexMatchUrlHelper.isCanonicalMatchSlug("team-1-vs-team-2-1st-match-test-cup-2026")).isFalse();
        assertThat(CrexMatchUrlHelper.isCanonicalMatchSlug("tbd-vs-a-1st-match-test-cup-2026")).isFalse();
    }

    @Test
    public void acceptsRealBareAndStableKeyCanonicalMatchSlugs() {
        assertThat(CrexMatchUrlHelper.isCanonicalMatchSlug("ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025")).isTrue();
        assertThat(CrexMatchUrlHelper.isCanonicalMatchSlug("abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC")).isTrue();
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
