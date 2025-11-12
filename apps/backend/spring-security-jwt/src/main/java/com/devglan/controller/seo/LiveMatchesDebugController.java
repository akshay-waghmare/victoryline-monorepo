package com.devglan.controller.seo;

import com.devglan.service.seo.LiveMatchesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/seo")
public class LiveMatchesDebugController {
    
    @Autowired
    private LiveMatchesService liveMatchesService;
    
    @GetMapping("/debug/live-matches")
    public ResponseEntity<Map<String, Object>> getDebugInfo() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<LiveMatchesService.LiveMatchEntry> matches = liveMatchesService.getLiveMatches();
            response.put("success", true);
            response.put("count", matches != null ? matches.size() : 0);
            response.put("matches", matches);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("stackTrace", e.getStackTrace());
        }
        
        return ResponseEntity.ok(response);
    }
}
