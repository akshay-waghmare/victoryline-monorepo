package com.devglan.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devglan.model.PlayerStatsSeriesEntity;

public interface PlayerStatsSeriesRepository extends JpaRepository<PlayerStatsSeriesEntity, Long> {

    Optional<PlayerStatsSeriesEntity> findFirstBySourceSystemAndExternalId(String sourceSystem, String externalId);

    Optional<PlayerStatsSeriesEntity> findFirstByNameIgnoreCase(String name);

    List<PlayerStatsSeriesEntity> findBySourceSystemOrderByNameAsc(String sourceSystem);

    @Query("SELECT s FROM PlayerStatsSeriesEntity s WHERE s.sourceSystem = :source AND (LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.shortName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.seasonName) LIKE LOWER(CONCAT('%', :query, '%'))) ORDER BY s.name ASC")
    List<PlayerStatsSeriesEntity> searchBySourceSystem(@Param("source") String source, @Param("query") String query);
}
