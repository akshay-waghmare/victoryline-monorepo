package com.devglan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.service.Contact;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

/**
 * Swagger/OpenAPI Configuration for API Documentation
 * Feature 005: Upcoming Matches Feed
 */
@Configuration
@EnableSwagger2
public class SwaggerConfig {

    @Bean
    public Docket api() {
        return new Docket(DocumentationType.SWAGGER_2)
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.devglan.controller"))
                .paths(PathSelectors.ant("/api/**"))
                .build()
                .apiInfo(apiInfo());
    }

    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("Crickzen API - Upcoming Matches")
                .description("REST API for retrieving and managing upcoming cricket match fixtures.\n\n" +
                        "Feature 005: Upcoming Matches Feed\n\n" +
                        "**Key Endpoints:**\n" +
                        "- `GET /api/v1/matches/upcoming` - List upcoming matches with filters\n" +
                        "- `GET /api/v1/matches/upcoming/{id}` - Get match details\n" +
                        "- `POST /api/v1/matches/upcoming` - Upsert single match (scraper)\n" +
                        "- `POST /api/v1/matches/upcoming/batch` - Bulk upsert (scraper)\n\n" +
                        "**Filtering:**\n" +
                        "- `startDate` / `endDate` - Filter by match start time (ISO 8601)\n" +
                        "- `team` - Filter by team name (partial match)\n" +
                        "- `series` - Filter by series name (partial match)\n\n" +
                        "**Pagination:**\n" +
                        "- `page` - Page number (0-indexed, default: 0)\n" +
                        "- `size` - Page size (1-100, default: 20)")
                .version("1.0.0")
                .contact(new Contact("Crickzen Team", "https://crickzen.com", "support@crickzen.com"))
                .license("Proprietary")
                .build();
    }
}
