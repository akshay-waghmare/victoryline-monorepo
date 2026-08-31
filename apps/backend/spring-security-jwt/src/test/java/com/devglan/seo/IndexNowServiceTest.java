package com.devglan.seo;

import com.devglan.service.seo.IndexNowService;
import org.junit.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

public class IndexNowServiceTest {
    @Test
    public void submits_only_canonical_host_urls_and_records_acceptance() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        IndexNowService service = new IndexNowService(restTemplate);
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "key", "test-key-12345678");
        ReflectionTestUtils.setField(service, "endpoint", "https://api.indexnow.org/indexnow");
        ReflectionTestUtils.setField(service, "host", "www.crickzen.com");
        ReflectionTestUtils.setField(service, "keyLocation", "https://www.crickzen.com/api/v1/seo/indexnow/key.txt");

        server.expect(requestTo("https://api.indexnow.org/indexnow"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("priority-a-vs-priority-b")))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("example.com"))))
                .andRespond(withStatus(HttpStatus.ACCEPTED));

        boolean accepted = service.submitUrls(Arrays.asList(
                "https://www.crickzen.com/cric-live/priority-a-vs-priority-b",
                "https://example.com/cric-live/not-ours"));

        server.verify();
        assertThat(accepted).isTrue();
        assertThat(service.getStatus()).containsEntry("lastSubmittedUrlCount", 1);
        assertThat(service.getPublicKey()).isEqualTo("test-key-12345678");
    }
}
