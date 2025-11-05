package com.devglan.dao;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.ElementCollection;
import java.util.List;

import com.devglan.model.CricketDataEntity;

@Entity
public class OversData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String overNumber;

    @ElementCollection
    private List<String> balls;

    private String totalRuns;

    @ManyToOne
    @JoinColumn(name = "cricket_data_id")
    private CricketDataEntity cricketDataEntity;

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOverNumber() {
        return overNumber;
    }

    public void setOverNumber(String overNumber) {
        this.overNumber = overNumber;
    }

    public List<String> getBalls() {
        return balls;
    }

    public void setBalls(List<String> balls) {
        this.balls = balls;
    }

    public String getTotalRuns() {
        return totalRuns;
    }

    public void setTotalRuns(String totalRuns) {
        this.totalRuns = totalRuns;
    }

    public CricketDataEntity getCricketDataEntity() {
        return cricketDataEntity;
    }

    public void setCricketDataEntity(CricketDataEntity cricketDataEntity) {
        this.cricketDataEntity = cricketDataEntity;
    }
}
