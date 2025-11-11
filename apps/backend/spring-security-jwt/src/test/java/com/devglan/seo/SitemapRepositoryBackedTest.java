package com.devglan.seo;

import com.devglan.controller.seo.PublicSitemapController;
import com.devglan.controller.seo.SitemapController;
import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.SitemapService;
import org.junit.Before;
import org.junit.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.junit.runner.RunWith;
import org.springframework.test.context.junit4.SpringRunner;

import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.Date;
import java.util.TimeZone;
import java.util.zip.GZIPInputStream;
import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration-style test that seeds visible Matches into H2 and ensures sitemap
 * partitions use real match-derived URLs with lastmod from matchDate.
 */
@RunWith(SpringRunner.class)
@DataJpaTest
@TestPropertySource(properties = {
    // Disable Spring SQL init scripts and any Hibernate import files
    "spring.datasource.initialization-mode=never",
    "spring.datasource.schema=",
    "spring.datasource.data=",
    // Use create-drop for isolated schema and disable any import scripts.
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.hbm2ddl.import_files="
})
@Transactional
public class SitemapRepositoryBackedTest {

    @Autowired
    private MatchRepository matchRepository;

    private MockMvc mockMvc;

    @Before
    public void setup() {
        // Seed a few visible matches with different statuses and dates
        seedMatch("TeamA", "TeamB", daysAgo(1), "live", true, "https://ext.example.com/matches/slug-one/live");
        seedMatch("TeamC", "TeamD", daysAgo(3), "upcoming", true, "https://ext.example.com/matches/slug-two/live");
        seedMatch("TeamE", "TeamF", daysAgo(10), "finished", true, "https://ext.example.com/matches/slug-three/scorecard");
        seedMatch("Hidden", "TeamX", daysAgo(2), "live", false, "https://ext.example.com/matches/hidden-slug/live"); // invisible

        SeoCache cache = new SeoCache();
        SitemapService service = new SitemapService(cache);
        // Wire repository manually since we're using standalone MockMvc
        service.setMatchRepository(matchRepository);
        SitemapController api = new SitemapController(service);
        PublicSitemapController pub = new PublicSitemapController(service);
        mockMvc = MockMvcBuilders.standaloneSetup(api, pub).build();
    }

    @Test
    public void partition_contains_real_match_urls_and_lastmod() throws Exception {
        // Request first partition (should include seeded matches)
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/seo/sitemap?part=1"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
            .andReturn();

    String xml = result.getResponse().getContentAsString();
        // Assert derived slug paths present (visibility true only)
        assertThat(xml).contains("/cric-live/slug-one");
        assertThat(xml).contains("/cric-live/slug-two");
        assertThat(xml).contains("/cric-live/slug-three");
        assertThat(xml).doesNotContain("hidden-slug"); // invisible match excluded
        // Basic lastmod presence (ISO date strings)
        assertThat(xml).contains("<lastmod>");
        // Assert changefreq/priority mapping by status
        assertThat(xml).contains("<changefreq>hourly</changefreq>");   // live
        assertThat(xml).contains("<changefreq>daily</changefreq>");    // upcoming
        assertThat(xml).contains("<changefreq>weekly</changefreq>");   // finished
        assertThat(xml).contains("<priority>0.9</priority>");          // live
        assertThat(xml).contains("<priority>0.8</priority>");          // upcoming
        assertThat(xml).contains("<priority>0.5</priority>");          // finished
    }

    @Test
    public void public_gzipped_partition_has_real_urls() throws Exception {
        // Public endpoint mapping chooses a partition name; we request first partition name explicitly
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/sitemaps/sitemap-matches-0001.xml.gz"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/x-gzip"))
            .andReturn();

        String xml = ungzip(result.getResponse().getContentAsByteArray());
        assertThat(xml).contains("/cric-live/slug-one");
        // Sanity on metadata fields too
        assertThat(xml).contains("<lastmod>");
        assertThat(xml).contains("<changefreq>");
        assertThat(xml).contains("<priority>");
    }

    private void seedMatch(String home, String away, Date date, String status, boolean visible, String link) {
        Matches m = new Matches();
        m.setHomeTeamName(home);
        m.setAwayTeamName(away);
        m.setMatchDate(date);
        m.setMatchStatus(status);
        m.setVisibility(visible);
        m.setMatchLink(link);
        matchRepository.save(m);
    }

    private Date daysAgo(int d) {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.add(Calendar.DAY_OF_YEAR, -d);
        return cal.getTime();
    }

    private String ungzip(byte[] gz) throws Exception {
        try (InputStream in = new GZIPInputStream(new ByteArrayInputStream(gz))) {
            byte[] buf = new byte[4096];
            int read;
            StringBuilder sb = new StringBuilder();
            while ((read = in.read(buf)) != -1) {
                sb.append(new String(buf, 0, read, StandardCharsets.UTF_8));
            }
            return sb.toString();
        }
    }
}
