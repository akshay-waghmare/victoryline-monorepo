package com.devglan.seo;

import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.SeoConstants;
import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.SitemapService;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Tests for sitemap partitioning logic to ensure proper URL distribution
 * across multiple partition files based on SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION.
 */
public class SitemapPartitionTest {

    private SitemapService service;
    private MatchRepository mockRepo;
    private SeoCache cache;

    @Before
    public void setUp() {
        cache = new SeoCache();
        LiveMatchesService liveMatchesService = new LiveMatchesService();
        service = new SitemapService(cache, liveMatchesService);
        
        // Mock repository for database fallback scenario
        mockRepo = Mockito.mock(MatchRepository.class);
        service.setMatchRepository(mockRepo);
    }

    @Test
    public void index_lists_correct_number_of_partitions_for_large_dataset() {
        // Given: Mock repo returns 250 visible matches (exceeds 100/partition cap)
        List<Matches> largeMatchSet = new ArrayList<>();
        for (int i = 1; i <= 250; i++) {
            Matches m = new Matches();
            m.setMatchId((long) i);
            m.setMatchLink("https://example.com/match-" + i);
            m.setMatchDate(new Date());
            m.setMatchStatus("Completed");
            m.setVisibility(true);
            largeMatchSet.add(m);
        }
        when(mockRepo.findByVisibilityTrue()).thenReturn(largeMatchSet);
        
        // When: Get sitemap index
        String indexXml = service.getSitemapIndexXml();
        
        // Then: Should have 3 partitions (3 static + 250 matches = 253 total, /100 = 3 partitions)
        assertThat(indexXml).contains("<sitemapindex");
        assertThat(indexXml).contains("sitemap-matches-0001.xml");
        assertThat(indexXml).contains("sitemap-matches-0002.xml");
        assertThat(indexXml).contains("sitemap-matches-0003.xml");
    }

    @Test
    public void partition_one_contains_static_pages_and_first_matches() {
        // Given: Mock repo returns 150 matches
        List<Matches> matches = new ArrayList<>();
        for (int i = 1; i <= 150; i++) {
            Matches m = new Matches();
            m.setMatchId((long) i);
            m.setMatchLink("https://example.com/match-" + i);
            m.setMatchDate(new Date());
            m.setMatchStatus("Completed");
            m.setVisibility(true);
            matches.add(m);
        }
        when(mockRepo.findByVisibilityTrue()).thenReturn(matches);
        
        // When: Get partition 1
        String partition1Xml = service.getPartitionXml(1);
        
        // Then: Should contain static pages (home, matches, blog)
        assertThat(partition1Xml).contains("<urlset");
        assertThat(partition1Xml).contains("https://www.crickzen.com/</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/matches</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/blog</loc>");
    }

    @Test
    public void partition_urls_have_canonical_host() {
        // Given: Mock repo returns some matches
        List<Matches> matches = createMatchList(10);
        when(mockRepo.findByVisibilityTrue()).thenReturn(matches);
        
        // When: Get any partition
        String partitionXml = service.getPartitionXml(1);
        
        // Then: All URLs should use canonical host
        assertThat(partitionXml).contains("https://www.crickzen.com/");
        assertThat(partitionXml).doesNotContain("http://localhost");
        assertThat(partitionXml).doesNotContain("http://example.com");
    }

    @Test
    public void partition_urls_have_iso_lastmod() {
        // Given: Mock repo returns matches
        List<Matches> matches = createMatchList(5);
        when(mockRepo.findByVisibilityTrue()).thenReturn(matches);
        
        // When: Get partition
        String partitionXml = service.getPartitionXml(1);
        
        // Then: Should have ISO-formatted lastmod
        assertThat(partitionXml).containsPattern("<lastmod>\\d{4}-\\d{2}-\\d{2}T");
        assertThat(partitionXml).contains("Z</lastmod>"); // UTC indicator
    }

    @Test
    public void empty_partition_returns_valid_xml() {
        // Given: Mock repo returns only 50 matches (less than 2 partitions worth)
        List<Matches> matches = createMatchList(50);
        when(mockRepo.findByVisibilityTrue()).thenReturn(matches);
        
        // When: Request partition 5 (beyond available data)
        String partition5Xml = service.getPartitionXml(5);
        
        // Then: Should return valid empty sitemap
        assertThat(partition5Xml).contains("<urlset");
        assertThat(partition5Xml).contains("</urlset>");
    }

    @Test
    public void partition_respects_max_urls_per_partition_constant() {
        // Given: Mock repo returns exactly 100 + 3 static URLs worth of matches
        List<Matches> matches = createMatchList(100);
        when(mockRepo.findByVisibilityTrue()).thenReturn(matches);
        
        // When: Get partition 1 and count URLs
        String partition1Xml = service.getPartitionXml(1);
        
        // Then: Should have at most SITEMAP_MAX_URLS_PER_PARTITION entries
        int urlCount = countOccurrences(partition1Xml, "<url>");
        assertThat(urlCount).isLessThanOrEqualTo(SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
    }

    // Helper methods
    
    private List<Matches> createMatchList(int count) {
        List<Matches> matches = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            Matches m = new Matches();
            m.setMatchId((long) i);
            m.setMatchLink("https://example.com/cricket/match-" + i + "/live");
            m.setMatchDate(new Date());
            m.setMatchStatus("Live");
            m.setVisibility(true);
            matches.add(m);
        }
        return matches;
    }

    private int countOccurrences(String text, String pattern) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(pattern, index)) != -1) {
            count++;
            index += pattern.length();
        }
        return count;
    }
}
