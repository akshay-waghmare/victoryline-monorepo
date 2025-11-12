package com.devglan.controller.seo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/seo/structured-data")
public class StructuredDataController {

    @GetMapping("/{type}/{id}")
    public ResponseEntity<Map<String, Object>> getStructuredData(
            @PathVariable String type,
            @PathVariable String id) {
        
        try {
            Map<String, Object> jsonLd = new HashMap<>();
            
            switch (type.toLowerCase()) {
                case "match":
                    jsonLd = generateMatchStructuredData(id);
                    break;
                case "team":
                    jsonLd = generateTeamStructuredData(id);
                    break;
                case "player":
                    jsonLd = generatePlayerStructuredData(id);
                    break;
                case "breadcrumb":
                    jsonLd = generateBreadcrumbStructuredData(id);
                    break;
                default:
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "Unsupported structured data type");
                    return ResponseEntity.badRequest().body(err);
            }
            
            return ResponseEntity.ok(jsonLd);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to generate structured data");
            err.put("message", e.getMessage());
            err.put("type", type);
            err.put("id", id);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    private Map<String, Object> generateMatchStructuredData(String matchId) {
        Map<String, Object> jsonLd = new HashMap<>();
        
        // Parse match ID (format: tournament-season-teams-format-date)
        String[] parts = matchId.split("-");
        
        jsonLd.put("@context", "https://schema.org");
        jsonLd.put("@type", "SportsEvent");
        jsonLd.put("name", String.format("Cricket Match: %s vs %s", 
            parts.length > 3 ? parts[2] : "Team1",
            parts.length > 3 ? parts[3] : "Team2"));
        jsonLd.put("description", "Live cricket match with ball-by-ball updates");
        jsonLd.put("url", String.format("https://www.crickzen.com/match/%s", matchId));
        
        // Event status
        jsonLd.put("eventStatus", "https://schema.org/EventScheduled");
        
        // Competition/League
        Map<String, Object> league = new HashMap<>();
        league.put("@type", "SportsOrganization");
        league.put("name", parts.length > 0 ? parts[0].toUpperCase() : "Cricket Tournament");
        jsonLd.put("superEvent", league);
        
        // Home Team
        Map<String, Object> homeTeam = new HashMap<>();
        homeTeam.put("@type", "SportsTeam");
        homeTeam.put("name", parts.length > 2 ? parts[2].replace("-", " ") : "Home Team");
        homeTeam.put("url", String.format("https://www.crickzen.com/team/%s", 
            parts.length > 2 ? parts[2] : "home-team"));
        
        // Away Team  
        Map<String, Object> awayTeam = new HashMap<>();
        awayTeam.put("@type", "SportsTeam");
        awayTeam.put("name", parts.length > 3 ? parts[3].replace("-", " ") : "Away Team");
        awayTeam.put("url", String.format("https://www.crickzen.com/team/%s", 
            parts.length > 3 ? parts[3] : "away-team"));
        
        jsonLd.put("homeTeam", homeTeam);
        jsonLd.put("awayTeam", awayTeam);
        
        // Location
        Map<String, Object> location = new HashMap<>();
        location.put("@type", "Place");
        location.put("name", "Cricket Stadium");
        location.put("address", "Stadium Address");
        jsonLd.put("location", location);
        
        // Date
        if (parts.length > 4) {
            jsonLd.put("startDate", parts[4] + "T14:30:00+05:30");
        }
        
        // Sport
        jsonLd.put("sport", "Cricket");
        
        return jsonLd;
    }

    private Map<String, Object> generateTeamStructuredData(String teamId) {
        Map<String, Object> jsonLd = new HashMap<>();
        
        String teamName = teamId.replace("-", " ");
        
        jsonLd.put("@context", "https://schema.org");
        jsonLd.put("@type", "SportsTeam");
        jsonLd.put("name", teamName);
        jsonLd.put("description", String.format("Professional cricket team %s profile with squad and statistics", teamName));
        jsonLd.put("url", String.format("https://www.crickzen.com/team/%s", teamId));
        jsonLd.put("sport", "Cricket");
        
        // Logo (placeholder)
        Map<String, Object> logo = new HashMap<>();
        logo.put("@type", "ImageObject");
        logo.put("url", String.format("https://www.crickzen.com/images/teams/%s-logo.png", teamId));
        logo.put("width", 200);
        logo.put("height", 200);
        jsonLd.put("logo", logo);
        
        return jsonLd;
    }

    private Map<String, Object> generatePlayerStructuredData(String playerId) {
        Map<String, Object> jsonLd = new HashMap<>();
        
        String playerName = playerId.replace("-", " ");
        
        jsonLd.put("@context", "https://schema.org");
        jsonLd.put("@type", "Person");
        jsonLd.put("name", playerName);
        jsonLd.put("description", String.format("Professional cricket player %s profile with career statistics", playerName));
        jsonLd.put("url", String.format("https://www.crickzen.com/player/%s", playerId));
        
        // Job Title
        jsonLd.put("jobTitle", "Cricket Player");
        
        // Sport
        jsonLd.put("sport", "Cricket");
        
        // Image (placeholder)
        Map<String, Object> image = new HashMap<>();
        image.put("@type", "ImageObject");
        image.put("url", String.format("https://www.crickzen.com/images/players/%s.jpg", playerId));
        image.put("width", 400);
        image.put("height", 400);
        jsonLd.put("image", image);
        
        return jsonLd;
    }

    private Map<String, Object> generateBreadcrumbStructuredData(String pathId) {
        Map<String, Object> jsonLd = new HashMap<>();
        
        jsonLd.put("@context", "https://schema.org");
        jsonLd.put("@type", "BreadcrumbList");
        
        // Parse path to generate breadcrumbs
        String[] pathParts = pathId.split("-");
        List<Map<String, Object>> itemList = Arrays.asList(
            createBreadcrumbItem(1, "Home", "https://www.crickzen.com/"),
            createBreadcrumbItem(2, "Matches", "https://www.crickzen.com/matches"),
            createBreadcrumbItem(3, "Current Match", "https://www.crickzen.com/match/" + pathId)
        );
        
        jsonLd.put("itemListElement", itemList);
        
        return jsonLd;
    }
    
    private Map<String, Object> createBreadcrumbItem(int position, String name, String url) {
        Map<String, Object> item = new HashMap<>();
        item.put("@type", "ListItem");
        item.put("position", position);
        
        Map<String, Object> thing = new HashMap<>();
        thing.put("@type", "Thing");
        thing.put("@id", url);
        thing.put("name", name);
        
        item.put("item", thing);
        
        return item;
    }
}