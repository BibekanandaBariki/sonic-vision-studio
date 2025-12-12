package com.app.config;

import com.app.controller.AudioStreamHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class WebSocketConfig {

    @Bean
    public HandlerMapping webSocketMapping(AudioStreamHandler audioStreamHandler) {
        System.out.println("Registering WebSocket handler mapping");
        Map<String, Object> map = new HashMap<>();
        map.put("/api/audio/stream", audioStreamHandler);
        System.out.println("Mapped /api/audio/stream to AudioStreamHandler");

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setOrder(10);
        mapping.setUrlMap(map);
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        System.out.println("Creating WebSocketHandlerAdapter");
        return new WebSocketHandlerAdapter();
    }
}