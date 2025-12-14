package com.app.controller;

import com.app.service.SpeechTranscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
@Slf4j
public class AudioStreamHandler implements WebSocketHandler {

    private final SpeechTranscriptionService sttService;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // Send a simple acknowledgment
        Mono<Void> ack = session.send(Mono.just(
                new WebSocketMessage(WebSocketMessage.Type.TEXT, 
                        session.bufferFactory().wrap("connected".getBytes()))))
                .onErrorResume(err -> {
                    log.error("Failed to send ack", err);
                    return Mono.empty();
                });

        // Process incoming messages
        Mono<Void> processing = session.receive()
                .flatMap(msg -> {
                    if (msg.getType() == WebSocketMessage.Type.BINARY) {
                        // Extract audio data
                        return Mono.fromCallable(() -> {
                            DataBuffer buffer = msg.getPayload();
                            byte[] bytes = new byte[buffer.readableByteCount()];
                            buffer.read(bytes);
                            DataBufferUtils.release(buffer);
                            return bytes;
                        })
                        .doOnNext(bytes -> {
                            // Send to STT Service - it will auto-start if needed
                            sttService.sendAudio(bytes);
                        });
                    } else if (msg.getType() == WebSocketMessage.Type.TEXT) {
                        DataBuffer buffer = msg.getPayload();
                        String text = buffer.toString(java.nio.charset.StandardCharsets.UTF_8);
                        DataBufferUtils.release(buffer);
                        
                        log.debug("Received command: {}", text);
                        
                        if ("ping".equals(text) && !sttService.isStreamInitialized()) {
                           sttService.startStream();
                        } else if ("silence".equals(text)) {
                            // Only close stream if we've received enough audio
                            // This prevents cutting off short utterances like single words
                            if (sttService.hasMinimumAudio()) {
                                log.info("Silence detected - closing STT stream (sufficient audio received)");
                                sttService.stopStream();
                            } else {
                                log.debug("Silence detected but insufficient audio - keeping stream open");
                            }
                        }
                        return Mono.empty();
                    }
                    return Mono.empty();
                })
                .doOnError(e -> log.error("WS Error", e))
                .doOnComplete(() -> {
                    log.info("WS Session ended");
                    sttService.stopStream(); 
                })
                .then();

        return ack.then(processing);
    }
}