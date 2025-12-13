package com.app.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

@Service
@RequiredArgsConstructor
public class AudioProcessingService {
    private static final Path LOG_PATH = Path.of(System.getProperty("user.home"), "Documents", "PrepXL_Project", ".cursor", "debug.log");
    private final GeminiTranscriptionService transcriptionService;

    public Mono<Void> handleAudioChunk(byte[] bytes) {
        if (bytes.length == 0) {
            return Mono.empty();
        }
        log("H6", "AudioProcessingService.handleAudioChunk", "Chunk received", bytes.length);
        return transcriptionService.ingest(bytes)
                .doOnSuccess(v -> log("H6", "AudioProcessingService.handleAudioChunk", "Chunk forwarded", bytes.length))
                .doOnError(err -> log("H7", "AudioProcessingService.handleAudioChunk", "Ingest error", bytes.length))
                .then();
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

    public void cleanup() {
        // No-op cleanup for now
    }
}

