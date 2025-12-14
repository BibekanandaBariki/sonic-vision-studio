package com.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.codec.json.Jackson2JsonDecoder;
import org.springframework.http.codec.json.Jackson2JsonEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    
    @Value("${gemini.api.key}")
    private String apiKey;
    
    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
    private static final String GEMINI_MODEL = "gemini-flash-latest";

    public AiService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        
        // Configure WebClient with proper codecs and settings
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> {
                    configurer.defaultCodecs().jackson2JsonEncoder(new Jackson2JsonEncoder(objectMapper, MediaType.APPLICATION_JSON));
                    configurer.defaultCodecs().jackson2JsonDecoder(new Jackson2JsonDecoder(objectMapper, MediaType.APPLICATION_JSON));
                    configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024); // 16MB buffer
                })
                .build();
        
        this.webClient = WebClient.builder()
                .baseUrl(GEMINI_BASE_URL)
                .exchangeStrategies(strategies)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public Mono<String> generateResponse(String userText) {
        if (userText == null || userText.isBlank()) {
            log.warn("Empty user text provided to generateResponse");
            return Mono.empty();
        }

        String cleanKey = (apiKey != null) ? apiKey.trim() : "";
        if (cleanKey.isEmpty()) {
            log.error("Gemini API key is missing or empty");
            return Mono.just("API key not configured.");
        }

        log.info("Generating AI response for: '{}' (Key length: {})", userText, cleanKey.length());

        // Build request body according to Gemini API spec
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", userText)
                ))
            )
        );

        String uri = String.format("/v1beta/models/%s:generateContent?key=%s", GEMINI_MODEL, cleanKey);

        return webClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .doOnNext(response -> log.debug("Raw Gemini response: {}", response))
                .map(responseBody -> {
                    try {
                        JsonNode root = objectMapper.readTree(responseBody);
                        
                        // Navigate the response structure
                        if (!root.has("candidates") || root.get("candidates").isEmpty()) {
                            log.warn("No candidates in Gemini response: {}", responseBody);
                            return "I couldn't generate a response.";
                        }
                        
                        JsonNode textNode = root.path("candidates")
                                .get(0)
                                .path("content")
                                .path("parts")
                                .get(0)
                                .path("text");
                        
                        if (textNode.isMissingNode() || textNode.isNull()) {
                            log.warn("Gemini response missing text field: {}", responseBody);
                            return "I'm not sure how to respond to that.";
                        }
                        
                        String aiResponse = textNode.asText();
                        log.info("Successfully extracted AI response: '{}'", aiResponse);
                        return aiResponse;
                        
                    } catch (Exception e) {
                        log.error("Failed to parse Gemini response: {}", responseBody, e);
                        return "Error processing AI response.";
                    }
                })
                // Retry logic with exponential backoff for 503 errors
                .retryWhen(reactor.util.retry.Retry.backoff(3, java.time.Duration.ofSeconds(1))
                    .maxBackoff(java.time.Duration.ofSeconds(4))
                    .filter(throwable -> {
                        if (throwable instanceof org.springframework.web.reactive.function.client.WebClientResponseException) {
                            org.springframework.web.reactive.function.client.WebClientResponseException webEx = 
                                (org.springframework.web.reactive.function.client.WebClientResponseException) throwable;
                            boolean is503 = webEx.getStatusCode().value() == 503;
                            if (is503) {
                                log.warn("Gemini API returned 503 (Service Unavailable), retrying...");
                            }
                            return is503;
                        }
                        return false;
                    })
                    .doBeforeRetry(retrySignal -> 
                        log.info("Retry attempt {} for Gemini API", retrySignal.totalRetries() + 1))
                )
                .onErrorResume(e -> {
                    log.error("Gemini API call failed after retries: {} - {}", e.getClass().getSimpleName(), e.getMessage());
                    
                    if (e instanceof org.springframework.web.reactive.function.client.WebClientResponseException) {
                        org.springframework.web.reactive.function.client.WebClientResponseException webEx = 
                            (org.springframework.web.reactive.function.client.WebClientResponseException) e;
                        log.error("HTTP Status: {}, Response Body: {}", 
                            webEx.getStatusCode(), webEx.getResponseBodyAsString());
                        
                        if (webEx.getStatusCode().value() == 503) {
                            return Mono.just("AI is temporarily busy. Please try again.");
                        }
                    }
                    
                    return Mono.just("Service temporarily unavailable.");
                })
                .doOnError(e -> log.error("Unexpected error in generateResponse", e));
    }
}
