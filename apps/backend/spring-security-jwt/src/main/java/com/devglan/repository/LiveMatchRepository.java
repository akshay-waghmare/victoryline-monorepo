package com.devglan.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.devglan.model.LiveMatch;
import com.devglan.model.MatchLifecycleStatus;

public interface LiveMatchRepository extends JpaRepository<LiveMatch, Long> , LiveMatchRepositoryCustom {

	boolean existsByUrl(String url);
	List<LiveMatch> findByIsDeletedFalse();
	boolean existsByUrlAndIsDeletedFalse(String url);
	List<LiveMatch> findByIsDeletedTrue();
	@Query("SELECT lm FROM LiveMatch lm WHERE lm.url LIKE %:url%")
    LiveMatch findByUrlContaining(@Param("url") String url);
	List<LiveMatch> findByDeletionAttemptsLessThan(Integer attempts);
	List<LiveMatch> findByDeletionAttemptsLessThanAndIsDeletedFalse(Integer attempts);
    List<LiveMatch> findByExternalMatchKeyOrderByIdDesc(String externalMatchKey);
    List<LiveMatch> findByStatusInAndIsDeletedFalseOrderByScheduledStartTimeAsc(List<MatchLifecycleStatus> statuses);
    @Query("SELECT lm FROM LiveMatch lm WHERE lm.status IN :statuses AND lm.isDeleted = false AND lm.scheduledStartTime >= :cutoff ORDER BY lm.scheduledStartTime ASC")
    List<LiveMatch> findUpcomingMatchesStartingAtOrAfter(
            @Param("statuses") List<MatchLifecycleStatus> statuses,
            @Param("cutoff") Long cutoff);
    List<LiveMatch> findByStatusInOrderByLastStateUpdatedAtDesc(List<MatchLifecycleStatus> statuses);
}
