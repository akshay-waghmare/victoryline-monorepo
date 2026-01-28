package com.devglan.service.seo;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.searchconsole.v1.SearchConsole;
import com.google.api.services.searchconsole.v1.model.SitemapsListResponse;
import com.google.api.services.searchconsole.v1.model.WmxSitemap;
import com.google.api.services.indexing.v3.Indexing;
import com.google.api.services.indexing.v3.model.PublishUrlNotificationResponse;
import com.google.api.services.indexing.v3.model.UrlNotification;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Google Search Console API Integration Service (Feature 008 - Match Page Title SEO)
 * 
 * T030: Service class for GSC API integration
 * T031: Service account authentication
 * T032: Sitemap submission
 * T033: Error handling with retry strategy
 * NEW: URL Indexing API for requesting indexing of key match pages
 * 
 * @see <a href="https://developers.google.com/webmaster-tools/v1/api_reference_index">GSC API Reference</a>
 * @see <a href="https://developers.google.com/search/apis/indexing-api/v3/quickstart">Indexing API Reference</a>
 */
@Service
public class GoogleSearchConsoleService {
    
    private static final Logger logger = LoggerFactory.getLogger(GoogleSearchConsoleService.class);
    
    private static final String APPLICATION_NAME = "Crickzen-SEO-Bot/1.0";
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final List<String> GSC_SCOPES = Collections.singletonList(
        "https://www.googleapis.com/auth/webmasters"
    );
    private static final List<String> INDEXING_SCOPES = Collections.singletonList(
        "https://www.googleapis.com/auth/indexing"
    );
    
    // Retry configuration (T033)
    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 1000; // 1 second
    private static final double BACKOFF_MULTIPLIER = 2.0;
    
    private final ResourceLoader resourceLoader;
    
    @Value("${gsc.service-account-path:classpath:gsc-service-account.json}")
    private String serviceAccountPath;
    
    @Value("${gsc.site-url:https://www.crickzen.com/}")
    private String siteUrl;
    
    @Value("${gsc.sitemap-url:https://www.crickzen.com/sitemap.xml}")
    private String defaultSitemapUrl;
    
    @Value("${gsc.enabled:false}")
    private boolean gscEnabled;
    
    private SearchConsole searchConsoleClient;
    private Indexing indexingClient;
    private boolean initialized = false;
    private boolean indexingInitialized = false;
    
