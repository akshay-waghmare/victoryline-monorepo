package com.devglan.websocket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Proxy;
import java.util.Collections;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.Test;
import org.springframework.messaging.core.MessageSendingOperations;
import org.springframework.messaging.simp.broker.BrokerAvailabilityEvent;

import com.devglan.repository.CricketDataRepository;

public class CricketDataServiceTest {

    @Test
    public void sendCricketDataUsesExtractedMatchKeyForNewCrexUrl() {
        final AtomicReference<String> destinationRef = new AtomicReference<String>();
        final AtomicReference<Object> payloadRef = new AtomicReference<Object>();

        @SuppressWarnings("unchecked")
        MessageSendingOperations<String> messagingTemplate = (MessageSendingOperations<String>) Proxy.newProxyInstance(
                MessageSendingOperations.class.getClassLoader(),
                new Class<?>[] { MessageSendingOperations.class },
                (proxy, method, args) -> {
                    if ("convertAndSend".equals(method.getName()) && args != null && args.length >= 2) {
                        destinationRef.set((String) args[0]);
                        payloadRef.set(args[1]);
                    }
                    return null;
                });

        CricketDataService service = new CricketDataService(messagingTemplate, null);
        service.onApplicationEvent(new BrokerAvailabilityEvent(true, new Object()));

        service.sendCricketData(
                "https://crex.com/cricket-live-score/dc-vs-lsg-5th-match-indian-premier-league-2026-match-updates-10Y3",
                Collections.<String, Object>singletonMap("current_ball", "1"));

        assertThat(destinationRef.get())
                .isEqualTo("/topic/cricket.dc-vs-lsg-5th-match-indian-premier-league-2026-match-updates-10Y3.current_ball");
        assertThat(payloadRef.get())
                .isEqualTo("{\"current_ball\":\"1\"}");
    }
}
