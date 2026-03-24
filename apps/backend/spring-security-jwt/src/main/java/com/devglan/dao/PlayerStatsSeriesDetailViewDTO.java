package com.devglan.dao;

import java.util.List;

public class PlayerStatsSeriesDetailViewDTO {

    private String url;
    private String source;
    private PlayerStatsSeriesDTO series;
    private List<PlayerStatsSnapshotViewDTO> standings;
    private List<PlayerStatsSnapshotViewDTO> stats;

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

    public PlayerStatsSeriesDTO getSeries() {
        return series;
    }

    public void setSeries(PlayerStatsSeriesDTO series) {
        this.series = series;
    }

    public List<PlayerStatsSnapshotViewDTO> getStandings() {
        return standings;
    }

    public void setStandings(List<PlayerStatsSnapshotViewDTO> standings) {
        this.standings = standings;
    }

    public List<PlayerStatsSnapshotViewDTO> getStats() {
        return stats;
    }

    public void setStats(List<PlayerStatsSnapshotViewDTO> stats) {
        this.stats = stats;
    }
}
