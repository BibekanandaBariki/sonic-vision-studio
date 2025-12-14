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
    
    // Track audio duration to prevent premature closure
    private volatile long streamStartTime = 0;
    private volatile long totalAudioBytes = 0;
    private static final int SAMPLE_RATE = 16000;
    private static final int BYTES_PER_SAMPLE = 2; // 16-bit PCM
    private static final long MIN_AUDIO_DURATION_MS = 400; // Minimum 400ms before allowing silence closure

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
        streamStartTime = System.currentTimeMillis();
        totalAudioBytes = 0;
        
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
                                        // Only generate AI response if transcript meets criteria
                                        if (shouldTriggerAI(text)) {
                                            log.info("Triggering AI for: '{}'", text);
                                            aiService.generateResponse(text)
                                                .subscribe(
                                                    aiResponse -> {
                                                        log.info("AI Response generated: {}", aiResponse);
                                                        transcriptSink.tryEmitNext(new TranscriptionResult(aiResponse, true, "ai"));
                                                    },
                                                    error -> log.error("Failed to generate AI response", error)
                                                );
                                        } else {
                                            log.debug("Skipping AI trigger for: '{}' (filtered out)", text);
                                        }
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
                        "Claude", "Anthropic", "Llama", "Meta",
                        "Google Gemini", "Gemini AI"
                    ))
                    .setBoost(20.0f) // Maximum boost for proper nouns
                    .build();

            // Technical terms - Strong boost
            SpeechContext techContext = SpeechContext.newBuilder()
                    .addAllPhrases(java.util.List.of(
                        "API", "REST", "GraphQL", "WebSocket", "HTTP", "HTTPS",
                        "Java", "Spring Boot", "React", "JavaScript", "Python",
                        "Docker", "Kubernetes", "AWS", "Azure", "GCP",
                        "microservice", "backend", "frontend", "full stack",
                        "Computer Science", "Information Technology"
                    ))
                    .setBoost(15.0f) // Strong boost for technical terms
                    .build();

            // Common phrases and commands - Moderate boost
            SpeechContext commandContext = SpeechContext.newBuilder()
                    .addAllPhrases(java.util.List.of(
                        "tell me", "tell me a joke", "what is", "how do I", "can you",
                        "show me", "explain", "help me", "could you", "please",
                        "my name is", "I am", "hello", "hi there"
                    ))
                    .setBoost(12.0f)
                    .build();

            // Educational and institutional terms
            SpeechContext eduContext = SpeechContext.newBuilder()
                    .addAllPhrases(java.util.List.of(
                        "Centurion University", "Centurion University of Technology and Management",
                        "mock interview", "resume", "ATS", "cover letter",
                        "system design", "data structures", "algorithms",
                        "behavioral question", "technical round", "coding interview"
                    ))
                    .setBoost(10.0f)
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
                    .addSpeechContexts(commandContext)
                    .addSpeechContexts(eduContext)
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
            totalAudioBytes += pcmData.length;
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
    
    /**
     * Check if enough audio has been received to safely close the stream.
     * Prevents premature closure on short utterances like single words.
     */
    public boolean hasMinimumAudio() {
        if (!isStreaming.get()) {
            return true; // If not streaming, allow closure
        }
        
        long durationMs = System.currentTimeMillis() - streamStartTime;
        long audioMs = (totalAudioBytes * 1000L) / (SAMPLE_RATE * BYTES_PER_SAMPLE);
        
        boolean hasEnough = durationMs >= MIN_AUDIO_DURATION_MS || audioMs >= MIN_AUDIO_DURATION_MS;
        
        if (!hasEnough) {
            log.debug("Insufficient audio: {}ms duration, {}ms audio - ignoring silence", durationMs, audioMs);
        }
        
        return hasEnough;
    }
    
    /**
     * Intelligent filtering to determine if AI should be triggered.
     * Prevents unnecessary API calls on fillers, introductions, and meaningless phrases.
     */
    private boolean shouldTriggerAI(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        
        String lowerText = text.toLowerCase().trim();
        
        // Filter 1: Minimum word count (at least 3 words for meaningful interaction)
        String[] words = lowerText.split("\\s+");
        if (words.length < 3) {
            log.debug("Filtered: Too short ({} words)", words.length);
            return false;
        }
        
        // Filter 2: Block common introductions and self-descriptions
        String[] introPatterns = {
            "my name is", "i am", "i'm", "this is", 
            "hello my name", "hi my name", "myself"
        };
        for (String pattern : introPatterns) {
            if (lowerText.startsWith(pattern) || lowerText.contains(" " + pattern + " ")) {
                log.debug("Filtered: Introduction pattern detected");
                return false;
            }
        }
        
        // Filter 3: Block Hindi/Hinglish fillers
        String[] fillers = {"hain", "hai", "jo", "ki", "ka", "ke", "kya", "tha", "the"};
        boolean onlyFillers = true;
        for (String word : words) {
            boolean isFiller = false;
            for (String filler : fillers) {
                if (word.equals(filler)) {
                    isFiller = true;
                    break;
                }
            }
            if (!isFiller && word.length() > 2) { // Non-filler word found
                onlyFillers = false;
                break;
            }
        }
        if (onlyFillers) {
            log.debug("Filtered: Only fillers detected");
            return false;
        }
        
        // Filter 4: Require intent indicators (questions or commands)
        String[] questionWords = {"what", "how", "why", "when", "where", "who", "which", "whose"};
        String[] commandWords = {"tell", "show", "explain", "help", "give", "make", "create", "find", "search"};
        String[] requestWords = {"can you", "could you", "would you", "please", "i need", "i want"};
        
        boolean hasIntent = false;
        
        // Check for question words
        for (String qWord : questionWords) {
            if (lowerText.contains(qWord)) {
                hasIntent = true;
                break;
            }
        }
        
        // Check for command words
        if (!hasIntent) {
            for (String cWord : commandWords) {
                if (lowerText.contains(cWord)) {
                    hasIntent = true;
                    break;
                }
            }
        }
        
        // Check for request phrases
        if (!hasIntent) {
            for (String rWord : requestWords) {
                if (lowerText.contains(rWord)) {
                    hasIntent = true;
                    break;
                }
            }
        }
        
        // Check for question mark (punctuation enabled)
        if (!hasIntent && text.contains("?")) {
            hasIntent = true;
        }
        
        if (!hasIntent) {
            log.debug("Filtered: No question/command intent detected");
            return false;
        }
        
        // Passed all filters
        return true;
    }

    @PreDestroy
    public void cleanup() {
        stopStream();
        if (speechClient != null) {
            speechClient.close();
        }
    }
}