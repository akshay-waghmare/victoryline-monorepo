package com.devglan.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devglan.model.PlayerStatsPlayerEntity;
import com.devglan.model.PlayerStatsSquadMembershipEntity;
import com.devglan.model.PlayerStatsTeamEntity;

public interface PlayerStatsSquadMembershipRepository extends JpaRepository<PlayerStatsSquadMembershipEntity, Long> {

    Optional<PlayerStatsSquadMembershipEntity> findFirstByMatchUrlAndTeamAndPlayer(String matchUrl,
            PlayerStatsTeamEntity team, PlayerStatsPlayerEntity player);

    Optional<PlayerStatsSquadMembershipEntity> findFirstByMatchExternalKeyAndTeamAndPlayer(String matchExternalKey,
            PlayerStatsTeamEntity team, PlayerStatsPlayerEntity player);

    List<PlayerStatsSquadMembershipEntity> findByMatchUrlOrderByIdAsc(String matchUrl);

    List<PlayerStatsSquadMembershipEntity> findByMatchExternalKeyOrderByIdAsc(String matchExternalKey);
}
