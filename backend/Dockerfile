FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
ENV MAVEN_OPTS="-Xmx384m -XX:+UseSerialGC"
RUN mvn clean package -Dmaven.test.skip=true -Dmaven.compiler.fork=false

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["java", "-Xmx350m", "-jar", "app.jar"]
