package com.devglan.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
    // Serve any pre-generated sitemap partitions from classpath:/public/sitemaps/
    // Note: Controller mapping for /sitemaps/{name}.xml takes precedence when active.
        registry.addResourceHandler("/sitemaps/**")
                .addResourceLocations("classpath:/public/sitemaps/")
                .setCachePeriod(3600) // Cache for 1 hour
                .resourceChain(true);
                
        // Configure static mapping for robots.txt
        registry.addResourceHandler("/robots.txt")
                .addResourceLocations("classpath:/seo/")
                .setCachePeriod(86400); // Cache for 24 hours
                
        // Do NOT statically map /sitemap.xml here; a controller serves it dynamically
        // registry.addResourceHandler("/sitemap.xml")
        //         .addResourceLocations("classpath:/public/sitemaps/")
        //         .setCachePeriod(3600); // Cache for 1 hour
    }
}
