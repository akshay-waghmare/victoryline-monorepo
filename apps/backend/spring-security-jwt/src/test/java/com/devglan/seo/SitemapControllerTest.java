package com.devglan.seo;

import com.devglan.controller.seo.PublicSitemapController;
import com.devglan.controller.seo.SitemapController;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.SitemapService;
import org.junit.Before;
import org.junit.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class SitemapControllerTest {

    private MockMvc mockMvc;

    @Before
    public void setUp() {
        SeoCache cache = new SeoCache();
        SitemapService service = new SitemapService(cache);
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
    MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/seo/sitemap?part=2"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
        .andReturn();

        String xml = result.getResponse().getContentAsString();
        assertThat(xml).contains("<urlset");
        assertThat(xml).contains("https://www.crickzen.com/");
        assertThat(xml).contains("<lastmod>");
    }

    @Test
    public void public_gzipped_index() throws Exception {
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/x-gzip"))
                .andReturn();

        byte[] body = result.getResponse().getContentAsByteArray();
        String xml = ungzip(body);
        assertThat(xml).contains("<sitemapindex");
        assertThat(xml).contains("https://www.crickzen.com/");
        assertThat(xml).contains("<lastmod>");
    }

    @Test
    public void public_gzipped_partition() throws Exception {
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.get("/sitemaps/sitemap-matches-0003.xml.gz"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/x-gzip"))
                .andReturn();

        byte[] body = result.getResponse().getContentAsByteArray();
        String xml = ungzip(body);
        assertThat(xml).contains("<urlset");
        assertThat(xml).contains("https://www.crickzen.com/");
        assertThat(xml).contains("<lastmod>");
    }

    private String ungzip(byte[] gz) throws Exception {
        try (InputStream in = new GZIPInputStream(new ByteArrayInputStream(gz))) {
            byte[] buf = new byte[8192];
            int read;
            StringBuilder sb = new StringBuilder();
            while ((read = in.read(buf)) != -1) {
                sb.append(new String(buf, 0, read, StandardCharsets.UTF_8));
            }
            return sb.toString();
        }
    }
}
