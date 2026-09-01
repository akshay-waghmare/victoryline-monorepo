package com.devglan.service.impl;

import java.time.LocalDate;
import java.time.ZoneId;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import javax.annotation.PostConstruct;
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
import com.devglan.model.MatchLifecycleCohort;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.service.CrexMatchUrlHelper;
import com.devglan.service.LiveMatchService;
import com.devglan.service.seo.events.SeoContentChangeEvent;
import com.devglan.websocket.service.CricketDataService;

@Service
public class LiveMatchServiceImpl implements LiveMatchService {

	private static final Logger logger = LoggerFactory.getLogger(LiveMatchServiceImpl.class);
	private static final ZoneId MATCH_DISPLAY_ZONE = ZoneId.of("Asia/Kolkata");
	private static final long ONE_DAY_MS = 24L * 60L * 60L * 1000L;
	private static final long LIMITED_OVERS_LIFECYCLE_WINDOW_MS = 2L * ONE_DAY_MS;
	private static final long UNSCHEDULED_LIVE_STATE_WINDOW_MS = 36L * 60L * 60L * 1000L;
	private static final Pattern SCORE_TOKEN_PATTERN = Pattern.compile("\\b\\d+\\s*/\\s*\\d+(?:\\.\\d+)?\\b");

	private final LiveMatchRepository liveMatchRepository;
	private final CricketDataService cricketDataService;
	private final RestTemplate restTemplate;
	private final ApplicationEventPublisher eventPublisher;
	private final Map<String, String> liveSeoSnapshotFingerprints = new ConcurrentHashMap<>();

	@Value("${stop.scrape.url:http://localhost:5000/stop-scrape}")
	private String stopScrapeUrl;

	@Value("${seo.live-content-freshness-throttle-ms:900000}")
	private long liveContentFreshnessThrottleMs = 900000L;

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
                boolean selectedForManagedFeed = urlList.contains(normalizeUrl(match.getUrl()));
                if (!selectedForManagedFeed && match.isLiveFeedManaged()) {
                    // The provider catalogue may contain more live matches than
                    // the bounded scraper slate. Retain the catalogue row, but
                    // withdraw its live-score freshness claim immediately.
                    match.setLiveFeedManaged(false);
                    liveMatchRepository.save(match);
                }
                if (currentStatus != null && !currentStatus.isLiveLike()) {
                    continue;
                }

