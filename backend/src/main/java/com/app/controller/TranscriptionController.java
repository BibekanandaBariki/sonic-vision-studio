package com.app.controller;

import com.app.service.SpeechTranscriptionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class TranscriptionController {

    private final SpeechTranscriptionService sttService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping(value = "/api/transcription/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> stream() {
        return sttService.transcriptionFlux()
                .map(result -> {
                    try {
                        String sender = result.sender();
                        String type = "user_partial"; 
                        if (result.isFinal()) {
                            type = "ai".equals(sender) ? "ai_response" : "user_final";
                        }
                        
                        Map<String, Object> json = Map.of(
                            "type", type,
                            "text", result.text()
                        );
                        String jsonStr = objectMapper.writeValueAsString(json);
                        log.info("Sending SSE: {}", jsonStr);
                        return "data:" + jsonStr + "\n\n";
                    } catch (Exception e) {
                        log.error("Serialization error", e);
                        return "data:{\"type\":\"error\",\"text\":\"serialization_error\"}\n\n";
                    }
                })
                .doOnCancel(() -> log.info("SSE client disconnected"));
    }
}