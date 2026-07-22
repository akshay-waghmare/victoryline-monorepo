package com.devglan.service.impl;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.devglan.dao.CricketDataDTO;
import com.devglan.dao.ScheduledMatchDTO;
import com.devglan.model.LiveMatch;
import com.devglan.model.MatchLifecycleStatus;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.service.CrexMatchUrlHelper;
import com.devglan.service.LiveMatchService;
import com.devglan.service.seo.events.SeoContentChangeEvent;
import com.devglan.websocket.service.CricketDataService;

@Service
public class LiveMatchServiceImpl implements LiveMatchService {

	private static final Logger logger = LoggerFactory.getLogger(LiveMatchServiceImpl.class);
	private static final ZoneId MATCH_DISPLAY_ZONE = ZoneId.of("Asia/Kolkata");

	private final LiveMatchRepository liveMatchRepository;
	private final CricketDataService cricketDataService;
	private final RestTemplate restTemplate;
	private final ApplicationEventPublisher eventPublisher;

	@Value("${stop.scrape.url:http://localhost:5000/stop-scrape}")
	private String stopScrapeUrl;

	@Autowired
	public LiveMatchServiceImpl(LiveMatchRepository liveMatchRepository, CricketDataService cricketDataService,
		RestTemplate restTemplate, ApplicationEventPublisher eventPublisher) {
		this.liveMatchRepository = liveMatchRepository;
		this.cricketDataService = cricketDataService;
		this.restTemplate = restTemplate;
		this.eventPublisher = eventPublisher;
	}

	public void syncLiveMatches(String[] urls) {
		logger.info("Starting the sync live matches logic.");

			List<String> urlList = Arrays.stream(urls)
                    .map(this::normalizeUrl)
                    .distinct()
                    .collect(Collectors.toList());
			List<LiveMatch> allNotDeletedMatches = liveMatchRepository.findByDeletionAttemptsLessThanAndIsDeletedFalse(Integer.valueOf(2));

			for (LiveMatch match : allNotDeletedMatches) {
                MatchLifecycleStatus currentStatus = match.getStatus();
                if (currentStatus != null && !currentStatus.isLiveLike()) {
                    continue;
                }

				if (!urlList.contains(normalizeUrl(match.getUrl()))) {
					match.setDeletionAttempts(match.getDeletionAttempts() + 1);
					
					if (match.getDeletionAttempts() >= 2) {
						CricketDataDTO lastUpdatedData = cricketDataService
								.getLastUpdatedData(appendBaseUrl(match.getUrl()));
						if (lastUpdatedData != null) {
							match.setLastKnownState(lastUpdatedData.getCurrentBall());
                            if (lastUpdatedData.getFinalResultText() != null && !lastUpdatedData.getFinalResultText().trim().isEmpty()) {
                                match.setResultSummary(lastUpdatedData.getFinalResultText());
                            }
						}
                        if ((match.getResultSummary() == null || match.getResultSummary().trim().isEmpty()) && match.getLastKnownState() != null) {
                            match.setResultSummary(match.getLastKnownState());
                        }
						match.setDeleted(true);
                        match.setStatus(inferTerminalStatus(match.getResultSummary()));
                        match.setLastStateUpdatedAt(System.currentTimeMillis());
						liveMatchRepository.save(match);
						stopScraping(match.getUrl());
						notifyMatchStatusChange(match.getUrl(), "completed");
					} else {
						liveMatchRepository.save(match);
					}
				}
			}

			for (String url : urls) {
                String normalizedUrl = normalizeUrl(url);
                String externalKey = extractExternalMatchKey(normalizedUrl);
                LiveMatch liveMatch = findExistingMatch(externalKey, normalizedUrl);
                boolean isNew = liveMatch == null;
                if (isNew) {
					liveMatch = new LiveMatch(normalizedUrl);
                    liveMatch.setExternalMatchKey(externalKey);
                } else {
                    liveMatch.setUrl(normalizedUrl);
                    if (liveMatch.getStatus() != null && liveMatch.getStatus().isTerminal()) {
                        // CREX live discovery is the authoritative signal for the active
                        // catalog. A schedule scrape can occasionally classify a live
                        // match as terminal from stale result text; do not let that stale
                        // terminal row permanently hide a match that CREX now lists live.
                        logger.warn("Reviving terminal match from authoritative live catalog: {}", normalizedUrl);
                    }
                }

                liveMatch.setDeleted(false);
                liveMatch.setDeletionAttempts(0);
                liveMatch.setStatus(MatchLifecycleStatus.LIVE);
                liveMatch.setLastStateUpdatedAt(System.currentTimeMillis());
                liveMatchRepository.save(liveMatch);

                if (isNew) {
					notifyMatchStatusChange(url, "added");
				} else {
					logger.info("URL already exists, refreshed lifecycle state: {}", normalizedUrl);
				}
			}

		logger.info("Live matches saved successfully!");
	}

