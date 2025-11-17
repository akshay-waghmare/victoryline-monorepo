package com.devglan.model;

import javax.persistence.*;
import java.time.Instant;

/**
 * JPA Entity for Upcoming Cricket Fixtures
 * Feature 005: Upcoming Matches Feed
 * 
 * Represents a scheduled cricket fixture with source attribution,
 * team details, venue information, and data freshness tracking.
 */
@Entity
@Table(name = "upcoming_matches", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"source", "source_key"}),
       indexes = {
           @Index(name = "idx_upcoming_matches_start_time", columnList = "start_time_utc"),
           @Index(name = "idx_upcoming_matches_series", columnList = "series_name"),
           @Index(name = "idx_upcoming_matches_team_a", columnList = "team_a_name"),
           @Index(name = "idx_upcoming_matches_team_b", columnList = "team_b_name"),
           @Index(name = "idx_upcoming_matches_status", columnList = "status")
       })
public class UpcomingMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source", nullable = false, length = 32)
    private String source;

    @Column(name = "source_key", nullable = false, length = 128)
    private String sourceKey;

    @Column(name = "series_name", nullable = false)
    private String seriesName;

    @Column(name = "match_title", nullable = false)
    private String matchTitle;

    @Column(name = "team_a_name", nullable = false, length = 128)
    private String teamAName;

    @Column(name = "team_b_name", nullable = false, length = 128)
    private String teamBName;

    @Column(name = "team_a_code", length = 16)
    private String teamACode;

    @Column(name = "team_b_code", length = 16)
    private String teamBCode;

    @Column(name = "start_time_utc", nullable = false, columnDefinition = "DATETIME(3)")
    private Instant startTimeUtc;

    @Column(name = "venue_name")
    private String venueName;

    @Column(name = "city", length = 128)
    private String city;

    @Column(name = "country", length = 128)
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MatchStatus status = MatchStatus.SCHEDULED;

    @Column(name = "notes", length = 512)
    private String notes;

    @Column(name = "last_scraped_at", nullable = false, columnDefinition = "DATETIME(3)")
    private Instant lastScrapedAt;

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)")
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)")
    private Instant updatedAt;

    public enum MatchStatus {
        SCHEDULED,
        POSTPONED,
        CANCELLED
    }

    // Constructors
    public UpcomingMatch() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getSourceKey() {
        return sourceKey;
    }

    public void setSourceKey(String sourceKey) {
        this.sourceKey = sourceKey;
    }

    public String getSeriesName() {
        return seriesName;
    }

    public void setSeriesName(String seriesName) {
        this.seriesName = seriesName;
    }

    public String getMatchTitle() {
        return matchTitle;
    }

    public void setMatchTitle(String matchTitle) {
        this.matchTitle = matchTitle;
    }

    public String getTeamAName() {
        return teamAName;
    }

    public void setTeamAName(String teamAName) {
        this.teamAName = teamAName;
    }

    public String getTeamBName() {
        return teamBName;
    }

    public void setTeamBName(String teamBName) {
        this.teamBName = teamBName;
    }

    public String getTeamACode() {
        return teamACode;
    }

    public void setTeamACode(String teamACode) {
        this.teamACode = teamACode;
    }

    public String getTeamBCode() {
        return teamBCode;
    }

    public void setTeamBCode(String teamBCode) {
        this.teamBCode = teamBCode;
    }

    public Instant getStartTimeUtc() {
        return startTimeUtc;
    }

    public void setStartTimeUtc(Instant startTimeUtc) {
        this.startTimeUtc = startTimeUtc;
    }

    public String getVenueName() {
        return venueName;
    }

    public void setVenueName(String venueName) {
        this.venueName = venueName;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public MatchStatus getStatus() {
        return status;
    }

    public void setStatus(MatchStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getLastScrapedAt() {
        return lastScrapedAt;
    }

    public void setLastScrapedAt(Instant lastScrapedAt) {
        this.lastScrapedAt = lastScrapedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
