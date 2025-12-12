package com.app.controller;

import com.app.service.GeminiTranscriptionService;
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

    private final GeminiTranscriptionService transcriptionService;

    @GetMapping(value = "/transcription/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamTranscription() {
        return transcriptionService.transcriptionFlux()
                .map(transcript -> {
                    String escaped = transcript.replace("\"", "\\\"").replace("\n", "\\n");
                    return "{\"type\":\"partial\",\"text\":\"" + escaped + "\"}";
                });
    }
}

