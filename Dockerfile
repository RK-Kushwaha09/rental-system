FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY app.jar app.jar
EXPOSE 8080
ENV PORT=8080
ENV DB_URL="jdbc:h2:file:./data/rentmanager_db;DB_CLOSE_DELAY=-1;MODE=MySQL"
ENV DB_USERNAME=sa
ENV DB_PASSWORD=""
ENV GEMINI_MODEL="gemini-3.5-flash-lite"
ENTRYPOINT ["java", "-jar", "app.jar"]
