package com.devglan.dao;

import java.util.ArrayList;
import java.util.List;

public class FreshnessSummaryDTO {
    private String url;
    private String pageType;
    private String heroSummary;
    private String scoreSummary;
    private String matchDevelopmentSummary;
    private Long meaningfulUpdatedAt;
    private List<FreshnessEventDTO> keyEvents = new ArrayList<>();
    private List<FreshnessEventDTO> liveUpdates = new ArrayList<>();

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPageType() {
        return pageType;
    }

    public void setPageType(String pageType) {
        this.pageType = pageType;
    }

    public String getHeroSummary() {
        return heroSummary;
    }

    public void setHeroSummary(String heroSummary) {
        this.heroSummary = heroSummary;
    }

    public String getScoreSummary() {
        return scoreSummary;
    }

    public void setScoreSummary(String scoreSummary) {
        this.scoreSummary = scoreSummary;
    }

    public String getMatchDevelopmentSummary() {
        return matchDevelopmentSummary;
    }

    public void setMatchDevelopmentSummary(String matchDevelopmentSummary) {
        this.matchDevelopmentSummary = matchDevelopmentSummary;
    }

    public Long getMeaningfulUpdatedAt() {
        return meaningfulUpdatedAt;
    }

    public void setMeaningfulUpdatedAt(Long meaningfulUpdatedAt) {
        this.meaningfulUpdatedAt = meaningfulUpdatedAt;
    }

    public List<FreshnessEventDTO> getKeyEvents() {
        return keyEvents;
    }

    public void setKeyEvents(List<FreshnessEventDTO> keyEvents) {
        this.keyEvents = keyEvents;
    }

    public List<FreshnessEventDTO> getLiveUpdates() {
        return liveUpdates;
    }

    public void setLiveUpdates(List<FreshnessEventDTO> liveUpdates) {
        this.liveUpdates = liveUpdates;
    }
}
