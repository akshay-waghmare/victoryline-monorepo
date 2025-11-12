package com.devglan.controller.seo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/seo")
public class SeoMetadataController {

    @GetMapping("/metadata")
    public ResponseEntity<Map<String, Object>> getMetadata(@RequestParam String path) {
        Map<String, Object> metadata = new HashMap<>();
        
        // Debug endpoint to return computed metadata for a given path
        try {
            if (path.contains("/match/")) {
                metadata = generateMatchMetadata(path);
            } else if (path.contains("/team/")) {
                metadata = generateTeamMetadata(path);
            } else if (path.contains("/player/")) {
                metadata = generatePlayerMetadata(path);
            } else {
                metadata = generateDefaultMetadata(path);
            }
            
            metadata.put("path", path);
            metadata.put("timestamp", System.currentTimeMillis());
            metadata.put("generated_at", java.time.Instant.now().toString());
            
            return ResponseEntity.ok(metadata);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to generate metadata");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("path", path);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    private Map<String, Object> generateMatchMetadata(String path) {
        Map<String, Object> metadata = new HashMap<>();
        // Expected format: /match/{tournament}/{season}/{team1-vs-team2}/{format}/{YYYY-MM-DD}
        String[] parts = path.split("/");
        if (parts.length < 7) {
            metadata.put("error", "Path format invalid for match metadata");
            metadata.put("received_parts", parts.length);
            return metadata;
        }
        String tournament = safe(parts, 2);
        String season = safe(parts, 3);
        String teamsRaw = safe(parts, 4);
        String format = safe(parts, 5);
        String date = safe(parts, 6);

        String teamsDisplay = teamsRaw.replace("-vs-", " vs ").replace("-", " ");
        String title = String.format("%s %s | %s %s | Crickzen", format.toUpperCase(), teamsDisplay, tournament.toUpperCase(), season);
        String desc = String.format("Live cricket scores and updates for %s between %s in %s %s. Ball-by-ball commentary, scorecards & analysis.", format.toUpperCase(), teamsDisplay, tournament.toUpperCase(), season);

        metadata.put("title", title);
        metadata.put("description", desc);
        metadata.put("canonical", "https://www.crickzen.com" + path);
        metadata.put("type", "match");
        metadata.put("tournament", tournament);
        metadata.put("season", season);
        metadata.put("teams", teamsRaw.split("-vs-"));
        metadata.put("format", format);
        metadata.put("date", date);
        return metadata;
    }

    private String safe(String[] arr, int idx) { return idx < arr.length ? arr[idx] : ""; }

    private Map<String, Object> generateTeamMetadata(String path) {
        Map<String, Object> metadata = new HashMap<>();
        
        // Extract team details from path
        // Format: /team/{team-name}
        String[] pathParts = path.split("/");
        
        if (pathParts.length >= 3) {
            String teamName = pathParts[2].replace("-", " ");
            
            metadata.put("title", String.format("%s Team Profile | Squad, Stats & Fixtures | Crickzen", 
                teamName));
            metadata.put("description", String.format("Complete %s team profile with current squad, player statistics, match fixtures, and team performance analysis. Follow %s on Crickzen for latest updates.",
                teamName, teamName));
            metadata.put("canonical", "https://www.crickzen.com" + path);
            metadata.put("type", "team");
            metadata.put("team_name", teamName);
        }
        
        return metadata;
    }

    private Map<String, Object> generatePlayerMetadata(String path) {
        Map<String, Object> metadata = new HashMap<>();
        
        // Extract player details from path
        // Format: /player/{player-name}
        String[] pathParts = path.split("/");
        
        if (pathParts.length >= 3) {
            String playerName = pathParts[2].replace("-", " ");
            
            metadata.put("title", String.format("%s Cricket Player Profile | Stats & Career | Crickzen", 
                playerName));
            metadata.put("description", String.format("Complete cricket profile of %s with career statistics, recent performances, and match history. Follow %s's cricket journey on Crickzen.",
                playerName, playerName));
            metadata.put("canonical", "https://www.crickzen.com" + path);
            metadata.put("type", "player");
            metadata.put("player_name", playerName);
        }
        
        return metadata;
    }

    private Map<String, Object> generateDefaultMetadata(String path) {
        Map<String, Object> metadata = new HashMap<>();
        
        metadata.put("title", "Crickzen - Live Cricket Scores & Updates");
        metadata.put("description", "Get live cricket scores, ball-by-ball commentary, match schedules, player statistics and team profiles on Crickzen. Your ultimate destination for cricket updates.");
        metadata.put("canonical", "https://www.crickzen.com" + path);
        metadata.put("type", "page");
        
        return metadata;
    }
}