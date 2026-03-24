package com.devglan.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import javax.transaction.Transactional;

import org.springframework.stereotype.Service;

import com.devglan.dao.PlayerStatsIngestionRequest;
import com.devglan.dao.PlayerStatsIngestionResponseDTO;
import com.devglan.dao.PlayerStatsMatchViewDTO;
import com.devglan.dao.PlayerStatsPayloadDTO;
import com.devglan.dao.PlayerStatsPlayerDetailViewDTO;
import com.devglan.dao.PlayerStatsPlayerSummaryDTO;
import com.devglan.dao.PlayerStatsTeamSummaryDTO;
import com.devglan.dao.PlayerStatsSeriesSummaryDTO;
import com.devglan.dao.PlayerStatsPlayerDTO;
import com.devglan.dao.PlayerStatsReferenceIngestionRequest;
import com.devglan.dao.PlayerStatsReferenceIngestionResponseDTO;
import com.devglan.dao.PlayerStatsSeriesDetailViewDTO;
import com.devglan.dao.PlayerStatsSeriesDTO;
import com.devglan.dao.PlayerStatsSnapshotViewDTO;
import com.devglan.dao.PlayerStatsSquadPlayerViewDTO;
import com.devglan.dao.PlayerStatsTeamDTO;
import com.devglan.dao.PlayerStatsTeamDetailViewDTO;
import com.devglan.dao.PlayerStatsTeamViewDTO;
import com.devglan.model.CrawlerPlayerStatsReferenceSnapshotEntity;
import com.devglan.model.CrawlerPlayerStatsSnapshotEntity;
import com.devglan.model.LiveMatch;
import com.devglan.model.PlayerStatsPlayerEntity;
import com.devglan.model.PlayerStatsSeriesEntity;
import com.devglan.model.PlayerStatsSquadMembershipEntity;
import com.devglan.model.PlayerStatsTeamEntity;
import com.devglan.repository.CrawlerPlayerStatsReferenceSnapshotRepository;
import com.devglan.repository.CrawlerPlayerStatsSnapshotRepository;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.repository.PlayerStatsPlayerRepository;
import com.devglan.repository.PlayerStatsSeriesRepository;
import com.devglan.repository.PlayerStatsSquadMembershipRepository;
import com.devglan.repository.PlayerStatsTeamRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class PlayerStatsCrawlerService {

    private static final String RESOURCE_SCOPE_PLAYER = "PLAYER";
    private static final String RESOURCE_SCOPE_TEAM = "TEAM";
    private static final String RESOURCE_SCOPE_SERIES = "SERIES";

    private final LiveMatchRepository liveMatchRepository;
    private final PlayerStatsSeriesRepository playerStatsSeriesRepository;
    private final PlayerStatsTeamRepository playerStatsTeamRepository;
    private final PlayerStatsPlayerRepository playerStatsPlayerRepository;
    private final PlayerStatsSquadMembershipRepository playerStatsSquadMembershipRepository;
    private final CrawlerPlayerStatsSnapshotRepository crawlerPlayerStatsSnapshotRepository;
    private final CrawlerPlayerStatsReferenceSnapshotRepository crawlerPlayerStatsReferenceSnapshotRepository;
    private final ObjectMapper objectMapper;

    public PlayerStatsCrawlerService(LiveMatchRepository liveMatchRepository,
            PlayerStatsSeriesRepository playerStatsSeriesRepository,
            PlayerStatsTeamRepository playerStatsTeamRepository,
            PlayerStatsPlayerRepository playerStatsPlayerRepository,
            PlayerStatsSquadMembershipRepository playerStatsSquadMembershipRepository,
            CrawlerPlayerStatsSnapshotRepository crawlerPlayerStatsSnapshotRepository,
            CrawlerPlayerStatsReferenceSnapshotRepository crawlerPlayerStatsReferenceSnapshotRepository,
            ObjectMapper objectMapper) {
        this.liveMatchRepository = liveMatchRepository;
        this.playerStatsSeriesRepository = playerStatsSeriesRepository;
        this.playerStatsTeamRepository = playerStatsTeamRepository;
        this.playerStatsPlayerRepository = playerStatsPlayerRepository;
        this.playerStatsSquadMembershipRepository = playerStatsSquadMembershipRepository;
        this.crawlerPlayerStatsSnapshotRepository = crawlerPlayerStatsSnapshotRepository;
        this.crawlerPlayerStatsReferenceSnapshotRepository = crawlerPlayerStatsReferenceSnapshotRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PlayerStatsIngestionResponseDTO ingest(PlayerStatsIngestionRequest request) {
        validateRequest(request);

        long now = System.currentTimeMillis();
        String source = normalizeSource(request.getSource());
        String matchUrl = normalizeUrl(request.getUrl());
        String matchExternalKey = firstNonBlank(request.getMatchExternalKey(), extractExternalMatchKey(matchUrl));
        LiveMatch liveMatch = findExistingMatch(matchExternalKey, matchUrl);
        PlayerStatsSeriesEntity series = upsertSeries(request.getSeries(), source, now);

        int teamsProcessed = 0;
        int squadEntriesProcessed = 0;
        int statSnapshotsProcessed = 0;

        for (PlayerStatsTeamDTO teamDTO : safeList(request.getTeams())) {
            if (teamDTO == null || !hasText(teamDTO.getName())) {
                continue;
            }
            PlayerStatsTeamEntity team = upsertTeam(teamDTO, source, now);
            teamsProcessed++;

            for (PlayerStatsPlayerDTO playerDTO : safeList(teamDTO.getSquad())) {
                if (playerDTO == null || !hasText(playerDTO.getName())) {
                    continue;
                }
                PlayerStatsPlayerEntity player = upsertPlayer(playerDTO, source, now);
                PlayerStatsSquadMembershipEntity squadMembership = upsertSquadMembership(liveMatch, matchUrl,
                        matchExternalKey, series, team, player, playerDTO, source, now);
                squadEntriesProcessed++;

                for (PlayerStatsPayloadDTO payloadDTO : safeList(playerDTO.getStats())) {
                    if (payloadDTO == null || !hasText(payloadDTO.getCategory())) {
                        continue;
                    }
                    upsertSnapshot(liveMatch, matchUrl, matchExternalKey, series, team, player, squadMembership,
                            payloadDTO, source, request.getCapturedAt(), now);
                    statSnapshotsProcessed++;
                }
            }
        }

        PlayerStatsIngestionResponseDTO response = new PlayerStatsIngestionResponseDTO();
        response.setUrl(matchUrl);
        response.setMatchExternalKey(matchExternalKey);
        response.setLiveMatchId(liveMatch != null ? liveMatch.getId() : null);
        response.setSource(source);
        response.setTeamsProcessed(teamsProcessed);
        response.setSquadEntriesProcessed(squadEntriesProcessed);
        response.setStatSnapshotsProcessed(statSnapshotsProcessed);
        return response;
    }

    @Transactional
    public PlayerStatsMatchViewDTO getMatchView(String url, String externalMatchKey) {
        String normalizedUrl = normalizeUrl(url);
        String normalizedMatchKey = firstNonBlank(externalMatchKey, extractExternalMatchKey(normalizedUrl));
        if (!hasText(normalizedUrl) && !hasText(normalizedMatchKey)) {
            throw new IllegalArgumentException("Either url or externalMatchKey is required.");
        }

        List<PlayerStatsSquadMembershipEntity> memberships = loadMemberships(normalizedUrl, normalizedMatchKey);
        List<CrawlerPlayerStatsSnapshotEntity> snapshots = loadSnapshots(normalizedUrl, normalizedMatchKey);

        if (memberships.isEmpty() && snapshots.isEmpty()) {
            return null;
        }

        LiveMatch liveMatch = findExistingMatch(normalizedMatchKey, normalizedUrl);
        PlayerStatsSeriesEntity series = extractSeries(memberships, snapshots);

        Map<String, List<PlayerStatsSnapshotViewDTO>> statsByPlayerKey = new LinkedHashMap<String, List<PlayerStatsSnapshotViewDTO>>();
        for (CrawlerPlayerStatsSnapshotEntity snapshot : snapshots) {
            String playerKey = buildPlayerKey(snapshot.getTeam(), snapshot.getPlayer());
            List<PlayerStatsSnapshotViewDTO> playerSnapshots = statsByPlayerKey.get(playerKey);
            if (playerSnapshots == null) {
                playerSnapshots = new ArrayList<PlayerStatsSnapshotViewDTO>();
                statsByPlayerKey.put(playerKey, playerSnapshots);
            }
            playerSnapshots.add(toSnapshotView(snapshot));
        }

        for (List<PlayerStatsSnapshotViewDTO> playerSnapshots : statsByPlayerKey.values()) {
            Collections.sort(playerSnapshots, new Comparator<PlayerStatsSnapshotViewDTO>() {
                @Override
                public int compare(PlayerStatsSnapshotViewDTO left, PlayerStatsSnapshotViewDTO right) {
                    Long leftCaptured = left.getCapturedAt() == null ? 0L : left.getCapturedAt();
                    Long rightCaptured = right.getCapturedAt() == null ? 0L : right.getCapturedAt();
                    return rightCaptured.compareTo(leftCaptured);
                }
            });
        }

        Map<Long, PlayerStatsTeamViewDTO> teamViews = new LinkedHashMap<Long, PlayerStatsTeamViewDTO>();
        for (PlayerStatsSquadMembershipEntity membership : memberships) {
            PlayerStatsTeamEntity teamEntity = membership.getTeam();
            PlayerStatsPlayerEntity playerEntity = membership.getPlayer();
            if (teamEntity == null || playerEntity == null) {
                continue;
            }

            PlayerStatsTeamViewDTO teamView = teamViews.get(teamEntity.getId());
            if (teamView == null) {
                teamView = new PlayerStatsTeamViewDTO();
                teamView.setExternalId(teamEntity.getExternalId());
                teamView.setName(teamEntity.getName());
                teamView.setShortName(teamEntity.getShortName());
                teamView.setTeamCode(teamEntity.getTeamCode());
                teamView.setSquad(new ArrayList<PlayerStatsSquadPlayerViewDTO>());
                teamViews.put(teamEntity.getId(), teamView);
            }

            PlayerStatsSquadPlayerViewDTO playerView = new PlayerStatsSquadPlayerViewDTO();
            playerView.setExternalId(playerEntity.getExternalId());
            playerView.setName(playerEntity.getName());
            playerView.setShortName(playerEntity.getShortName());
            playerView.setRole(playerEntity.getRole());
            playerView.setBattingStyle(playerEntity.getBattingStyle());
            playerView.setBowlingStyle(playerEntity.getBowlingStyle());
            playerView.setCountry(playerEntity.getCountry());
            playerView.setImageUrl(playerEntity.getImageUrl());
            playerView.setCaptain(membership.getCaptain());
            playerView.setWicketKeeper(membership.getWicketKeeper());
            playerView.setProbable(membership.getProbable());
            playerView.setAnnounced(membership.getAnnounced());
            playerView.setLineupOrder(membership.getLineupOrder());
            playerView.setStats(new ArrayList<PlayerStatsSnapshotViewDTO>(
                    safeList(statsByPlayerKey.get(buildPlayerKey(teamEntity, playerEntity)))));
            teamView.getSquad().add(playerView);
        }

        PlayerStatsMatchViewDTO view = new PlayerStatsMatchViewDTO();
        view.setUrl(firstNonBlank(normalizedUrl, extractMatchUrl(memberships, snapshots)));
        view.setMatchExternalKey(firstNonBlank(normalizedMatchKey, extractMatchExternalKey(memberships, snapshots)));
        view.setLiveMatchId(liveMatch != null ? liveMatch.getId() : null);
        view.setSource(extractSource(memberships, snapshots));
        view.setSeries(toSeriesDTO(series));
        view.setTeams(new ArrayList<PlayerStatsTeamViewDTO>(teamViews.values()));
        return view;
    }

    @Transactional
    public PlayerStatsReferenceIngestionResponseDTO ingestReferenceData(PlayerStatsReferenceIngestionRequest request) {
        validateReferenceRequest(request);

        long now = System.currentTimeMillis();
        String source = normalizeDetailSource(request.getSource());
        String resourceUrl = normalizeUrl(request.getUrl());
        String resourceScope = resolveResourceScope(request);

        PlayerStatsPlayerEntity player = null;
        PlayerStatsTeamEntity team = null;
        PlayerStatsSeriesEntity series = null;

        if (RESOURCE_SCOPE_PLAYER.equals(resourceScope)) {
            player = upsertPlayer(request.getPlayer(), source, now);
        } else if (RESOURCE_SCOPE_TEAM.equals(resourceScope)) {
            team = upsertTeam(request.getTeam(), source, now);
        } else {
            series = upsertSeries(request.getSeries(), source, now);
        }

        int statSnapshotsProcessed = 0;
        for (PlayerStatsPayloadDTO payloadDTO : safeList(request.getSnapshots())) {
            upsertReferenceSnapshot(resourceUrl, resourceScope, source, series, team, player, payloadDTO,
                    request.getCapturedAt(), now);
            statSnapshotsProcessed++;
        }

        PlayerStatsReferenceIngestionResponseDTO response = new PlayerStatsReferenceIngestionResponseDTO();
        response.setUrl(resourceUrl);
        response.setSource(source);
        response.setResourceScope(resourceScope);
        response.setResourceExternalId(extractReferenceExternalId(request, resourceScope));
        response.setStatSnapshotsProcessed(statSnapshotsProcessed);
        return response;
    }

    @Transactional
    public PlayerStatsPlayerDetailViewDTO getPlayerView(String externalId, String source) {
        String normalizedExternalId = trim(externalId);
        if (!hasText(normalizedExternalId)) {
            throw new IllegalArgumentException("Player externalId is required.");
        }

        String normalizedSource = normalizeDetailSource(source);
        Optional<PlayerStatsPlayerEntity> player = playerStatsPlayerRepository
                .findFirstBySourceSystemAndExternalId(normalizedSource, normalizedExternalId);
        if (!player.isPresent()) {
            return null;
        }

        List<CrawlerPlayerStatsReferenceSnapshotEntity> snapshots = crawlerPlayerStatsReferenceSnapshotRepository
                .findBySourceSystemAndResourceScopeAndPlayerOrderByIdAsc(normalizedSource, RESOURCE_SCOPE_PLAYER,
                        player.get());

        PlayerStatsPlayerDetailViewDTO view = new PlayerStatsPlayerDetailViewDTO();
        view.setUrl(snapshots.isEmpty() ? null : extractResourceUrl(snapshots));
        view.setSource(normalizedSource);
        view.setExternalId(player.get().getExternalId());
        view.setName(player.get().getName());
        view.setShortName(player.get().getShortName());
        view.setRole(player.get().getRole());
        view.setBattingStyle(player.get().getBattingStyle());
        view.setBowlingStyle(player.get().getBowlingStyle());
        view.setCountry(player.get().getCountry());
        view.setImageUrl(player.get().getImageUrl());
        view.setStats(toSortedReferenceSnapshots(snapshots));
        return view;
    }

    @Transactional
    public PlayerStatsTeamDetailViewDTO getTeamView(String externalId, String source) {
        String normalizedExternalId = trim(externalId);
        if (!hasText(normalizedExternalId)) {
            throw new IllegalArgumentException("Team externalId is required.");
        }

        String normalizedSource = normalizeDetailSource(source);
        Optional<PlayerStatsTeamEntity> team = playerStatsTeamRepository.findFirstBySourceSystemAndExternalId(
                normalizedSource, normalizedExternalId);
        if (!team.isPresent()) {
            return null;
        }

        List<CrawlerPlayerStatsReferenceSnapshotEntity> snapshots = crawlerPlayerStatsReferenceSnapshotRepository
                .findBySourceSystemAndResourceScopeAndTeamOrderByIdAsc(normalizedSource, RESOURCE_SCOPE_TEAM, team.get());

        PlayerStatsTeamDetailViewDTO view = new PlayerStatsTeamDetailViewDTO();
        view.setUrl(snapshots.isEmpty() ? null : extractResourceUrl(snapshots));
        view.setSource(normalizedSource);
        view.setExternalId(team.get().getExternalId());
        view.setName(team.get().getName());
        view.setShortName(team.get().getShortName());
        view.setTeamCode(team.get().getTeamCode());
        view.setStats(toSortedReferenceSnapshots(snapshots));
        return view;
    }

    @Transactional
    public PlayerStatsSeriesDetailViewDTO getSeriesView(String externalId, String source) {
        String normalizedExternalId = trim(externalId);
        if (!hasText(normalizedExternalId)) {
            throw new IllegalArgumentException("Series externalId is required.");
        }

        String normalizedSource = normalizeDetailSource(source);
        Optional<PlayerStatsSeriesEntity> series = playerStatsSeriesRepository.findFirstBySourceSystemAndExternalId(
                normalizedSource, normalizedExternalId);
        if (!series.isPresent()) {
            return null;
        }

        List<CrawlerPlayerStatsReferenceSnapshotEntity> snapshots = crawlerPlayerStatsReferenceSnapshotRepository
                .findBySourceSystemAndResourceScopeAndSeriesOrderByIdAsc(normalizedSource, RESOURCE_SCOPE_SERIES,
                        series.get());

        PlayerStatsSeriesDetailViewDTO view = new PlayerStatsSeriesDetailViewDTO();
        view.setUrl(snapshots.isEmpty() ? null : extractResourceUrl(snapshots));
        view.setSource(normalizedSource);
        view.setSeries(toSeriesDTO(series.get()));
        view.setStandings(toSortedReferenceSnapshots(snapshots, true));
        view.setStats(toSortedReferenceSnapshots(snapshots));
        return view;
    }

    @Transactional
    public PlayerStatsSeriesDetailViewDTO getSeriesStandingsView(String externalId, String source) {
        return getSeriesView(externalId, source);
    }

    public List<PlayerStatsPlayerSummaryDTO> listPlayers(String source, String query) {
        String normalizedSource = normalizeDetailSource(source);
        List<PlayerStatsPlayerEntity> entities;
        if (hasText(query)) {
            entities = playerStatsPlayerRepository.searchBySourceSystem(normalizedSource, query.trim());
        } else {
            entities = playerStatsPlayerRepository.findBySourceSystemOrderByNameAsc(normalizedSource);
        }
        List<PlayerStatsPlayerSummaryDTO> result = new ArrayList<PlayerStatsPlayerSummaryDTO>();
        for (PlayerStatsPlayerEntity e : entities) {
            PlayerStatsPlayerSummaryDTO dto = new PlayerStatsPlayerSummaryDTO();
            dto.setExternalId(e.getExternalId());
            dto.setName(e.getName());
            dto.setShortName(e.getShortName());
            dto.setRole(e.getRole());
            dto.setBattingStyle(e.getBattingStyle());
            dto.setBowlingStyle(e.getBowlingStyle());
            dto.setCountry(e.getCountry());
            dto.setImageUrl(e.getImageUrl());
            result.add(dto);
        }
        return result;
    }

    public List<PlayerStatsTeamSummaryDTO> listTeams(String source, String query) {
        String normalizedSource = normalizeDetailSource(source);
        List<PlayerStatsTeamEntity> entities;
        if (hasText(query)) {
            entities = playerStatsTeamRepository.searchBySourceSystem(normalizedSource, query.trim());
        } else {
            entities = playerStatsTeamRepository.findBySourceSystemOrderByNameAsc(normalizedSource);
        }
        List<PlayerStatsTeamSummaryDTO> result = new ArrayList<PlayerStatsTeamSummaryDTO>();
        for (PlayerStatsTeamEntity e : entities) {
            PlayerStatsTeamSummaryDTO dto = new PlayerStatsTeamSummaryDTO();
            dto.setExternalId(e.getExternalId());
            dto.setName(e.getName());
            dto.setShortName(e.getShortName());
            dto.setTeamCode(e.getTeamCode());
            result.add(dto);
        }
        return result;
    }

    public List<PlayerStatsSeriesSummaryDTO> listSeries(String source, String query) {
        String normalizedSource = normalizeDetailSource(source);
        List<PlayerStatsSeriesEntity> entities;
        if (hasText(query)) {
            entities = playerStatsSeriesRepository.searchBySourceSystem(normalizedSource, query.trim());
        } else {
            entities = playerStatsSeriesRepository.findBySourceSystemOrderByNameAsc(normalizedSource);
        }
        List<PlayerStatsSeriesSummaryDTO> result = new ArrayList<PlayerStatsSeriesSummaryDTO>();
        for (PlayerStatsSeriesEntity e : entities) {
            PlayerStatsSeriesSummaryDTO dto = new PlayerStatsSeriesSummaryDTO();
            dto.setExternalId(e.getExternalId());
            dto.setName(e.getName());
            dto.setShortName(e.getShortName());
            dto.setSeasonName(e.getSeasonName());
            result.add(dto);
        }
        return result;
    }

    private void validateRequest(PlayerStatsIngestionRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required.");
        }
        if (!hasText(request.getUrl()) && !hasText(request.getMatchExternalKey())) {
            throw new IllegalArgumentException("Either url or matchExternalKey is required.");
        }
        if (request.getTeams() == null || request.getTeams().isEmpty()) {
            throw new IllegalArgumentException("At least one team is required.");
        }
    }

    private void validateReferenceRequest(PlayerStatsReferenceIngestionRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required.");
        }
        if (request.getSnapshots() == null || request.getSnapshots().isEmpty()) {
            throw new IllegalArgumentException("At least one snapshot is required.");
        }

        int resourceCount = 0;
        if (request.getPlayer() != null) {
            validateEntityReference("Player", request.getPlayer().getExternalId(), request.getPlayer().getName());
            resourceCount++;
        }
        if (request.getTeam() != null) {
            validateEntityReference("Team", request.getTeam().getExternalId(), request.getTeam().getName());
            resourceCount++;
        }
        if (request.getSeries() != null) {
            validateEntityReference("Series", request.getSeries().getExternalId(), request.getSeries().getName());
            resourceCount++;
        }
        if (resourceCount != 1) {
            throw new IllegalArgumentException("Exactly one of player, team, or series is required.");
        }

        for (PlayerStatsPayloadDTO snapshot : safeList(request.getSnapshots())) {
            if (snapshot == null) {
                throw new IllegalArgumentException("Snapshots cannot contain null entries.");
            }
            if (!hasText(snapshot.getCategory())) {
                throw new IllegalArgumentException("Each snapshot category is required.");
            }
        }
    }

    private PlayerStatsSeriesEntity upsertSeries(PlayerStatsSeriesDTO dto, String source, long now) {
        if (dto == null) {
            return null;
        }

        Optional<PlayerStatsSeriesEntity> existing = Optional.empty();
        if (hasText(dto.getExternalId())) {
            existing = playerStatsSeriesRepository.findFirstBySourceSystemAndExternalId(source, trim(dto.getExternalId()));
        }
        if (!existing.isPresent() && hasText(dto.getName())) {
            existing = playerStatsSeriesRepository.findFirstByNameIgnoreCase(dto.getName().trim());
        }

        PlayerStatsSeriesEntity entity = existing.isPresent() ? existing.get() : new PlayerStatsSeriesEntity();
        entity.setSourceSystem(source);
        entity.setExternalId(firstNonBlank(dto.getExternalId(), entity.getExternalId()));
        entity.setName(firstNonBlank(dto.getName(), entity.getName()));
        entity.setShortName(firstNonBlank(dto.getShortName(), entity.getShortName()));
        entity.setSeasonName(firstNonBlank(dto.getSeasonName(), entity.getSeasonName()));
        if (!hasText(entity.getName())) {
            throw new IllegalArgumentException("Series name is required.");
        }
        entity.setUpdatedAt(now);
        return playerStatsSeriesRepository.save(entity);
    }

    private PlayerStatsTeamEntity upsertTeam(PlayerStatsTeamDTO dto, String source, long now) {
        if (dto == null) {
            return null;
        }

        Optional<PlayerStatsTeamEntity> existing = Optional.empty();
        if (hasText(dto.getExternalId())) {
            existing = playerStatsTeamRepository.findFirstBySourceSystemAndExternalId(source, trim(dto.getExternalId()));
        }
        if (!existing.isPresent() && hasText(dto.getName())) {
            existing = playerStatsTeamRepository.findFirstByNameIgnoreCase(dto.getName().trim());
        }

        PlayerStatsTeamEntity entity = existing.isPresent() ? existing.get() : new PlayerStatsTeamEntity();
        entity.setSourceSystem(source);
        entity.setExternalId(firstNonBlank(dto.getExternalId(), entity.getExternalId()));
        entity.setName(firstNonBlank(dto.getName(), entity.getName()));
        entity.setShortName(firstNonBlank(dto.getShortName(), entity.getShortName()));
        entity.setTeamCode(firstNonBlank(dto.getTeamCode(), entity.getTeamCode()));
        if (!hasText(entity.getName())) {
            throw new IllegalArgumentException("Team name is required.");
        }
        entity.setUpdatedAt(now);
        return playerStatsTeamRepository.save(entity);
    }

    private PlayerStatsPlayerEntity upsertPlayer(PlayerStatsPlayerDTO dto, String source, long now) {
        if (dto == null) {
            return null;
        }

        Optional<PlayerStatsPlayerEntity> existing = Optional.empty();
        if (hasText(dto.getExternalId())) {
            existing = playerStatsPlayerRepository.findFirstBySourceSystemAndExternalId(source, trim(dto.getExternalId()));
        }
        if (!existing.isPresent() && hasText(dto.getName())) {
            existing = playerStatsPlayerRepository.findFirstByNameIgnoreCase(dto.getName().trim());
        }

        PlayerStatsPlayerEntity entity = existing.isPresent() ? existing.get() : new PlayerStatsPlayerEntity();
        entity.setSourceSystem(source);
        entity.setExternalId(firstNonBlank(dto.getExternalId(), entity.getExternalId()));
        entity.setName(firstNonBlank(dto.getName(), entity.getName()));
        entity.setShortName(firstNonBlank(dto.getShortName(), entity.getShortName()));
        entity.setRole(firstNonBlank(dto.getRole(), entity.getRole()));
        entity.setBattingStyle(firstNonBlank(dto.getBattingStyle(), entity.getBattingStyle()));
        entity.setBowlingStyle(firstNonBlank(dto.getBowlingStyle(), entity.getBowlingStyle()));
        entity.setCountry(firstNonBlank(dto.getCountry(), entity.getCountry()));
        entity.setImageUrl(firstNonBlank(dto.getImageUrl(), entity.getImageUrl()));
        if (!hasText(entity.getName())) {
            throw new IllegalArgumentException("Player name is required.");
        }
        entity.setUpdatedAt(now);
        return playerStatsPlayerRepository.save(entity);
    }

    private PlayerStatsSquadMembershipEntity upsertSquadMembership(LiveMatch liveMatch, String matchUrl,
            String matchExternalKey, PlayerStatsSeriesEntity series, PlayerStatsTeamEntity team,
            PlayerStatsPlayerEntity player, PlayerStatsPlayerDTO playerDTO, String source, long now) {
        Optional<PlayerStatsSquadMembershipEntity> existing = Optional.empty();
        if (hasText(matchUrl)) {
            existing = playerStatsSquadMembershipRepository.findFirstByMatchUrlAndTeamAndPlayer(matchUrl, team, player);
        }
        if (!existing.isPresent() && hasText(matchExternalKey)) {
            existing = playerStatsSquadMembershipRepository.findFirstByMatchExternalKeyAndTeamAndPlayer(matchExternalKey,
                    team, player);
        }

        PlayerStatsSquadMembershipEntity entity = existing.isPresent() ? existing.get()
                : new PlayerStatsSquadMembershipEntity();
        entity.setLiveMatch(liveMatch);
        entity.setMatchUrl(matchUrl);
        entity.setMatchExternalKey(matchExternalKey);
        entity.setSeries(series);
        entity.setTeam(team);
        entity.setPlayer(player);
        entity.setSourceSystem(source);
        entity.setCaptain(playerDTO.getCaptain());
        entity.setWicketKeeper(playerDTO.getWicketKeeper());
        entity.setProbable(playerDTO.getProbable());
        entity.setAnnounced(playerDTO.getAnnounced());
        entity.setLineupOrder(playerDTO.getLineupOrder());
        entity.setUpdatedAt(now);
        return playerStatsSquadMembershipRepository.save(entity);
    }

    private CrawlerPlayerStatsSnapshotEntity upsertSnapshot(LiveMatch liveMatch, String matchUrl, String matchExternalKey,
            PlayerStatsSeriesEntity series, PlayerStatsTeamEntity team, PlayerStatsPlayerEntity player,
            PlayerStatsSquadMembershipEntity squadMembership, PlayerStatsPayloadDTO payloadDTO, String source,
            Long requestCapturedAt, long now) {
        Optional<CrawlerPlayerStatsSnapshotEntity> existing = Optional.empty();
        String category = trim(payloadDTO.getCategory());
        if (hasText(matchUrl)) {
            existing = crawlerPlayerStatsSnapshotRepository.findFirstByMatchUrlAndTeamAndPlayerAndStatsCategory(matchUrl, team,
                    player, category);
        }
        if (!existing.isPresent() && hasText(matchExternalKey)) {
            existing = crawlerPlayerStatsSnapshotRepository.findFirstByMatchExternalKeyAndTeamAndPlayerAndStatsCategory(
                    matchExternalKey, team, player, category);
        }

        CrawlerPlayerStatsSnapshotEntity entity = existing.isPresent() ? existing.get()
                : new CrawlerPlayerStatsSnapshotEntity();
        entity.setLiveMatch(liveMatch);
        entity.setMatchUrl(matchUrl);
        entity.setMatchExternalKey(matchExternalKey);
        entity.setSeries(series);
        entity.setTeam(team);
        entity.setPlayer(player);
        entity.setSquadMembership(squadMembership);
        entity.setSourceSystem(source);
        entity.setStatsCategory(category);
        entity.setStatsLabel(trim(payloadDTO.getLabel()));
        entity.setCapturedAt(firstNonNull(payloadDTO.getCapturedAt(), requestCapturedAt, now));
        entity.setUpdatedAt(now);
        entity.setPayloadJson(writeJson(payloadDTO.getPayload()));
        return crawlerPlayerStatsSnapshotRepository.save(entity);
    }

    private CrawlerPlayerStatsReferenceSnapshotEntity upsertReferenceSnapshot(String resourceUrl, String resourceScope,
            String source, PlayerStatsSeriesEntity series, PlayerStatsTeamEntity team, PlayerStatsPlayerEntity player,
            PlayerStatsPayloadDTO payloadDTO, Long requestCapturedAt, long now) {
        Optional<CrawlerPlayerStatsReferenceSnapshotEntity> existing = Optional.empty();
        String category = trim(payloadDTO.getCategory());

        if (RESOURCE_SCOPE_PLAYER.equals(resourceScope)) {
            existing = crawlerPlayerStatsReferenceSnapshotRepository
                    .findFirstBySourceSystemAndResourceScopeAndPlayerAndStatsCategory(source, resourceScope, player,
                            category);
        } else if (RESOURCE_SCOPE_TEAM.equals(resourceScope)) {
            existing = crawlerPlayerStatsReferenceSnapshotRepository
                    .findFirstBySourceSystemAndResourceScopeAndTeamAndStatsCategory(source, resourceScope, team,
                            category);
        } else if (RESOURCE_SCOPE_SERIES.equals(resourceScope)) {
            existing = crawlerPlayerStatsReferenceSnapshotRepository
                    .findFirstBySourceSystemAndResourceScopeAndSeriesAndStatsCategory(source, resourceScope, series,
                            category);
        }

        CrawlerPlayerStatsReferenceSnapshotEntity entity = existing.isPresent() ? existing.get()
                : new CrawlerPlayerStatsReferenceSnapshotEntity();
        entity.setResourceUrl(resourceUrl);
        entity.setSourceSystem(source);
        entity.setResourceScope(resourceScope);
        entity.setSeries(series);
        entity.setTeam(team);
        entity.setPlayer(player);
        entity.setStatsCategory(category);
        entity.setStatsLabel(trim(payloadDTO.getLabel()));
        entity.setCapturedAt(firstNonNull(payloadDTO.getCapturedAt(), requestCapturedAt, now));
        entity.setUpdatedAt(now);
        entity.setPayloadJson(writeJson(payloadDTO.getPayload()));
        return crawlerPlayerStatsReferenceSnapshotRepository.save(entity);
    }

    private List<PlayerStatsSquadMembershipEntity> loadMemberships(String url, String externalMatchKey) {
        List<PlayerStatsSquadMembershipEntity> memberships = hasText(url)
                ? playerStatsSquadMembershipRepository.findByMatchUrlOrderByIdAsc(url)
                : new ArrayList<PlayerStatsSquadMembershipEntity>();
        if (memberships.isEmpty() && hasText(externalMatchKey)) {
            memberships = playerStatsSquadMembershipRepository.findByMatchExternalKeyOrderByIdAsc(externalMatchKey);
        }
        return memberships;
    }

    private List<CrawlerPlayerStatsSnapshotEntity> loadSnapshots(String url, String externalMatchKey) {
        List<CrawlerPlayerStatsSnapshotEntity> snapshots = hasText(url)
                ? crawlerPlayerStatsSnapshotRepository.findByMatchUrlOrderByIdAsc(url)
                : new ArrayList<CrawlerPlayerStatsSnapshotEntity>();
        if (snapshots.isEmpty() && hasText(externalMatchKey)) {
            snapshots = crawlerPlayerStatsSnapshotRepository.findByMatchExternalKeyOrderByIdAsc(externalMatchKey);
        }
        return snapshots;
    }

    private PlayerStatsSnapshotViewDTO toSnapshotView(CrawlerPlayerStatsSnapshotEntity snapshot) {
        PlayerStatsSnapshotViewDTO view = new PlayerStatsSnapshotViewDTO();
        view.setCategory(snapshot.getStatsCategory());
        view.setLabel(snapshot.getStatsLabel());
        view.setCapturedAt(snapshot.getCapturedAt());
        view.setPayload(readJson(snapshot.getPayloadJson()));
        return view;
    }

    private PlayerStatsSeriesDTO toSeriesDTO(PlayerStatsSeriesEntity series) {
        if (series == null) {
            return null;
        }
        PlayerStatsSeriesDTO dto = new PlayerStatsSeriesDTO();
        dto.setExternalId(series.getExternalId());
        dto.setName(series.getName());
        dto.setShortName(series.getShortName());
        dto.setSeasonName(series.getSeasonName());
        return dto;
    }

    private List<PlayerStatsSnapshotViewDTO> toSortedReferenceSnapshots(
            List<CrawlerPlayerStatsReferenceSnapshotEntity> snapshots) {
        return toSortedReferenceSnapshots(snapshots, false);
    }

    private List<PlayerStatsSnapshotViewDTO> toSortedReferenceSnapshots(
            List<CrawlerPlayerStatsReferenceSnapshotEntity> snapshots, boolean standingsOnly) {
        List<PlayerStatsSnapshotViewDTO> views = new ArrayList<PlayerStatsSnapshotViewDTO>();
        for (CrawlerPlayerStatsReferenceSnapshotEntity snapshot : safeList(snapshots)) {
            if (standingsOnly && !isStandingsCategory(snapshot.getStatsCategory())) {
                continue;
            }
            PlayerStatsSnapshotViewDTO view = new PlayerStatsSnapshotViewDTO();
            view.setCategory(snapshot.getStatsCategory());
            view.setLabel(snapshot.getStatsLabel());
            view.setCapturedAt(snapshot.getCapturedAt());
            view.setPayload(readJson(snapshot.getPayloadJson()));
            views.add(view);
        }

        Collections.sort(views, new Comparator<PlayerStatsSnapshotViewDTO>() {
            @Override
            public int compare(PlayerStatsSnapshotViewDTO left, PlayerStatsSnapshotViewDTO right) {
                Long leftCaptured = left.getCapturedAt() == null ? 0L : left.getCapturedAt();
                Long rightCaptured = right.getCapturedAt() == null ? 0L : right.getCapturedAt();
                return rightCaptured.compareTo(leftCaptured);
            }
        });
        return views;
    }

    private boolean isStandingsCategory(String category) {
        String normalizedCategory = trim(category);
        if (!hasText(normalizedCategory)) {
            return false;
        }
        String lowerCaseCategory = normalizedCategory.toLowerCase();
        return lowerCaseCategory.contains("standing")
                || lowerCaseCategory.contains("points")
                || lowerCaseCategory.contains("ranking")
                || lowerCaseCategory.contains("table");
    }

    private PlayerStatsSeriesEntity extractSeries(List<PlayerStatsSquadMembershipEntity> memberships,
            List<CrawlerPlayerStatsSnapshotEntity> snapshots) {
        for (PlayerStatsSquadMembershipEntity membership : memberships) {
            if (membership.getSeries() != null) {
                return membership.getSeries();
            }
        }
        for (CrawlerPlayerStatsSnapshotEntity snapshot : snapshots) {
            if (snapshot.getSeries() != null) {
                return snapshot.getSeries();
            }
        }
        return null;
    }

    private String extractSource(List<PlayerStatsSquadMembershipEntity> memberships,
            List<CrawlerPlayerStatsSnapshotEntity> snapshots) {
        for (PlayerStatsSquadMembershipEntity membership : memberships) {
            if (hasText(membership.getSourceSystem())) {
                return membership.getSourceSystem();
            }
        }
        for (CrawlerPlayerStatsSnapshotEntity snapshot : snapshots) {
            if (hasText(snapshot.getSourceSystem())) {
                return snapshot.getSourceSystem();
            }
        }
        return null;
    }

    private String extractMatchUrl(List<PlayerStatsSquadMembershipEntity> memberships,
            List<CrawlerPlayerStatsSnapshotEntity> snapshots) {
        for (PlayerStatsSquadMembershipEntity membership : memberships) {
            if (hasText(membership.getMatchUrl())) {
                return membership.getMatchUrl();
            }
        }
        for (CrawlerPlayerStatsSnapshotEntity snapshot : snapshots) {
            if (hasText(snapshot.getMatchUrl())) {
                return snapshot.getMatchUrl();
            }
        }
        return null;
    }

    private String extractMatchExternalKey(List<PlayerStatsSquadMembershipEntity> memberships,
            List<CrawlerPlayerStatsSnapshotEntity> snapshots) {
        for (PlayerStatsSquadMembershipEntity membership : memberships) {
            if (hasText(membership.getMatchExternalKey())) {
                return membership.getMatchExternalKey();
            }
        }
        for (CrawlerPlayerStatsSnapshotEntity snapshot : snapshots) {
            if (hasText(snapshot.getMatchExternalKey())) {
                return snapshot.getMatchExternalKey();
            }
        }
        return null;
    }

    private String extractResourceUrl(List<CrawlerPlayerStatsReferenceSnapshotEntity> snapshots) {
        for (CrawlerPlayerStatsReferenceSnapshotEntity snapshot : snapshots) {
            if (hasText(snapshot.getResourceUrl())) {
                return snapshot.getResourceUrl();
            }
        }
        return null;
    }

    private LiveMatch findExistingMatch(String externalKey, String url) {
        if (hasText(externalKey)) {
            List<LiveMatch> matches = liveMatchRepository.findByExternalMatchKeyOrderByIdDesc(externalKey);
            if (matches != null && !matches.isEmpty()) {
                return matches.get(0);
            }
        }
        if (hasText(url)) {
            return liveMatchRepository.findByUrlContaining(url);
        }
        return null;
    }

    private String normalizeUrl(String url) {
        if (!hasText(url)) {
            return null;
        }
        String normalized = url.trim();
        if (!normalized.startsWith("http")) {
            normalized = "https://crex.com" + (normalized.startsWith("/") ? normalized : "/" + normalized);
        }
        return normalized;
    }

    private String extractExternalMatchKey(String url) {
        if (!hasText(url)) {
            return null;
        }
        List<String> parts = Arrays.stream(url.split("/"))
                .filter(this::hasText)
                .collect(Collectors.toList());
        if (parts.isEmpty()) {
            return null;
        }
        String last = parts.get(parts.size() - 1);
        if ("live".equalsIgnoreCase(last) || "scorecard".equalsIgnoreCase(last) || "info".equalsIgnoreCase(last)) {
            return parts.size() > 1 ? parts.get(parts.size() - 2) : last;
        }
        return last;
    }

    private String buildPlayerKey(PlayerStatsTeamEntity team, PlayerStatsPlayerEntity player) {
        Long teamId = team != null ? team.getId() : null;
        Long playerId = player != null ? player.getId() : null;
        return String.valueOf(teamId) + ":" + String.valueOf(playerId);
    }

    private String writeJson(Object payload) {
        try {
            return payload == null ? null : objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            throw new IllegalArgumentException("Unable to serialize stats payload.", e);
        }
    }

    private Object readJson(String payloadJson) {
        if (!hasText(payloadJson)) {
            return null;
        }
        try {
            return objectMapper.readValue(payloadJson, Object.class);
        } catch (IOException e) {
            return payloadJson;
        }
    }

    private <T> List<T> safeList(List<T> list) {
        return list == null ? Collections.<T>emptyList() : list;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String trim(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private String normalizeSource(String source) {
        return hasText(source) ? source.trim() : "crawler";
    }

    private String normalizeDetailSource(String source) {
        return hasText(source) ? source.trim() : "crex";
    }

    private String firstNonBlank(String primary, String fallback) {
        return hasText(primary) ? primary.trim() : trim(fallback);
    }

    private Long firstNonNull(Long primary, Long secondary, long fallback) {
        if (primary != null) {
            return primary;
        }
        if (secondary != null) {
            return secondary;
        }
        return Long.valueOf(fallback);
    }

    private String resolveResourceScope(PlayerStatsReferenceIngestionRequest request) {
        if (request.getPlayer() != null) {
            return RESOURCE_SCOPE_PLAYER;
        }
        if (request.getTeam() != null) {
            return RESOURCE_SCOPE_TEAM;
        }
        return RESOURCE_SCOPE_SERIES;
    }

    private String extractReferenceExternalId(PlayerStatsReferenceIngestionRequest request, String resourceScope) {
        if (RESOURCE_SCOPE_PLAYER.equals(resourceScope) && request.getPlayer() != null) {
            return trim(request.getPlayer().getExternalId());
        }
        if (RESOURCE_SCOPE_TEAM.equals(resourceScope) && request.getTeam() != null) {
            return trim(request.getTeam().getExternalId());
        }
        return request.getSeries() != null ? trim(request.getSeries().getExternalId()) : null;
    }

    private void validateEntityReference(String label, String externalId, String name) {
        if (!hasText(externalId) && !hasText(name)) {
            throw new IllegalArgumentException(label + " externalId or name is required.");
        }
    }
}
