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
@Table(name = "crawler_player_stats_reference_snapshot", indexes = {
        @Index(name = "idx_player_stats_reference_player", columnList = "source_system, resource_scope, player_id, stats_category"),
        @Index(name = "idx_player_stats_reference_team", columnList = "source_system, resource_scope, team_id, stats_category"),
        @Index(name = "idx_player_stats_reference_series", columnList = "source_system, resource_scope, series_id, stats_category")
})
public class CrawlerPlayerStatsReferenceSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resource_url", length = 1000)
    private String resourceUrl;

    @Column(name = "source_system")
    private String sourceSystem;

    @Column(name = "resource_scope")
    private String resourceScope;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    private PlayerStatsSeriesEntity series;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private PlayerStatsTeamEntity team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    private PlayerStatsPlayerEntity player;

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

    public String getResourceUrl() {
        return resourceUrl;
    }

    public void setResourceUrl(String resourceUrl) {
        this.resourceUrl = resourceUrl;
    }

    public String getSourceSystem() {
        return sourceSystem;
    }

    public void setSourceSystem(String sourceSystem) {
        this.sourceSystem = sourceSystem;
    }

    public String getResourceScope() {
        return resourceScope;
    }

    public void setResourceScope(String resourceScope) {
        this.resourceScope = resourceScope;
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
