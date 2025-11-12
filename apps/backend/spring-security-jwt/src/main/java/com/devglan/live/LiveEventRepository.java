package com.devglan.live;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LiveEventRepository extends JpaRepository<LiveEvent, Long> {
    
    /**
     * Find all events for a specific match, ordered by creation time descending
     */
    List<LiveEvent> findByMatchIdOrderByCreatedAtDesc(String matchId);
    
    /**
     * Find events for a match with pagination
     */
    Page<LiveEvent> findByMatchIdOrderByCreatedAtDesc(String matchId, Pageable pageable);
    
    /**
     * Count events for a match
     */
    long countByMatchId(String matchId);
}
