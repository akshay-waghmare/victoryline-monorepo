package com.devglan.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devglan.model.LiveMatch;

public interface LiveMatchRepository extends JpaRepository<LiveMatch, Long> , LiveMatchRepositoryCustom {

	boolean existsByUrl(String url);
	List<LiveMatch> findByIsDeletedFalse();
	boolean existsByUrlAndIsDeletedFalse(String url);
	List<LiveMatch> findByIsDeletedTrue();
	
	/**
	 * Find completed matches (isDeleted=true) ordered by ID descending (most recent first)
	 * Supports pagination via Pageable to limit results
	 * Added for: Feature 008-completed-matches (US1 - T011)
	 */
	@Query("SELECT lm FROM LiveMatch lm WHERE lm.isDeleted = true ORDER BY lm.id DESC")
	List<LiveMatch> findCompletedMatches(Pageable pageable);
	
	@Query("SELECT lm FROM LiveMatch lm WHERE lm.url LIKE %:url%")
    LiveMatch findByUrlContaining(@Param("url") String url);
	List<LiveMatch> findByDeletionAttemptsLessThan(Integer attempts);
	List<LiveMatch> findByDeletionAttemptsLessThanAndIsDeletedFalse(Integer attempts);
}