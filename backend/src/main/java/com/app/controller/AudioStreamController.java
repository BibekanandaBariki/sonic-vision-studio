package com.app.controller;

import com.app.service.SpeechTranscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.Duration;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AudioStreamController {

    private final SpeechTranscriptionService transcriptionService;

    @GetMapping(value = "/transcription/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamTranscription() {
        return transcriptionService.transcriptionFlux()
                .map(result -> {
                    String sender = result.sender();
                    // Map "user" -> "user_partial"/"user_final"
                    // Map "ai" -> "ai_response"
                    String type = "user_partial"; 
                    if (result.isFinal()) {
                        type = "ai".equals(sender) ? "ai_response" : "user_final";
                    }
                    
                    String escaped = result.text().replace("\"", "\\\"").replace("\n", "\\n");
                    String json = "{\"type\":\"" + type + "\",\"text\":\"" + escaped + "\"}";
                    return "data: " + json + "\n\n";
                });
    }
}

