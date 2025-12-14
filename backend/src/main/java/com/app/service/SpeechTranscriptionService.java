package com.app.service;

import com.app.model.TranscriptionResult;
import com.google.api.gax.rpc.ClientStream;
import com.google.api.gax.rpc.ResponseObserver;
import com.google.api.gax.rpc.StreamController;
import com.google.cloud.speech.v1.*;
import com.google.protobuf.ByteString;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
public class SpeechTranscriptionService {

    private SpeechClient speechClient;
    private volatile ClientStream<StreamingRecognizeRequest> requestStream;
    private final AtomicBoolean isStreaming = new AtomicBoolean(false);

    private AiService aiService;
    private final Sinks.Many<TranscriptionResult> transcriptSink =
            Sinks.many().multicast().onBackpressureBuffer();

    // Debug file output
    private java.io.FileOutputStream debugFos;
    
    // Setter for dependency injection (circular dep avoidance if needed, or just autowire)
    // But better to use constructor injection if possible. 
    // Since we are using @Service usually Spring handles it. 
    // However, for this existing class structure, I will add it via setter or field injection if required.
    // Actually, I'll update the constructor/field via the tool.
    
    public SpeechTranscriptionService(AiService aiService) {
        this.aiService = aiService;
    }

    @PostConstruct
    public void init() {
        try {
            speechClient = SpeechClient.create();
            log.info("SpeechClient created successfully");
        } catch (Exception e) {
            log.error("Failed to create SpeechClient", e);
        }
    }

    public synchronized void startStream() {
        if (isStreaming.get()) {
            return; 
        }

        log.info("Initializing Google STT stream");
        
        try {
             debugFos = new java.io.FileOutputStream("debug_audio.pcm", true); // Append mode
        } catch (Exception e) {
            log.error("Failed to open debug file", e);
        }

        ResponseObserver<StreamingRecognizeResponse> responseObserver =
                new ResponseObserver<>() {
                    @Override
                    public void onStart(StreamController controller) {
                        log.info("Google STT stream connected");
                    }

                    @Override
                    public void onResponse(StreamingRecognizeResponse response) {
                        for (StreamingRecognitionResult result : response.getResultsList()) {
                             // Log every result to see if we get *anything*
                             log.info("Received raw STT result: {}", result);
                            if (result.getAlternativesCount() > 0) {
                                String text = result.getAlternatives(0).getTranscript();
                                boolean isFinal = result.getIsFinal();
                                
                                if (!text.isBlank()) {
                                    log.info("Transcript: {} (isFinal: {})", text, isFinal);
                                    transcriptSink.tryEmitNext(new TranscriptionResult(text, isFinal, "user"));
                                    
                                    if (isFinal) {
                                        // Generate AI response
                                        aiService.generateResponse(text)
                                            .subscribe(
                                                aiResponse -> {
                                                    log.info("AI Response generated: {}", aiResponse);
                                                    transcriptSink.tryEmitNext(new TranscriptionResult(aiResponse, true, "ai"));
                                                },
                                                error -> log.error("Failed to generate AI response", error)
                                            );
                                    }
                                }
                            } else {
                                log.warn("Received STT result with NO alternatives (noise/silence?)");
                            }
                        }
                    }

                    @Override
                    public void onError(Throwable t) {
                        log.error("STT Stream Error: {}", t.getMessage());
                        isStreaming.set(false);
                        requestStream = null;
                    }

                    @Override
                    public void onComplete() {
                        log.info("STT stream completed");
                        isStreaming.set(false);
                        requestStream = null;
                        try { if(debugFos!=null) debugFos.close(); } catch(Exception e){}
                    }
                };

        try {
            if (speechClient == null || speechClient.isShutdown()) {
                speechClient = SpeechClient.create();
            }
            
            requestStream = speechClient.streamingRecognizeCallable().splitCall(responseObserver);

            // Product names and brand terms - Maximum boost
            SpeechContext productContext = SpeechContext.newBuilder()
                    .addAllPhrases(java.util.List.of(
                        "Gemini", "PrepXL", "ChatGPT", "OpenAI", "Google",
                        "Claude", "Anthropic", "Llama", "Meta"
                    ))
                    .setBoost(20.0f) // Maximum boost for proper nouns
                    .build();

            // Technical terms - Strong boost
            SpeechContext techContext = SpeechContext.newBuilder()
                    .addAllPhrases(java.util.List.of(
                        "API", "REST", "GraphQL", "WebSocket", "HTTP", "HTTPS",
                        "Java", "Spring Boot", "React", "JavaScript", "Python",
                        "Docker", "Kubernetes", "AWS", "Azure", "GCP",
                        "microservice", "backend", "frontend", "full stack"
                    ))
                    .setBoost(15.0f) // Strong boost for technical terms
                    .build();

            // Interview and domain terms - Moderate boost
            SpeechContext interviewContext = SpeechContext.newBuilder()
                    .addAllPhrases(java.util.List.of(
                        "mock interview", "resume", "ATS", "cover letter",
                        "system design", "data structures", "algorithms",
                        "behavioral question", "technical round", "coding interview",
                        "tell me a joke", "what is", "how do I", "can you"
                    ))
                    .setBoost(10.0f) // Moderate boost for common phrases
                    .build();

            RecognitionConfig recognitionConfig = RecognitionConfig.newBuilder()
                    .setEncoding(RecognitionConfig.AudioEncoding.LINEAR16)
                    .setSampleRateHertz(16000)  // ✅ FIXED: 16kHz for optimal accuracy (was 48kHz)
                    .setLanguageCode("en-IN")   // ✅ FIXED: Indian English (was en-US)
                    .setModel("latest_long")    // Best for continuous speech
                    .setUseEnhanced(true)       // ✅ ADDED: Enhanced model for 10-15% accuracy boost
                    .setEnableAutomaticPunctuation(true)  // ✅ FIXED: Enable punctuation (was false)
                    .setMaxAlternatives(1)      // Only best result
                    .setAudioChannelCount(1)    // Mono channel
                    .addSpeechContexts(productContext)
                    .addSpeechContexts(techContext)
                    .addSpeechContexts(interviewContext)
                    .build();

            StreamingRecognitionConfig streamingConfig = StreamingRecognitionConfig.newBuilder()
                    .setConfig(recognitionConfig)
                    .setInterimResults(true)
                    .build();

            requestStream.send(StreamingRecognizeRequest.newBuilder()
                    .setStreamingConfig(streamingConfig)
                    .build());

            isStreaming.set(true);
            log.info("Google STT stream initialized and config sent");
            
        } catch (Exception e) {
            log.error("Failed to initialize STT stream", e);
            isStreaming.set(false);
            requestStream = null;
        }
    }

