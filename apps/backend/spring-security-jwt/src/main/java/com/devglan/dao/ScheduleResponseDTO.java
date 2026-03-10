package com.devglan.dao;

import java.util.List;

import com.devglan.model.LiveMatch;

public class ScheduleResponseDTO {

    private boolean success;
    private List<LiveMatch> data;
    private Long lastUpdated;
    private String source;

    public ScheduleResponseDTO() {
    }

    public ScheduleResponseDTO(boolean success, List<LiveMatch> data, Long lastUpdated, String source) {
        this.success = success;
        this.data = data;
        this.lastUpdated = lastUpdated;
        this.source = source;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public List<LiveMatch> getData() {
        return data;
    }

    public void setData(List<LiveMatch> data) {
        this.data = data;
    }

    public Long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(Long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
