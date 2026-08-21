# ---- Stage 1: Build backend ----
FROM eclipse-temurin:25-jdk AS backend-build
WORKDIR /build
COPY zygererp/build.gradle zygererp/settings.gradle ./
COPY zygererp/src ./src
COPY zygererp/gradlew ./gradlew
COPY zygererp/gradle ./gradle
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon -x test

# ---- Stage 2: Build frontend ----
FROM node:22-slim AS frontend-build
WORKDIR /build
COPY zyger-erp-frontend/package.json zyger-erp-frontend/package-lock.json* ./
RUN npm install
COPY zyger-erp-frontend/ .
RUN npm run build

# ---- Stage 3: Runtime ----
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=backend-build /build/build/libs/*.jar app.jar
COPY --from=frontend-build /build/dist /app/static

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"
ENV SERVER_PORT=9090

EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:9090/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
