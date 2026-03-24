package com.devglan.dao;

import java.util.List;

public class PlayerStatsMatchViewDTO {

    private String url;
    private String matchExternalKey;
    private Long liveMatchId;
    private String source;
    private PlayerStatsSeriesDTO series;
    private List<PlayerStatsTeamViewDTO> teams;

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

    public Long getLiveMatchId() {
        return liveMatchId;
    }

    public void setLiveMatchId(Long liveMatchId) {
        this.liveMatchId = liveMatchId;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public PlayerStatsSeriesDTO getSeries() {
        return series;
    }

    public void setSeries(PlayerStatsSeriesDTO series) {
        this.series = series;
    }

    public List<PlayerStatsTeamViewDTO> getTeams() {
        return teams;
    }

    public void setTeams(List<PlayerStatsTeamViewDTO> teams) {
        this.teams = teams;
    }
}
