package com.devglan.live;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for LiveUpdateController
 * Tests SSE stream creation, event broadcasting, and authorization
 */
@RunWith(MockitoJUnitRunner.class)
public class LiveUpdateControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LiveEventService liveEventService;

    @InjectMocks
    private LiveUpdateController controller;

    private ObjectMapper objectMapper = new ObjectMapper();

    @Before
    public void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    /**
     * Test: SSE stream endpoint returns TEXT_EVENT_STREAM content type
     */
    @Test
    public void streamMatchEvents_returnsSseEmitter() throws Exception {
        String matchId = "MATCH123";
        
        MvcResult result = mockMvc.perform(get("/live/matches/{matchId}/stream", matchId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andReturn();

        // Verify the response is an SSE stream (async request)
        assertThat(result.getRequest().isAsyncStarted()).isTrue();
    }

    /**
     * Test: SSE stream accepts multiple match IDs
     */
    @Test
    public void streamMatchEvents_acceptsMultipleMatchIds() throws Exception {
        String matchId1 = "MATCH123";
        String matchId2 = "MATCH456";
        
        // First connection
        MvcResult result1 = mockMvc.perform(get("/live/matches/{matchId}/stream", matchId1))
                .andExpect(status().isOk())
                .andReturn();
        
        // Second connection to different match
        MvcResult result2 = mockMvc.perform(get("/live/matches/{matchId}/stream", matchId2))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(result1.getRequest().isAsyncStarted()).isTrue();
        assertThat(result2.getRequest().isAsyncStarted()).isTrue();
    }

    /**
     * Test: POST event without authentication returns 401/403
     */
    @Test
    public void pushEvent_withoutAuth_returnsUnauthorized() throws Exception {
        String matchId = "MATCH123";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("Test wicket");
        request.setEventType("wicket");
        
        String json = objectMapper.writeValueAsString(request);
        
        // Without @WithMockUser, Spring Security should reject this
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isUnauthorized());
    }

    /**
     * Test: POST event with ROLE_BLOG_EDITOR succeeds
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void pushEvent_withBlogEditorRole_succeeds() throws Exception {
        String matchId = "MATCH123";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("Kohli out for 50");
        request.setEventType("wicket");
        request.setOver("10.3");
        request.setInnings("1st innings");
        
        // Mock service to return a saved event
        LiveEvent mockEvent = new LiveEvent();
        mockEvent.setId(1L);
        mockEvent.setMatchId(matchId);
        mockEvent.setMessage("Kohli out for 50");
        mockEvent.setEventType("wicket");
        mockEvent.setOverLabel("10.3");
        mockEvent.setInningsLabel("1st innings");
        mockEvent.setCreatedAt(Instant.now());
        
        when(liveEventService.createEvent(
                eq(matchId), 
                eq("Kohli out for 50"), 
                eq("wicket"), 
                eq("10.3"), 
                eq("1st innings")))
                .thenReturn(mockEvent);
        
        String json = objectMapper.writeValueAsString(request);
        
        MvcResult result = mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.matchId").value(matchId))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).contains("\"success\":true");
    }

    /**
     * Test: POST event with empty message returns 400
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void pushEvent_withEmptyMessage_returnsBadRequest() throws Exception {
        String matchId = "MATCH123";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("");  // Empty message
        request.setEventType("info");
        
        String json = objectMapper.writeValueAsString(request);
        
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Message is required"));
    }

    /**
     * Test: POST event with null message returns 400
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void pushEvent_withNullMessage_returnsBadRequest() throws Exception {
        String matchId = "MATCH123";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage(null);  // Null message
        request.setEventType("info");
        
        String json = objectMapper.writeValueAsString(request);
        
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    /**
     * Test: POST event defaults eventType to "info" when null
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void pushEvent_withNullEventType_defaultsToInfo() throws Exception {
        String matchId = "MATCH123";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("Score update: 100-2");
        request.setEventType(null);  // Null event type
        
        // Mock service to return a saved event with "info" type
        LiveEvent mockEvent = new LiveEvent();
        mockEvent.setId(2L);
        mockEvent.setMatchId(matchId);
        mockEvent.setMessage("Score update: 100-2");
        mockEvent.setEventType("info");
        mockEvent.setCreatedAt(Instant.now());
        
        when(liveEventService.createEvent(
                eq(matchId), 
                eq("Score update: 100-2"), 
                eq("info"),  // Should default to "info"
                isNull(), 
                isNull()))
                .thenReturn(mockEvent);
        
        String json = objectMapper.writeValueAsString(request);
        
        mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    /**
     * Test: POST event with all optional fields
     */
    @Test
    @WithMockUser(roles = {"BLOG_EDITOR"})
    public void pushEvent_withAllFields_succeeds() throws Exception {
        String matchId = "MATCH123";
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        request.setMessage("Six over long-on!");
        request.setEventType("boundary");
        request.setOver("15.4");
        request.setInnings("2nd innings");
        
        LiveEvent mockEvent = new LiveEvent();
        mockEvent.setId(3L);
        mockEvent.setMatchId(matchId);
        mockEvent.setMessage("Six over long-on!");
        mockEvent.setEventType("boundary");
        mockEvent.setOverLabel("15.4");
        mockEvent.setInningsLabel("2nd innings");
        mockEvent.setCreatedAt(Instant.now());
        
        when(liveEventService.createEvent(
                eq(matchId), 
                eq("Six over long-on!"), 
                eq("boundary"), 
                eq("15.4"), 
                eq("2nd innings")))
                .thenReturn(mockEvent);
        
        String json = objectMapper.writeValueAsString(request);
        
        MvcResult result = mockMvc.perform(post("/live/matches/{matchId}/events", matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(3))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).contains("\"matchId\":\"MATCH123\"");
    }

    /**
     * Test: LiveEventRequest DTO getters and setters
     */
    @Test
    public void liveEventRequest_gettersAndSetters() {
        LiveUpdateController.LiveEventRequest request = new LiveUpdateController.LiveEventRequest();
        
        request.setMessage("Test message");
        request.setEventType("wicket");
        request.setOver("5.2");
        request.setInnings("1st innings");
        
        assertThat(request.getMessage()).isEqualTo("Test message");
        assertThat(request.getEventType()).isEqualTo("wicket");
        assertThat(request.getOver()).isEqualTo("5.2");
        assertThat(request.getInnings()).isEqualTo("1st innings");
    }
}
