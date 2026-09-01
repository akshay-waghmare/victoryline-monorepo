package com.devglan.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devglan.model.PlayerStatsPlayerEntity;

public interface PlayerStatsPlayerRepository extends JpaRepository<PlayerStatsPlayerEntity, Long> {

    Optional<PlayerStatsPlayerEntity> findFirstBySourceSystemAndExternalId(String sourceSystem, String externalId);

    Optional<PlayerStatsPlayerEntity> findFirstBySourceSystemAndNameIgnoreCase(String sourceSystem, String name);

    Optional<PlayerStatsPlayerEntity> findFirstByNameIgnoreCase(String name);

    List<PlayerStatsPlayerEntity> findBySourceSystemOrderByNameAsc(String sourceSystem);

    @Query("SELECT p FROM PlayerStatsPlayerEntity p WHERE p.sourceSystem = :source AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.shortName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.role) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.country) LIKE LOWER(CONCAT('%', :query, '%'))) ORDER BY p.name ASC")
    List<PlayerStatsPlayerEntity> searchBySourceSystem(@Param("source") String source, @Param("query") String query);
}
