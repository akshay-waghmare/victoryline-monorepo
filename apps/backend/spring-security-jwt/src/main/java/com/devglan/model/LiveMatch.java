package com.devglan.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import javax.persistence.Table;
import javax.persistence.Transient;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Entity
@Table(name = "LIVE_MATCH", indexes = {
	    @Index(name = "idx_is_deleted", columnList = "isDeleted")
	})
public class LiveMatch {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String url;
    
    @Column(name = "external_match_key")
    private String externalMatchKey;
	
	private boolean isDeleted = false; // Soft delete flag
    private String lastKnownState; // JSON string to store the last known state
    private int deletionAttempts = 0; // Counter for deletion attempts

    @Enumerated(EnumType.STRING)
    @Column(name = "match_status")
    private MatchLifecycleStatus status = MatchLifecycleStatus.LIVE;

    @Column(name = "scheduled_start_time")
    private Long scheduledStartTime;

    @Column(name = "team1_name")
    private String team1Name;

    @Column(name = "team2_name")
    private String team2Name;

    @Column(name = "series_name")
    private String seriesName;

    @Column(name = "match_format")
    private String matchFormat;

    @Column(name = "result_summary", length = 1000)
    private String resultSummary;

    @Column(name = "last_state_updated_at")
    private Long lastStateUpdatedAt;

    /**
     * True only for the bounded live slate currently refreshed by the scraper.
     * A provider can advertise more live rows than we intentionally manage;
     * those rows must not be presented as fresh live-score cards.
     */
    @Column(name = "live_feed_managed", nullable = false)
    private boolean liveFeedManaged = false;

    @Column(name = "seo_content_fingerprint", length = 64)
    private String seoContentFingerprint;

    @Column(name = "seo_content_modified_at")
    private Long seoContentModifiedAt;

    /**
     * Fingerprint of the latest persisted audience-visible score/state
     * snapshot. This is separate from seoContentFingerprint because live score
     * updates arrive through CricketDataDTO rather than the catalogue row.
     */
    @Column(name = "seo_live_content_fingerprint", length = 64)
    private String seoLiveContentFingerprint;

    @Transient
    private String lifecycleCohort;

    @Column(name = "venue")
    private String venue;
    
    @Column(name="isDistributionDone")
    private Boolean distributionDone=false;

	public Boolean isDistributionDone() {
		 return Boolean.TRUE.equals(distributionDone);
	}

	public void setDistributionDone(Boolean distributionDone) {
		this.distributionDone = distributionDone;
	}

	public boolean isDeleted() {
		return isDeleted;
	}

	public void setDeleted(boolean isDeleted) {
		this.isDeleted = isDeleted;
	}

	public String getLastKnownState() {
		return lastKnownState;
	}

	public void setLastKnownState(String lastKnownState) {
		this.lastKnownState = lastKnownState;
	}

	public int getDeletionAttempts() {
		return deletionAttempts;
	}

	public void setDeletionAttempts(int deletionAttempts) {
		this.deletionAttempts = deletionAttempts;
	}

	public LiveMatch() {
        this.lastStateUpdatedAt = System.currentTimeMillis();
	}

	public LiveMatch(String url) {
		this.url = url;
        this.lastStateUpdatedAt = System.currentTimeMillis();
	}

    /**
     * Sitemap freshness is a record of an audience-visible match change, not
     * a scraper heartbeat. The stored fingerprint lets updates such as retry
     * counters or poll timestamps leave lastmod unchanged.
     */
    @PrePersist
    @PreUpdate
    private void updateSeoContentFreshness() {
        String nextFingerprint = semanticContentFingerprint();
        if (seoContentFingerprint == null || !seoContentFingerprint.equals(nextFingerprint)) {
            seoContentModifiedAt = System.currentTimeMillis();
            seoContentFingerprint = nextFingerprint;
        }
    }

    private String semanticContentFingerprint() {
        String source = String.join("|",
                safe(url), safe(externalMatchKey), safe(status == null ? null : status.name()),
                Boolean.toString(isDeleted), safe(lastKnownState), safe(resultSummary),
                safe(scheduledStartTime), safe(team1Name), safe(team2Name), safe(seriesName),
                safe(matchFormat), safe(venue));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte value : digest) hex.append(String.format("%02x", value));
            return hex.toString();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }

    private String safe(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

    public String getExternalMatchKey() {
        return externalMatchKey;
    }

    public void setExternalMatchKey(String externalMatchKey) {
        this.externalMatchKey = externalMatchKey;
    }

	public boolean isFinished() {
		return isDeleted() || (status != null && status.isTerminal());
	}

    public MatchLifecycleStatus getStatus() {
        return status;
    }

    public void setStatus(MatchLifecycleStatus status) {
        this.status = status;
    }

    public Long getScheduledStartTime() {
        return scheduledStartTime;
    }

    public void setScheduledStartTime(Long scheduledStartTime) {
        this.scheduledStartTime = scheduledStartTime;
    }

    public String getTeam1Name() {
        return team1Name;
    }

    public void setTeam1Name(String team1Name) {
        this.team1Name = team1Name;
    }

    public String getTeam2Name() {
        return team2Name;
    }

    public void setTeam2Name(String team2Name) {
        this.team2Name = team2Name;
    }

    public String getSeriesName() {
        return seriesName;
    }

    public void setSeriesName(String seriesName) {
        this.seriesName = seriesName;
    }

    public String getMatchFormat() {
        return matchFormat;
    }

    public void setMatchFormat(String matchFormat) {
        this.matchFormat = matchFormat;
    }

    public String getResultSummary() {
        return resultSummary;
    }

    public void setResultSummary(String resultSummary) {
        this.resultSummary = resultSummary;
    }

	public Long getLastStateUpdatedAt() {
		return lastStateUpdatedAt;
	}

	public void setLastStateUpdatedAt(Long lastStateUpdatedAt) {
		this.lastStateUpdatedAt = lastStateUpdatedAt;
	}

    public boolean isLiveFeedManaged() {
        return liveFeedManaged;
    }

    public void setLiveFeedManaged(boolean liveFeedManaged) {
        this.liveFeedManaged = liveFeedManaged;
    }

    public String getSeoContentFingerprint() { return seoContentFingerprint; }
    public void setSeoContentFingerprint(String seoContentFingerprint) { this.seoContentFingerprint = seoContentFingerprint; }

    public Long getSeoContentModifiedAt() { return seoContentModifiedAt; }
    public void setSeoContentModifiedAt(Long seoContentModifiedAt) { this.seoContentModifiedAt = seoContentModifiedAt; }

    @JsonIgnore
    public String getSeoLiveContentFingerprint() { return seoLiveContentFingerprint; }
    public void setSeoLiveContentFingerprint(String seoLiveContentFingerprint) {
        this.seoLiveContentFingerprint = seoLiveContentFingerprint;
    }

    public String getLifecycleCohort() { return lifecycleCohort; }
    public void setLifecycleCohort(String lifecycleCohort) { this.lifecycleCohort = lifecycleCohort; }

    public String getVenue() {
        return venue;
    }

    public void setVenue(String venue) {
        this.venue = venue;
    }

	public String getWinningTeam() {
		String winningSource = resultSummary != null && !resultSummary.trim().isEmpty() ? resultSummary : lastKnownState;
		if (winningSource != null && winningSource.contains("won by")) {
            String[] parts = winningSource.split(" won by");
            if (parts.length > 0) {
                return parts[0].trim();
            }
        }
        return null;
	}


}
