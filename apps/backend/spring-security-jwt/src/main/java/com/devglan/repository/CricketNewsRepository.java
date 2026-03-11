package com.devglan.repository;

import com.devglan.model.CricketNews;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CricketNewsRepository extends JpaRepository<CricketNews, String> {
    Optional<CricketNews> findByNewsId(String newsId);
    List<CricketNews> findTop20ByOrderByCreatedTimestampDesc();
}
