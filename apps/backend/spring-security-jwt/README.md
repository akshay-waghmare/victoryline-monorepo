# Spring Boot Security Jwt Authentication

This is a sample project to provide example on how to add JWT token authentication in a spring boot application.
The example uses maven as a build tool and also sample script to run on application startup so that anybody can get started by simply running Application.java
 
The cricket branch is related to cricket odds app  project. 

 1. Spring Boot (1.5.8.RELEASE)
 2.  JWT (0.6.0)
 3.  Mysql
 4. Java 1.8
## Similar Post

You may be interested in other spring security articles:

[Spring Boot Security OAUTH2 Example](http://www.devglan.com/spring-security/spring-boot-security-oauth2-example).

[Spring Boot Security Basic Authentication](http://www.devglan.com/spring-security/spring-boot-security-rest-basic-authentication)

[Spring Boot Security Hibernate Login](http://www.devglan.com/spring-security/spring-boot-security-hibernate-login-example)

[Securing Actuator Endpoints with Spring Security](http://www.devglan.com/spring-security/securing-spring-boot-actuator-endpoints-with-spring-security)

## SEO sitemap endpoints (project-specific)

This branch includes project-specific SEO endpoints for robots/sitemap.

- Public endpoints:
	- `/sitemap.xml` (gzipped sitemap index)
	- `/sitemaps/sitemap-matches-0001.xml.gz` (gzipped partition example)
- API endpoint used by tests: `/api/v1/seo/sitemap?part=1` (XML)

Testing with H2:

- Repository-backed tests use an embedded H2 and rely on Hibernate `create-drop` schema.
- If your application properties enable schema/data SQL imports (e.g., `schema.sql`, `import_*.sql`), disable them in tests to avoid conflicts:

	- `spring.datasource.initialization-mode=never`
	- `spring.datasource.schema=` (empty)
	- `spring.datasource.data=` (empty)
	- `spring.jpa.hibernate.ddl-auto=create-drop`
	- `spring.jpa.properties.hibernate.hbm2ddl.import_files=` (empty)

See `src/test/java/com/devglan/seo/SitemapRepositoryBackedTest.java` for a working example.
