package com.devglan.service;

import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.devglan.dao.MatchInfoDetailEntity;
import com.devglan.repository.MatchInfoDetailRepository;
import com.devglan.service.seo.events.SeoContentChangeEvent;

@Service
public class MatchInfoService {

    private final MatchInfoDetailRepository matchInfoDetailRepository;
    private final ApplicationEventPublisher eventPublisher;

    public MatchInfoService(MatchInfoDetailRepository matchInfoDetailRepository,
            ApplicationEventPublisher eventPublisher) {
        this.matchInfoDetailRepository = matchInfoDetailRepository;
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
        
    	 Optional<MatchInfoDetailEntity> optionalMatchInfo = matchInfoDetailRepository.findFirstByUrlContaining(url);
    	    if (optionalMatchInfo.isPresent()) {
    	        MatchInfoDetailEntity matchInfo = optionalMatchInfo.get();
    	        return matchInfo.getData();
    	    } else {
    	        return null;
    	    }
    }

    public boolean existsByUrl(String url) {
        return matchInfoDetailRepository.existsById(url);
    }
}
