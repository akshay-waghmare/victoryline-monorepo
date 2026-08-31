package com.devglan.service.seo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class IndexNowService {
    private static final Logger LOGGER = LoggerFactory.getLogger(IndexNowService.class);

    private final RestTemplate restTemplate;

    @Value("${seo.indexnow.enabled:false}")
    private boolean enabled;

    @Value("${seo.indexnow.key:}")
    private String key;

    @Value("${seo.indexnow.endpoint:https://api.indexnow.org/indexnow}")
    private String endpoint;

    @Value("${seo.indexnow.host:www.crickzen.com}")
    private String host;

    @Value("${seo.indexnow.key-location:https://www.crickzen.com/api/v1/seo/indexnow/key.txt}")
    private String keyLocation;

    private volatile long lastSubmissionEpochMs;
    private volatile int lastSubmittedUrlCount;
    private volatile Integer lastHttpStatus;
    private volatile String lastError;

    public IndexNowService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean submitUrls(List<String> urls) {
        if (!isConfigured() || urls == null || urls.isEmpty()) {
            return false;
        }

        List<String> canonicalUrls = new ArrayList<>();
        for (String url : urls) {
            if (url != null && url.startsWith("https://" + host + "/") && !canonicalUrls.contains(url)) {
                canonicalUrls.add(url);
            }
        }
        if (canonicalUrls.isEmpty()) {
            lastError = "No canonical URLs qualified for IndexNow";
            return false;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("host", host);
        payload.put("key", key.trim());
        payload.put("keyLocation", keyLocation);
        payload.put("urlList", canonicalUrls);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint, HttpMethod.POST, new HttpEntity<>(payload, headers), String.class);
            lastHttpStatus = response.getStatusCodeValue();
            lastSubmissionEpochMs = System.currentTimeMillis();
            lastSubmittedUrlCount = canonicalUrls.size();
            lastError = null;
            boolean accepted = lastHttpStatus == 200 || lastHttpStatus == 202;
            if (accepted) {
                LOGGER.info("IndexNow accepted {} priority match URLs with HTTP {}",
                        canonicalUrls.size(), lastHttpStatus);
            } else {
                lastError = "Unexpected IndexNow HTTP status " + lastHttpStatus;
                LOGGER.warn(lastError);
            }
            return accepted;
        } catch (Exception ex) {
            lastError = ex.getClass().getSimpleName() + ": " + ex.getMessage();
            LOGGER.error("IndexNow priority URL submission failed", ex);
            return false;
        }
    }

    public boolean isConfigured() {
        return enabled && key != null && key.trim().matches("[A-Za-z0-9-]{8,128}");
    }

    public String getPublicKey() {
        return isConfigured() ? key.trim() : null;
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", enabled);
        status.put("configured", isConfigured());
        status.put("endpoint", endpoint);
        status.put("host", host);
        status.put("keyLocation", keyLocation);
        status.put("lastSubmissionEpochMs", lastSubmissionEpochMs);
        status.put("lastSubmittedUrlCount", lastSubmittedUrlCount);
        status.put("lastHttpStatus", lastHttpStatus);
        status.put("lastError", lastError);
        status.put("guarantee", "submission receipt only; search engines decide crawl and indexing");
        return status;
    }
}
