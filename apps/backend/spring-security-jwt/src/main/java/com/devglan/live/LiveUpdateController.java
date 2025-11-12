package com.devglan.live;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/live")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LiveUpdateController {

    private static final Logger logger = LoggerFactory.getLogger(LiveUpdateController.class);

    @Autowired
    private LiveEventService liveEventService;

    // Store active SSE connections per match
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /**
     * SSE endpoint for streaming live match updates
     * GET /live/matches/{matchId}/stream
     */
    @GetMapping(value = "/matches/{matchId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMatchEvents(@PathVariable String matchId) {
        SseEmitter emitter = new SseEmitter(0L); // No timeout

        // Add emitter to the match's list
        emitters.computeIfAbsent(matchId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        
        int clientCount = emitters.get(matchId).size();
        logger.info("SSE_CONNECT: matchId={}, timestamp={}, totalClients={}, clientAddress={}", 
                    matchId, Instant.now(), clientCount, "REMOTE_ADDR");

        // Remove emitter on completion or timeout
        emitter.onCompletion(() -> {
            removeEmitter(matchId, emitter);
            int remainingClients = emitters.containsKey(matchId) ? emitters.get(matchId).size() : 0;
            logger.info("SSE_COMPLETE: matchId={}, timestamp={}, remainingClients={}, reason=CLIENT_CLOSED", 
                        matchId, Instant.now(), remainingClients);
        });
        
        emitter.onTimeout(() -> {
            removeEmitter(matchId, emitter);
            int remainingClients = emitters.containsKey(matchId) ? emitters.get(matchId).size() : 0;
            logger.warn("SSE_TIMEOUT: matchId={}, timestamp={}, remainingClients={}, reason=TIMEOUT", 
                        matchId, Instant.now(), remainingClients);
        });
        
        emitter.onError(e -> {
            removeEmitter(matchId, emitter);
            int remainingClients = emitters.containsKey(matchId) ? emitters.get(matchId).size() : 0;
            logger.error("SSE_ERROR: matchId={}, timestamp={}, remainingClients={}, error={}", 
                         matchId, Instant.now(), remainingClients, e.getMessage(), e);
        });

        // Send a connection confirmation event
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("{\"message\":\"Connected to live updates for match " + matchId + "\"}")
                    .id(Instant.now().toString()));
            logger.debug("SSE_SEND_CONNECT: matchId={}, eventType=connected", matchId);
        } catch (IOException e) {
            logger.error("SSE_SEND_ERROR: matchId={}, eventType=connected, error={}", 
                         matchId, e.getMessage());
            emitter.completeWithError(e);
        }

        return emitter;
    }

    /**
     * POST endpoint for editors to push live events
     * POST /live/matches/{matchId}/events
     * Requires ROLE_BLOG_EDITOR
     */
    @PostMapping("/matches/{matchId}/events")
    @PreAuthorize("hasRole('BLOG_EDITOR')")
    public ResponseEntity<Map<String, Object>> pushEvent(
            @PathVariable String matchId,
            @RequestBody LiveEventRequest request) {

        logger.info("EVENT_RECEIVED: matchId={}, eventType={}, message=\"{}\"", 
                    matchId, request.getEventType(), request.getMessage());

        // Validate input
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            logger.warn("EVENT_VALIDATION_ERROR: matchId={}, reason=EMPTY_MESSAGE", matchId);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", Map.of("code", "VALIDATION_ERROR", "message", "Message is required"),
                    "timestamp", Instant.now().toString()
            ));
        }

        // Create and persist event
        LiveEvent event = liveEventService.createEvent(
                matchId,
                request.getMessage(),
                request.getEventType() != null ? request.getEventType() : "info",
                request.getOver(),
                request.getInnings()
        );

        logger.info("EVENT_PERSISTED: matchId={}, eventId={}, eventType={}", 
                    matchId, event.getId(), event.getEventType());

        // Broadcast to all connected clients
        int broadcastCount = broadcastEvent(matchId, event);
        
        logger.info("EVENT_BROADCAST: matchId={}, eventId={}, clientsNotified={}", 
                    matchId, event.getId(), broadcastCount);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "data", Map.of("id", event.getId(), "matchId", matchId, "createdAt", event.getCreatedAt().toString()),
                "error", (Object) null,
                "timestamp", Instant.now().toString()
        ));
    }

    /**
     * Broadcast event to all SSE clients for this match
     * Returns the number of clients notified
     */
    private int broadcastEvent(String matchId, LiveEvent event) {
        List<SseEmitter> matchEmitters = emitters.get(matchId);
        if (matchEmitters == null || matchEmitters.isEmpty()) {
            logger.debug("BROADCAST_SKIP: matchId={}, reason=NO_CLIENTS", matchId);
            return 0;
        }

        // Prepare event data
        Map<String, Object> eventData = Map.of(
                "id", event.getId(),
                "matchId", event.getMatchId(),
                "message", event.getMessage(),
                "eventType", event.getEventType(),
                "over", event.getOverLabel() != null ? event.getOverLabel() : "",
                "innings", event.getInningsLabel() != null ? event.getInningsLabel() : "",
                "createdAt", event.getCreatedAt().toString()
        );

        int successCount = 0;
        int failureCount = 0;

        // Send to all connected clients
        for (SseEmitter emitter : matchEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(event.getEventType())
                        .data(eventData)
                        .id(event.getId().toString()));
                successCount++;
            } catch (IOException e) {
                // Client disconnected, will be removed by error handler
                logger.warn("BROADCAST_SEND_ERROR: matchId={}, eventId={}, error={}", 
                           matchId, event.getId(), e.getMessage());
                emitter.completeWithError(e);
                failureCount++;
            }
        }

        if (failureCount > 0) {
            logger.info("BROADCAST_COMPLETE: matchId={}, eventId={}, success={}, failures={}", 
                       matchId, event.getId(), successCount, failureCount);
        }

        return successCount;
    }

    /**
     * Remove emitter from the active connections
     */
    private void removeEmitter(String matchId, SseEmitter emitter) {
        List<SseEmitter> matchEmitters = emitters.get(matchId);
        if (matchEmitters != null) {
            matchEmitters.remove(emitter);
            if (matchEmitters.isEmpty()) {
                emitters.remove(matchId);
                logger.info("SSE_CLEANUP: matchId={}, reason=NO_CLIENTS_REMAINING", matchId);
            }
        }
    }

    /**
     * DTO for incoming live event requests
     */
    public static class LiveEventRequest {
        private String message;
        private String eventType;
        private String over;
        private String innings;

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getEventType() {
            return eventType;
        }

        public void setEventType(String eventType) {
            this.eventType = eventType;
        }

        public String getOver() {
            return over;
        }

        public void setOver(String over) {
            this.over = over;
        }

        public String getInnings() {
            return innings;
        }

        public void setInnings(String innings) {
            this.innings = innings;
        }
    }
}
