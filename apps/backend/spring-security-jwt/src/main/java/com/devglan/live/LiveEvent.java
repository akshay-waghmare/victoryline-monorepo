package com.devglan.live;

import javax.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "live_event", indexes = {
    @Index(name = "idx_live_event_match_time", columnList = "match_id,created_at")
})
public class LiveEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false, length = 64)
    private String matchId;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "event_type", nullable = false, length = 16)
    private String eventType;

    @Column(name = "over_label", length = 8)
    private String overLabel;

    @Column(name = "innings_label", length = 8)
    private String inningsLabel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMatchId() {
        return matchId;
    }

    public void setMatchId(String matchId) {
        this.matchId = matchId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getOverLabel() {
        return overLabel;
    }

    public void setOverLabel(String overLabel) {
        this.overLabel = overLabel;
    }

    public String getInningsLabel() {
        return inningsLabel;
    }

    public void setInningsLabel(String inningsLabel) {
        this.inningsLabel = inningsLabel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
