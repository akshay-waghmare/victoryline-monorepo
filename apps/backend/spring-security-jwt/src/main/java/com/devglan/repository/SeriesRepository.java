package com.devglan.repository;

import com.devglan.model.Series;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for Series entity
 * Feature: 006-completed-matches-display
 */
@Repository
public interface SeriesRepository extends JpaRepository<Series, Long> {
}
