package com.devglan.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.Before;
import org.junit.Test;

import com.devglan.dao.CricketDataDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;

public class JacksonCustomCricketDeserializerTest {

    private ObjectMapper objectMapper;

    @Before
    public void setUp() {
        SimpleModule module = new SimpleModule();
        module.addDeserializer(CricketDataDTO.class, new JacksonCustomCricketDeserializer());
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(module);
    }

    @Test
    public void ignoresNullNestedOverForInfoOnlyUpdates() throws Exception {
        String payload = "{"
                + "\"url\":\"https://crex.com/cricket-live-score/ee-vs-me-5th-match-nigeria-super-t20-league-2026-match-updates-125I\","
                + "\"match_update\":{\"score\":{\"teamName\":\"Eastern Elephants\",\"score\":null,\"over\":null}},"
                + "\"score_update\":\"Toss delayed due to rain 2:00 PM 20 May \""
                + "}";

        CricketDataDTO dto = objectMapper.readValue(payload, CricketDataDTO.class);

        assertThat(dto.getOver()).isNull();
        assertThat(dto.getCurrentBall()).isEqualTo("Toss delayed due to rain 2:00 PM 20 May ");
        assertThat(dto.getBattingTeamName()).isEqualTo("Eastern Elephants");
    }

    @Test
    public void parsesTextualNestedOverWhenPresent() throws Exception {
        String payload = "{"
                + "\"match_update\":{\"score\":{\"teamName\":\"CSK\",\"score\":\"22-0\",\"over\":\"1.4 ov\"}}"
                + "}";

        CricketDataDTO dto = objectMapper.readValue(payload, CricketDataDTO.class);

        assertThat(dto.getOver()).isEqualTo(1.4D);
    }
}
