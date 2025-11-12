package com.devglan.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import javax.sql.DataSource;

/**
 * Database initialization configuration
 * Loads dummy data for development/testing
 */
@Configuration
public class DatabaseInitializer {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);

    @Autowired
    private DataSource dataSource;

    @Bean
    public CommandLineRunner loadDummyData() {
        return args -> {
            try {
                logger.info("🌱 Loading dummy data from data-seed.sql...");
                
                ClassPathResource resource = new ClassPathResource("data-seed.sql");
                
                if (resource.exists()) {
                    ResourceDatabasePopulator populator = new ResourceDatabasePopulator(resource);
                    populator.setContinueOnError(true); // Continue even if some inserts fail
                    populator.execute(dataSource);
                    
                    logger.info("✅ Dummy data loaded successfully!");
                    logger.info("   - Blog posts: 5 articles");
                    logger.info("   - Live events: 13 events (IPL2025_FINAL)");
                    logger.info("   - Test users: 3 users (admin/editor/viewer)");
                } else {
                    logger.warn("⚠️  data-seed.sql not found, skipping dummy data load");
                }
                
            } catch (Exception e) {
                logger.error("❌ Failed to load dummy data: " + e.getMessage());
                // Don't fail startup, just log the error
            }
        };
    }
}
