/*
 * Copyright 2002-2013 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.devglan.websocket.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

import javax.transaction.Transactional;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationListener;
import org.springframework.messaging.core.MessageSendingOperations;
import org.springframework.messaging.simp.broker.BrokerAvailabilityEvent;
import org.springframework.stereotype.Service;

import com.devglan.dao.CricketDataDTO;
import com.devglan.dao.MatchInfoEntity;
import com.devglan.dao.OversData;
import com.devglan.dao.PlayingXIEntity;
import com.devglan.dao.SessionOdds;
import com.devglan.dao.SessionOverData;
import com.devglan.model.Bets;
import com.devglan.model.CricketDataEntity;
import com.devglan.model.PlayingXI;
import com.devglan.model.TeamComparison;
import com.devglan.model.TeamSessionData;
import com.devglan.repository.CricketDataRepository;
import com.devglan.repository.MatchInfoRepository;
import com.devglan.repository.OversDataRepository;
import com.devglan.repository.SessionOddsRepository;
import com.devglan.repository.SessionOverDataRepository;
import com.devglan.repository.TeamSessionDataRepository;
import com.devglan.service.CrexMatchUrlHelper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class CricketDataService implements ApplicationListener<BrokerAvailabilityEvent> {

	private static Log logger = LogFactory.getLog(CricketDataService.class);

	private final MessageSendingOperations<String> messagingTemplate;

	private AtomicBoolean brokerAvailable = new AtomicBoolean();

	private final CricketDataRepository cricketDataRepository;
    
    @Autowired
    private OversDataRepository oversDataRepository;

    @Autowired
	private TeamSessionDataRepository teamSessionDataRepository;
    
    @Autowired
    private SessionOverDataRepository SessionOverDataRepository;
    
    @Autowired
    private MatchInfoRepository matchInfoRepository;
    
    @Autowired
    private SessionOddsRepository sessionOddsRepository;

    // ─── In-memory cache for match data (stale-while-revalidate) ────
    private static class CacheEntry<T> {
        final T data;
        final long timestamp;
        CacheEntry(T data) { this.data = data; this.timestamp = System.currentTimeMillis(); }
        boolean isExpired(long ttlMs) { return System.currentTimeMillis() - timestamp > ttlMs; }
    }
    /** Cache TTL: 10 seconds – fresh enough for live matches */
    private static final long CACHE_TTL_MS = 10_000;
    /** In-memory match data cache keyed by URL */
    private final ConcurrentHashMap<String, CacheEntry<CricketDataDTO>> matchDataCache = new ConcurrentHashMap<>();
    /** In-memory commentary cache keyed by URL – stores latest commentary entries per match */
    private final ConcurrentHashMap<String, List<Map<String, Object>>> commentaryCache = new ConcurrentHashMap<>();
    /** Per-match locks avoid cross-match serialization while preserving same-match ordering. */
    private final ConcurrentHashMap<String, ReentrantLock> matchLocks = new ConcurrentHashMap<>();
    /** Max commentary entries to keep per match */
    private static final int MAX_COMMENTARY_ENTRIES = 200;
	


	/*
	 * @Autowired private LiveMatchRepository liveMatchRepository;
	 */

	@Autowired
	public CricketDataService(MessageSendingOperations<String> messagingTemplate, CricketDataRepository cricketDataRepository) {
		this.messagingTemplate = messagingTemplate;
        this.cricketDataRepository = cricketDataRepository;
		
	}

	@Override
	
	public void onApplicationEvent(BrokerAvailabilityEvent event) {
		this.brokerAvailable.set(event.isBrokerAvailable());
	}

	public void sendCricketData(String url, Map<String, Object> dataToSend) {
		String match = CrexMatchUrlHelper.extractMatchKey(url);
		if (match == null || match.trim().isEmpty()) {
			String[] parts = url.split("/");
			match = parts.length >= 2 ? parts[parts.length - 2] : url;
		}
	    

		ObjectMapper objectMapper = new ObjectMapper();
		for (Map.Entry<String, Object> entry : dataToSend.entrySet()) {
			String key = entry.getKey();
			Object value = entry.getValue();

			// Create a JSON representation of the field and its value
			String jsonField = null;
			try {
				jsonField = objectMapper.writeValueAsString(Collections.singletonMap(key, value));
			} catch (JsonProcessingException e) {
				logger.info("error in writing object");
			}
			if (logger.isTraceEnabled()) {
				logger.info("Sending cricketData " + jsonField);
			}
			// Sending payload (jsonField) to the WebSocket topic (/topic/cricket.{key})
			if (this.brokerAvailable.get()) {
				messagingTemplate.convertAndSend("/topic/cricket." + match + "." + key, jsonField);
			}
		}

	}

	public void sendCricketSnapshot(String url, CricketDataDTO snapshot) {
		String match = CrexMatchUrlHelper.extractMatchKey(url);
		if (match == null || match.trim().isEmpty()) {
			String[] parts = url.split("/");
			match = parts.length >= 2 ? parts[parts.length - 2] : url;
		}

		if (this.brokerAvailable.get() && snapshot != null) {
			messagingTemplate.convertAndSend("/topic/cricket.match." + match + ".snapshot", snapshot);
		}
	}

	public void notifyNewMatch(String url) {
		messagingTemplate.convertAndSend("/topic/live-matches", url);

	}
	
	public void notifyBetStatus(Bets bet) {
		messagingTemplate.convertAndSend("/topic/bet-status", bet);

	}

	public void notifyMatchStatusChange(String url, String status) {
	    Map<String, Object> notification = new HashMap<>();
	    notification.put("url", url);
	    notification.put("status", status);

	    ObjectMapper objectMapper = new ObjectMapper();
	    try {
	        String jsonPayload = objectMapper.writeValueAsString(notification);
	        if (this.brokerAvailable.get()) {
	            messagingTemplate.convertAndSend("/topic/live-matches", jsonPayload); 
	        }
	    } catch (JsonProcessingException e) {
	        logger.error("Error converting match status notification to JSON", e);
	    }
	}

    public <T> T withMatchLock(String url, Supplier<T> action) {
        if (url == null || url.trim().isEmpty()) {
            return action.get();
        }

        ReentrantLock lock = matchLocks.computeIfAbsent(url, key -> new ReentrantLock());
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                matchLocks.remove(url, lock);
            }
        }
    }

	
	 // Method to set the last updated data for a specific URL
    public void setLastUpdatedData(String url, CricketDataDTO data) {
        //lastUpdatedDataMap.put(url, data);
        CricketDataEntity entity = convertDtoToEntity(url, data);
        cricketDataRepository.save(entity);
        
        if (dataContainsMatchInfo(data)) {
            MatchInfoEntity matchInfoEntity = convertDtoToMatchInfoEntity(data);
            matchInfoRepository.save(matchInfoEntity);
        }
        
        // Update cache with fresh DB data (will be enriched with transient fields below)
        matchDataCache.remove(url);
    }

    /**
     * Publish-speed cache update used by live patches. Full periodic scrapes remain
     * responsible for relational persistence.
     */
    public void cacheLastUpdatedData(String url, CricketDataDTO data) {
        matchDataCache.put(url, new CacheEntry<>(data));
    }

    /**
     * Enrich the in-memory cache with transient fields (batsman_data, bowler_data, toss_won_country)
     * that are NOT persisted to the database but should be returned by getLastUpdatedData.
     * Called by the controller after setLastUpdatedData + sendCricketData.
     */
    public void enrichCacheWithTransientData(String url, CricketDataDTO incomingData) {
        // Get the current cache entry (or load from DB if not cached)
        CricketDataDTO cached = null;
        CacheEntry<CricketDataDTO> entry = matchDataCache.get(url);
        if (entry != null) {
            cached = entry.data;
        }
        if (cached == null) {
            // Load from DB to populate cache
            cached = getLastUpdatedData(url);
        }
        if (cached == null) {
            cached = new CricketDataDTO();
            cached.setUrl(url);
        }
        
        // Merge transient fields that aren't persisted to DB
        if (incomingData.getBatsmanData() != null && !incomingData.getBatsmanData().isEmpty()) {
            cached.setBatsmanData(incomingData.getBatsmanData());
        }
        if (incomingData.getBowlerData() != null && !incomingData.getBowlerData().isEmpty()) {
            cached.setBowlerData(incomingData.getBowlerData());
        }
        if (incomingData.getToss_won_country() != null) {
            cached.setToss_won_country(incomingData.getToss_won_country());
        }
        
        // Merge commentary entries (append new, deduplicate by id, cap at MAX_COMMENTARY_ENTRIES)
        if (incomingData.getCommentary() != null && !incomingData.getCommentary().isEmpty()) {
            List<Map<String, Object>> existing = commentaryCache.getOrDefault(url, new ArrayList<>());
            Map<String, Integer> existingIndexes = new HashMap<>();
            for (int i = 0; i < existing.size(); i++) {
                String key = commentaryEntryKey(existing.get(i));
                if (!key.isEmpty()) {
                    existingIndexes.put(key, i);
                }
            }
            for (Map<String, Object> newEntry : incomingData.getCommentary()) {
                Map<String, Object> sanitizedEntry = sanitizeCommentaryEntry(newEntry);
                String key = commentaryEntryKey(sanitizedEntry);
                if (!key.isEmpty() && existingIndexes.containsKey(key)) {
                    int existingIndex = existingIndexes.get(key);
                    existing.set(existingIndex, mergeCommentaryEntry(existing.get(existingIndex), sanitizedEntry));
                } else {
                    existingIndexes.put(key, existing.size());
                    existing.add(sanitizedEntry);
                }
            }
            // Sort: most recent first (inningsNumber DESC, overNumber DESC, ballInOver DESC)
            // At same over.ball: OVER_SUMMARY first, then WICKET, then BALL
            existing.sort((a, b) -> {
                int innA = toInt(a.get("inningsNumber"));
                int innB = toInt(b.get("inningsNumber"));
                if (innA != innB) return innB - innA;
                int overA = toInt(a.get("overNumber"));
                int overB = toInt(b.get("overNumber"));
                if (overA != overB) return overB - overA;
                int ballA = toInt(a.get("ballInOver"));
                int ballB = toInt(b.get("ballInOver"));
                if (ballA != ballB) return ballB - ballA;
                return typePriority(a) - typePriority(b);
            });
            // Cap size
            if (existing.size() > MAX_COMMENTARY_ENTRIES) {
                existing = new ArrayList<>(existing.subList(0, MAX_COMMENTARY_ENTRIES));
            }
            commentaryCache.put(url, existing);
            cached.setCommentary(existing);
        }
        
        // Store the enriched DTO in cache
        matchDataCache.put(url, new CacheEntry<>(cached));
    }

    /**
     * Get commentary entries for a match URL.
     * Returns all cached commentary entries (most recent first).
     */
    public List<Map<String, Object>> getCommentaryForMatch(String url) {
        return commentaryCache.getOrDefault(url, Collections.emptyList());
    }

    private static int toInt(Object val) {
        if (val instanceof Number) return ((Number) val).intValue();
        if (val instanceof String) {
            try { return Integer.parseInt((String) val); } catch (NumberFormatException e) { return 0; }
        }
        return 0;
    }

    private static int typePriority(Map<String, Object> entry) {
        Object type = entry.get("type");
        if ("OVER_SUMMARY".equals(type)) return 0;
        if ("WICKET".equals(type)) return 1;
        if ("BOUNDARY".equals(type)) return 2;
        if ("BALL".equals(type)) return 3;
        if ("INFO".equals(type)) return 4;
        return 99;
    }

    private static Map<String, Object> sanitizeCommentaryEntry(Map<String, Object> entry) {
        Map<String, Object> sanitized = new HashMap<>(entry);
        Object text = sanitized.get("text");
        if (text instanceof String) {
            sanitized.put("text", normalizeText(text));
        }
        return sanitized;
    }

    private static String commentaryEntryKey(Map<String, Object> entry) {
        String type = String.valueOf(valueOrDefault(entry.get("type"), "")).toUpperCase();
        Object innings = valueOrDefault(entry.get("inningsNumber"), "0");
        Object over = valueOrDefault(entry.get("overNumber"), "0");
        Object ball = valueOrDefault(entry.get("ballInOver"), "0");
        Object delivery = valueOrDefault(entry.get("delivery"), "0");

        if ("OVER_SUMMARY".equals(type)
                && (!"0".equals(String.valueOf(innings)) || !"0".equals(String.valueOf(over)))) {
            return String.format("summary|%s|%s", innings, over);
        }

        if (!"0".equals(String.valueOf(innings))
                || !"0".equals(String.valueOf(over))
                || !"0".equals(String.valueOf(ball))) {
            return String.format("ball|%s|%s|%s", innings, over, ball);
        }

        Object id = entry.get("id");
        if (id != null && !id.toString().trim().isEmpty()) {
            return id.toString();
        }

        if (!"0".equals(String.valueOf(delivery))) {
            return String.format("delivery|%s|%s", innings, delivery);
        }

        return normalizeText(entry.get("text"));
    }

    private static Map<String, Object> mergeCommentaryEntry(Map<String, Object> existing, Map<String, Object> incoming) {
        Map<String, Object> merged = new HashMap<>(existing);
        merged.putAll(incoming);
        merged.put("text", preferText(incoming.get("text"), existing.get("text")));
        merged.put("type", preferredType(existing.get("type"), incoming.get("type")));
        merged.put("runs", valueOrDefault(incoming.get("runs"), existing.get("runs")));
        merged.put("overBall", valueOrDefault(incoming.get("overBall"), existing.get("overBall")));
        merged.put("overNumber", valueOrDefault(incoming.get("overNumber"), existing.get("overNumber")));
        merged.put("ballInOver", valueOrDefault(incoming.get("ballInOver"), existing.get("ballInOver")));
        merged.put("delivery", valueOrDefault(incoming.get("delivery"), existing.get("delivery")));
        merged.put("inningsNumber", valueOrDefault(incoming.get("inningsNumber"), existing.get("inningsNumber")));
        merged.put("batsmanName", valueOrDefault(incoming.get("batsmanName"), existing.get("batsmanName")));
        merged.put("bowlerName", valueOrDefault(incoming.get("bowlerName"), existing.get("bowlerName")));
        merged.put("totalScore", valueOrDefault(incoming.get("totalScore"), existing.get("totalScore")));
        merged.put("highlights", mergeHighlights(existing.get("highlights"), incoming.get("highlights")));
        return merged;
    }

    private static Object preferredType(Object existing, Object incoming) {
        int existingPriority = typePriority(Collections.singletonMap("type", existing));
        int incomingPriority = typePriority(Collections.singletonMap("type", incoming));
        return incomingPriority <= existingPriority ? valueOrDefault(incoming, existing) : valueOrDefault(existing, incoming);
    }

    private static Object valueOrDefault(Object primary, Object fallback) {
        if (primary == null) {
            return fallback;
        }
        if (primary instanceof String && ((String) primary).trim().isEmpty()) {
            return fallback;
        }
        return primary;
    }

    private static String preferText(Object primary, Object fallback) {
        String first = normalizeText(primary);
        String second = normalizeText(fallback);
        if (first.isEmpty()) return second;
        if (second.isEmpty()) return first;
        return first.length() >= second.length() ? first : second;
    }

    private static String normalizeText(Object value) {
        if (!(value instanceof String)) {
            return "";
        }
        return ((String) value).replaceAll("<[^>]*>", "").replace("&nbsp;", " ").replaceAll("\\s+", " ").trim();
    }

    private static List<?> mergeHighlights(Object existing, Object incoming) {
        LinkedHashSet<Object> merged = new LinkedHashSet<>();
        if (existing instanceof List) {
            merged.addAll((List<?>) existing);
        }
        if (incoming instanceof List) {
            merged.addAll((List<?>) incoming);
        }
        return new ArrayList<>(merged);
    }

    // Method to get the last updated data for a specific URL
    @org.springframework.transaction.annotation.Transactional
    public CricketDataDTO getLastUpdatedData(String url) {
        // Check in-memory cache first (avoids DB round-trip within TTL window)
        CacheEntry<CricketDataDTO> cached = matchDataCache.get(url);
        if (cached != null && !cached.isExpired(CACHE_TTL_MS)) {
            return cached.data;
        }

        //return lastUpdatedDataMap.get(url);
    	CricketDataEntity entity = cricketDataRepository.findByUrlWithTeamWiseSessionData(url);
        MatchInfoEntity matchInfoEntity = matchInfoRepository.findById(url).orElse(null); // Get MatchInfoEntity by URL

        if (entity == null && matchInfoEntity == null) {
            return null;
        }
        

        if (entity != null) {
            Hibernate.initialize(entity.getMatchOdds());
            Hibernate.initialize(entity.getTeamWiseSessionData()); // Explicitly initialize
            Hibernate.initialize(entity.getOversData());
            if (entity.getOversData() != null) {
                for (OversData oversData : entity.getOversData()) {
                    Hibernate.initialize(oversData.getBalls());
                }
            }
        }
        if (matchInfoEntity != null) {
            Hibernate.initialize(matchInfoEntity.getTeamComparison());
            Hibernate.initialize(matchInfoEntity.getTeamForm());
            Hibernate.initialize(matchInfoEntity.getPlayingXI());
        }
        CricketDataDTO data = convertEntityToDto(entity);
        if (matchInfoEntity != null) {
            data = mergeMatchInfoToCricketDataDTO(matchInfoEntity, data);
        }
        
        // Preserve transient fields (batsman/bowler data, commentary) from expired cache
        if (cached != null && cached.data != null) {
            if (data.getBatsmanData() == null || data.getBatsmanData().isEmpty()) {
                data.setBatsmanData(cached.data.getBatsmanData());
            }
            if (data.getBowlerData() == null || data.getBowlerData().isEmpty()) {
                data.setBowlerData(cached.data.getBowlerData());
            }
            if (data.getToss_won_country() == null) {
                data.setToss_won_country(cached.data.getToss_won_country());
            }
        }
        // Preserve commentary from commentaryCache
        List<Map<String, Object>> commentary = commentaryCache.get(url);
        if (commentary != null && !commentary.isEmpty()) {
            data.setCommentary(commentary);
        }

        // Store in cache for subsequent requests
        matchDataCache.put(url, new CacheEntry<>(data));
        
        return data;
    	
    	
    }
    
 // Convert MatchInfoEntity to CricketDataDTO and merge it
    private CricketDataDTO mergeMatchInfoToCricketDataDTO(MatchInfoEntity matchInfoEntity, CricketDataDTO data) {
        if (matchInfoEntity != null) {
            data.setUrl(matchInfoEntity.getUrl());
            data.setMatchDate(matchInfoEntity.getMatchDate());
            data.setVenue(matchInfoEntity.getVenue());
            data.setMatchName(matchInfoEntity.getMatchName());
            data.setTossInfo(matchInfoEntity.getTossInfo());
            data.setTeamComparison(copyTeamComparisonMap(matchInfoEntity.getTeamComparison()));
            data.setTeamForm(matchInfoEntity.getTeamForm());
            data.setVenueStats(matchInfoEntity.getVenueStats());
         // Transform List<PlayingXIEntity> to Map<String, List<PlayingXI>>
            if (matchInfoEntity.getPlayingXI() != null && !matchInfoEntity.getPlayingXI().isEmpty()) {
                Map<String, Set<PlayingXI>> convertedPlayingXIMap = new HashMap<>();
                for (PlayingXIEntity playingXIEntity : matchInfoEntity.getPlayingXI()) {
                    String teamName = playingXIEntity.getTeamName();
                    PlayingXI playingXI = new PlayingXI();
                    playingXI.setPlayerName(playingXIEntity.getPlayerName());
                    playingXI.setPlayerRole(playingXIEntity.getPlayerRole());

                    convertedPlayingXIMap.computeIfAbsent(teamName, k -> new HashSet<>()).add(playingXI);
                }
                data.setPlayingXI(convertedPlayingXIMap);
            }
        }
        return data;
    }
    
    private MatchInfoEntity convertDtoToMatchInfoEntity(CricketDataDTO dto) {
        MatchInfoEntity entity = new MatchInfoEntity();
        
        if (dto.getUrl() != null) {
            entity.setUrl(dto.getUrl());
        }
        if (dto.getMatchDate() != null) {
            entity.setMatchDate(dto.getMatchDate());
        }
        if (dto.getVenue() != null) {
            entity.setVenue(dto.getVenue());
        }
        if (dto.getMatchName() != null) {
            entity.setMatchName(dto.getMatchName());
        }
        if (dto.getTossInfo() != null) {
            entity.setTossInfo(dto.getTossInfo());
        }
        if (dto.getTeamComparison() != null) {
            entity.setTeamComparison(dto.getTeamComparison());
        }
        if (dto.getTeamForm() != null) {
            entity.setTeamForm(dto.getTeamForm());
        }
        if (dto.getVenueStats() != null) {
            entity.setVenueStats(dto.getVenueStats());
        }
     // Convert Map<String, List<PlayingXI>> to List<PlayingXIEntity>
        if (dto.getPlayingXI() != null && !dto.getPlayingXI().isEmpty()) {
            Set<PlayingXIEntity> playingXIEntityList = new HashSet<>();
            for (Entry<String, Set<PlayingXI>> entry : dto.getPlayingXI().entrySet()) {
                String teamName = entry.getKey();
                Set<PlayingXI> playingXIList = entry.getValue();

                for (PlayingXI playingXI : playingXIList) {
                    PlayingXIEntity playingXIEntity = new PlayingXIEntity();
                    playingXIEntity.setTeamName(teamName);
                    playingXIEntity.setPlayerName(playingXI.getPlayerName());
                    playingXIEntity.setPlayerRole(playingXI.getPlayerRole());
                    playingXIEntityList.add(playingXIEntity);
                }
            }
            entity.setPlayingXI(playingXIEntityList);
        }

        return entity;
    }
    
	private CricketDataDTO convertEntityToDto(MatchInfoEntity entity) {
		CricketDataDTO dto = new CricketDataDTO();

		if (entity != null) {
			if (entity.getUrl() != null) {
				dto.setUrl(entity.getUrl());
			}
			if (entity.getMatchDate() != null) {
				dto.setMatchDate(entity.getMatchDate());
			}
			if (entity.getVenue() != null) {
				dto.setVenue(entity.getVenue());
			}
			if (entity.getMatchName() != null) {
				dto.setMatchName(entity.getMatchName());
			}
			if (entity.getTossInfo() != null) {
				dto.setTossInfo(entity.getTossInfo());
			}
			if (entity.getTeamComparison() != null) {
				dto.setTeamComparison(copyTeamComparisonMap(entity.getTeamComparison()));
			}
			if (entity.getTeamForm() != null) {
				dto.setTeamForm(entity.getTeamForm());
			}
			if (entity.getVenueStats() != null) {
				dto.setVenueStats(entity.getVenueStats());
			}
			// Transform List<PlayingXIEntity> to Map<String, List<PlayingXI>>
			if (entity.getPlayingXI() != null && !entity.getPlayingXI().isEmpty()) {
				Map<String, Set<PlayingXI>> playingXIMap = new HashMap<>();
				for (PlayingXIEntity playingXIEntity : entity.getPlayingXI()) {
					String teamName = playingXIEntity.getTeamName();
					PlayingXI playingXI = new PlayingXI();
					playingXI.setPlayerName(playingXIEntity.getPlayerName());
					playingXI.setPlayerRole(playingXIEntity.getPlayerRole());

					// Use a HashSet instead of ArrayList for the Set<PlayingXI>
					playingXIMap.computeIfAbsent(teamName, k -> new HashSet<>()).add(playingXI);
				}
			}
		}

		return dto;
	}

    private Map<String, TeamComparison> copyTeamComparisonMap(Map<String, TeamComparison> source) {
        if (source == null || source.isEmpty()) {
            return new LinkedHashMap<>();
        }

        Map<String, TeamComparison> copy = new LinkedHashMap<>();
        for (Map.Entry<String, TeamComparison> entry : source.entrySet()) {
            copy.put(entry.getKey(), copyTeamComparison(entry.getValue()));
        }
        return copy;
    }

    private TeamComparison copyTeamComparison(TeamComparison source) {
        if (source == null) {
            return null;
        }

        TeamComparison copy = new TeamComparison();
        copy.setMatchesPlayed(source.getMatchesPlayed());
        copy.setWinPercentage(source.getWinPercentage());
        copy.setAvgScore(source.getAvgScore());
        copy.setHighestScore(source.getHighestScore());
        copy.setLowestScore(source.getLowestScore());
        return copy;
    }
    
    private boolean dataContainsMatchInfo(CricketDataDTO data) {
        // Check if the DTO contains match info data that needs to be saved
        return true;
    }
    
    @org.springframework.transaction.annotation.Transactional
    public CricketDataDTO getCricData(String url) {
        //return lastUpdatedDataMap.get(url);
    	CricketDataEntity entity = cricketDataRepository.findByUrlContaining(url);
    	if (entity != null) {
    		Hibernate.initialize(entity.getMatchOdds());
            Hibernate.initialize(entity.getTeamWiseSessionData()); // Explicitly initialize
            Hibernate.initialize(entity.getOversData());
            if (entity.getOversData() != null) {
                for (OversData oversData : entity.getOversData()) {
                    Hibernate.initialize(oversData.getBalls());
                }
            }
        }
        return convertEntityToDto(entity);
    	
    	
    }
    
    @Transactional
	private CricketDataEntity convertDtoToEntity(String url, CricketDataDTO data) {
		CricketDataEntity entity = new CricketDataEntity();
		entity.setUrl(url);
		entity.setMatchOdds(data.getMatchOdds());
		entity.setTeamOdds(data.getTeamOdds());
		entity.setBattingTeamName(data.getBattingTeamName());
		entity.setOver(data.getOver());
		entity.setScore(data.getScore());
		entity.setCurrentBall(data.getCurrentBall());
		entity.setRunsOnBall(data.getRunsOnBall());
		entity.setFavTeam(data.getFavTeam());
		// Handle multiple session odds
		// Handle multiple session odds
		// Update session odds logic (without immediate save)
		if (data.getSessionOddsList() != null && !data.getSessionOddsList().isEmpty()) {
			Set<SessionOdds> sessionOddsSet = new HashSet<>();

			for (SessionOdds sessionOdds : data.getSessionOddsList()) {
				Optional<SessionOdds> existingSessionOdds = sessionOddsRepository
						.findBySessionOverAndCricketDataEntityUrl(sessionOdds.getSessionOver(), entity.getUrl());

				if (existingSessionOdds.isPresent()) {
					// Update existing session odds
					SessionOdds existing = existingSessionOdds.get();
					existing.setSessionBackOdds(sessionOdds.getSessionBackOdds());
					existing.setSessionLayOdds(sessionOdds.getSessionLayOdds());
					sessionOddsSet.add(existing); // Add updated session odds to the set
				} else {
					// Create new session odds
					sessionOdds.setCricketDataEntity(entity);
					sessionOddsSet.add(sessionOdds); // Add new session odds to the set
				}
			}
			entity.setSessionOddsSet(sessionOddsSet);
		}

		entity.setCurrentRunRate(data.getCurrentRunRate());
		entity.setFinalResultText(data.getFinalResultText());

		entity.setLastOddsUpdatedTimeStamp(data.getLastUpdated());

//        entity.setOversData(data.getOversData());
		// entity.setTossWonCountry(data.getTossWonCountry());
		// entity.setBatOrBallSelected(data.getBatOrBallSelected());
		// entity.setUpdatedTimeStamp());
		// Save each OversData
		List<OversData> oversDataList = data.getOversData();
		if (oversDataList != null) {
			List<OversData> savedOversDataList = new ArrayList<>();
			for (OversData oversData : oversDataList) {
				OversData savedOversData = oversDataRepository.save(oversData);
				savedOversDataList.add(savedOversData);
			}
			entity.setOversData(savedOversDataList);
		}

		// Update each TeamSessionData
		Map<String, List<SessionOverData>> teamWiseSessionData = data.getTeamWiseSessionData();
		if (teamWiseSessionData != null) {
			List<TeamSessionData> savedTeamSessionDataList = new ArrayList<>();
			for (Map.Entry<String, List<SessionOverData>> entry : teamWiseSessionData.entrySet()) {
				TeamSessionData teamSessionData = teamSessionDataRepository
						.findByTeamNameAndCricketDataEntity(entry.getKey(), entity);
				if (teamSessionData == null) {
					teamSessionData = new TeamSessionData();
					teamSessionData.setTeamName(entry.getKey());
					teamSessionData.setCricketDataEntity(entity); // Set the reference to the parent entity
				}
				List<SessionOverData> sessionOverDataList = new ArrayList<>();
				for (SessionOverData sessionOverData : entry.getValue()) {
					sessionOverData = SessionOverDataRepository.save(sessionOverData); // Save the SessionOverData first
					sessionOverDataList.add(sessionOverData);
				}
				teamSessionData.setSessionOverDataList(sessionOverDataList);
				teamSessionDataRepository.save(teamSessionData); // Save the TeamSessionData
				savedTeamSessionDataList.add(teamSessionData);
			}
			entity.setTeamWiseSessionData(savedTeamSessionDataList);
		}

		return entity;
	}

	@org.springframework.transaction.annotation.Transactional
	public CricketDataDTO convertEntityToDto(CricketDataEntity entity) {
		if (entity == null) {
			return null;
		}
		CricketDataDTO data = new CricketDataDTO();
		data.setMatchOdds(entity.getMatchOdds());
		data.setTeamOdds(entity.getTeamOdds());
		data.setBattingTeamName(entity.getBattingTeamName());
		data.setOver(entity.getOver());
		data.setScore(entity.getScore());
		data.setCurrentBall(entity.getCurrentBall());
		data.setRunsOnBall(entity.getRunsOnBall());
		data.setFavTeam(entity.getFavTeam());
		// Convert multiple session odds
		if (entity.getSessionOddsSet() != null && !entity.getSessionOddsSet().isEmpty()) {
		data.setSessionOddsList(entity.getSessionOddsSet());
		}
		data.setCurrentRunRate(entity.getCurrentRunRate());
		data.setFinalResultText(entity.getFinalResultText());
		data.setOversData(copyOversData(entity.getOversData()));
		data.setUpdatedTimeStamp(entity.getUpdatedTimeStamp());
		if (entity.getLastOddsUpdatedTimeStamp() == null) {
			data.setLastUpdated(0l);
		} else {
			data.setLastUpdated(entity.getLastOddsUpdatedTimeStamp());
		}
		// data.setTossWonCountry(entity.getTossWonCountry());
		// data.setBatOrBallSelected(entity.getBatOrBallSelected());
		// data.setUpdatedTimeStamp(entity.getUpdatedTimeStamp());

		// Convert TeamSessionData to Map
		List<TeamSessionData> teamSessionDataList = entity.getTeamWiseSessionData();
		if (teamSessionDataList != null) {
			Map<String, List<SessionOverData>> teamWiseSessionData = new HashMap<>();
			for (TeamSessionData teamSessionData : teamSessionDataList) {
				teamWiseSessionData.put(teamSessionData.getTeamName(), teamSessionData.getSessionOverDataList());
			}
			data.setTeamWiseSessionData(teamWiseSessionData);
		}
		return data;
	}

    static List<OversData> copyOversData(List<OversData> source) {
        if (source == null || source.isEmpty()) {
            return source;
        }

        List<OversData> copy = new ArrayList<>();
        for (OversData original : source) {
            if (original == null) {
                continue;
            }
            OversData cloned = new OversData();
            cloned.setId(original.getId());
            cloned.setOverNumber(original.getOverNumber());
            cloned.setTotalRuns(original.getTotalRuns());
            if (original.getBalls() != null) {
                cloned.setBalls(new ArrayList<>(original.getBalls()));
            }
            copy.add(cloned);
        }
        return copy;
    }

}