				if (!selectedForManagedFeed) {
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
						MatchLifecycleStatus inferredStatus = lifecycleFromEvidence(match);
						boolean hasTerminalEvidence = hasTerminalResultSignal(match.getResultSummary());

						// CREX discovery can briefly return an empty slate while the
						// scraper/browser is recovering. Absence from that slate is not
						// proof that a live match finished. Keep the last live state until
						// a terminal result (or abandoned/no-result signal) is present.
						if (!hasTerminalEvidence && inferredStatus == MatchLifecycleStatus.COMPLETED) {
							inferredStatus = retainNonTerminalStatus(match);
						}

						// A multi-day match can disappear from CREX's live carousel at
                        // stumps. Retain only evidence-backed innings breaks (or a
                        // clearly multi-day fixture); an absent limited-overs LIVE
                        // row must leave the live catalogue instead of being kept by
                        // the generic lifecycle window.
						if (!inferredStatus.isTerminal() && !shouldRetainAbsentLiveMatch(match, inferredStatus)
								&& hasTerminalEvidence) {
                            inferredStatus = MatchLifecycleStatus.COMPLETED;
                        }
                        if (!inferredStatus.isTerminal()) {
                            match.setDeleted(false);
                            match.setDeletionAttempts(0);
                            match.setStatus(inferredStatus);
                            match.setLastStateUpdatedAt(System.currentTimeMillis());
                            liveMatchRepository.save(match);
                            continue;
                        }
						match.setDeleted(true);
                        match.setStatus(inferredStatus);
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
                if (!isValidCatalogMatchUrl(normalizedUrl)) {
                    logger.warn("Ignoring malformed CREX live-match URL: {}", normalizedUrl);
                    continue;
                }
                String externalKey = extractCatalogMatchKey(normalizedUrl);
                LiveMatch liveMatch = findExistingMatch(externalKey, normalizedUrl);
                boolean isNew = liveMatch == null;
                // A terminal/deleted row is historical evidence, not a writable
                // owner for a newly authoritative live selection. Create an active
                // row so a stale retired alias can never hide a real live feed.
                if (liveMatch != null && liveMatch.isDeleted()
                        && liveMatch.getStatus() != null && liveMatch.getStatus().isTerminal()) {
                    logger.warn("Creating active catalog row for previously retired live match: {}", normalizedUrl);
                    LiveMatch retired = liveMatch;
                    liveMatch = new LiveMatch(normalizedUrl);
                    liveMatch.setTeam1Name(retired.getTeam1Name());
                    liveMatch.setTeam2Name(retired.getTeam2Name());
                    liveMatch.setSeriesName(retired.getSeriesName());
                    liveMatch.setMatchFormat(retired.getMatchFormat());
                    liveMatch.setVenue(retired.getVenue());
                    liveMatch.setScheduledStartTime(retired.getScheduledStartTime());
                    liveMatch.setResultSummary(retired.getResultSummary());
                    liveMatch.setLastKnownState(retired.getLastKnownState());
                    isNew = true;
                }
                if (isNew) {
					if (liveMatch == null) {
                        liveMatch = new LiveMatch(normalizedUrl);
                    }
                    liveMatch.setExternalMatchKey(externalKey);
                } else {
                    liveMatch.setUrl(normalizedUrl);
                    liveMatch.setExternalMatchKey(externalKey);
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
                liveMatch.setLiveFeedManaged(true);
                liveMatch.setLastStateUpdatedAt(System.currentTimeMillis());
                liveMatchRepository.save(liveMatch);

                if (isNew) {
					notifyMatchStatusChange(url, "added");
				} else {
					logger.info("URL already exists, refreshed lifecycle state: {}", normalizedUrl);
				}
			}
            reconcileDuplicateMatchRows();

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
            if (!isValidCatalogMatchUrl(normalizedUrl)) {
                logger.warn("Ignoring malformed CREX schedule URL: {}", normalizedUrl);
                continue;
            }
            String externalKey = extractCatalogMatchKey(normalizedUrl);

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
            String team1Name = sanitizeCatalogText(dto.getTeam1Name());
            String team2Name = sanitizeCatalogText(dto.getTeam2Name());
            String seriesName = sanitizeCatalogText(dto.getSeriesName());
            String matchFormat = sanitizeCatalogText(dto.getMatchFormat());
            String venue = sanitizeCatalogText(dto.getVenue());
            String resultSummary = sanitizeCatalogText(dto.getResultSummary());
            if (team1Name != null) {
                match.setTeam1Name(team1Name);
            }
            if (team2Name != null) {
                match.setTeam2Name(team2Name);
            }
            if (seriesName != null) {
                match.setSeriesName(seriesName);
            }
            if (matchFormat != null) {
                match.setMatchFormat(matchFormat);
            }
            if (venue != null) {
                match.setVenue(venue);
            }
            if (resultSummary != null) {
                match.setResultSummary(resultSummary);
                if (match.getLastKnownState() == null || match.getLastKnownState().trim().isEmpty()) {
                    match.setLastKnownState(resultSummary);
                }
                if (incomingStatus == null || !incomingStatus.isTerminal()) {
                    incomingStatus = inferTerminalStatus(resultSummary);
                }
            }

            // A provider lifecycle flag without a terminal result is not enough to
            // publish a completed match. This prevents a stale schedule card from
            // converting "Day 2 stumps" into "Match completed".
            if (incomingStatus != null && incomingStatus.isTerminal() && !hasTerminalResultSignal(resultSummary)) {
                incomingStatus = lifecycleFromEvidence(match);
                if (incomingStatus == MatchLifecycleStatus.COMPLETED) {
                    incomingStatus = retainNonTerminalStatus(match);
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
        return resolvedCanonicalCatalogue().stream()
                .filter(this::isLiveLike)
                .filter(LiveMatch::isLiveFeedManaged)
                .map(this::enrichLiveMatchFromSnapshot)
                .collect(Collectors.toList());
	}

    @Override
    public List<LiveMatch> findMatchesByCohort(MatchLifecycleCohort cohort) {
        if (cohort == null) {
            return new ArrayList<>();
        }
        return resolvedCanonicalCatalogue().stream()
                .filter(this::isPubliclyIndexable)
                .filter(match -> cohort != MatchLifecycleCohort.LIVE || match.isLiveFeedManaged())
                .filter(match -> cohort == cohortFor(match))
                .map(match -> cohort == MatchLifecycleCohort.LIVE ? enrichLiveMatchFromSnapshot(match) : match)
                .collect(Collectors.toList());
	}

	public List<LiveMatch> findAllMatches() {
		return resolvedCanonicalCatalogue();
	}

    @Override
    public List<LiveMatch> findIndexableMatches() {
        return resolvedCanonicalCatalogue().stream()
                .filter(this::isPubliclyIndexable)
                .collect(Collectors.toList());
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
        return resolvedCanonicalCatalogue().stream()
                .filter(match -> match.getStatus() == MatchLifecycleStatus.UPCOMING)
                .filter(match -> match.getScheduledStartTime() != null && match.getScheduledStartTime() >= startOfToday)
                // Upcoming rows are often written from a compact schedule card. Hydrate
                // only missing identity facts from the stored canonical snapshot so SSR
                // can show a real venue without inventing one or changing the source URL.
                .map(this::enrichLiveMatchFromSnapshot)
                .collect(Collectors.toList());
    }

    @Override
    public List<LiveMatch> findCompletedMatches() {
        return resolvedCanonicalCatalogue().stream()
                .filter(match -> match.getStatus() != null && match.getStatus().isTerminal())
                .sorted(Comparator.comparing((LiveMatch match) -> match.getLastStateUpdatedAt() == null ? 0L : match.getLastStateUpdatedAt()).reversed())
                .collect(Collectors.toList());
    }
	
	public LiveMatch findByUrl(String url) {
		return liveMatchRepository.findFirstByUrlContainingOrderByIdDesc(url);
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

	/**
	 * Records the latest merged viewer-facing score/state snapshot without
	 * turning every scraper heartbeat into a sitemap regeneration. The complete
	 * snapshot fingerprint is persisted, while seoContentModifiedAt advances at
	 * most once per configured throttle window (or immediately for a new final
	 * result). A sitemap event is emitted only when lastmod actually advances.
	 */
	@Override
	public boolean recordSeoLiveSnapshot(String url, CricketDataDTO snapshot) {
		if (liveMatchRepository == null || snapshot == null || isBlank(url)) {
			return false;
		}

		String normalizedUrl = normalizeUrl(url);
		String externalKey = extractCatalogMatchKey(normalizedUrl);
		LiveMatch match = findExistingMatch(externalKey, normalizedUrl);
		if (match == null) {
			return false;
		}

		String fingerprint = buildSeoLiveContentFingerprint(snapshot);
		if (fingerprint == null) {
			return false;
		}
		String snapshotKey = extractCatalogIdentity(normalizedUrl);
		String previousFingerprint = liveSeoSnapshotFingerprints.put(snapshotKey, fingerprint);
		if (Objects.equals(fingerprint, previousFingerprint)
				|| (previousFingerprint == null && Objects.equals(fingerprint, match.getSeoLiveContentFingerprint()))) {
			return false;
		}

		match.setSeoLiveContentFingerprint(fingerprint);
		long now = System.currentTimeMillis();
		boolean finalResultChanged = !isBlank(snapshot.getFinalResultText())
				&& !Objects.equals(snapshot.getFinalResultText().trim(), trimToNull(match.getResultSummary()));
		Long previousModifiedAt = match.getSeoContentModifiedAt();
		boolean freshnessWindowOpen = previousModifiedAt == null
				|| now - previousModifiedAt >= Math.max(0L, liveContentFreshnessThrottleMs);
		boolean advanceLastmod = finalResultChanged || freshnessWindowOpen;
		if (advanceLastmod) {
			match.setSeoContentModifiedAt(now);
		}

		if (!advanceLastmod) {
			// Keep the latest fingerprint in memory so repeated live patches do
			// not write the catalogue row while the freshness window is closed.
			return false;
		}

		liveMatchRepository.save(match);
		if (advanceLastmod && eventPublisher != null) {
			eventPublisher.publishEvent(SeoContentChangeEvent.matchUpdated(normalizedUrl));
		}
		return advanceLastmod;
	}

	private String buildSeoLiveContentFingerprint(CricketDataDTO snapshot) {
		String score = trimToNull(snapshot.getScore());
		String over = snapshot.getOver() == null ? null : String.valueOf(snapshot.getOver());
		String currentBall = trimToNull(snapshot.getCurrentBall());
		String announcement = trimToNull(snapshot.getMatchAnnouncement());
		String finalResult = trimToNull(snapshot.getFinalResultText());
		String battingTeam = trimToNull(snapshot.getBattingTeamName());
		String toss = trimToNull(snapshot.getTossInfo());
		if (score == null && over == null && currentBall == null && announcement == null
				&& finalResult == null && battingTeam == null && toss == null) {
			return null;
		}

		String source = String.join("|", safe(score), safe(over), safe(currentBall),
				safe(announcement), safe(finalResult), safe(battingTeam), safe(toss));
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256")
					.digest(source.getBytes(StandardCharsets.UTF_8));
			StringBuilder hex = new StringBuilder(64);
			for (byte value : digest) {
				hex.append(String.format("%02x", value));
			}
			return hex.toString();
		} catch (NoSuchAlgorithmException impossible) {
			throw new IllegalStateException("SHA-256 unavailable", impossible);
		}
	}

	private String trimToNull(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}
		return value.trim();
	}

	private String safe(String value) {
		return value == null ? "" : value;
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

    private String extractCatalogMatchKey(String url) {
        String apiKey = CrexMatchUrlHelper.extractCrexApiKey(url);
        return apiKey != null ? apiKey : extractExternalMatchKey(url);
    }

    private String extractCatalogIdentity(String url) {
        String identity = CrexMatchUrlHelper.matchIdentityKey(url);
        return identity == null ? "row:" + String.valueOf(url) : identity;
    }

    @PostConstruct
    public void reconcileDuplicateMatchRowsOnStartup() {
        reconcileDuplicateMatchRows();
    }

    private void reconcileDuplicateMatchRows() {
        List<LiveMatch> matches = liveMatchRepository.findByIsDeletedFalse();
        for (LiveMatch match : matches) {
            normalizeStoredCatalogText(match);
        }
        Map<String, List<LiveMatch>> byIdentity = matches.stream()
                .filter(this::isValidCatalogMatch)
                .collect(Collectors.groupingBy(match -> extractCatalogIdentity(match.getUrl())));
        for (Map.Entry<String, List<LiveMatch>> entry : byIdentity.entrySet()) {
            if (entry.getValue().size() < 2) {
                continue;
            }
            LiveMatch keeper = entry.getValue().stream().max(Comparator
                    .comparing(this::hasUsableSlugAndTeams)
                    .thenComparing(match -> match.getLastStateUpdatedAt() == null ? 0L : match.getLastStateUpdatedAt()))
                    .get();
            for (LiveMatch duplicate : entry.getValue()) {
                if (duplicate.getId() != null && duplicate.getId().equals(keeper.getId())) {
                    continue;
                }
                duplicate.setDeleted(true);
                duplicate.setDeletionAttempts(2);
                liveMatchRepository.save(duplicate);
                logger.warn("Soft-deleted duplicate catalog row {} for catalog identity {}; keeping {}", duplicate.getId(), entry.getKey(), keeper.getId());
            }
        }
    }

    private void normalizeStoredCatalogText(LiveMatch match) {
        String team1 = sanitizeCatalogText(match.getTeam1Name());
        String team2 = sanitizeCatalogText(match.getTeam2Name());
        String externalKey = extractCatalogMatchKey(match.getUrl());
        if (!java.util.Objects.equals(team1, match.getTeam1Name()) || !java.util.Objects.equals(team2, match.getTeam2Name())
                || !java.util.Objects.equals(externalKey, match.getExternalMatchKey())) {
            match.setTeam1Name(team1);
            match.setTeam2Name(team2);
            match.setExternalMatchKey(externalKey);
            liveMatchRepository.save(match);
        }
    }

    private boolean hasUsableSlugAndTeams(LiveMatch match) {
        return isValidCatalogMatchUrl(match.getUrl()) && !isBlank(match.getTeam1Name()) && !isBlank(match.getTeam2Name());
    }

    private boolean isValidCatalogMatch(LiveMatch match) {
        return match != null && isValidCatalogMatchUrl(match.getUrl());
    }

    private boolean isPubliclyIndexable(LiveMatch match) {
        if (!isValidCatalogMatch(match) || match.getStatus() == null) {
            return false;
        }

        if (match.getStatus() == MatchLifecycleStatus.UPCOMING) {
            Long scheduledStart = match.getScheduledStartTime();
            return scheduledStart != null && scheduledStart > System.currentTimeMillis();
        }

        // A terminal URL must carry a result decision, otherwise it is only a
        // historical catalogue shell.  The sitemap applies the same guard;
        // keeping it here makes match cohorts, canonical SSR resolution, and
        // published URLs agree instead of advertising a page we cannot make
        // meaningfully different from every other empty result page.
        if (match.getStatus().isTerminal()) {
            if (match.getStatus() == MatchLifecycleStatus.ABANDONED) {
                return true;
            }
            String evidence = String.valueOf(match.getResultSummary()) + " "
                    + String.valueOf(match.getLastKnownState());
            return hasTerminalResultSignal(evidence);
        }

        return true;
    }

    private boolean isValidCatalogMatchUrl(String url) {
        if (isBlank(url)) {
            return false;
        }
        String slug = CrexMatchUrlHelper.extractMatchKey(url);
        return CrexMatchUrlHelper.isCanonicalMatchSlug(slug);
    }

    private String sanitizeCatalogText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() || "null".equalsIgnoreCase(trimmed) || "undefined".equalsIgnoreCase(trimmed) ? null : trimmed;
    }

    private LiveMatch findExistingMatch(String externalKey, String url) {
        LiveMatch existing = null;
        if (url != null && !url.trim().isEmpty()) {
            existing = liveMatchRepository.findFirstByUrlContainingOrderByIdDesc(url);
            if (existing != null) {
                return existing;
            }
        }
        if (externalKey != null && !externalKey.trim().isEmpty()) {
            List<LiveMatch> matches = liveMatchRepository.findByExternalMatchKeyOrderByIdDesc(externalKey);
            String requestedIdentity = extractCatalogIdentity(url);
            if (matches != null) {
                for (LiveMatch candidate : matches) {
                    if (candidate != null && requestedIdentity.equals(extractCatalogIdentity(candidate.getUrl()))) {
                        existing = candidate;
                        break;
                    }
                }
                if (existing == null && !matches.isEmpty()) {
                    logger.warn("Rejected {} catalog rows for short CREX key {} because their team families differ from {}",
                            matches.size(), externalKey, requestedIdentity);
                }
            }
        }
        return existing;
    }

    private MatchLifecycleStatus inferTerminalStatus(String resultSummary) {
        String normalized = resultSummary == null ? "" : resultSummary.toLowerCase();
        if (normalized.contains("abandoned") || normalized.contains("no result")) {
            return MatchLifecycleStatus.ABANDONED;
        }
        if (hasCompletedResultSignal(normalized)) {
            return MatchLifecycleStatus.COMPLETED;
        }
        if (hasInningsBreakSignal(normalized)) {
            return MatchLifecycleStatus.INNINGS_BREAK;
        }
        return MatchLifecycleStatus.COMPLETED;
    }

    /**
     * Resolves one public lifecycle per CREX match ID. Catalogue feeds, the
     * canonical-match endpoint and sitemap generation all consume this method,
     * so an alias cannot advertise a different phase from the canonical owner.
     */
    private List<LiveMatch> resolvedCanonicalCatalogue() {
        Map<String, List<LiveMatch>> matchesByIdentity = liveMatchRepository.findAll().stream()
                .filter(this::isValidCatalogMatch)
                .collect(Collectors.groupingBy(
                        match -> isBlank(extractCatalogIdentity(match.getUrl()))
                                ? "row:" + match.getId()
                                : extractCatalogIdentity(match.getUrl()),
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<LiveMatch> resolved = new ArrayList<>();
        for (List<LiveMatch> aliases : matchesByIdentity.values()) {
            LiveMatch owner = aliases.stream().min(Comparator
                    // Never let a retired alias hide an active row for the same
                    // provider key. Among rows in the same lifecycle phase, keep
                    // the most specific stable URL when a provider emits both
                    // "1st Test" and a lossy "1st match" alias.
                    .comparing(LiveMatch::isDeleted)
                    .thenComparing(Comparator.comparingInt(this::canonicalSlugSpecificity).reversed())
                    .thenComparing(match -> match.getId() == null ? Long.MAX_VALUE : match.getId()))
                    .orElse(null);
            LiveMatch freshest = aliases.stream().max(Comparator
                    .comparing(match -> match.getLastStateUpdatedAt() == null ? 0L : match.getLastStateUpdatedAt()))
                    .orElse(owner);
            if (owner == null) {
                continue;
            }

            LiveMatch snapshot = copyForPublication(owner);
            // Canonical wording is allowed to change, but the public owner must
            // retain identity and format facts from every stable-key sibling.
            // Otherwise an alias such as "1st match" can erase "1st Test" and
            // incorrectly receive a limited-overs expiry window.
            aliases.stream().sorted(Comparator.comparing(match ->
                    match.getLastStateUpdatedAt() == null ? 0L : match.getLastStateUpdatedAt()))
                    .forEach(source -> copyStaticEvidence(snapshot, source));
            copyRicherEvidence(snapshot, freshest);
            // A soft-deleted owner is an authoritative terminal decision from
            // live-catalog reconciliation. Do not re-infer INNINGS_BREAK from
            // its old snapshot merely because the lifecycle window is still
            // open; that would republish a stale absent limited-overs row.
            MatchLifecycleStatus status = owner.isDeleted()
                    ? owner.getStatus()
                    : lifecycleFromEvidence(snapshot);
            snapshot.setStatus(status);
            snapshot.setDeleted(owner.isDeleted() || (status != null && status.isTerminal()));
            snapshot.setLiveFeedManaged(aliases.stream().anyMatch(LiveMatch::isLiveFeedManaged));
            snapshot.setLifecycleCohort(cohortFor(snapshot).wireName());
            resolved.add(snapshot);
        }
        return resolved;
    }

    private MatchLifecycleStatus lifecycleFromEvidence(LiveMatch match) {
        String normalized = (firstNonBlank(match.getResultSummary(), "") + " "
                + firstNonBlank(match.getLastKnownState(), "")).toLowerCase();
        if (normalized.contains("abandoned") || normalized.contains("no result")) {
            return MatchLifecycleStatus.ABANDONED;
        }
        // A current stumps/lead signal wins over an older stale terminal summary
        // retained on an alias row, but only while the match can still be
        // running. Otherwise old scorecards accumulate in the live lane.
        if (hasInningsBreakSignal(normalized)) {
            return isLifecycleWindowOpen(match)
                    ? MatchLifecycleStatus.INNINGS_BREAK
                    : MatchLifecycleStatus.COMPLETED;
        }
        if (hasCompletedResultSignal(normalized)) {
            return MatchLifecycleStatus.COMPLETED;
        }
        MatchLifecycleStatus stored = match.getStatus() == null ? MatchLifecycleStatus.UPCOMING : match.getStatus();
        if (stored.isLiveLike() && !isLifecycleWindowOpen(match)) {
            return MatchLifecycleStatus.COMPLETED;
        }
        return stored;
    }

    private boolean shouldRetainAbsentLiveMatch(LiveMatch match, MatchLifecycleStatus inferredStatus) {
        if (match == null || inferredStatus != MatchLifecycleStatus.INNINGS_BREAK) {
            return false;
        }
        String context = (String.valueOf(match.getMatchFormat()) + " "
                + String.valueOf(match.getSeriesName()) + " "
                + String.valueOf(match.getUrl())).toLowerCase();
        // "Innings Break" is also emitted between innings in limited-overs
        // matches. It is not enough evidence to retain an absent row in the
        // live catalogue. Only clearly multi-day fixtures may survive an
        // empty authoritative live discovery cycle.
        return context.contains("test") || context.contains("first-class")
                || context.contains("multi day") || context.contains("multi-day")
                || context.contains("2-day") || context.contains("two-day")
                || context.contains("3-day") || context.contains("three-day")
                || context.contains("4-day") || context.contains("four-day");
    }

    private MatchLifecycleStatus retainNonTerminalStatus(LiveMatch match) {
        if (match != null && match.getStatus() != null && match.getStatus().isLiveLike()) {
            return match.getStatus();
        }
        return MatchLifecycleStatus.UPCOMING;
    }

    private boolean isLifecycleWindowOpen(LiveMatch match) {
        if (match == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        Long scheduledStart = match.getScheduledStartTime();
        if (scheduledStart != null && scheduledStart > 0L) {
            return now <= scheduledStart + lifecycleWindowFor(match);
        }
        Long lastUpdated = match.getLastStateUpdatedAt();
        return lastUpdated != null && lastUpdated > 0L && now - lastUpdated <= UNSCHEDULED_LIVE_STATE_WINDOW_MS;
    }

    private long lifecycleWindowFor(LiveMatch match) {
        String context = (String.valueOf(match.getMatchFormat()) + " "
                + String.valueOf(match.getSeriesName()) + " "
                + String.valueOf(match.getUrl())).toLowerCase();
        if (context.contains("test") || context.contains("first-class") || context.contains("multi day")
                || context.contains("multi-day") || context.contains("4-day")
                || context.contains("four-day")) {
            return 8L * ONE_DAY_MS;
        }
        if (context.contains("3-day") || context.contains("three-day")) {
            return 6L * ONE_DAY_MS;
        }
        if (context.contains("2-day") || context.contains("two-day")) {
            return 4L * ONE_DAY_MS;
        }
        return LIMITED_OVERS_LIFECYCLE_WINDOW_MS;
    }

    private int canonicalSlugSpecificity(LiveMatch match) {
        String value = String.valueOf(match == null ? null : match.getUrl()).toLowerCase();
        if (value.contains("test") || value.contains("first-class") || value.contains("four-day") || value.contains("4-day")) return 3;
        if (value.contains("t20") || value.contains("odi") || value.contains("one-day") || value.contains("hundred")) return 2;
        return 1;
    }

    private MatchLifecycleCohort cohortFor(LiveMatch match) {
        MatchLifecycleStatus status = match == null ? null : match.getStatus();
        if (status != null && status.isLiveLike()) return MatchLifecycleCohort.LIVE;
        if (status == MatchLifecycleStatus.UPCOMING) return MatchLifecycleCohort.UPCOMING;
        long changedAt = match != null && match.getSeoContentModifiedAt() != null
                ? match.getSeoContentModifiedAt()
                : match != null && match.getLastStateUpdatedAt() != null ? match.getLastStateUpdatedAt() : 0L;
        return changedAt > 0L && System.currentTimeMillis() - changedAt <= 30L * ONE_DAY_MS
                ? MatchLifecycleCohort.RECENT : MatchLifecycleCohort.ARCHIVE;
    }

    private boolean hasCompletedResultSignal(String value) {
        if (value == null) {
            return false;
        }
        value = value.toLowerCase();
        return value.contains("won by") || value.contains("match drawn") || value.contains("match tied")
                || value.matches(".*\\b(match )?draw\\b.*") || value.matches(".*\\b(match )?tied\\b.*")
                // CREX sometimes embeds the final winner between both innings
                // scores ("TEAM Won ... OTHER 172/6") without "won by".
                || (value.matches(".*\\bwon\\b.*") && scoreTokenCount(value) >= 2);
    }

    private int scoreTokenCount(String value) {
        Matcher matcher = SCORE_TOKEN_PATTERN.matcher(value);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private boolean hasTerminalResultSignal(String value) {
        String normalized = value == null ? "" : value.toLowerCase();
        return normalized.contains("abandoned") || normalized.contains("no result") || hasCompletedResultSignal(normalized);
    }

    private boolean hasInningsBreakSignal(String value) {
        return value.contains("stumps") || value.contains("lead by") || value.contains("innings break");
    }

    private LiveMatch copyForPublication(LiveMatch source) {
        LiveMatch copy = new LiveMatch(source.getUrl());
        copy.setId(source.getId());
        copy.setExternalMatchKey(source.getExternalMatchKey());
        copy.setDeleted(source.isDeleted());
        copy.setLastKnownState(source.getLastKnownState());
        copy.setDeletionAttempts(source.getDeletionAttempts());
        copy.setStatus(source.getStatus());
        copy.setScheduledStartTime(source.getScheduledStartTime());
        copy.setTeam1Name(source.getTeam1Name());
        copy.setTeam2Name(source.getTeam2Name());
        copy.setSeriesName(source.getSeriesName());
        copy.setMatchFormat(source.getMatchFormat());
        copy.setResultSummary(source.getResultSummary());
        copy.setLastStateUpdatedAt(source.getLastStateUpdatedAt());
        copy.setLiveFeedManaged(source.isLiveFeedManaged());
        copy.setSeoContentFingerprint(source.getSeoContentFingerprint());
        copy.setSeoContentModifiedAt(source.getSeoContentModifiedAt());
        copy.setLifecycleCohort(source.getLifecycleCohort());
        copy.setVenue(source.getVenue());
        copy.setDistributionDone(source.isDistributionDone());
        return copy;
    }

    private void copyRicherEvidence(LiveMatch target, LiveMatch source) {
        if (source == null) {
            return;
        }
        if (!isBlank(source.getLastKnownState())) {
            target.setLastKnownState(source.getLastKnownState());
        }
        if (!isBlank(source.getResultSummary())) {
            target.setResultSummary(source.getResultSummary());
        }
        if (source.getLastStateUpdatedAt() != null) {
            target.setLastStateUpdatedAt(source.getLastStateUpdatedAt());
        }
    }

    private void copyStaticEvidence(LiveMatch target, LiveMatch source) {
        if (source == null) {
            return;
        }
        if (isBlank(target.getMatchFormat()) && !isBlank(source.getMatchFormat())) target.setMatchFormat(source.getMatchFormat());
        if (isBlank(target.getSeriesName()) && !isBlank(source.getSeriesName())) target.setSeriesName(source.getSeriesName());
        if (isBlank(target.getTeam1Name()) && !isBlank(source.getTeam1Name())) target.setTeam1Name(source.getTeam1Name());
        if (isBlank(target.getTeam2Name()) && !isBlank(source.getTeam2Name())) target.setTeam2Name(source.getTeam2Name());
        if (isBlank(target.getVenue()) && !isBlank(source.getVenue())) target.setVenue(source.getVenue());
        if (target.getScheduledStartTime() == null && source.getScheduledStartTime() != null) {
            target.setScheduledStartTime(source.getScheduledStartTime());
        }
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
