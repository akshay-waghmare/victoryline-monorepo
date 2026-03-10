package com.devglan.model;

public enum MatchLifecycleStatus {
    UPCOMING,
    LIVE,
    INNINGS_BREAK,
    COMPLETED,
    ABANDONED,
    RAIN_DELAY;

    public boolean isLiveLike() {
        return this == LIVE || this == INNINGS_BREAK || this == RAIN_DELAY;
    }

    public boolean isTerminal() {
        return this == COMPLETED || this == ABANDONED;
    }

    public static MatchLifecycleStatus fromString(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }

        String normalized = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        try {
            return MatchLifecycleStatus.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
