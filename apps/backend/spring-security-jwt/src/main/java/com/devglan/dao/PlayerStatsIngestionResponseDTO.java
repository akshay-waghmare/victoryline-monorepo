package com.devglan.dao;

public class PlayerStatsIngestionResponseDTO {

    private String url;
    private String matchExternalKey;
    private Long liveMatchId;
    private String source;
    private int teamsProcessed;
    private int squadEntriesProcessed;
    private int statSnapshotsProcessed;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getMatchExternalKey() {
        return matchExternalKey;
    }

    public void setMatchExternalKey(String matchExternalKey) {
        this.matchExternalKey = matchExternalKey;
    }

    public Long getLiveMatchId() {
        return liveMatchId;
    }

    public void setLiveMatchId(Long liveMatchId) {
        this.liveMatchId = liveMatchId;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public int getTeamsProcessed() {
        return teamsProcessed;
    }

    public void setTeamsProcessed(int teamsProcessed) {
        this.teamsProcessed = teamsProcessed;
    }

    public int getSquadEntriesProcessed() {
        return squadEntriesProcessed;
    }

    public void setSquadEntriesProcessed(int squadEntriesProcessed) {
        this.squadEntriesProcessed = squadEntriesProcessed;
    }

    public int getStatSnapshotsProcessed() {
        return statSnapshotsProcessed;
    }

    public void setStatSnapshotsProcessed(int statSnapshotsProcessed) {
        this.statSnapshotsProcessed = statSnapshotsProcessed;
    }
}
