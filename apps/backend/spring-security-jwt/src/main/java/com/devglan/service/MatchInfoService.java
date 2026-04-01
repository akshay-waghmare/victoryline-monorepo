package com.devglan.service;

import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.devglan.dao.MatchInfoDetailEntity;
import com.devglan.model.LiveMatch;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.repository.MatchInfoDetailRepository;
import com.devglan.service.seo.events.SeoContentChangeEvent;

@Service
public class MatchInfoService {

    private final MatchInfoDetailRepository matchInfoDetailRepository;
    private final LiveMatchRepository liveMatchRepository;
    private final ApplicationEventPublisher eventPublisher;

    public MatchInfoService(MatchInfoDetailRepository matchInfoDetailRepository,
            LiveMatchRepository liveMatchRepository,
            ApplicationEventPublisher eventPublisher) {
        this.matchInfoDetailRepository = matchInfoDetailRepository;
        this.liveMatchRepository = liveMatchRepository;
        this.eventPublisher = eventPublisher;
    }

    public void saveMatchInfo(String url, String data) {
        MatchInfoDetailEntity matchInfo = new MatchInfoDetailEntity();
        matchInfo.setUrl(url);
        matchInfo.setData(data);
        matchInfoDetailRepository.save(matchInfo);
        eventPublisher.publishEvent(SeoContentChangeEvent.matchUpdated(url));
    }

    public String getMatchInfo(String url) {
        String resolvedInfoUrl = resolveInfoUrl(url);

        if (resolvedInfoUrl != null) {
            Optional<MatchInfoDetailEntity> exactMatchInfo = matchInfoDetailRepository.findById(resolvedInfoUrl);
            if (exactMatchInfo.isPresent()) {
                return exactMatchInfo.get().getData();
            }
        }

        Optional<MatchInfoDetailEntity> optionalMatchInfo = matchInfoDetailRepository
                .findFirstByUrlContaining(resolvedInfoUrl != null ? resolvedInfoUrl : url);
        if (optionalMatchInfo.isPresent()) {
            return optionalMatchInfo.get().getData();
        }

        if (resolvedInfoUrl != null && url != null && !resolvedInfoUrl.equals(url)) {
            Optional<MatchInfoDetailEntity> fallbackMatchInfo = matchInfoDetailRepository.findFirstByUrlContaining(url);
            if (fallbackMatchInfo.isPresent()) {
                return fallbackMatchInfo.get().getData();
            }
        }

        return null;
    }

    private String resolveInfoUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return url;
        }

        String trimmedUrl = url.trim();
        if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
            return CrexMatchUrlHelper.toMatchDetailsUrl(trimmedUrl);
        }

        LiveMatch liveMatch = liveMatchRepository.findByUrlContaining(trimmedUrl);
        if (liveMatch != null && liveMatch.getUrl() != null && !liveMatch.getUrl().trim().isEmpty()) {
            return CrexMatchUrlHelper.toMatchDetailsUrl(liveMatch.getUrl());
        }

        return CrexMatchUrlHelper.toMatchDetailsUrl(trimmedUrl);
    }

    public boolean existsByUrl(String url) {
        return matchInfoDetailRepository.existsById(url);
    }
}
