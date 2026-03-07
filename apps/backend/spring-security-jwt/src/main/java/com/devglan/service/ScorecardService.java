package com.devglan.service;

import java.util.Optional;

import org.springframework.stereotype.Service;

import com.devglan.dao.ScorecardEntity;
import com.devglan.model.LiveMatch;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.repository.ScorecardRepository;

@Service
public class ScorecardService {

    private final ScorecardRepository scorecardRepository;
    private final LiveMatchRepository liveMatchRepository;

    public ScorecardService(ScorecardRepository scorecardRepository, LiveMatchRepository liveMatchRepository) {
        this.scorecardRepository = scorecardRepository;
        this.liveMatchRepository = liveMatchRepository;
    }

    public void saveMatchInfo(String url, String data) {
    	ScorecardEntity scorecard = new ScorecardEntity();
        scorecard.setUrl(url);
        scorecard.setData(data);
        scorecardRepository.save(scorecard);
    }

    public String getMatchInfo(String url) {
        String resolvedUrl = resolveLiveUrl(url);

        if (resolvedUrl != null) {
            Optional<ScorecardEntity> exactScorecard = scorecardRepository.findById(resolvedUrl);
            if (exactScorecard.isPresent()) {
                return exactScorecard.get().getData();
            }
        }

        Optional<ScorecardEntity> scorecardnfo = scorecardRepository.findFirstByUrlContaining(resolvedUrl != null ? resolvedUrl : url);
        if (scorecardnfo.isPresent()) {
            return scorecardnfo.get().getData();
        }

        if (resolvedUrl != null && url != null && !resolvedUrl.equals(url)) {
            Optional<ScorecardEntity> fallbackScorecard = scorecardRepository.findFirstByUrlContaining(url);
            if (fallbackScorecard.isPresent()) {
                return fallbackScorecard.get().getData();
            }
        }

        return null;
    }

    private String resolveLiveUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return url;
        }

        String trimmedUrl = url.trim();
        if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
            return trimmedUrl;
        }

        LiveMatch liveMatch = liveMatchRepository.findByUrlContaining(trimmedUrl);
        if (liveMatch != null && liveMatch.getUrl() != null && !liveMatch.getUrl().trim().isEmpty()) {
            return liveMatch.getUrl();
        }

        return trimmedUrl;
    }

    public boolean existsByUrl(String url) {
        return scorecardRepository.existsById(url);
    }
}
