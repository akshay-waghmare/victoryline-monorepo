package com.devglan.model;

import java.util.Date;

/**
 * DTO for completed match display (Feature 006-completed-matches-display)
 * Optimized projection to avoid N+1 queries and reduce payload size
 */
public class CompletedMatchDTO {

    private Long matchId;
    private String homeTeamName;
    private String awayTeamName;
    private String result;
    private Date completionDate;
    private String seriesName;
    private String seriesFormat;
    private String location;
    private String sportType;
    private String matchLink;

    // Constructors
    public CompletedMatchDTO() {
    }

    /**
     * Constructor for JPA query projections
     * @param matchId Match identifier
     * @param homeTeamName Home team name
     * @param awayTeamName Away team name
     * @param result Match result summary
     * @param completionDate When match was completed
     * @param seriesName Series name
     * @param seriesFormat Series format (Test/ODI/T20)
     * @param location Match location/venue
     * @param sportType Sport type
     * @param matchLink Link to match details
     */
    public CompletedMatchDTO(Long matchId, String homeTeamName, String awayTeamName, 
                            String result, Date completionDate, String seriesName, 
                            String seriesFormat, String location, String sportType, 
                            String matchLink) {
        this.matchId = matchId;
        this.homeTeamName = homeTeamName;
        this.awayTeamName = awayTeamName;
        this.result = result;
        this.completionDate = completionDate;
        this.seriesName = seriesName;
        this.seriesFormat = seriesFormat;
        this.location = location;
        this.sportType = sportType;
        this.matchLink = matchLink;
    }

    // Getters and Setters
    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public String getHomeTeamName() {
        return homeTeamName;
    }

    public void setHomeTeamName(String homeTeamName) {
        this.homeTeamName = homeTeamName;
    }

    public String getAwayTeamName() {
        return awayTeamName;
    }

    public void setAwayTeamName(String awayTeamName) {
        this.awayTeamName = awayTeamName;
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
        return seriesFormat;
    }

    public void setSeriesFormat(String seriesFormat) {
        this.seriesFormat = seriesFormat;
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
        return matchLink;
    }

    public void setMatchLink(String matchLink) {
        this.matchLink = matchLink;
    }
}