    public GoogleSearchConsoleService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }
    
    /**
     * Initialize the GSC client with service account credentials (T031)
     */
    @PostConstruct
    public void init() {
        if (!gscEnabled) {
            logger.info("[GSC] Google Search Console integration is DISABLED (gsc.enabled=false)");
            return;
        }
        
        try {
            this.searchConsoleClient = authenticateSearchConsole();
            this.initialized = true;
            logger.info("[GSC] Successfully initialized Google Search Console client for site: {}", siteUrl);
        } catch (Exception e) {
            logger.error("[GSC] Failed to initialize GSC client: {}. Sitemap submission will be disabled.", 
                e.getMessage());
            this.initialized = false;
        }
        
        // Initialize Indexing API separately (requires different scope)
        try {
            this.indexingClient = authenticateIndexingApi();
            this.indexingInitialized = true;
            logger.info("[GSC] Successfully initialized Google Indexing API client");
        } catch (Exception e) {
            logger.warn("[GSC] Failed to initialize Indexing API client: {}. URL indexing requests will be disabled.", 
                e.getMessage());
            this.indexingInitialized = false;
        }
    }
    
    /**
     * Authenticate with Google for Search Console API (T031)
     */
    private SearchConsole authenticateSearchConsole() throws IOException, GeneralSecurityException {
        logger.debug("[GSC] Loading service account credentials from: {}", serviceAccountPath);
        
        Resource resource = resourceLoader.getResource(serviceAccountPath);
        if (!resource.exists()) {
            throw new IOException("Service account key file not found: " + serviceAccountPath);
        }
        
        GoogleCredentials credentials;
        try (InputStream credentialsStream = resource.getInputStream()) {
            credentials = ServiceAccountCredentials.fromStream(credentialsStream)
                .createScoped(GSC_SCOPES);
        }
        
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);
        
        return new SearchConsole.Builder(httpTransport, JSON_FACTORY, requestInitializer)
            .setApplicationName(APPLICATION_NAME)
            .build();
    }
    
    /**
     * Authenticate with Google for Indexing API
     */
    private Indexing authenticateIndexingApi() throws IOException, GeneralSecurityException {
        Resource resource = resourceLoader.getResource(serviceAccountPath);
        if (!resource.exists()) {
            throw new IOException("Service account key file not found: " + serviceAccountPath);
        }
        
        GoogleCredentials credentials;
        try (InputStream credentialsStream = resource.getInputStream()) {
            credentials = ServiceAccountCredentials.fromStream(credentialsStream)
                .createScoped(INDEXING_SCOPES);
        }
        
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);
        
        return new Indexing.Builder(httpTransport, JSON_FACTORY, requestInitializer)
            .setApplicationName(APPLICATION_NAME)
            .build();
    }
    
    /**
     * Submit a sitemap to Google Search Console (T032)
     * Uses exponential backoff retry strategy (T033)
     * 
     * @param sitemapUrl The full URL of the sitemap to submit
     * @return true if submission was successful, false otherwise
     */
    public boolean submitSitemap(String sitemapUrl) {
        if (!initialized) {
            logger.warn("[GSC] Cannot submit sitemap - GSC client not initialized");
            return false;
        }
        
        if (sitemapUrl == null || sitemapUrl.isEmpty()) {
            sitemapUrl = defaultSitemapUrl;
        }
        
        logger.info("[GSC] Submitting sitemap to Google Search Console: {}", sitemapUrl);
        
        int attempt = 0;
        long backoffMs = INITIAL_BACKOFF_MS;
        
        while (attempt < MAX_RETRIES) {
            try {
                // GSC API call to submit sitemap
                searchConsoleClient.sitemaps()
                    .submit(siteUrl, sitemapUrl)
                    .execute();
                
                logger.info("[GSC] Successfully submitted sitemap: {} (attempt {})", sitemapUrl, attempt + 1);
                return true;
                
            } catch (IOException e) {
                attempt++;
                
                if (attempt >= MAX_RETRIES) {
                    logger.error("[GSC] Failed to submit sitemap after {} attempts: {}", MAX_RETRIES, e.getMessage());
                    return false;
                }
                
                // T033: Exponential backoff
                logger.warn("[GSC] Sitemap submission attempt {} failed, retrying in {}ms: {}", 
                    attempt, backoffMs, e.getMessage());
                
                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return false;
                }
                
                backoffMs = (long) (backoffMs * BACKOFF_MULTIPLIER);
            }
        }
        
        return false;
    }
    
    /**
     * Submit the default sitemap URL configured in application properties
     * 
     * @return true if submission was successful, false otherwise
     */
    public boolean submitDefaultSitemap() {
        return submitSitemap(defaultSitemapUrl);
    }
    
    /**
     * List all sitemaps registered for the site
     * 
     * @return List of sitemap information, or empty list on error
     */
    public List<WmxSitemap> listSitemaps() {
        if (!initialized) {
            logger.warn("[GSC] Cannot list sitemaps - GSC client not initialized");
            return Collections.emptyList();
        }
        
        try {
            SitemapsListResponse response = searchConsoleClient.sitemaps()
                .list(siteUrl)
                .execute();
            
            List<WmxSitemap> sitemaps = response.getSitemap();
            logger.info("[GSC] Found {} sitemaps for site: {}", 
                sitemaps != null ? sitemaps.size() : 0, siteUrl);
            
            return sitemaps != null ? sitemaps : Collections.emptyList();
            
        } catch (IOException e) {
            logger.error("[GSC] Failed to list sitemaps: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    /**
     * Check if the GSC service is properly initialized and ready to use
     * 
     * @return true if initialized, false otherwise
     */
    public boolean isInitialized() {
        return initialized;
    }
    
    /**
     * Check if the Indexing API is properly initialized and ready to use
     * 
     * @return true if initialized, false otherwise
     */
    public boolean isIndexingInitialized() {
        return indexingInitialized;
    }
    
    /**
     * Get the configured site URL
     * 
     * @return The site URL for GSC operations
     */
    public String getSiteUrl() {
        return siteUrl;
    }
    
    // ==================== INDEXING API METHODS ====================
    
    /**
     * Request Google to index a specific URL using the Indexing API.
     * This is useful for getting key match pages indexed faster.
     * 
     * Note: The Indexing API has a daily quota (typically 200 requests/day).
     * Use this for important pages only, not for bulk indexing.
     * 
     * @param url The full URL to request indexing for (e.g., https://www.crickzen.com/cric-live/match-slug)
     * @return true if the request was successful, false otherwise
     */
    public boolean requestIndexing(String url) {
        if (!indexingInitialized) {
            logger.warn("[GSC-Indexing] Cannot request indexing - Indexing API client not initialized");
            return false;
        }
        
        if (url == null || url.isEmpty()) {
            logger.warn("[GSC-Indexing] Cannot request indexing - URL is null or empty");
            return false;
        }
        
        logger.info("[GSC-Indexing] Requesting indexing for URL: {}", url);
        
        int attempt = 0;
        long backoffMs = INITIAL_BACKOFF_MS;
        
        while (attempt < MAX_RETRIES) {
            try {
                UrlNotification notification = new UrlNotification()
                    .setUrl(url)
                    .setType("URL_UPDATED");
                
                PublishUrlNotificationResponse response = indexingClient.urlNotifications()
                    .publish(notification)
                    .execute();
                
                String notifyTime = (response != null && response.getUrlNotificationMetadata() != null 
                    && response.getUrlNotificationMetadata().getLatestUpdate() != null)
                    ? response.getUrlNotificationMetadata().getLatestUpdate().getNotifyTime()
                    : "unknown";
                
                logger.info("[GSC-Indexing] Successfully requested indexing for: {} (notifyTime: {})", 
                    url, notifyTime);
                return true;
                
            } catch (IOException e) {
                attempt++;
                
                if (attempt >= MAX_RETRIES) {
                    logger.error("[GSC-Indexing] Failed to request indexing after {} attempts: {}", 
                        MAX_RETRIES, e.getMessage());
                    return false;
                }
                
                logger.warn("[GSC-Indexing] Indexing request attempt {} failed, retrying in {}ms: {}", 
                    attempt, backoffMs, e.getMessage());
                
                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return false;
                }
                
                backoffMs = (long) (backoffMs * BACKOFF_MULTIPLIER);
            }
        }
        
        return false;
    }
    
    /**
     * Request indexing for a match page by its URL slug.
     * Convenience method that constructs the full URL.
     * 
     * @param matchSlug The match URL slug (e.g., "ind-vs-pak-world-cup-2025")
     * @return true if the request was successful, false otherwise
     */
    public boolean requestIndexingForMatch(String matchSlug) {
        if (matchSlug == null || matchSlug.isEmpty()) {
            logger.warn("[GSC-Indexing] Cannot request indexing - match slug is null or empty");
            return false;
        }
        
        String fullUrl = siteUrl + "/cric-live/" + matchSlug;
        return requestIndexing(fullUrl);
    }
    
    /**
     * Request indexing for multiple URLs (with rate limiting).
     * 
     * @param urls List of URLs to request indexing for
     * @return Number of successfully indexed URLs
     */
    public int requestIndexingBatch(List<String> urls) {
        if (!indexingInitialized) {
            logger.warn("[GSC-Indexing] Cannot request batch indexing - Indexing API client not initialized");
            return 0;
        }
        
        if (urls == null || urls.isEmpty()) {
            return 0;
        }
        
        int successCount = 0;
        int failCount = 0;
        
        for (String url : urls) {
            if (requestIndexing(url)) {
                successCount++;
            } else {
                failCount++;
            }
            
            // Rate limit: 1 request per second to avoid quota issues
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        
        logger.info("[GSC-Indexing] Batch indexing complete: {} success, {} failed out of {} total", 
            successCount, failCount, urls.size());
        
        return successCount;
    }
    
    /**
     * Notify Google that a URL has been removed (for cleanup).
     * 
     * @param url The URL that was removed
     * @return true if the notification was successful, false otherwise
     */
    public boolean notifyUrlRemoved(String url) {
        if (!indexingInitialized) {
            logger.warn("[GSC-Indexing] Cannot notify URL removal - Indexing API client not initialized");
            return false;
        }
        
        try {
            UrlNotification notification = new UrlNotification()
                .setUrl(url)
                .setType("URL_DELETED");
            
            indexingClient.urlNotifications()
                .publish(notification)
                .execute();
            
            logger.info("[GSC-Indexing] Successfully notified URL removal: {}", url);
            return true;
            
        } catch (IOException e) {
            logger.error("[GSC-Indexing] Failed to notify URL removal: {}", e.getMessage());
            return false;
        }
    }
}