    @Override
    public void syncScheduleMatches(List<ScheduledMatchDTO> matches) {
        if (matches == null || matches.isEmpty()) {
            return;
        }

        for (ScheduledMatchDTO dto : matches) {
            if (dto == null || dto.getUrl() == null || dto.getUrl().trim().isEmpty()) {
                continue;
            }

            String normalizedUrl = normalizeUrl(dto.getUrl());
            String externalKey = dto.getExternalMatchKey();
            if (externalKey == null || externalKey.trim().isEmpty()) {
                externalKey = extractExternalMatchKey(normalizedUrl);
            }

            MatchLifecycleStatus incomingStatus = MatchLifecycleStatus.fromString(dto.getStatus());
            if (incomingStatus == null) {
                incomingStatus = MatchLifecycleStatus.UPCOMING;
            }

            LiveMatch match = findExistingMatch(externalKey, normalizedUrl);
            boolean isNew = match == null;
            if (isNew) {
                match = new LiveMatch(normalizedUrl);
                match.setStatus(null);
            }
            MatchLifecycleStatus previousStatus = match.getStatus();

            match.setUrl(normalizedUrl);
            match.setExternalMatchKey(externalKey);
            if (dto.getScheduledStartTime() != null) {
                match.setScheduledStartTime(dto.getScheduledStartTime());
            }
            if (dto.getTeam1Name() != null && !dto.getTeam1Name().trim().isEmpty()) {
                match.setTeam1Name(dto.getTeam1Name());
            }
            if (dto.getTeam2Name() != null && !dto.getTeam2Name().trim().isEmpty()) {
                match.setTeam2Name(dto.getTeam2Name());
            }
            if (dto.getSeriesName() != null && !dto.getSeriesName().trim().isEmpty()) {
                match.setSeriesName(dto.getSeriesName());
            }
            if (dto.getMatchFormat() != null && !dto.getMatchFormat().trim().isEmpty()) {
                match.setMatchFormat(dto.getMatchFormat());
            }
            if (dto.getVenue() != null && !dto.getVenue().trim().isEmpty()) {
                match.setVenue(dto.getVenue());
            }
            if (dto.getResultSummary() != null && !dto.getResultSummary().trim().isEmpty()) {
                match.setResultSummary(dto.getResultSummary());
                if (match.getLastKnownState() == null || match.getLastKnownState().trim().isEmpty()) {
                    match.setLastKnownState(dto.getResultSummary());
                }
                if (incomingStatus == null || !incomingStatus.isTerminal()) {
                    incomingStatus = inferTerminalStatus(dto.getResultSummary());
                }
            }

            MatchLifecycleStatus mergedStatus = isNew ? incomingStatus : mergeLifecycleStatus(match.getStatus(), incomingStatus);
            match.setStatus(mergedStatus);
            match.setDeleted(mergedStatus != null && mergedStatus.isTerminal());
            if (mergedStatus != null && mergedStatus.isTerminal()) {
                match.setDeletionAttempts(2);
            } else if (mergedStatus == MatchLifecycleStatus.UPCOMING
                    || (mergedStatus != null && mergedStatus.isLiveLike())) {
                match.setDeletionAttempts(0);
            }
            match.setLastStateUpdatedAt(dto.getLastStateUpdatedAt() != null
                    ? dto.getLastStateUpdatedAt()
                    : System.currentTimeMillis());

            liveMatchRepository.save(match);

            boolean transitionedToTerminal = mergedStatus != null
                    && mergedStatus.isTerminal()
                    && (previousStatus == null || !previousStatus.isTerminal());

            if (transitionedToTerminal) {
                stopScraping(match.getUrl());
                notifyMatchStatusChange(match.getUrl(), "completed");
            } else if (isNew) {
                notifyMatchStatusChange(match.getUrl(), "added");
            } else {
                publishSeoEvent(null, match.getUrl());
            }
        }
    }

