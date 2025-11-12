package com.devglan.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.devglan.model.Matches;

import java.util.List;

@Repository
public interface MatchRepository extends JpaRepository<Matches, Long> {
	// Visible matches only (SEO relevant). If visibility column isn't maintained yet, this will still work via fallback.
	List<Matches> findByVisibilityTrue();
}

