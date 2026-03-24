package com.devglan.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devglan.model.CrawlerPlayerStatsReferenceSnapshotEntity;
import com.devglan.model.PlayerStatsPlayerEntity;
import com.devglan.model.PlayerStatsSeriesEntity;
import com.devglan.model.PlayerStatsTeamEntity;

public interface CrawlerPlayerStatsReferenceSnapshotRepository
        extends JpaRepository<CrawlerPlayerStatsReferenceSnapshotEntity, Long> {

    Optional<CrawlerPlayerStatsReferenceSnapshotEntity> findFirstBySourceSystemAndResourceScopeAndPlayerAndStatsCategory(
            String sourceSystem, String resourceScope, PlayerStatsPlayerEntity player, String statsCategory);

    Optional<CrawlerPlayerStatsReferenceSnapshotEntity> findFirstBySourceSystemAndResourceScopeAndTeamAndStatsCategory(
            String sourceSystem, String resourceScope, PlayerStatsTeamEntity team, String statsCategory);

    Optional<CrawlerPlayerStatsReferenceSnapshotEntity> findFirstBySourceSystemAndResourceScopeAndSeriesAndStatsCategory(
            String sourceSystem, String resourceScope, PlayerStatsSeriesEntity series, String statsCategory);

    List<CrawlerPlayerStatsReferenceSnapshotEntity> findBySourceSystemAndResourceScopeAndPlayerOrderByIdAsc(
            String sourceSystem, String resourceScope, PlayerStatsPlayerEntity player);

    List<CrawlerPlayerStatsReferenceSnapshotEntity> findBySourceSystemAndResourceScopeAndTeamOrderByIdAsc(
            String sourceSystem, String resourceScope, PlayerStatsTeamEntity team);

    List<CrawlerPlayerStatsReferenceSnapshotEntity> findBySourceSystemAndResourceScopeAndSeriesOrderByIdAsc(
            String sourceSystem, String resourceScope, PlayerStatsSeriesEntity series);
}
