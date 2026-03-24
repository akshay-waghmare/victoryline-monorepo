package com.devglan.dao;

import java.util.List;

public class PlayerStatsTeamDetailViewDTO {

    private String url;
    private String source;
    private String externalId;
    private String name;
    private String shortName;
    private String teamCode;
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

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getShortName() {
        return shortName;
    }

    public void setShortName(String shortName) {
        this.shortName = shortName;
    }

    public String getTeamCode() {
        return teamCode;
    }

    public void setTeamCode(String teamCode) {
        this.teamCode = teamCode;
    }

    public List<PlayerStatsSnapshotViewDTO> getStats() {
        return stats;
    }

    public void setStats(List<PlayerStatsSnapshotViewDTO> stats) {
        this.stats = stats;
    }
}
