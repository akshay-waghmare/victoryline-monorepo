package com.devglan.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;

import org.junit.Test;

import com.devglan.service.impl.LiveMatchServiceImpl;

public class LiveMatchServiceLifecycleEvidenceTest {

    @Test
    public void treatsProviderWinnerBetweenTwoScoresAsTerminal() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        Method method = LiveMatchServiceImpl.class.getDeclaredMethod("hasCompletedResultSignal", String.class);
        method.setAccessible(true);

        boolean terminal = (Boolean) method.invoke(service,
                "tt 83/68.2 tt won 7tht20, kcl t20 2026 kbt 172/6 20.0");

        assertThat(terminal).isTrue();
    }

    @Test
    public void doesNotTreatAWinTossMessageAsTerminal() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        Method method = LiveMatchServiceImpl.class.getDeclaredMethod("hasCompletedResultSignal", String.class);
        method.setAccessible(true);

        boolean terminal = (Boolean) method.invoke(service, "ind won the toss and elected to bat");

        assertThat(terminal).isFalse();
    }
}
