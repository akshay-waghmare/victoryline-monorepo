# Live Match Lifecycle & Deletion Logic

This document explains how the system manages the lifecycle of live matches, specifically how it detects new matches and marks finished/removed matches as deleted to ensure only currently live matches are shown.

## Overview

The system uses a **Synchronization Pattern** rather than explicit delete commands. The Scraper provides the "Source of Truth" (the current list of live matches), and the Backend reconciles this list with its database state.

## 1. Scraper Responsibility (Discovery)

The Scraper's `LiveMatchDiscoverer` (formerly `crex_main_url.py`) is responsible for:
1.  Periodically (every 60s) navigating to the live matches listing page (`https://crex.com/live-matches`).
2.  Extracting **ALL** currently visible match URLs.
3.  Sending this **complete list** to the Backend via the `POST /add-live-matches` endpoint.

**Key Behavior:**
*   The scraper does *not* decide what to delete.
*   It simply says: "Here is the list of matches that are live right now."

## 2. Backend Responsibility (Reconciliation)

The Backend (`LiveMatchServiceImpl.java`) receives the list of URLs and performs the following logic in `syncLiveMatches(String[] urls)`:

### A. Handling Missing Matches (Deletion Logic)
The backend iterates through all **existing active matches** in the database (where `isDeleted = false`).

For each existing match:
1.  **Check Presence**: Is the match's URL present in the new list provided by the scraper?
2.  **If Present**: The match is still live. Reset any deletion counters (optional, implicit by not incrementing).
3.  **If Absent (Missing)**:
    *   The match might have finished or temporarily disappeared from the source.
    *   **Increment `deletionAttempts` counter**.
    *   **Threshold Check**:
        *   If `deletionAttempts < 2`: Do nothing yet (grace period for temporary glitches).
        *   If `deletionAttempts >= 2`:
            *   **Mark as Deleted**: Set `isDeleted = true`.
            *   **Finalize State**: Fetch the last known data (e.g., current ball) to save the final state.
            *   **Stop Scraping**: Call the scraper's `stop-scrape` endpoint (if applicable) to free resources.
            *   **Notify**: Publish an event (e.g., via WebSocket) that the match is deleted/finished.

### B. Handling New Matches (Creation Logic)
The backend iterates through the **new list** of URLs provided by the scraper.

For each URL in the list:
1.  **Check Existence**: Does this URL already exist in the database?
2.  **If New**:
    *   Create a new `LiveMatch` entity.
    *   Set `isDeleted = false`.
    *   Save to database.
    *   **Notify**: Publish an event that a new match is added.
    *   (The Scraper Service will separately pick this up via the `start-scrape` trigger or periodic checks).

## Summary of Flow

1.  **Scraper**: Finds `[A, B, C]`. Sends `[A, B, C]` to Backend.
2.  **Backend**: DB has `[]`. Adds `A, B, C`.
3.  ... time passes ...
4.  **Scraper**: Finds `[A, C]` (Match B finished). Sends `[A, C]` to Backend.
5.  **Backend**:
    *   Sees `A` is present.
    *   Sees `B` is missing. Increments `B.deletionAttempts` to 1.
    *   Sees `C` is present.
6.  ... time passes ...
7.  **Scraper**: Finds `[A, C]`. Sends `[A, C]` to Backend.
8.  **Backend**:
    *   Sees `B` is missing. Increments `B.deletionAttempts` to 2.
    *   **ACTION**: Marks `B` as `isDeleted = true`.
    *   `B` is no longer returned in `GET /live-matches`.

## Implementation References

*   **Scraper**: `apps/scraper/crex_scraper_python/src/discovery.py` (Method: `_discover_and_sync`)
*   **Backend**: `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/impl/LiveMatchServiceImpl.java` (Method: `syncLiveMatches`)
