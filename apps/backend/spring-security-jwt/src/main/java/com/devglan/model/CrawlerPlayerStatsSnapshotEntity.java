package com.devglan.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.Lob;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

@Entity
@Table(name = "crawler_player_stats_snapshot", indexes = {
        @Index(name = "idx_crawler_player_stats_snapshot_match_url", columnList = "match_url"),
        @Index(name = "idx_crawler_player_stats_snapshot_match_external", columnList = "match_external_key")
})
public class CrawlerPlayerStatsSnapshotEntity {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "squad_membership_id")
    private PlayerStatsSquadMembershipEntity squadMembership;

    @Column(name = "source_system")
    private String sourceSystem;

    @Column(name = "stats_category")
    private String statsCategory;

    @Column(name = "stats_label")
    private String statsLabel;

    @Column(name = "captured_at")
    private Long capturedAt;

    @Column(name = "updated_at")
    private Long updatedAt;

    @Lob
    @Column(name = "payload_json")
    private String payloadJson;

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

    public PlayerStatsSquadMembershipEntity getSquadMembership() {
        return squadMembership;
    }

    public void setSquadMembership(PlayerStatsSquadMembershipEntity squadMembership) {
        this.squadMembership = squadMembership;
    }

    public String getSourceSystem() {
        return sourceSystem;
    }

    public void setSourceSystem(String sourceSystem) {
        this.sourceSystem = sourceSystem;
    }

    public String getStatsCategory() {
        return statsCategory;
    }

    public void setStatsCategory(String statsCategory) {
        this.statsCategory = statsCategory;
    }

    public String getStatsLabel() {
        return statsLabel;
    }

    public void setStatsLabel(String statsLabel) {
        this.statsLabel = statsLabel;
    }

    public Long getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(Long capturedAt) {
        this.capturedAt = capturedAt;
    }

    public Long getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Long updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }
}
