package com.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    
    @org.springframework.beans.factory.annotation.Value("${gemini.api.key}")
    private String apiKey;
    
    private static final String GEMINI_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=";

    public AiService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public Mono<String> generateResponse(String userText) {
        if (userText == null || userText.isBlank()) return Mono.empty();

        log.info("Generating AI response for: {}", userText);

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", userText)
                ))
            )
        );

        return webClient.post()
                .uri(GEMINI_URL_TEMPLATE + apiKey)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        JsonNode root = objectMapper.readTree(responseBody);
                        JsonNode textNode = root.path("candidates").get(0).path("content").path("parts").get(0).path("text");
                        if (textNode.isMissingNode()) {
                            log.warn("Gemini response missing text: {}", responseBody);
                            return "I'm not sure how to respond to that.";
                        }
                        return textNode.asText();
                    } catch (Exception e) {
                        log.error("Failed to parse Gemini response", e);
                        return "Error processing response.";
                    }
                })
                .onErrorResume(e -> {
                    log.error("Gemini API call failed", e);
                    return Mono.just("Service unavailable.");
                });
    }
}
