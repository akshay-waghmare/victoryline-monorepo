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
