package com.devglan.service.impl;

import com.devglan.dto.PagedResponseDTO;
import com.devglan.dto.UpcomingMatchDTO;
import com.devglan.model.UpcomingMatch;
import com.devglan.repository.UpcomingMatchRepository;
import com.devglan.service.UpcomingMatchService;
import com.devglan.util.UpcomingMatchMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service implementation for upcoming matches
 * Feature 005: Upcoming Matches Feed
 */
@Service
@Transactional
public class UpcomingMatchServiceImpl implements UpcomingMatchService {

    private static final Logger logger = LoggerFactory.getLogger(UpcomingMatchServiceImpl.class);

    @Autowired
    private UpcomingMatchRepository repository;

    @Override
    @Cacheable(
            value = "upcomingMatches",
            key = "#startDate + '_' + #endDate + '_' + #teamName + '_' + #seriesName + '_' + #page + '_' + #size",
            unless = "#result == null"
    )
    public PagedResponseDTO<UpcomingMatchDTO> getUpcomingMatches(
            Instant startDate,
            Instant endDate,
            String teamName,
            String seriesName,
            int page,
            int size
    ) {
        logger.info("Fetching upcoming matches: startDate={}, endDate={}, team={}, series={}, page={}, size={}",
                startDate, endDate, teamName, seriesName, page, size);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "startTimeUtc"));

        Page<UpcomingMatch> matchPage = repository.findUpcomingMatches(
                startDate,
                endDate,
                teamName,
                seriesName,
                pageable
        );

        List<UpcomingMatchDTO> dtos = matchPage.getContent()
                .stream()
                .map(UpcomingMatchMapper::toDTO)
                .collect(Collectors.toList());

        logger.info("Fetched {} matches (total elements: {})", dtos.size(), matchPage.getTotalElements());

        return new PagedResponseDTO<UpcomingMatchDTO>(
                dtos,
                page,
                size,
                matchPage.getTotalElements()
        );
    }

    @Override
    @Cacheable(value = "upcomingMatch", key = "#id", unless = "#result == null")
    public Optional<UpcomingMatchDTO> getUpcomingMatchById(Long id) {
        logger.debug("Fetching upcoming match by id: {}", id);
        return repository.findById(id)
                .map(UpcomingMatchMapper::toDTO);
    }

    @Override
    @CacheEvict(value = {"upcomingMatches", "upcomingMatch"}, allEntries = true)
    public UpcomingMatchDTO upsertUpcomingMatch(UpcomingMatchDTO dto) {
        logger.info("Upserting match: source={}, sourceKey={}, title={}",
                dto.getSource(), dto.getSourceKey(), dto.getMatchTitle());

        // Check if match exists by source + source_key
        Optional<UpcomingMatch> existingMatch = repository.findBySourceAndSourceKey(
                dto.getSource(),
                dto.getSourceKey()
        );

        UpcomingMatch entity;
        if (existingMatch.isPresent()) {
            entity = existingMatch.get();
            logger.debug("Updating existing match id={}", entity.getId());
            
            // Update mutable fields
            entity.setSeriesName(dto.getSeriesName());
            entity.setMatchTitle(dto.getMatchTitle());
            entity.setTeamAName(dto.getTeamA().getName());
            entity.setTeamBName(dto.getTeamB().getName());
            entity.setTeamACode(dto.getTeamA().getCode());
            entity.setTeamBCode(dto.getTeamB().getCode());
            entity.setStartTimeUtc(dto.getStartTime());
            
            if (dto.getVenue() != null) {
                entity.setVenueName(dto.getVenue().getName());
                entity.setCity(dto.getVenue().getCity());
                entity.setCountry(dto.getVenue().getCountry());
            }
            
            if (dto.getStatus() != null) {
                entity.setStatus(UpcomingMatch.MatchStatus.valueOf(dto.getStatus().toUpperCase()));
            }
            entity.setNotes(dto.getNotes());
            entity.setLastScrapedAt(Instant.now());
        } else {
            // Create new match
            entity = UpcomingMatchMapper.toEntity(dto);
            entity.setLastScrapedAt(Instant.now());
            logger.debug("Creating new match: {}", dto.getMatchTitle());
        }

        UpcomingMatch saved = repository.save(entity);
        logger.info("Match upserted successfully: id={}, title={}", saved.getId(), saved.getMatchTitle());

        return UpcomingMatchMapper.toDTO(saved);
    }

    @Override
    @CacheEvict(value = {"upcomingMatches", "upcomingMatch"}, allEntries = true)
    public List<UpcomingMatchDTO> upsertUpcomingMatches(List<UpcomingMatchDTO> dtos) {
        logger.info("Bulk upserting {} matches", dtos.size());

        List<UpcomingMatchDTO> results = dtos.stream()
                .map(this::upsertUpcomingMatch)
                .collect(Collectors.toList());

        logger.info("Bulk upsert completed: {} matches processed", results.size());
        return results;
    }

    @Override
    @CacheEvict(value = {"upcomingMatches", "upcomingMatch"}, allEntries = true)
    public int deleteMatchesOlderThan(Instant olderThan) {
        logger.info("Deleting matches older than: {}", olderThan);

        List<UpcomingMatch> oldMatches = repository.findUpcomingMatches(
                null,
                olderThan,
                null,
                null,
                Pageable.unpaged()
        ).getContent();

        int count = oldMatches.size();
        repository.deleteAll(oldMatches);

        logger.info("Deleted {} old matches", count);
        return count;
    }
}
