package com.devglan.dao;

public class ScheduledMatchDTO {

    private String url;
    private String externalMatchKey;
    private String status;
    private Long scheduledStartTime;
    private String seriesName;
    private String matchFormat;
    private String resultSummary;
    private Long lastStateUpdatedAt;
    private String venue;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getExternalMatchKey() {
        return externalMatchKey;
    }

    public void setExternalMatchKey(String externalMatchKey) {
        this.externalMatchKey = externalMatchKey;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getScheduledStartTime() {
        return scheduledStartTime;
    }

    public void setScheduledStartTime(Long scheduledStartTime) {
        this.scheduledStartTime = scheduledStartTime;
    }

    public String getSeriesName() {
        return seriesName;
    }

    public void setSeriesName(String seriesName) {
        this.seriesName = seriesName;
    }

    public String getMatchFormat() {
        return matchFormat;
    }

    public void setMatchFormat(String matchFormat) {
        this.matchFormat = matchFormat;
    }

    public String getResultSummary() {
        return resultSummary;
    }

    public void setResultSummary(String resultSummary) {
        this.resultSummary = resultSummary;
    }

    public Long getLastStateUpdatedAt() {
        return lastStateUpdatedAt;
    }

    public void setLastStateUpdatedAt(Long lastStateUpdatedAt) {
        this.lastStateUpdatedAt = lastStateUpdatedAt;
    }

    public String getVenue() {
        return venue;
    }

    public void setVenue(String venue) {
        this.venue = venue;
    }
}
