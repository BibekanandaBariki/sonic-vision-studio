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

    // Endpoint removed: handled by AudioStreamController

}