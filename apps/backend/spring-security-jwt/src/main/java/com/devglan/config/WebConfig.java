package com.devglan.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Public sitemap endpoints
        registry.addMapping("/sitemap.xml")
                .allowedOrigins("*")
                .allowedMethods("GET");

        registry.addMapping("/sitemaps/**")
                .allowedOrigins("*")
                .allowedMethods("GET");

        // Internal SEO API endpoints for tooling and UI integration
        registry.addMapping("/api/v1/seo/**")
                .allowedOrigins(
                        "https://www.crickzen.com",
                        "http://localhost:4200",
                        "http://localhost:8080",
                        "http://localhost:4000"
                )
                .allowedMethods("GET");
    }
}
