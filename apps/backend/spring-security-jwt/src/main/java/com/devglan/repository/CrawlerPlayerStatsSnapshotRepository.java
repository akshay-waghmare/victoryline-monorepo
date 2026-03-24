package com.devglan.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devglan.model.CrawlerPlayerStatsSnapshotEntity;
import com.devglan.model.PlayerStatsPlayerEntity;
import com.devglan.model.PlayerStatsTeamEntity;

public interface CrawlerPlayerStatsSnapshotRepository extends JpaRepository<CrawlerPlayerStatsSnapshotEntity, Long> {

    Optional<CrawlerPlayerStatsSnapshotEntity> findFirstByMatchUrlAndTeamAndPlayerAndStatsCategory(String matchUrl,
            PlayerStatsTeamEntity team, PlayerStatsPlayerEntity player, String statsCategory);

    Optional<CrawlerPlayerStatsSnapshotEntity> findFirstByMatchExternalKeyAndTeamAndPlayerAndStatsCategory(
            String matchExternalKey, PlayerStatsTeamEntity team, PlayerStatsPlayerEntity player, String statsCategory);

    List<CrawlerPlayerStatsSnapshotEntity> findByMatchUrlOrderByIdAsc(String matchUrl);

    List<CrawlerPlayerStatsSnapshotEntity> findByMatchExternalKeyOrderByIdAsc(String matchExternalKey);
}
