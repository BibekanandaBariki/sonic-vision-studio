package com.app.controller;

import com.app.service.AudioProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AudioStreamHandler implements WebSocketHandler {

    private final AudioProcessingService processingService;
    private static final Path LOG_PATH = Path.of(System.getProperty("user.home"), "Documents", "PrepXL_Project", ".cursor", "debug.log");

    private void log(String hypothesisId, String location, String message, int size) {
        try {
            String payload = String.format(
                    "{\"sessionId\":\"debug-session\",\"runId\":\"run-repro3\",\"hypothesisId\":\"%s\",\"location\":\"%s\",\"message\":\"%s\",\"data\":{\"bytes\":%d},\"timestamp\":%d}%n",
                    hypothesisId, location, message, size, System.currentTimeMillis());
            Files.writeString(LOG_PATH, payload, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        System.out.println("AudioStreamHandler.handle() called - WebSocket connection attempt");
        
        // Send a simple acknowledgment when the connection is established
        Mono<Void> ack = session.send(Mono.just(
                new WebSocketMessage(WebSocketMessage.Type.TEXT, 
                        session.bufferFactory().wrap("connected".getBytes()))))
                .doOnSuccess(v -> {
                    System.out.println("Connection ack sent successfully");
                })
                .onErrorResume(err -> {
                    System.out.println("Failed to send connection ack: " + err.getMessage());
                    return Mono.empty();
                });

        // Process incoming audio data
        Mono<Void> audioProcessing = session.receive()
                .doOnNext(msg -> System.out.println("Processing message type: " + msg.getType()))
                .filter(msg -> msg.getType() == WebSocketMessage.Type.BINARY)
                .flatMap(msg -> {
                    // Extract payload and process
                    return Mono.fromCallable(() -> {
                        DataBuffer buffer = msg.getPayload();
                        byte[] bytes = new byte[buffer.readableByteCount()];
                        buffer.read(bytes);
                        // Important: Release buffer to prevent leaks!
                        DataBufferUtils.release(buffer);
                        return bytes;
                    }).flatMap(processingService::handleAudioChunk);
                })
                .doOnError(e -> {
                    System.err.println("AudioProcessing Error: " + e.getMessage());
                    e.printStackTrace();
                })
                .doOnComplete(() -> System.out.println("AudioProcessing Complete (Client likely disconnected)"))
                .doFinally(signalType -> {
                    System.out.println("WebSocket connection closed or cancelled: " + signalType);
                })
                .then();

        // Keep connection open and process both flows
        return ack
                .doOnError(e -> System.err.println("Ack Error: " + e))
                .then(audioProcessing)
                .doOnSubscribe(s -> System.out.println("WebSocket subscribed"))
                .doOnTerminate(() -> System.out.println("WebSocket terminated"));
    }
}