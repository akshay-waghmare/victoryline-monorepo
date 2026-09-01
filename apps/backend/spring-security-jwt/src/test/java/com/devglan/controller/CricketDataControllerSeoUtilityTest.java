package com.devglan.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.Test;

public class CricketDataControllerSeoUtilityTest {

    @Test
    @SuppressWarnings("unchecked")
    public void summarizesStoredScorecardInningsAndPerformersWithoutHydration() throws Exception {
        CricketDataController controller = new CricketDataController();
        Method method = CricketDataController.class.getDeclaredMethod(
                "buildStoredScorecardUtility", String.class, List.class, List.class, Map.class);
        method.setAccessible(true);

        List<Map<String, Object>> innings = new ArrayList<>();
        List<Map<String, Object>> performers = new ArrayList<>();
        Map<String, Integer> counts = new HashMap<>();
        method.invoke(controller,
                "{\"innings\":{\"1st_inning\":{\"team_name\":\"India\",\"team_score\":\"180/4\","
                        + "\"batsman_stats\":{\"P1\":{\"player_name\":\"A Batter\",\"runs\":\"80\",\"balls_faced\":\"50\"}},"
                        + "\"bowlers_stats\":{\"P2\":{\"player_name\":\"B Bowler\",\"overs\":\"4\",\"runs\":\"20\",\"wickets\":\"2\"}}}}}",
                innings, performers, counts);

        assertThat(innings).hasSize(1);
        assertThat(innings.get(0).get("team")).isEqualTo("India");
        assertThat(innings.get(0).get("score")).isEqualTo("180/4");
        assertThat(counts.get("batsmen")).isEqualTo(1);
        assertThat(counts.get("bowlers")).isEqualTo(1);
        assertThat(performers).extracting(row -> row.get("name"))
                .contains("A Batter", "B Bowler");
    }
}
