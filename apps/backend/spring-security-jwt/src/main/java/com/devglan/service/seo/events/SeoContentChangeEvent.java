package com.devglan.service.seo.events;

import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * Spring application event published whenever crawlable content changes.
 * Consumers (e.g. sitemap generator) can debounce work without callers knowing the details.
 */
public class SeoContentChangeEvent {

    public enum ChangeType {
        MATCH_PUBLISHED,
        MATCH_UPDATED,
        MATCH_COMPLETED,
        MATCH_REMOVED,
        BULK_REFRESH
    }

    private final ChangeType changeType;
    private final String reference;
    private final OffsetDateTime occurredAt;
    private final String source;

    private SeoContentChangeEvent(ChangeType changeType, String reference, String source, OffsetDateTime occurredAt) {
        this.changeType = Objects.requireNonNull(changeType, "changeType");
        this.reference = reference;
        this.source = source;
        this.occurredAt = occurredAt != null ? occurredAt : OffsetDateTime.now();
    }

    public static SeoContentChangeEvent matchPublished(String reference) {
        return new SeoContentChangeEvent(ChangeType.MATCH_PUBLISHED, reference, null, OffsetDateTime.now());
    }

    public static SeoContentChangeEvent matchUpdated(String reference) {
        return new SeoContentChangeEvent(ChangeType.MATCH_UPDATED, reference, null, OffsetDateTime.now());
    }

    public static SeoContentChangeEvent matchCompleted(String reference) {
        return new SeoContentChangeEvent(ChangeType.MATCH_COMPLETED, reference, null, OffsetDateTime.now());
    }

    public static SeoContentChangeEvent matchRemoved(String reference) {
        return new SeoContentChangeEvent(ChangeType.MATCH_REMOVED, reference, null, OffsetDateTime.now());
    }

    public static SeoContentChangeEvent bulkRefresh(String source) {
        return new SeoContentChangeEvent(ChangeType.BULK_REFRESH, null, source, OffsetDateTime.now());
    }

    public ChangeType getChangeType() {
        return changeType;
    }

    public String getReference() {
        return reference;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }

    public String getSource() {
        return source;
    }
}
