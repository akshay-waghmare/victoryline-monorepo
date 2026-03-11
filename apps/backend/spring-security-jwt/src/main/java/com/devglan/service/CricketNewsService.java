package com.devglan.service;

import com.devglan.model.CricketNews;
import com.devglan.repository.CricketNewsRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
public class CricketNewsService {

    private static final Logger logger = LoggerFactory.getLogger(CricketNewsService.class);
    private static final String API_HOST = "cricket-live-line-advance.p.rapidapi.com";
    private static final String API_URL = "https://cricket-live-line-advance.p.rapidapi.com/seasons/2025/news?paged=1&per_page=20";

    private final CricketNewsRepository newsRepository;
    private final ObjectMapper objectMapper;
    private final OkHttpClient httpClient;

    @Value("${rapidapi.key:}")
    private String rapidApiKey;

    public CricketNewsService(CricketNewsRepository newsRepository) {
        this.newsRepository = newsRepository;
        this.objectMapper = new ObjectMapper();
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Get latest news from DB cache. If empty, triggers a fetch.
     */
    public List<CricketNews> getLatestNews() {
        List<CricketNews> cached = newsRepository.findTop20ByOrderByCreatedTimestampDesc();
        if (cached.isEmpty()) {
            logger.info("No cached news found, triggering fetch");
            refreshNews();
            cached = newsRepository.findTop20ByOrderByCreatedTimestampDesc();
        }
        return cached;
    }

    /**
     * Fetch fresh news from RapidAPI and persist to DB.
     * Called by scheduler every 4 hours.
     */
    public int refreshNews() {
        if (rapidApiKey == null || rapidApiKey.isEmpty()) {
            logger.warn("RAPIDAPI_KEY not configured — skipping news fetch");
            return 0;
        }

        logger.info("Fetching cricket news from RapidAPI...");
        int newCount = 0;

        try {
            Request request = new Request.Builder()
                    .url(API_URL)
                    .get()
                    .addHeader("x-rapidapi-host", API_HOST)
                    .addHeader("x-rapidapi-key", rapidApiKey)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    logger.error("RapidAPI news request failed: HTTP {}", response.code());
                    return 0;
                }

                String body = response.body().string();
                JsonNode root = objectMapper.readTree(body);

                if (!"ok".equals(root.path("status").asText())) {
                    logger.error("RapidAPI response status not ok: {}", root.path("message").asText());
                    return 0;
                }

                JsonNode items = root.path("response").path("items");
                if (!items.isArray()) {
                    logger.warn("No news items array in response");
                    return 0;
                }

                LocalDateTime now = LocalDateTime.now();

                for (JsonNode item : items) {
                    String newsId = item.path("news_id").asText();
                    Optional<CricketNews> existing = newsRepository.findByNewsId(newsId);

                    if (!existing.isPresent()) {
                        CricketNews news = new CricketNews();
                        news.setNewsId(newsId);
                        news.setTitle(item.path("title").asText());
                        news.setBody(item.path("news_body").asText());
                        news.setMediaUrl(item.path("media_url").asText());
                        news.setNewsUrl(item.path("news_url").asText());
                        news.setCredit(item.path("credit").asText());

                        String created = item.path("created").asText();
                        try {
                            news.setCreatedTimestamp(Long.parseLong(created));
                        } catch (NumberFormatException e) {
                            news.setCreatedTimestamp(System.currentTimeMillis() / 1000);
                        }

                        news.setFetchedAt(now);
                        newsRepository.save(news);
                        newCount++;
                    }
                }

                logger.info("News refresh complete: {} new articles saved (total items: {})", newCount, items.size());
            }
        } catch (Exception e) {
            logger.error("Error fetching cricket news: {}", e.getMessage(), e);
        }

        return newCount;
    }
}