    public synchronized void stopStream() {
        if (!isStreaming.get() || requestStream == null) {
            return;
        }
        try {
            requestStream.closeSend();
            log.info("Google STT stream closeSend called");
        } catch (Exception e) {
            log.error("Error closing STT stream", e);
        } finally {
            isStreaming.set(false);
            requestStream = null;
            try { if(debugFos!=null) debugFos.close(); } catch(Exception e){}
        }
    }

    public void sendAudio(byte[] pcmData) {
        log.info("Received audio chunk: {} bytes", pcmData.length);
        
        try { if(debugFos!=null) debugFos.write(pcmData); } catch(Exception e){}

        if (!isStreaming.get() || requestStream == null) {
            log.warn("Stream not active, attempting to restart...");
            /* startStream(); */ // Don't block here, assume async start
             // Actually, if we just call startStream(), it'll sync start.
             startStream();
            if (!isStreaming.get() || requestStream == null) {
                log.error("Failed to restart stream, dropping audio chunk");
                return;
            }
        }

        try {
            requestStream.send(StreamingRecognizeRequest.newBuilder()
                    .setAudioContent(ByteString.copyFrom(pcmData))
                    .build());
        } catch (Exception e) {
            log.error("Error sending audio chunk", e);
            isStreaming.set(false);
        }
    }

    public Flux<TranscriptionResult> transcriptionFlux() {
        return transcriptSink.asFlux();
    }

    public boolean isStreamInitialized() {
        return isStreaming.get();
    }

    @PreDestroy
    public void cleanup() {
        stopStream();
        if (speechClient != null) {
            speechClient.close();
        }
    }
}