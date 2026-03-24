package com.devglan.dao;

import java.util.List;

public class PlayerStatsTeamDTO {

    private String externalId;
    private String name;
    private String shortName;
    private String teamCode;
    private List<PlayerStatsPlayerDTO> squad;

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

    public List<PlayerStatsPlayerDTO> getSquad() {
        return squad;
    }

    public void setSquad(List<PlayerStatsPlayerDTO> squad) {
        this.squad = squad;
    }
}
