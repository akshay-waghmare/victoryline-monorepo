package com.devglan.repository;

import com.devglan.model.CompletedMatchDTO;
import com.devglan.model.Matches;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Matches entity with support for completed matches display
 * Feature: 006-completed-matches-display
 */
@Repository
public interface MatchRepository extends JpaRepository<Matches, Long> {

    /**
     * Find completed matches with series information using DTO projection
     * Uses JOIN FETCH to prevent N+1 query problem
     * Ordered by completion date descending (most recent first)
     * 
     * @param pageable Pagination and sorting parameters (limit 20)
     * @return List of completed match DTOs with series names
     */
    @Query("SELECT new com.devglan.model.CompletedMatchDTO(" +
           "m.matchId, m.homeTeamName, m.awayTeamName, m.result, " +
           "m.completionDate, s.name, s.format, m.location, " +
           "m.sportType, m.matchLink) " +
           "FROM Matches m " +
           "LEFT JOIN m.series s " +
           "WHERE m.matchStatus IN ('Completed', 'Result', 'Finished') " +
           "AND m.completionDate IS NOT NULL " +
           "ORDER BY m.completionDate DESC")
    List<CompletedMatchDTO> findTop20CompletedMatches(Pageable pageable);
}
