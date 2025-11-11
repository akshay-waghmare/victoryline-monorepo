package com.devglan.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve any pre-generated sitemap partitions from classpath:/public/sitemaps/
        // Note: Controller mapping for /sitemaps/{name}.xml.gz takes precedence when active.
        registry.addResourceHandler("/sitemaps/**")
                .addResourceLocations("classpath:/public/sitemaps/")
                .setCachePeriod(300); // 5 minutes
    }
}
