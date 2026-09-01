package com.devglan.service.seo.events;

import java.util.Collections;
import java.util.ArrayList;
import java.util.List;

/**
 * Published after a complete sitemap manifest has been atomically installed.
 * Consumers can debounce external submission until the priority child remains
 * stable for a short period.
 */
public final class SitemapManifestChangedEvent {
    private final long generationId;
    private final long generatedAtEpochMs;
    private final boolean prioritySitemapChanged;
    private final List<String> priorityMatchUrls;

    public SitemapManifestChangedEvent(long generationId, long generatedAtEpochMs,
                                       boolean prioritySitemapChanged,
                                       List<String> priorityMatchUrls) {
        this.generationId = generationId;
        this.generatedAtEpochMs = generatedAtEpochMs;
        this.prioritySitemapChanged = prioritySitemapChanged;
        this.priorityMatchUrls = priorityMatchUrls == null
                ? Collections.<String>emptyList()
                : Collections.unmodifiableList(new ArrayList<>(priorityMatchUrls));
    }

    public long getGenerationId() {
        return generationId;
    }

    public long getGeneratedAtEpochMs() {
        return generatedAtEpochMs;
    }

    public boolean isPrioritySitemapChanged() {
        return prioritySitemapChanged;
    }

    public List<String> getPriorityMatchUrls() {
        return priorityMatchUrls;
    }
}
