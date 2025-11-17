package com.devglan.service;

import com.devglan.dto.PagedResponseDTO;
import com.devglan.dto.UpcomingMatchDTO;
import com.devglan.model.UpcomingMatch;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Service interface for upcoming matches operations
 * Feature 005: Upcoming Matches Feed
 */
public interface UpcomingMatchService {

    /**
     * Get paginated list of upcoming matches with optional filters
     *
     * @param startDate Filter by start date (inclusive)
     * @param endDate Filter by end date (inclusive)
     * @param teamName Filter by team name (partial match)
     * @param seriesName Filter by series name (partial match)
     * @param page Page number (0-indexed)
     * @param size Page size
     * @return Paged response with matches
     */
    PagedResponseDTO<UpcomingMatchDTO> getUpcomingMatches(
            Instant startDate,
            Instant endDate,
            String teamName,
            String seriesName,
            int page,
            int size
    );

    /**
     * Get single upcoming match by ID
     *
     * @param id Match ID
     * @return Match DTO if found
     */
    Optional<UpcomingMatchDTO> getUpcomingMatchById(Long id);

    /**
     * Upsert upcoming match (create or update based on source + source_key)
     * Used by scraper to maintain fixtures
     *
     * @param dto Match data transfer object
     * @return Saved match DTO
     */
    UpcomingMatchDTO upsertUpcomingMatch(UpcomingMatchDTO dto);

    /**
     * Bulk upsert for scraper batch operations
     *
     * @param dtos List of matches to upsert
     * @return List of saved matches
     */
    List<UpcomingMatchDTO> upsertUpcomingMatches(List<UpcomingMatchDTO> dtos);

    /**
     * Delete matches older than specified date (cleanup job)
     *
     * @param olderThan Delete matches before this date
     * @return Number of deleted matches
     */
    int deleteMatchesOlderThan(Instant olderThan);
}
