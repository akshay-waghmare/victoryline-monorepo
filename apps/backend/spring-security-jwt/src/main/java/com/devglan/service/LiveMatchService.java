package com.devglan.service;

import java.util.List;

import org.springframework.http.ResponseEntity;

import com.devglan.dao.CricketDataDTO;
import com.devglan.dao.ScheduledMatchDTO;
import com.devglan.model.LiveMatch;
import com.devglan.model.MatchLifecycleCohort;

public interface LiveMatchService {
	void syncLiveMatches(String[] urls);
    void syncScheduleMatches(List<ScheduledMatchDTO> matches);

	public List<LiveMatch> findAllMatches();
    public List<LiveMatch> findIndexableMatches();
    List<LiveMatch> findAll();
    public ResponseEntity<CricketDataDTO> fetchAndSendData(String url);
    public String appendBaseUrl(String url);

	public List<LiveMatch> findAllFinishedMatches();
    public List<LiveMatch> findUpcomingMatches();
    public List<LiveMatch> findCompletedMatches();
	public LiveMatch findByUrl(String url);
	public List<LiveMatch> findAllLiveMatches();
	List<LiveMatch> findMatchesByCohort(MatchLifecycleCohort cohort);
	LiveMatch update(LiveMatch match);
    
}