	private void stopScraping(String url) {
		try {
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);

			Map<String, String> requestBody = new HashMap<>();
			requestBody.put("url", url);

			HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

			ResponseEntity<String> response = restTemplate.exchange(stopScrapeUrl, HttpMethod.POST, request,
					String.class);

			if (response.getStatusCode().is2xxSuccessful()) {
				logger.info("Successfully requested to stop scraping for URL: {}", url);
			} else {
				logger.error("Failed to request to stop scraping for URL: {}", url);
			}
		} catch (Exception e) {
			logger.error("Exception while requesting to stop scraping for URL: {}. Error: ", url, e);
		}
	}

	private void notifyMatchStatusChange(String url, String status) {
		cricketDataService.notifyMatchStatusChange(url, status);
		publishSeoEvent(status, url);
	}

	private void publishSeoEvent(String status, String url) {
		SeoContentChangeEvent event;
		if (status == null) {
			event = SeoContentChangeEvent.matchUpdated(url);
		} else {
			switch (status.toLowerCase()) {
				case "added":
					event = SeoContentChangeEvent.matchPublished(url);
					break;
				case "deleted":
                case "completed":
					event = SeoContentChangeEvent.matchCompleted(url);
					break;
				default:
					event = SeoContentChangeEvent.matchUpdated(url);
			}
		}
		eventPublisher.publishEvent(event);
	}

	public List<LiveMatch> findAll() {
		return liveMatchRepository.findByIsDeletedFalse();
	}
	
	public List<LiveMatch> findAllLiveMatches() {
		return liveMatchRepository.findByDeletionAttemptsLessThanAndIsDeletedFalse(Integer.valueOf(2))
                .stream()
                .filter(this::isLiveLike)
                .map(this::enrichLiveMatchFromSnapshot)
                .collect(Collectors.toList());
	}

	public List<LiveMatch> findAllMatches() {
		return liveMatchRepository.findAll();
	}

	public List<LiveMatch> findAllFinishedMatches() {
		return findCompletedMatches();
	}

    @Override
    public List<LiveMatch> findUpcomingMatches() {
        long startOfToday = LocalDate.now(MATCH_DISPLAY_ZONE)
                .atStartOfDay(MATCH_DISPLAY_ZONE)
                .toInstant()
                .toEpochMilli();
        return liveMatchRepository.findUpcomingMatchesStartingAtOrAfter(
                Arrays.asList(MatchLifecycleStatus.UPCOMING),
                startOfToday);
    }

    @Override
    public List<LiveMatch> findCompletedMatches() {
        return liveMatchRepository.findByStatusInOrderByLastStateUpdatedAtDesc(
                Arrays.asList(MatchLifecycleStatus.COMPLETED, MatchLifecycleStatus.ABANDONED));
    }
	
	public LiveMatch findByUrl(String url) {
		return liveMatchRepository.findByUrlContaining(url);
	}

	public ResponseEntity<CricketDataDTO> fetchAndSendData(String url) {
		CricketDataDTO lastUpdatedData = cricketDataService.getLastUpdatedData(url);
		if (lastUpdatedData != null) {
			return ResponseEntity.ok(lastUpdatedData);
		} else {
			return ResponseEntity.notFound().build();
		}
	}

	public String appendBaseUrl(String url) {
		// URL is already complete (contains https://crex.com), no need to append
		return url;
	}

	
	@Override
	public LiveMatch update(LiveMatch match) {
		return liveMatchRepository.save(match);
	}

    private boolean isLiveLike(LiveMatch match) {
        if (match.getStatus() == null) {
            return !match.isDeleted();
        }
        return match.getStatus().isLiveLike();
    }

    private String normalizeUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return url;
        }
        String normalized = url.trim();
        if (!normalized.startsWith("http")) {
            normalized = "https://crex.com" + (normalized.startsWith("/") ? normalized : "/" + normalized);
        }
        return normalized;
    }

    private String extractExternalMatchKey(String url) {
        return CrexMatchUrlHelper.extractMatchKey(url);
    }

    private LiveMatch findExistingMatch(String externalKey, String url) {
        LiveMatch existing = null;
        if (externalKey != null && !externalKey.trim().isEmpty()) {
            List<LiveMatch> matches = liveMatchRepository.findByExternalMatchKeyOrderByIdDesc(externalKey);
            if (matches != null && !matches.isEmpty()) {
                existing = matches.get(0);
                if (matches.size() > 1) {
                    logger.warn("Multiple matches found for external key {}. Using latest record {}",
                            externalKey, existing.getId());
                }
            }
        }
        if (existing == null && url != null && !url.trim().isEmpty()) {
            existing = liveMatchRepository.findByUrlContaining(url);
        }
        return existing;
    }

    private MatchLifecycleStatus inferTerminalStatus(String resultSummary) {
        if (resultSummary == null || resultSummary.trim().isEmpty()) {
            return MatchLifecycleStatus.COMPLETED;
        }

        String normalized = resultSummary.toLowerCase();
        if (normalized.contains("abandoned") || normalized.contains("no result")) {
            return MatchLifecycleStatus.ABANDONED;
        }
        return MatchLifecycleStatus.COMPLETED;
    }

    private MatchLifecycleStatus mergeLifecycleStatus(MatchLifecycleStatus current, MatchLifecycleStatus incoming) {
        if (incoming == null) {
            return current != null ? current : MatchLifecycleStatus.UPCOMING;
        }
        if (current == null) {
            return incoming;
        }

        if (current.isTerminal()) {
            return current;
        }

        if (incoming.isTerminal()) {
            return incoming;
        }

        if (current == MatchLifecycleStatus.UPCOMING) {
            return incoming;
        }

        if (incoming == MatchLifecycleStatus.UPCOMING) {
            return current;
        }

        return statusPriority(current) >= statusPriority(incoming) ? current : incoming;
    }

    private int statusPriority(MatchLifecycleStatus status) {
        if (status == null) {
            return 0;
        }

        switch (status) {
            case LIVE:
                return 60;
            case INNINGS_BREAK:
                return 55;
            case RAIN_DELAY:
                return 50;
            case COMPLETED:
            case ABANDONED:
                return 40;
            case UPCOMING:
                return 10;
            default:
                return 0;
        }
    }

    private LiveMatch enrichLiveMatchFromSnapshot(LiveMatch match) {
        if (match == null || match.getUrl() == null || match.getUrl().trim().isEmpty()) {
            return match;
        }

        boolean needsEnrichment =
                isBlank(match.getTeam1Name())
                || isBlank(match.getTeam2Name())
                || isBlank(match.getVenue())
                || isBlank(match.getLastKnownState());

        if (!needsEnrichment) {
            return match;
        }

        try {
            CricketDataDTO snapshot = cricketDataService.getLastUpdatedData(match.getUrl());
            if (snapshot == null) {
                snapshot = cricketDataService.getLastUpdatedData(buildMatchDetailsUrl(match.getUrl()));
            }
            if (snapshot == null) {
                return match;
            }

            if (isBlank(match.getVenue()) && !isBlank(snapshot.getVenue())) {
                match.setVenue(snapshot.getVenue().trim());
            }

            if (isBlank(match.getLastKnownState())) {
                String liveSummary = firstNonBlank(
                        snapshot.getCurrentBall(),
                        snapshot.getMatchAnnouncement(),
                        snapshot.getFinalResultText(),
                        snapshot.getTossInfo());
                if (!isBlank(liveSummary)) {
                    match.setLastKnownState(liveSummary.trim());
                }
            }

            if (isBlank(match.getResultSummary()) && !isBlank(snapshot.getFinalResultText())) {
                match.setResultSummary(snapshot.getFinalResultText().trim());
            }

            if (isBlank(match.getTeam1Name()) || isBlank(match.getTeam2Name())) {
                List<String> teams = extractTeams(snapshot.getMatchName());
                if (teams.size() >= 2) {
                    if (isBlank(match.getTeam1Name())) {
                        match.setTeam1Name(teams.get(0));
                    }
                    if (isBlank(match.getTeam2Name())) {
                        match.setTeam2Name(teams.get(1));
                    }
                }
            }
        } catch (Exception e) {
            logger.debug("Could not enrich live match feed row for {}", match.getUrl(), e);
        }

        return match;
    }

    private List<String> extractTeams(String matchName) {
        List<String> teams = new ArrayList<>();
        if (isBlank(matchName)) {
            return teams;
        }

        String normalized = matchName.replaceAll("\\s+", " ").trim();
        String[] separators = new String[] { " vs ", " v ", " VS ", " V " };
        for (String separator : separators) {
            int index = normalized.indexOf(separator);
            if (index > 0) {
                String team1 = normalized.substring(0, index).trim();
                String team2 = normalized.substring(index + separator.length()).trim();
                if (!isBlank(team1) && !isBlank(team2)) {
                    teams.add(team1);
                    teams.add(team2);
                }
                return teams;
            }
        }

        return teams;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }

        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String buildMatchDetailsUrl(String url) {
        if (isBlank(url) || url.endsWith("/match-details")) {
            return url;
        }
        return url + "/match-details";
    }
}
