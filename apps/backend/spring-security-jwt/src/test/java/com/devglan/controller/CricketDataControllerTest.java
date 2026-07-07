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
import com.devglan.service.MatchDetailHydrationService;
import com.devglan.websocket.service.CricketDataService;

@RunWith(MockitoJUnitRunner.class)
public class CricketDataControllerTest {

    @Mock
    private CricketDataService cricketDataService;

    @Mock
    private MatchDetailHydrationService matchDetailHydrationService;

    private CricketDataController controller;

    @Before
    public void setUp() throws Exception {
        controller = new CricketDataController();
        setField("cricketDataService", cricketDataService);
        setField("matchDetailHydrationService", matchDetailHydrationService);
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
