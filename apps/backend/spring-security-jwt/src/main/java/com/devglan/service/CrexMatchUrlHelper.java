package com.devglan.service;

import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CrexMatchUrlHelper {

    private static final Pattern CREX_API_KEY_PATTERN = Pattern.compile("-match-updates-([A-Za-z0-9]+)$");
    private static final Pattern MATCH_FAMILY_PATTERN = Pattern.compile(
            "^(.+?-vs-.+?)-\\d+(?:st|nd|rd|th)-.*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern SAFE_MATCH_SLUG_PATTERN = Pattern.compile("[A-Za-z0-9&-]+");
    private static final Pattern PLACEHOLDER_TEAM_PATTERN = Pattern.compile(
            "^(?:null|undefined|tbd|tba|unknown|team(?:-(?:1|2|a|b))?)(?:-|$)",
            Pattern.CASE_INSENSITIVE);

    private static final Set<String> TERMINAL_MATCH_SEGMENTS = new HashSet<String>(Arrays.asList(
            "live",
            "scorecard",
            "info",
            "match-scorecard",
            "match-details"));

    private CrexMatchUrlHelper() {
    }

    public static String extractMatchKey(String url) {
        List<String> parts = extractPathSegments(url);
        if (parts.isEmpty()) {
            return null;
        }

        String last = parts.get(parts.size() - 1);
        if (isTerminalSegment(last)) {
            return parts.size() > 1 ? parts.get(parts.size() - 2) : last;
        }

        return last;
    }

    /** Returns CREX's stable key embedded in current match URLs, or null for other URL shapes. */
    public static String extractCrexApiKey(String url) {
        List<String> parts = extractPathSegments(url);
        if (parts.isEmpty()) {
            return null;
        }
        Matcher matcher = CREX_API_KEY_PATTERN.matcher(parts.get(parts.size() - 1));
        return matcher.find() ? matcher.group(1) : null;
    }

    /**
     * Returns whether two human-readable CREX slugs describe the same team
     * pairing. CREX short update keys are not globally unique, so they may be
     * used for aliasing only inside this family (for example, "1st test" and
     * "1st match"), never across unrelated fixtures.
     */
    public static boolean isSameMatchFamily(String firstSlug, String secondSlug) {
        String firstFamily = extractMatchFamilyKey(firstSlug);
        String secondFamily = extractMatchFamilyKey(secondSlug);
        return firstFamily != null && firstFamily.equalsIgnoreCase(secondFamily);
    }

    /**
     * Returns the catalogue identity used for deduplication. CREX's short key
     * is scoped to the teams in the slug because that key can recur in another
     * match, while wording aliases in the same family remain deduplicated.
     */
    public static String matchIdentityKey(String slugOrUrl) {
        String slug = extractMatchKey(slugOrUrl);
        if (!hasText(slug)) {
            return null;
        }
        String stableKey = extractCrexApiKey(slug);
        if (hasText(stableKey)) {
            String family = extractMatchFamilyKey(slug);
            if (hasText(family)) {
                return "crex:" + family + "|" + stableKey.toLowerCase(Locale.ROOT);
            }
        }
        return "slug:" + slug.toLowerCase(Locale.ROOT);
    }

    private static String extractMatchFamilyKey(String slug) {
        if (!hasText(slug)) {
            return null;
        }
        String normalized = slug.trim().toLowerCase(Locale.ROOT);
        Matcher matcher = MATCH_FAMILY_PATTERN.matcher(normalized);
        if (matcher.matches()) {
            return matcher.group(1);
        }
        int updatesMarker = normalized.indexOf("-match-updates-");
        return updatesMarker > 0 ? normalized.substring(0, updatesMarker) : normalized;
    }

    /**
     * Returns whether a slug is safe to publish as the canonical public match
     * route. This rejects placeholder identities before they become sitemap
     * locations or indexable SSR pages.
     */
    public static boolean isCanonicalMatchSlug(String slug) {
        if (!hasText(slug)) {
            return false;
        }
        String normalized = slug.trim();
        if (!SAFE_MATCH_SLUG_PATTERN.matcher(normalized).matches()) {
            return false;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        int separator = lower.indexOf("-vs-");
        if (separator <= 0 || separator + 4 >= lower.length()) {
            return false;
        }
        String firstTeam = lower.substring(0, separator);
        String secondTeamAndSeries = lower.substring(separator + 4);
        return !PLACEHOLDER_TEAM_PATTERN.matcher(firstTeam).matches()
                && !PLACEHOLDER_TEAM_PATTERN.matcher(secondTeamAndSeries).matches();
    }

    /**
     * A syntactically valid slug is not enough to publish a page.  This shared
     * predicate rejects catalogue rows that contain only a lifecycle enum
     * (for example UPCOMING) but no schedule, identity, score, state, or
     * result evidence.
     */
    public static boolean hasCanonicalMatchData(String team1, String team2, String series,
            String venue, Object scheduledAt, String result, String lastKnownState, String score) {
        return hasMeaningfulPair(team1, team2)
                || hasMeaningfulValue(series)
                || hasMeaningfulValue(venue)
                || hasMeaningfulValue(scheduledAt)
                || hasMeaningfulValue(result)
                || hasMeaningfulValue(lastKnownState)
                || hasMeaningfulValue(score);
    }

    public static String toMatchDetailsUrl(String url) {
        if (!hasText(url)) {
            return url;
        }

        String trimmedUrl = url.trim();
        if (endsWithSegment(trimmedUrl, "match-details") || endsWithSegment(trimmedUrl, "info")) {
            return trimmedUrl;
        }
        if (endsWithSegment(trimmedUrl, "match-scorecard")) {
            return replaceLastSegment(trimmedUrl, "match-details");
        }
        if (endsWithSegment(trimmedUrl, "scorecard") || endsWithSegment(trimmedUrl, "live")) {
            return replaceLastSegment(trimmedUrl, "info");
        }
        if (isNewStructure(trimmedUrl)) {
            return appendSegment(trimmedUrl, "match-details");
        }
        return trimmedUrl;
    }

    public static String toMatchScorecardUrl(String url) {
        if (!hasText(url)) {
            return url;
        }

        String trimmedUrl = url.trim();
        if (endsWithSegment(trimmedUrl, "match-scorecard")
                || endsWithSegment(trimmedUrl, "scorecard")
                || endsWithSegment(trimmedUrl, "live")) {
            return trimmedUrl;
        }
        if (endsWithSegment(trimmedUrl, "match-details")) {
            return replaceLastSegment(trimmedUrl, "match-scorecard");
        }
        if (endsWithSegment(trimmedUrl, "info")) {
            return replaceLastSegment(trimmedUrl, "scorecard");
        }
        if (trimmedUrl.contains("/scoreboard/")) {
            return appendSegment(trimmedUrl, "scorecard");
        }
        if (isNewStructure(trimmedUrl)) {
            return appendSegment(trimmedUrl, "match-scorecard");
        }
        return trimmedUrl;
    }

    private static List<String> extractPathSegments(String url) {
        if (!hasText(url)) {
            return java.util.Collections.emptyList();
        }

        String candidate = url.trim();
        try {
            URI uri = URI.create(candidate);
            if (hasText(uri.getPath())) {
                candidate = uri.getPath();
            }
        } catch (IllegalArgumentException ex) {
            int queryIndex = candidate.indexOf('?');
            if (queryIndex >= 0) {
                candidate = candidate.substring(0, queryIndex);
            }
            int fragmentIndex = candidate.indexOf('#');
            if (fragmentIndex >= 0) {
                candidate = candidate.substring(0, fragmentIndex);
            }
        }

        return Arrays.stream(candidate.split("/"))
                .filter(CrexMatchUrlHelper::hasText)
                .collect(Collectors.toList());
    }

    private static boolean isTerminalSegment(String segment) {
        return hasText(segment) && TERMINAL_MATCH_SEGMENTS.contains(segment.toLowerCase(Locale.ROOT));
    }

    private static boolean isNewStructure(String url) {
        List<String> parts = extractPathSegments(url);
        return !parts.isEmpty() && "cricket-live-score".equalsIgnoreCase(parts.get(0));
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static boolean hasMeaningfulPair(String first, String second) {
        return hasMeaningfulValue(first) && hasMeaningfulValue(second);
    }

    private static boolean hasMeaningfulValue(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Number && ((Number) value).doubleValue() <= 0d) {
            return false;
        }
        String normalized = String.valueOf(value).trim();
        return !normalized.isEmpty()
                && !"null".equalsIgnoreCase(normalized)
                && !"undefined".equalsIgnoreCase(normalized)
                && !"no match name".equalsIgnoreCase(normalized)
                && !"no venue".equalsIgnoreCase(normalized)
                && !"no data".equalsIgnoreCase(normalized);
    }

    private static boolean endsWithSegment(String url, String segment) {
        return url.toLowerCase(Locale.ROOT).endsWith("/" + segment.toLowerCase(Locale.ROOT));
    }

    private static String replaceLastSegment(String url, String replacement) {
        int slashIndex = url.lastIndexOf('/');
        if (slashIndex < 0) {
            return replacement;
        }
        return url.substring(0, slashIndex + 1) + replacement;
    }

    private static String appendSegment(String url, String segment) {
        return url.endsWith("/") ? url + segment : url + "/" + segment;
    }
}
