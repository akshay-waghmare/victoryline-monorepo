package com.devglan.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

@Entity
@Table(name = "player_stats_squad_membership", indexes = {
        @Index(name = "idx_player_stats_squad_match_url", columnList = "match_url"),
        @Index(name = "idx_player_stats_squad_match_external", columnList = "match_external_key")
})
public class PlayerStatsSquadMembershipEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_match_id")
    private LiveMatch liveMatch;

    @Column(name = "match_url", length = 1000)
    private String matchUrl;

    @Column(name = "match_external_key")
    private String matchExternalKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    private PlayerStatsSeriesEntity series;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private PlayerStatsTeamEntity team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    private PlayerStatsPlayerEntity player;

    @Column(name = "source_system")
    private String sourceSystem;

    @Column(name = "captain_flag")
    private Boolean captain;

    @Column(name = "wicket_keeper_flag")
    private Boolean wicketKeeper;

    @Column(name = "probable_flag")
    private Boolean probable;

    @Column(name = "announced_flag")
    private Boolean announced;

    @Column(name = "lineup_order")
    private Integer lineupOrder;

    @Column(name = "updated_at")
    private Long updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LiveMatch getLiveMatch() {
        return liveMatch;
    }

    public void setLiveMatch(LiveMatch liveMatch) {
        this.liveMatch = liveMatch;
    }

    public String getMatchUrl() {
        return matchUrl;
    }

    public void setMatchUrl(String matchUrl) {
        this.matchUrl = matchUrl;
    }

    public String getMatchExternalKey() {
        return matchExternalKey;
    }

    public void setMatchExternalKey(String matchExternalKey) {
        this.matchExternalKey = matchExternalKey;
    }

    public PlayerStatsSeriesEntity getSeries() {
        return series;
    }

    public void setSeries(PlayerStatsSeriesEntity series) {
        this.series = series;
    }

    public PlayerStatsTeamEntity getTeam() {
        return team;
    }

    public void setTeam(PlayerStatsTeamEntity team) {
        this.team = team;
    }

    public PlayerStatsPlayerEntity getPlayer() {
        return player;
    }

    public void setPlayer(PlayerStatsPlayerEntity player) {
        this.player = player;
    }

    public String getSourceSystem() {
        return sourceSystem;
    }

    public void setSourceSystem(String sourceSystem) {
        this.sourceSystem = sourceSystem;
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

    public Long getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Long updatedAt) {
        this.updatedAt = updatedAt;
    }
}
