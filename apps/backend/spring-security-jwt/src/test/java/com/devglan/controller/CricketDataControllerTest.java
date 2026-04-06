package com.devglan.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
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

    private void setField(String fieldName, Object value) throws Exception {
        java.lang.reflect.Field field = CricketDataController.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(controller, value);
    }
}
