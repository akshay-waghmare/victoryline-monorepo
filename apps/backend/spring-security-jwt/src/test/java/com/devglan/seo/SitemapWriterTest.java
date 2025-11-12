package com.devglan.seo;

import com.devglan.service.seo.SitemapWriter;
import org.junit.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

public class SitemapWriterTest {

    @Test
    public void buildIndexCanonicalizesRelativePaths() {
        SitemapWriter writer = new SitemapWriter();
        String xml = writer.buildIndex(Arrays.asList(
                "/sitemaps/a.xml",
                "sitemaps/b.xml",
                "https://cdn.example.com/seed.xml"
        ));

        assertThat(xml).contains("<loc>https://www.crickzen.com/sitemaps/a.xml</loc>");
        assertThat(xml).contains("<loc>https://www.crickzen.com/sitemaps/b.xml</loc>");
        assertThat(xml).contains("<loc>https://cdn.example.com/seed.xml</loc>");
        assertThat(xml).containsPattern("<lastmod>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z</lastmod>");
    }
}
