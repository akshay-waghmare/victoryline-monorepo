package com.devglan.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devglan.model.PlayerStatsTeamEntity;

public interface PlayerStatsTeamRepository extends JpaRepository<PlayerStatsTeamEntity, Long> {

    Optional<PlayerStatsTeamEntity> findFirstBySourceSystemAndExternalId(String sourceSystem, String externalId);

    Optional<PlayerStatsTeamEntity> findFirstByNameIgnoreCase(String name);

    List<PlayerStatsTeamEntity> findBySourceSystemOrderByNameAsc(String sourceSystem);

    @Query("SELECT t FROM PlayerStatsTeamEntity t WHERE t.sourceSystem = :source AND (LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.shortName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.teamCode) LIKE LOWER(CONCAT('%', :query, '%'))) ORDER BY t.name ASC")
    List<PlayerStatsTeamEntity> searchBySourceSystem(@Param("source") String source, @Param("query") String query);
}
