package com.devglan.model;

/** Public discovery lane for one resolved canonical match identity. */
public enum MatchLifecycleCohort {
    LIVE,
    UPCOMING,
    RECENT,
    ARCHIVE;

    public String wireName() {
        return name().toLowerCase();
    }
}
