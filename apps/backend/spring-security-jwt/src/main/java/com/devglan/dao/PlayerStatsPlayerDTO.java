package com.devglan.dao;

import java.util.List;

public class PlayerStatsPlayerDTO {

    private String externalId;
    private String name;
    private String shortName;
    private String role;
    private String battingStyle;
    private String bowlingStyle;
    private String country;
    private String imageUrl;
    private Boolean captain;
    private Boolean wicketKeeper;
    private Boolean probable;
    private Boolean announced;
    private Integer lineupOrder;
    private List<PlayerStatsPayloadDTO> stats;

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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getBattingStyle() {
        return battingStyle;
    }

    public void setBattingStyle(String battingStyle) {
        this.battingStyle = battingStyle;
    }

    public String getBowlingStyle() {
        return bowlingStyle;
    }

    public void setBowlingStyle(String bowlingStyle) {
        this.bowlingStyle = bowlingStyle;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Boolean getCaptain() {
        return captain;
    }

    public void setCaptain(Boolean captain) {
        this.captain = captain;
    }

    public Boolean getWicketKeeper() {
        return wicketKeeper;
    }

    public void setWicketKeeper(Boolean wicketKeeper) {
        this.wicketKeeper = wicketKeeper;
    }

    public Boolean getProbable() {
        return probable;
    }

    public void setProbable(Boolean probable) {
        this.probable = probable;
    }

    public Boolean getAnnounced() {
        return announced;
    }

    public void setAnnounced(Boolean announced) {
        this.announced = announced;
    }

    public Integer getLineupOrder() {
        return lineupOrder;
    }

    public void setLineupOrder(Integer lineupOrder) {
        this.lineupOrder = lineupOrder;
    }

    public List<PlayerStatsPayloadDTO> getStats() {
        return stats;
    }

    public void setStats(List<PlayerStatsPayloadDTO> stats) {
        this.stats = stats;
    }
}
