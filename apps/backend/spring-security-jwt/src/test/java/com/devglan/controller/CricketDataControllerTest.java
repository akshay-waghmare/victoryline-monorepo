package com.devglan.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.devglan.dao.CricketDataDTO;
import com.devglan.model.LiveMatch;
import com.devglan.service.LiveMatchService;
import com.devglan.service.MatchDetailHydrationService;
import com.devglan.service.MatchInfoService;
import com.devglan.websocket.service.CricketDataService;
import com.fasterxml.jackson.databind.ObjectMapper;

@RunWith(MockitoJUnitRunner.class)
public class CricketDataControllerTest {

    @Mock
    private CricketDataService cricketDataService;

    @Mock
    private MatchDetailHydrationService matchDetailHydrationService;

    @Mock
    private LiveMatchService liveMatchService;

    @Mock
    private MatchInfoService matchInfoService;

    private CricketDataController controller;

    @Before
    public void setUp() throws Exception {
        controller = new CricketDataController();
        setField("cricketDataService", cricketDataService);
        setField("matchDetailHydrationService", matchDetailHydrationService);
        setField("liveMatchService", liveMatchService);
        setField("matchInfoService", matchInfoService);
        setField("springObjectMapper", new ObjectMapper());
    }

    @Test
    public void getLastUpdatedDataRetriesAfterHydrationForSlugRequests() throws Exception {
        CricketDataDTO dto = new CricketDataDTO();
        dto.setScore("182/4");

        when(cricketDataService.getLastUpdatedData("match-slug")).thenReturn(null, dto);
        when(matchDetailHydrationService.hydrate("match-slug")).thenReturn(true);

        ResponseEntity<CricketDataDTO> response = controller.getLastUpdatedData("match-slug");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(dto);
        verify(cricketDataService, times(2)).getLastUpdatedData("match-slug");
        verify(matchDetailHydrationService).hydrate("match-slug");
    }

    @Test
    public void liveUpdateBroadcastsBeforePersistence() throws Exception {
        CricketDataDTO incoming = new CricketDataDTO();
        incoming.setUrl("match-slug");
        incoming.setScore("31-2");

        ResponseEntity<String> response = invokeMergeAndBroadcast(incoming, true);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        InOrder order = org.mockito.Mockito.inOrder(cricketDataService);
        order.verify(cricketDataService).sendCricketSnapshot(
                org.mockito.ArgumentMatchers.eq("match-slug"),
                org.mockito.ArgumentMatchers.any(CricketDataDTO.class));
        order.verify(cricketDataService).sendCricketData(
                org.mockito.ArgumentMatchers.eq("match-slug"),
                org.mockito.ArgumentMatchers.<Map<String, Object>>any());
        order.verify(cricketDataService).setLastUpdatedData(
                org.mockito.ArgumentMatchers.eq("match-slug"),
                org.mockito.ArgumentMatchers.any(CricketDataDTO.class));
    }

    @Test
    public void livePatchBroadcastsAndCachesWithoutPersistence() throws Exception {
        CricketDataDTO incoming = new CricketDataDTO();
        incoming.setUrl("match-slug");
        incoming.setScore("32-2");

        ResponseEntity<String> response = invokeMergeAndBroadcast(incoming, false);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(cricketDataService).sendCricketSnapshot(
                org.mockito.ArgumentMatchers.eq("match-slug"),
                org.mockito.ArgumentMatchers.any(CricketDataDTO.class));
        verify(cricketDataService).cacheLastUpdatedData(
                org.mockito.ArgumentMatchers.eq("match-slug"),
                org.mockito.ArgumentMatchers.any(CricketDataDTO.class));
        verify(cricketDataService, org.mockito.Mockito.never()).setLastUpdatedData(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(CricketDataDTO.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void canonicalSnapshotRetainsStoredVenueWhenLiveStateOmitsIt() throws Exception {
        String slug = "aut-vs-isr-7th-match-eca-mens-european-cup-2026-match-updates-138M";
        LiveMatch match = new LiveMatch("https://crex.com/cricket-live-score/" + slug);
        match.setExternalMatchKey(slug);
        match.setVenue(null);
        match.setSeriesName("European Cup 2026");

        CricketDataDTO sparseLiveState = new CricketDataDTO();
        sparseLiveState.setMatchName("transient live label");
        sparseLiveState.setVenue(null);

        when(liveMatchService.findByUrl(slug)).thenReturn(match);
        when(matchInfoService.getMatchInfo(slug)).thenReturn(
                "{\"match_name\":\"European Cup 2026\",\"match_date\":\"Tuesday, 28 July, 5:30 AM\",\"venue\":\"Moara Vlasiei Cricket Ground, Ilfov County\"}");
        when(cricketDataService.getLastUpdatedData(match.getUrl())).thenReturn(sparseLiveState);

        ResponseEntity<?> response = controller.getCanonicalMatchSnapshot(slug);
        Map<String, Object> body = (Map<String, Object>) response.getBody();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body.get("venue")).isEqualTo("Moara Vlasiei Cricket Ground, Ilfov County");
        assertThat(body.get("series")).isEqualTo("European Cup 2026");
    }

    @SuppressWarnings("unchecked")
    private ResponseEntity<String> invokeMergeAndBroadcast(CricketDataDTO data, boolean persist) throws Exception {
        java.lang.reflect.Method method = CricketDataController.class
                .getDeclaredMethod("mergeAndBroadcastCricketData", CricketDataDTO.class, boolean.class);
        method.setAccessible(true);
        return (ResponseEntity<String>) method.invoke(controller, data, persist);
    }

    private void setField(String fieldName, Object value) throws Exception {
        java.lang.reflect.Field field = CricketDataController.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(controller, value);
    }
}
