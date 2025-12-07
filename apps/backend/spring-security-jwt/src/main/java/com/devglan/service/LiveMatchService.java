package com.devglan.service;

import java.util.List;

import org.springframework.http.ResponseEntity;

import com.devglan.dao.CricketDataDTO;
import com.devglan.model.LiveMatch;

public interface LiveMatchService {
	void syncLiveMatches(String[] urls);

	public List<LiveMatch> findAllMatches();
    List<LiveMatch> findAll();
    public ResponseEntity<CricketDataDTO> fetchAndSendData(String url);
    public String appendBaseUrl(String url);

	public List<LiveMatch> findAllFinishedMatches();
	
	/**
	 * Get up to 20 most recently completed matches
	 * Added for: Feature 008-completed-matches (US1 - T012)
	 * @return List of completed matches (max 20), ordered by most recent first
	 */
	public List<LiveMatch> getCompletedMatches();
	
	public LiveMatch findByUrl(String url);
	public List<LiveMatch> findAllLiveMatches();
	LiveMatch update(LiveMatch match);
    
}
