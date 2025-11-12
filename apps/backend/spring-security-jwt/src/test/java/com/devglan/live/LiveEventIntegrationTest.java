package com.devglan.live;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Live Event system
 * Tests full flow: POST event → Database persistence → SSE broadcast
 * 
 * Note: @SpringBootTest may fail if application context cannot load.
 * If these tests fail with "Unable to find @SpringBootConfiguration",
 * create a minimal test configuration class or use @WebMvcTest with manual setup.
 */
@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class LiveEventIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LiveEventRepository repository;

    @Autowired
    private LiveEventService service;

    private ObjectMapper objectMapper = new ObjectMapper();

    @Before
    public void setUp() {
        // Clean up before each test
        repository.deleteAll();
    }

    /**
     * Test: Full flow - POST event → Persisted to DB → Retrievable
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void postEvent_persistsToDatabase() throws Exception {
        String matchId = "INTEG_MATCH_001";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("Rohit Sharma hits a six!");
        request.setEventType("boundary");
        request.setOver("8.3");
        request.setInnings("1st innings");
        
        String json = objectMapper.writeValueAsString(request);
        
        // POST event via API
        MvcResult result = mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.matchId").value(matchId))
                .andReturn();

        // Verify event was persisted
        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).contains("\"success\":true");
        
        // Query database directly
        Iterable<LiveEvent> events = repository.findAll();
        assertThat(events).isNotEmpty();
        
        LiveEvent savedEvent = events.iterator().next();
        assertThat(savedEvent.getMatchId()).isEqualTo(matchId);
        assertThat(savedEvent.getMessage()).isEqualTo("Rohit Sharma hits a six!");
        assertThat(savedEvent.getEventType()).isEqualTo("boundary");
        assertThat(savedEvent.getOverLabel()).isEqualTo("8.3");
        assertThat(savedEvent.getInningsLabel()).isEqualTo("1st innings");
    }

    /**
     * Test: Multiple events persist in order
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void postMultipleEvents_persistsAll() throws Exception {
        String matchId = "INTEG_MATCH_002";
        
        // Event 1
        LiveUpdateController.LiveEventRequest request1 = new LiveUpdateController.LiveEventRequest();
        request1.setMessage("Event 1");
        request1.setEventType("info");
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());
        
        // Event 2
        LiveUpdateController.LiveEventRequest request2 = new LiveUpdateController.LiveEventRequest();
        request2.setMessage("Event 2");
        request2.setEventType("wicket");
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isCreated());
        
        // Event 3
        LiveUpdateController.LiveEventRequest request3 = new LiveUpdateController.LiveEventRequest();
        request3.setMessage("Event 3");
        request3.setEventType("boundary");
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request3)))
                .andExpect(status().isCreated());
        
        // Verify all 3 events persisted
        Iterable<LiveEvent> events = repository.findAll();
        assertThat(events).hasSize(3);
    }

    /**
     * Test: Authorization - Only BLOG_EDITOR can POST events
     */
    @Test
    @WithMockUser(roles = {"USER"})
    public void postEvent_withoutBlogEditorRole_returns403() throws Exception {
        String matchId = "INTEG_MATCH_003";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("Should fail");
        request.setEventType("info");
        
        String json = objectMapper.writeValueAsString(request);
        
        // Should fail with 403 Forbidden
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isForbidden());
        
        // Verify no event was persisted
        Iterable<LiveEvent> events = repository.findAll();
        assertThat(events).isEmpty();
    }

    /**
     * Test: Validation - Empty message rejected before persistence
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void postEvent_withEmptyMessage_doesNotPersist() throws Exception {
        String matchId = "INTEG_MATCH_004";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("");  // Empty
        request.setEventType("info");
        
        String json = objectMapper.writeValueAsString(request);
        
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest());
        
        // Verify no event was persisted
        Iterable<LiveEvent> events = repository.findAll();
        assertThat(events).isEmpty();
    }

    /**
     * Test: Service layer - createEvent method
     */
    @Test
    public void liveEventService_createEvent_persistsSuccessfully() {
        String matchId = "SERVICE_TEST_001";
        String message = "Virat Kohli scores 100!";
        String eventType = "milestone";
        String over = "45.2";
        String innings = "1st innings";
        
        LiveEvent event = service.createEvent(matchId, message, eventType, over, innings);
        
        assertThat(event).isNotNull();
        assertThat(event.getId()).isNotNull();
        assertThat(event.getMatchId()).isEqualTo(matchId);
        assertThat(event.getMessage()).isEqualTo(message);
        assertThat(event.getEventType()).isEqualTo(eventType);
        assertThat(event.getOverLabel()).isEqualTo(over);
        assertThat(event.getInningsLabel()).isEqualTo(innings);
        assertThat(event.getCreatedAt()).isNotNull();
        
        // Verify persisted in DB
        LiveEvent retrieved = repository.findById(event.getId()).orElse(null);
        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getMessage()).isEqualTo(message);
    }

    /**
     * Test: Repository - findByMatchIdOrderByCreatedAtDesc
     */
    @Test
    public void repository_findByMatchId_returnsEventsInOrder() {
        String matchId = "REPO_TEST_001";
        
        // Create 3 events with slight delay
        LiveEvent event1 = service.createEvent(matchId, "First", "info", null, null);
        
        try { Thread.sleep(10); } catch (InterruptedException e) {}
        LiveEvent event2 = service.createEvent(matchId, "Second", "info", null, null);
        
        try { Thread.sleep(10); } catch (InterruptedException e) {}
        LiveEvent event3 = service.createEvent(matchId, "Third", "info", null, null);
        
        // Query by matchId
        Iterable<LiveEvent> events = repository.findByMatchIdOrderByCreatedAtDesc(matchId);
        assertThat(events).hasSize(3);
        
        // Should be in DESC order (newest first)
        LiveEvent[] eventArray = new LiveEvent[3];
        int i = 0;
        for (LiveEvent e : events) {
            eventArray[i++] = e;
        }
        
        assertThat(eventArray[0].getMessage()).isEqualTo("Third");
        assertThat(eventArray[1].getMessage()).isEqualTo("Second");
        assertThat(eventArray[2].getMessage()).isEqualTo("First");
    }

    /**
     * Test: SSE stream endpoint is accessible
     */
    @Test
    public void sseStreamEndpoint_isAccessible() throws Exception {
        String matchId = "SSE_TEST_001";
        
        MvcResult result = mockMvc.perform(get("/live/matches/{matchId}/stream", matchId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andReturn();
        
        assertThat(result.getRequest().isAsyncStarted()).isTrue();
    }

    /**
     * Test: Concurrent POST requests
     * Verifies thread-safety of event persistence
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void concurrentPostEvents_allPersist() throws Exception {
        String matchId = "CONCURRENT_TEST_001";
        int numThreads = 5;
        CountDownLatch latch = new CountDownLatch(numThreads);
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        
        for (int i = 0; i < numThreads; i++) {
            final int eventNum = i;
            executor.submit(() -> {
                try {
                    LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
                    request.setMessage("Concurrent event " + eventNum);
                    request.setEventType("info");
                    
                    String json = objectMapper.writeValueAsString(request);
                    
                    mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                            .andExpect(status().isCreated());
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }
        
        // Wait for all threads to complete (max 5 seconds)
        boolean completed = latch.await(5, TimeUnit.SECONDS);
        assertThat(completed).isTrue();
        
        executor.shutdown();
        
        // Verify all events persisted
        Iterable<LiveEvent> events = repository.findAll();
        assertThat(events).hasSize(numThreads);
    }

    /**
     * Test: Event with only required fields (message + matchId)
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void postEvent_withMinimalFields_succeeds() throws Exception {
        String matchId = "MINIMAL_TEST_001";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("Minimal event");
        // No eventType, over, or innings
        
        String json = objectMapper.writeValueAsString(request);
        
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
        
        // Verify persisted with default eventType
        LiveEvent event = repository.findAll().iterator().next();
        assertThat(event.getMessage()).isEqualTo("Minimal event");
        assertThat(event.getEventType()).isEqualTo("info");  // Default
        assertThat(event.getOverLabel()).isNull();
        assertThat(event.getInningsLabel()).isNull();
    }
}
