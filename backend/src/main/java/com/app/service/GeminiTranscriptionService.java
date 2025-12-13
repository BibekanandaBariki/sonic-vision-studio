package com.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.springframework.web.reactive.socket.client.WebSocketClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Base64;
import java.util.Map;

@Service
public class GeminiTranscriptionService {
    private static final Path LOG_PATH = Path.of(System.getProperty("user.home"), "Documents", "PrepXL_Project", ".cursor", "debug.log");

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final Sinks.Many<byte[]> audioSink = Sinks.many().multicast().onBackpressureBuffer();
    private final Sinks.Many<String> transcriptionSink = Sinks.many().multicast().onBackpressureBuffer();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        connectToGemini();
    }

    private void connectToGemini() {
        WebSocketClient client = new ReactorNettyWebSocketClient();
        String url = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=" + geminiApiKey;

        client.execute(URI.create(url), session -> {
            log("H9", "GeminiTranscriptionService.connect", "Connected to Gemini WebSocket", 0);

            // 1. Send Setup Message
            Map<String, Object> setupMsg = Map.of("setup", Map.of(
                    "model", "models/gemini-2.0-flash-exp", // or gemini-1.5-flash-latest
                    "generation_config", Map.of("response_modalities", new String[]{"TEXT"})
            ));
            
            Mono<Void> sendSetup = session.send(Mono.fromCallable(() -> {
                String json = objectMapper.writeValueAsString(setupMsg);
                log("H9", "GeminiTranscriptionService.connect", "Sending Setup: " + json, json.length());
                return session.textMessage(json);
            }));

            // 2. Stream Audio
            Mono<Void> sendAudio = session.send(audioSink.asFlux().map(bytes -> {
                try {
                    String base64Audio = Base64.getEncoder().encodeToString(bytes);
                    Map<String, Object> audioMsg = Map.of("realtime_input", Map.of(
                            "media_chunks", new Object[]{
                                    Map.of(
                                            "mime_type", "audio/pcm",
                                            "data", base64Audio
                                    )
                            }
                    ));
                    return session.textMessage(objectMapper.writeValueAsString(audioMsg));
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }));

            // 3. Receive Transcription
            Mono<Void> receive = session.receive()
                    .doOnNext(message -> {
                        try {
                            String payload = message.getPayloadAsText();
                            // log("H10", "GeminiTranscriptionService.receive", "Received: " + payload, payload.length());
                            JsonNode root = objectMapper.readTree(payload);
                            
                            // Parse serverContent -> modelTurn -> parts -> text
                            if (root.has("serverContent") && root.get("serverContent").has("modelTurn")) {
                                JsonNode parts = root.get("serverContent").get("modelTurn").get("parts");
                                if (parts != null && parts.isArray()) {
                                    for (JsonNode part : parts) {
                                        if (part.has("text")) {
                                            String text = part.get("text").asText();
                                            transcriptionSink.tryEmitNext(text);
                                            log("H10", "GeminiTranscriptionService.receive", "Emitted text: " + text, text.length());
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log("H10", "GeminiTranscriptionService.receive", "Error parsing: " + e.getMessage(), 0);
                        }
                    })
                    .then();

            return sendSetup.then(Mono.zip(sendAudio, receive).then());
        }).subscribe(
                null,
                error -> {
                    log("H9", "GeminiTranscriptionService.error", "Gemini WebSocket Error: " + error.getMessage(), 0);
                    // Reconnect logic could go here
                    try { Thread.sleep(3000); } catch (InterruptedException e) {}
                    connectToGemini();
                },
                () -> log("H9", "GeminiTranscriptionService.complete", "Gemini WebSocket Completed", 0)
        );
    }

    public Mono<Void> ingest(byte[] bytes) {
        // log("H7", "GeminiTranscriptionService.ingest", "Forwarding audio size: " + bytes.length, bytes.length);
        if (bytes.length > 0) {
            audioSink.tryEmitNext(bytes);
        }
        return Mono.empty();
    }

    public Flux<String> transcriptionFlux() {
        return transcriptionSink.asFlux();
    }

    private void log(String hypothesisId, String location, String message, int size) {
        try {
            String payload = String.format(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"run-repro3\",\"hypothesisId\":\"%s\",\"location\":\"%s\",\"message\":\"%s\",\"data\":{\"bytes\":%d},\"timestamp\":%d}%n",
                    hypothesisId, location, message, size, System.currentTimeMillis()
            );
            Files.writeString(LOG_PATH, payload, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }
}