package com.devglan.live;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LiveEventService {

    @Autowired
    private LiveEventRepository liveEventRepository;

    /**
     * Create and persist a new live event
     */
    @Transactional
    public LiveEvent createEvent(String matchId, String message, String eventType, 
                                  String overLabel, String inningsLabel) {
        LiveEvent event = new LiveEvent();
        event.setMatchId(matchId);
        event.setMessage(message);
        event.setEventType(eventType);
        event.setOverLabel(overLabel);
        event.setInningsLabel(inningsLabel);
        return liveEventRepository.save(event);
    }

    /**
     * Get all events for a match
     */
    public List<LiveEvent> getEventsForMatch(String matchId) {
        return liveEventRepository.findByMatchIdOrderByCreatedAtDesc(matchId);
    }

    /**
     * Get paginated events for a match
     */
    public Page<LiveEvent> getEventsForMatch(String matchId, Pageable pageable) {
        return liveEventRepository.findByMatchIdOrderByCreatedAtDesc(matchId, pageable);
    }

    /**
     * Count total events for a match
     */
    public long countEventsForMatch(String matchId) {
        return liveEventRepository.countByMatchId(matchId);
    }
}
