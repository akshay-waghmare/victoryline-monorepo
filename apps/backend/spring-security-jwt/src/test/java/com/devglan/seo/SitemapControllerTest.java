package com.devglan.seo;

import com.devglan.controller.seo.PublicSitemapController;
import com.devglan.controller.seo.SitemapController;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.SitemapService;
import org.junit.Before;
import org.junit.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;
import java.util.List;

public class SitemapControllerTest {

    private MockMvc mockMvc;

    @Before
    public void setUp() {
        SeoCache cache = new SeoCache();
        LiveMatchesService liveMatchesService = new StubLiveMatchesService();
        SitemapService service = new SitemapService(cache, liveMatchesService);
        SitemapController api = new SitemapController(service);
        PublicSitemapController pub = new PublicSitemapController(service);
        this.mockMvc = MockMvcBuilders.standaloneSetup(api, pub).build();
    }

    @Test
    public void api_sitemap_index_xml() throws Exception {
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/seo/sitemap"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
            .andReturn();

    String xml = result.getResponse().getContentAsString();
        assertThat(xml).contains("<sitemapindex");
        assertThat(xml).contains("https://www.crickzen.com/");
        assertThat(xml).contains("<lastmod>");
    }

    @Test
    public void api_sitemap_partition_xml() throws Exception {
        // Partition 1 has static pages (home, matches, blog) even without database
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/seo/sitemap?part=1"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
            .andReturn();

    String xml = result.getResponse().getContentAsString();
        assertThat(xml).contains("<urlset");
        assertThat(xml).contains("https://www.crickzen.com/");
        assertThat(xml).contains("<lastmod>");
    }

    @Test
    public void public_index_returns_xml() throws Exception {
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
                .andReturn();

    String xml = result.getResponse().getContentAsString();
        assertThat(xml).contains("<sitemapindex");
        assertThat(xml).contains("https://www.crickzen.com/");
        assertThat(xml).contains("<lastmod>");
    }

    @Test
    public void public_partition_returns_xml() throws Exception {
        // Partition 1 has static pages even without database
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/sitemaps/sitemap-matches-0001.xml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
                .andReturn();

    String xml = result.getResponse().getContentAsString();
        assertThat(xml).contains("<urlset");
        assertThat(xml).contains("https://www.crickzen.com/");
        assertThat(xml).contains("<lastmod>");
    }

    @Test
    public void unknown_public_partition_returns_not_found_without_cache() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/sitemaps/sitemap-matches-9999.xml"))
                .andExpect(status().isNotFound());
    }

    @Test
    public void malformed_public_partition_route_returns_not_found_without_cache() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/sitemaps/compatibility-0001.xml"))
                .andExpect(status().isNotFound());
    }

    private static class StubLiveMatchesService extends LiveMatchesService {
        @Override
        public List<LiveMatchEntry> getSitemapMatches() {
            LiveMatchEntry entry = new LiveMatchEntry();
            entry.setUrl("https://crex.com/cricket-live-score/ind-vs-aus-1st-test-2026-match-updates-111A");
            entry.setStatus("LIVE");
            entry.setLastKnownState("India 10/0");
            return Collections.singletonList(entry);
        }
    }
}
