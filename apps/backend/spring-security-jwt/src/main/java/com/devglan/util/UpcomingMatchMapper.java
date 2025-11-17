package com.devglan.util;

import com.devglan.dto.TeamDTO;
import com.devglan.dto.UpcomingMatchDTO;
import com.devglan.dto.VenueDTO;
import com.devglan.model.UpcomingMatch;

import java.time.Instant;

/**
 * Mapper Utility for UpcomingMatch Entity to DTO conversion
 * Feature 005: Upcoming Matches Feed
 */
public class UpcomingMatchMapper {

    /**
     * Convert UpcomingMatch entity to DTO
     */
    public static UpcomingMatchDTO toDTO(UpcomingMatch entity) {
        if (entity == null) {
            return null;
        }

        UpcomingMatchDTO dto = new UpcomingMatchDTO();
        dto.setId(entity.getId());
        dto.setSource(entity.getSource());
        dto.setSourceKey(entity.getSourceKey());
        dto.setSeriesName(entity.getSeriesName());
        dto.setMatchTitle(entity.getMatchTitle());
        
        // Map team A
        TeamDTO teamA = new TeamDTO(entity.getTeamAName(), entity.getTeamACode());
        dto.setTeamA(teamA);
        
        // Map team B
        TeamDTO teamB = new TeamDTO(entity.getTeamBName(), entity.getTeamBCode());
        dto.setTeamB(teamB);
        
        dto.setStartTime(entity.getStartTimeUtc());
        
        // Map venue (only if at least venue name exists)
        if (entity.getVenueName() != null || entity.getCity() != null || entity.getCountry() != null) {
            VenueDTO venue = new VenueDTO(
                entity.getVenueName(),
                entity.getCity(),
                entity.getCountry()
            );
            dto.setVenue(venue);
        }
        
        dto.setStatus(entity.getStatus() != null ? entity.getStatus().name().toLowerCase() : "scheduled");
        dto.setNotes(entity.getNotes());
        dto.setLastUpdated(entity.getLastScrapedAt());
        
        return dto;
    }

    /**
     * Convert DTO to UpcomingMatch entity (for create/update operations)
     */
    public static UpcomingMatch toEntity(UpcomingMatchDTO dto) {
        if (dto == null) {
            return null;
        }

        UpcomingMatch entity = new UpcomingMatch();
        entity.setId(dto.getId());
        entity.setSource(dto.getSource());
        entity.setSourceKey(dto.getSourceKey());
        entity.setSeriesName(dto.getSeriesName());
        entity.setMatchTitle(dto.getMatchTitle());
        
        // Map team A
        if (dto.getTeamA() != null) {
            entity.setTeamAName(dto.getTeamA().getName());
            entity.setTeamACode(dto.getTeamA().getCode());
        }
        
        // Map team B
        if (dto.getTeamB() != null) {
            entity.setTeamBName(dto.getTeamB().getName());
            entity.setTeamBCode(dto.getTeamB().getCode());
        }
        
        entity.setStartTimeUtc(dto.getStartTime());
        
        // Map venue
        if (dto.getVenue() != null) {
            entity.setVenueName(dto.getVenue().getName());
            entity.setCity(dto.getVenue().getCity());
            entity.setCountry(dto.getVenue().getCountry());
        }
        
        if (dto.getStatus() != null) {
            entity.setStatus(UpcomingMatch.MatchStatus.valueOf(dto.getStatus().toUpperCase()));
        }
        
        entity.setNotes(dto.getNotes());
        entity.setLastScrapedAt(dto.getLastUpdated());
        
        return entity;
    }
}
