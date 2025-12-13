package com.app.controller;

import com.app.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequiredArgsConstructor
public class DebugController {

    private final AiService aiService;

    @GetMapping("/api/debug/ai")
    public Mono<String> debugAi(@RequestParam String text) {
        return aiService.generateResponse(text);
    }
}
