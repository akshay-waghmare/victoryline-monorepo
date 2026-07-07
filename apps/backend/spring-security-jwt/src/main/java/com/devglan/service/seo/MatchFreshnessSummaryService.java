package com.devglan.service.seo;

import com.devglan.dao.CricketDataDTO;
import com.devglan.dao.FreshnessEventDTO;
import com.devglan.dao.FreshnessSummaryDTO;
import com.devglan.websocket.service.CricketDataService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class MatchFreshnessSummaryService {
    private static final int MAX_UPDATES = 6;
    private static final int MAX_KEY_EVENTS = 4;

    private final CricketDataService cricketDataService;

    public MatchFreshnessSummaryService(CricketDataService cricketDataService) {
        this.cricketDataService = cricketDataService;
    }

    public FreshnessSummaryDTO buildSummary(String url, String pageType) {
        CricketDataDTO snapshot = cricketDataService.getLastUpdatedData(url);
        FreshnessSummaryDTO summary = new FreshnessSummaryDTO();
        summary.setUrl(url);
        summary.setPageType(normalizePageType(pageType));

        if (snapshot == null) {
            summary.setHeroSummary("");
            summary.setMatchDevelopmentSummary("");
            return summary;
        }

        List<FreshnessEventDTO> liveUpdates = buildLiveUpdates(snapshot);
        List<FreshnessEventDTO> keyEvents = liveUpdates.size() <= MAX_KEY_EVENTS
                ? new ArrayList<>(liveUpdates)
                : new ArrayList<>(liveUpdates.subList(0, MAX_KEY_EVENTS));

        if (keyEvents.isEmpty()) {
            FreshnessEventDTO tossEvent = buildTossEvent(snapshot);
            if (tossEvent != null) {
                keyEvents.add(tossEvent);
            }
        }

        Long meaningfulUpdatedAt = resolveMeaningfulUpdatedAt(snapshot, pageType, liveUpdates, keyEvents);
        String scoreSummary = buildScoreSummary(snapshot);
        String heroSummary = buildHeroSummary(snapshot, pageType, keyEvents);
        String developmentSummary = buildDevelopmentSummary(snapshot, scoreSummary, keyEvents);

        summary.setScoreSummary(scoreSummary);
        summary.setHeroSummary(heroSummary);
        summary.setMatchDevelopmentSummary(developmentSummary);
        summary.setMeaningfulUpdatedAt(meaningfulUpdatedAt);
        summary.setKeyEvents(keyEvents);
        summary.setLiveUpdates(liveUpdates);
        return summary;
    }

    public Long resolveMeaningfulUpdatedAt(String url, String pageType) {
        return buildSummary(url, pageType).getMeaningfulUpdatedAt();
    }

    private String normalizePageType(String pageType) {
        if ("result".equalsIgnoreCase(pageType)) {
            return "result";
        }
        if ("live-updates".equalsIgnoreCase(pageType)) {
            return "live-updates";
        }
        return "preview";
    }

    private List<FreshnessEventDTO> buildLiveUpdates(CricketDataDTO snapshot) {
        List<Map<String, Object>> commentary = snapshot.getCommentary();
        if (commentary == null || commentary.isEmpty()) {
            return Collections.emptyList();
        }

        List<FreshnessEventDTO> events = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (Map<String, Object> entry : commentary) {
            if (!isMeaningfulCommentaryEntry(entry)) {
                continue;
            }

            FreshnessEventDTO event = toEvent(entry, snapshot);
            if (event == null || event.getSummary() == null || event.getSummary().isEmpty()) {
                continue;
            }

            String dedupeKey = event.getIntent() + "|" + event.getSummary();
            if (seen.contains(dedupeKey)) {
                continue;
            }
            seen.add(dedupeKey);
            events.add(event);
            if (events.size() >= MAX_UPDATES) {
                break;
            }
        }
        return events;
    }

    private FreshnessEventDTO toEvent(Map<String, Object> entry, CricketDataDTO snapshot) {
        String text = cleanText(entry.get("text"));
        if (text.isEmpty()) {
            return null;
        }

        FreshnessEventDTO event = new FreshnessEventDTO();
        String intent = detectIntent(entry, text);
        event.setIntent(intent);
        event.setLabel(buildLabel(intent, entry));
        event.setSummary(text);
        event.setTimestamp(resolveEntryTimestamp(entry, snapshot));
        return event;
    }

    private boolean isMeaningfulCommentaryEntry(Map<String, Object> entry) {
        if (entry == null) {
            return false;
        }
        String type = stringValue(entry.get("type")).toUpperCase(Locale.ROOT);
        String text = cleanText(entry.get("text"));
        if (text.isEmpty()) {
            return false;
        }
        if ("WICKET".equals(type) || "OVER_SUMMARY".equals(type) || "BOUNDARY".equals(type)) {
            return true;
        }
        return text.matches("(?i).*(toss|won the toss|review|rain|innings break|target|needs|required rate|fifty|hundred|partnership|six|four|boundary|wicket|wins by|won by|stumps).*");
    }

    private String detectIntent(Map<String, Object> entry, String text) {
        String type = stringValue(entry.get("type")).toUpperCase(Locale.ROOT);
        if (text.matches("(?i).*toss.*")) {
            return "toss";
        }
        if ("WICKET".equals(type) || text.matches("(?i).*(wicket|\\bout\\b).*")) {
            return "wicket";
        }
        if (text.matches("(?i).*(innings break|stumps|tea|lunch).*")) {
            return "innings-break";
        }
        if (text.matches("(?i).*(rain|bad light|weather).*")) {
            return "weather";
        }
        if (text.matches("(?i).*(fifty|hundred|milestone|partnership).*")) {
            return "milestone";
        }
        if (text.matches("(?i).*(target|needs|required rate|equation).*")) {
            return "chase";
        }
        if ("BOUNDARY".equals(type) || text.matches("(?i).*(four|six|boundary).*")) {
            return "boundary";
        }
        return "live-update";
    }

    private String buildLabel(String intent, Map<String, Object> entry) {
        if ("toss".equals(intent)) {
            return "Toss update";
        }
        if ("wicket".equals(intent)) {
            return "Wicket moment";
        }
        if ("innings-break".equals(intent)) {
            return "Innings change";
        }
        if ("weather".equals(intent)) {
            return "Weather update";
        }
        if ("milestone".equals(intent)) {
            return "Milestone";
        }
        if ("chase".equals(intent)) {
            return "Chase pressure";
        }
        if ("boundary".equals(intent)) {
            return "Boundary burst";
        }
        String overBall = stringValue(entry.get("overBall"));
        if (!overBall.isEmpty()) {
            return overBall;
        }
        return "Match update";
    }

    private Long resolveMeaningfulUpdatedAt(CricketDataDTO snapshot, String pageType, List<FreshnessEventDTO> liveUpdates, List<FreshnessEventDTO> keyEvents) {
        String normalizedPageType = normalizePageType(pageType);
        if ("live-updates".equals(normalizedPageType)) {
            for (FreshnessEventDTO event : liveUpdates) {
                if (event.getTimestamp() != null && event.getTimestamp() > 0) {
                    return event.getTimestamp();
                }
            }
        }

        if ("preview".equals(normalizedPageType)) {
            if (hasMeaningfulPrematchSignal(snapshot)) {
                return firstPositive(
                        snapshot.getUpdatedTimeStamp(),
                        snapshot.getLastUpdated(),
                        parseLong(snapshot.getMatchDate())
                );
            }
            return parseLong(snapshot.getMatchDate());
        }

        if (hasMeaningfulResultSignal(snapshot, keyEvents)) {
            return firstPositive(
                    snapshot.getUpdatedTimeStamp(),
                    snapshot.getLastUpdated(),
                    parseLong(snapshot.getMatchDate())
            );
        }

        return firstPositive(
                snapshot.getUpdatedTimeStamp(),
                snapshot.getLastUpdated(),
                parseLong(snapshot.getMatchDate())
        );
    }

    private boolean hasMeaningfulPrematchSignal(CricketDataDTO snapshot) {
        return !stringValue(snapshot.getTossInfo()).isEmpty()
                || (snapshot.getPlayingXI() != null && !snapshot.getPlayingXI().isEmpty())
                || !stringValue(snapshot.getVenue()).isEmpty();
    }

    private boolean hasMeaningfulResultSignal(CricketDataDTO snapshot, List<FreshnessEventDTO> keyEvents) {
        return !stringValue(snapshot.getFinalResultText()).isEmpty()
                || !stringValue(snapshot.getMatchAnnouncement()).isEmpty()
                || !keyEvents.isEmpty()
                || !buildScoreSummary(snapshot).isEmpty();
    }

    private FreshnessEventDTO buildTossEvent(CricketDataDTO snapshot) {
        String toss = stringValue(snapshot.getTossInfo());
        if (toss.isEmpty()) {
            return null;
        }
        FreshnessEventDTO event = new FreshnessEventDTO();
        event.setLabel("Toss update");
        event.setIntent("toss");
        event.setSummary(toss);
        event.setTimestamp(firstPositive(snapshot.getUpdatedTimeStamp(), snapshot.getLastUpdated()));
        return event;
    }

    private String buildHeroSummary(CricketDataDTO snapshot, String pageType, List<FreshnessEventDTO> keyEvents) {
        String teams = extractTeamsLabel(snapshot.getMatchName(), snapshot.getUrl());
        String normalizedPageType = normalizePageType(pageType);
        if ("result".equals(normalizedPageType)) {
            String result = firstNonEmpty(stringValue(snapshot.getFinalResultText()), stringValue(snapshot.getMatchAnnouncement()));
            if (!result.isEmpty()) {
                return teams + " result coverage now includes " + result + ".";
            }
            return teams + " result page with recap context and a direct path back to the canonical full scorecard.";
        }
        if ("live-updates".equals(normalizedPageType)) {
            if (!keyEvents.isEmpty()) {
                return teams + " stays covered here with live updates, match-day context, and the latest key moment: " + keyEvents.get(0).getSummary() + ".";
            }
            return teams + " stays covered here with live updates, match-day context, and a direct path back to the full scorecard.";
        }
        return teams + " heads into this preview with venue context, toss timing, likely playing XI angles, and a direct path back to the canonical live score page.";
    }

    private String buildDevelopmentSummary(CricketDataDTO snapshot, String scoreSummary, List<FreshnessEventDTO> keyEvents) {
        List<String> parts = new ArrayList<>();
        if (!scoreSummary.isEmpty()) {
            parts.add(scoreSummary);
        }
        for (int index = 0; index < keyEvents.size() && index < 2; index++) {
            parts.add(keyEvents.get(index).getSummary());
        }
        if (parts.isEmpty()) {
            return "Fresh match developments will be summarized here once the feed produces meaningful visible events.";
        }
        return String.join(". ", parts);
    }

    private String buildScoreSummary(CricketDataDTO snapshot) {
        List<String> parts = new ArrayList<>();
        if (!stringValue(snapshot.getScore()).isEmpty()) {
            String score = snapshot.getScore();
            if (!stringValue(snapshot.getBattingTeamName()).isEmpty()) {
                parts.add(snapshot.getBattingTeamName() + " " + score);
            } else {
                parts.add(score);
            }
        }
        if (!stringValue(snapshot.getCurrentRunRate()).isEmpty()) {
            parts.add("CRR " + snapshot.getCurrentRunRate());
        }
        if (!stringValue(snapshot.getOver()).isEmpty()) {
            parts.add("Over " + snapshot.getOver());
        }
        return String.join(" | ", parts);
    }

    private Long resolveEntryTimestamp(Map<String, Object> entry, CricketDataDTO snapshot) {
        List<Long> candidates = new ArrayList<>();
        candidates.add(parseLong(entry.get("updatedAt")));
        candidates.add(parseLong(entry.get("updated_at")));
        candidates.add(parseLong(entry.get("createdAt")));
        candidates.add(parseLong(entry.get("created_at")));
        candidates.add(parseLong(entry.get("timestamp")));
        candidates.add(snapshot.getUpdatedTimeStamp());
        candidates.add(snapshot.getLastUpdated());
        for (Long candidate : candidates) {
            if (candidate != null && candidate > 0) {
                return candidate;
            }
        }
        return null;
    }

    private Long firstPositive(Long... values) {
        if (values == null) {
            return null;
        }
        for (Long value : values) {
            if (value != null && value > 0) {
                return value;
            }
        }
        return null;
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        String text = stringValue(value);
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String extractTeamsLabel(String matchName, String url) {
        if (matchName != null && !matchName.trim().isEmpty()) {
            return matchName.trim();
        }
        String slug = LiveMatchesServiceSlugHelper.extractSlug(url);
        if (slug.isEmpty()) {
            return "Cricket match";
        }
        return slug.replace("-match-updates", "").replace('-', ' ').trim();
    }

    private String firstNonEmpty(String first, String second) {
        return first.isEmpty() ? second : first;
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String cleanText(Object value) {
        return stringValue(value).replaceAll("<[^>]*>", "").replace("&nbsp;", " ").replaceAll("\\s+", " ").trim();
    }

    /**
     * Small local helper to avoid coupling this service to frontend slug utilities.
     */
    static class LiveMatchesServiceSlugHelper {
        static String extractSlug(String url) {
            if (url == null || url.trim().isEmpty()) {
                return "";
            }
            String clean = url.trim();
            int query = clean.indexOf('?');
            if (query >= 0) {
                clean = clean.substring(0, query);
            }
            String[] parts = clean.split("/");
            for (int i = parts.length - 1; i >= 0; i--) {
                String part = parts[i].trim();
                if (part.contains("-vs-")) {
                    return part;
                }
            }
            return "";
        }
    }
}
