package com.devglan.dao;

import java.util.List;

public class PlayerStatsReferenceIngestionRequest {

    private String url;
    private String source;
    private Long capturedAt;
    private PlayerStatsSeriesDTO series;
    private PlayerStatsTeamDTO team;
    private PlayerStatsPlayerDTO player;
    private List<PlayerStatsPayloadDTO> snapshots;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
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

    public PlayerStatsTeamDTO getTeam() {
        return team;
    }

    public void setTeam(PlayerStatsTeamDTO team) {
        this.team = team;
    }

    public PlayerStatsPlayerDTO getPlayer() {
        return player;
    }

    public void setPlayer(PlayerStatsPlayerDTO player) {
        this.player = player;
    }

    public List<PlayerStatsPayloadDTO> getSnapshots() {
        return snapshots;
    }

    public void setSnapshots(List<PlayerStatsPayloadDTO> snapshots) {
        this.snapshots = snapshots;
    }
}
