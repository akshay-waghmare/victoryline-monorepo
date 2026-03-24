package com.devglan.dao;

public class PlayerStatsReferenceIngestionResponseDTO {

    private String url;
    private String source;
    private String resourceScope;
    private String resourceExternalId;
    private int statSnapshotsProcessed;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getResourceScope() {
        return resourceScope;
    }

    public void setResourceScope(String resourceScope) {
        this.resourceScope = resourceScope;
    }

    public String getResourceExternalId() {
        return resourceExternalId;
    }

    public void setResourceExternalId(String resourceExternalId) {
        this.resourceExternalId = resourceExternalId;
    }

    public int getStatSnapshotsProcessed() {
        return statSnapshotsProcessed;
    }

    public void setStatSnapshotsProcessed(int statSnapshotsProcessed) {
        this.statSnapshotsProcessed = statSnapshotsProcessed;
    }
}
