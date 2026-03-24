package com.devglan.dao;

import java.util.List;

public class PlayerStatsIngestionRequest {

    private String url;
    private String matchExternalKey;
    private String source;
    private Long capturedAt;
    private PlayerStatsSeriesDTO series;
    private List<PlayerStatsTeamDTO> teams;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getMatchExternalKey() {
        return matchExternalKey;
    }

    public void setMatchExternalKey(String matchExternalKey) {
        this.matchExternalKey = matchExternalKey;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Long getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(Long capturedAt) {
        this.capturedAt = capturedAt;
    }

    public PlayerStatsSeriesDTO getSeries() {
        return series;
    }

    public void setSeries(PlayerStatsSeriesDTO series) {
        this.series = series;
    }

    public List<PlayerStatsTeamDTO> getTeams() {
        return teams;
    }

    public void setTeams(List<PlayerStatsTeamDTO> teams) {
        this.teams = teams;
    }
}
