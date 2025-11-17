package com.devglan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import javax.validation.Valid;
import java.time.Instant;

/**
 * DTO for Upcoming Match Response
 * Feature 005: Upcoming Matches Feed
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpcomingMatchDTO {
    
    private Long id;
    
    @NotBlank(message = "Source is required")
    @Size(max = 32, message = "Source must not exceed 32 characters")
    private String source;
    
    @NotBlank(message = "Source key is required")
    @Size(max = 128, message = "Source key must not exceed 128 characters")
    private String sourceKey;
    
    @NotBlank(message = "Series name is required")
    @Size(max = 255, message = "Series name must not exceed 255 characters")
    private String seriesName;
    
    @NotBlank(message = "Match title is required")
    @Size(max = 255, message = "Match title must not exceed 255 characters")
    private String matchTitle;
    
    @NotNull(message = "Team A is required")
    @Valid
    private TeamDTO teamA;
    
    @NotNull(message = "Team B is required")
    @Valid
    private TeamDTO teamB;
    
    @NotNull(message = "Start time is required")
    private Instant startTime;
    
    @Valid
    private VenueDTO venue;
    
    private String status;
    
    @Size(max = 512, message = "Notes must not exceed 512 characters")
    private String notes;
    
    private Instant lastUpdated;

    public UpcomingMatchDTO() {}

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

    public TeamDTO getTeamA() {
        return teamA;
    }

    public void setTeamA(TeamDTO teamA) {
        this.teamA = teamA;
    }

    public TeamDTO getTeamB() {
        return teamB;
    }

    public void setTeamB(TeamDTO teamB) {
        this.teamB = teamB;
    }

    public Instant getStartTime() {
        return startTime;
    }

    public void setStartTime(Instant startTime) {
        this.startTime = startTime;
    }

    public VenueDTO getVenue() {
        return venue;
    }

    public void setVenue(VenueDTO venue) {
        this.venue = venue;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(Instant lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
