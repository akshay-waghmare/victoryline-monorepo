# Stage 1: Build the application
FROM maven:3.8-openjdk-11 AS build

# Set working directory
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:11-jre-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy the built artifact from build stage
COPY --from=build /app/target/*.war /app/app.war

# Create directory for H2 database (fallback)
RUN mkdir -p /app/data

# Expose application port
EXPOSE 8099

# Expose debug port (optional, can be removed in production)
EXPOSE 5005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8099/actuator/health || exit 1

# Run the application with optional debug support
# Remove debug agent in production
ENTRYPOINT ["java", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-default}", \
    "-jar", "/app/app.war"]

