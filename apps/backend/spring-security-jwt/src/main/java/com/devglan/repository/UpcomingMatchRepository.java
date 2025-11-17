package com.devglan.repository;

import com.devglan.model.UpcomingMatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

/**
 * Repository for UpcomingMatch Entity
 * Feature 005: Upcoming Matches Feed
 * 
 * Provides custom query methods for filtering upcoming fixtures by:
 * - Date range (from/to)
 * - Team name or code (case-insensitive partial match)
 * - Series name (case-insensitive partial match)
 */
@Repository
public interface UpcomingMatchRepository extends JpaRepository<UpcomingMatch, Long> {

    /**
     * Find upcoming match by source and source_key for upsert operations
     */
    Optional<UpcomingMatch> findBySourceAndSourceKey(String source, String sourceKey);

    /**
     * Find all upcoming matches with optional filters
     * Supports filtering by date range, team, and series
     */
    @Query("SELECT u FROM UpcomingMatch u WHERE " +
           "(:from IS NULL OR u.startTimeUtc >= :from) AND " +
           "(:to IS NULL OR u.startTimeUtc <= :to) AND " +
           "(:team IS NULL OR LOWER(u.teamAName) LIKE LOWER(CONCAT('%', :team, '%')) OR " +
           "                 LOWER(u.teamBName) LIKE LOWER(CONCAT('%', :team, '%')) OR " +
           "                 LOWER(u.teamACode) LIKE LOWER(CONCAT('%', :team, '%')) OR " +
           "                 LOWER(u.teamBCode) LIKE LOWER(CONCAT('%', :team, '%'))) AND " +
           "(:series IS NULL OR LOWER(u.seriesName) LIKE LOWER(CONCAT('%', :series, '%'))) " +
           "ORDER BY u.startTimeUtc ASC")
    Page<UpcomingMatch> findUpcomingMatches(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("team") String team,
            @Param("series") String series,
            Pageable pageable
    );

    /**
     * Count matches for pagination total
     */
    @Query("SELECT COUNT(u) FROM UpcomingMatch u WHERE " +
           "(:from IS NULL OR u.startTimeUtc >= :from) AND " +
           "(:to IS NULL OR u.startTimeUtc <= :to) AND " +
           "(:team IS NULL OR LOWER(u.teamAName) LIKE LOWER(CONCAT('%', :team, '%')) OR " +
           "                 LOWER(u.teamBName) LIKE LOWER(CONCAT('%', :team, '%')) OR " +
           "                 LOWER(u.teamACode) LIKE LOWER(CONCAT('%', :team, '%')) OR " +
           "                 LOWER(u.teamBCode) LIKE LOWER(CONCAT('%', :team, '%'))) AND " +
           "(:series IS NULL OR LOWER(u.seriesName) LIKE LOWER(CONCAT('%', :series, '%')))")
    long countUpcomingMatches(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("team") String team,
            @Param("series") String series
    );
}
