package com.app.model;

public record TranscriptionResult(String text, boolean isFinal, String sender) {
    public TranscriptionResult(String text, boolean isFinal) {
        this(text, isFinal, "user");
    }
}
