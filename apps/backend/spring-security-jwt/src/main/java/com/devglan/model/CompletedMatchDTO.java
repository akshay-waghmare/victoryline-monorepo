package com.devglan.model;

import java.io.Serializable;
import java.util.Date;

/**
 * DTO for completed match display (Feature 006-completed-matches-display)
 * CORRECTED to work with LIVE_MATCH table data
 * 
 * This DTO is populated from LiveMatch entities where isDeleted=true.
 * Match details are parsed from the 'lastKnownState' JSON field.
 */
public class CompletedMatchDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;

    private Long matchId;
    private String matchUrl; // Match URL from LIVE_MATCH.url
    private String teamA; // Home team name (parsed from JSON)
    private String teamB; // Away team name (parsed from JSON)
    private String scoreA; // Team A score (parsed from JSON)
    private String scoreB; // Team B score (parsed from JSON)
    private String result; // Match result (parsed from JSON)
    private String seriesName; // Derived from URL or competition field
    private String format; // Match format (ODI/T20/Test)
    private String location; // Venue

    // Legacy fields (maintained for backwards compatibility)
    private String homeTeamName;
    private String awayTeamName;
    private Date completionDate;
    private String seriesFormat;
    private String sportType;
    private String matchLink;

    // Constructors
    public CompletedMatchDTO() {
    }

    /**
     * Constructor for JPA query projections (legacy - kept for compatibility)
     */
    public CompletedMatchDTO(Long matchId, String homeTeamName, String awayTeamName, 
                            String result, Date completionDate, String seriesName, 
                            String seriesFormat, String location, String sportType, 
                            String matchLink) {
        this.matchId = matchId;
        this.homeTeamName = homeTeamName;
        this.teamA = homeTeamName; // Alias
        this.awayTeamName = awayTeamName;
        this.teamB = awayTeamName; // Alias
        this.result = result;
        this.completionDate = completionDate;
        this.seriesName = seriesName;
        this.seriesFormat = seriesFormat;
        this.format = seriesFormat; // Alias
        this.location = location;
        this.sportType = sportType;
        this.matchLink = matchLink;
        this.matchUrl = matchLink; // Alias
    }

    // Getters and Setters
    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public String getMatchUrl() {
        return matchUrl;
    }

    public void setMatchUrl(String matchUrl) {
        this.matchUrl = matchUrl;
        this.matchLink = matchUrl; // Keep legacy field in sync
    }

    public String getTeamA() {
        return teamA != null ? teamA : homeTeamName;
    }

    public void setTeamA(String teamA) {
        this.teamA = teamA;
        this.homeTeamName = teamA; // Keep legacy field in sync
    }

    public String getTeamB() {
        return teamB != null ? teamB : awayTeamName;
    }

    public void setTeamB(String teamB) {
        this.teamB = teamB;
        this.awayTeamName = teamB; // Keep legacy field in sync
    }

    public String getScoreA() {
        return scoreA;
    }

    public void setScoreA(String scoreA) {
        this.scoreA = scoreA;
    }

    public String getScoreB() {
        return scoreB;
    }

    public void setScoreB(String scoreB) {
        this.scoreB = scoreB;
    }

    // Legacy getters/setters (kept for backwards compatibility)
    public String getHomeTeamName() {
        return teamA != null ? teamA : homeTeamName;
    }

    public void setHomeTeamName(String homeTeamName) {
        this.homeTeamName = homeTeamName;
        this.teamA = homeTeamName;
    }

    public String getAwayTeamName() {
        return teamB != null ? teamB : awayTeamName;
    }

    public void setAwayTeamName(String awayTeamName) {
        this.awayTeamName = awayTeamName;
        this.teamB = awayTeamName;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public Date getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(Date completionDate) {
        this.completionDate = completionDate;
    }

    public String getSeriesName() {
        return seriesName;
    }

    public void setSeriesName(String seriesName) {
        this.seriesName = seriesName;
    }

    public String getSeriesFormat() {
        return format != null ? format : seriesFormat;
    }

    public void setSeriesFormat(String seriesFormat) {
        this.seriesFormat = seriesFormat;
        this.format = seriesFormat;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
        this.seriesFormat = format;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getSportType() {
        return sportType;
    }

    public void setSportType(String sportType) {
        this.sportType = sportType;
    }

    public String getMatchLink() {
        return matchUrl != null ? matchUrl : matchLink;
    }

    public void setMatchLink(String matchLink) {
        this.matchLink = matchLink;
        this.matchUrl = matchLink;
    }
}

