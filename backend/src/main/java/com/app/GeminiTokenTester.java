package com.app;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.AccessToken;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Scanner;

public class GeminiTokenTester {

    private static final List<String> SCOPES = List.of(
            "https://www.googleapis.com/auth/generative-language",
            "https://www.googleapis.com/auth/cloud-platform"
    );

    public static void main(String[] args) {
        System.out.println("=== Gemini Token Tester ===");
        try {
            // 1. Get Token
            System.out.println("Acquiring GoogleCredentials...");
            GoogleCredentials credentials = GoogleCredentials.getApplicationDefault().createScoped(SCOPES);
            credentials.refreshIfExpired();
            AccessToken token = credentials.getAccessToken();
            
            String tokenValue = token.getTokenValue();
            System.out.println("Access Token acquired (length: " + tokenValue.length() + ")");
            System.out.println("Token expires at: " + token.getExpirationTime());

            // 2. Test API Call
            String testUrl = "https://generativelanguage.googleapis.com/v1/models";
            System.out.println("Testing API call to: " + testUrl);
            
            URL url = new URL(testUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + tokenValue);
            conn.setRequestProperty("Content-Type", "application/json");

            int responseCode = conn.getResponseCode();
            System.out.println("Response Code: " + responseCode);

            if (responseCode == 200) {
                try (Scanner scanner = new Scanner(conn.getInputStream())) {
                    String responseBody = scanner.useDelimiter("\\A").next();
                    System.out.println("Response Body (Success):");
                    System.out.println(responseBody);
                    System.out.println("\nSUCCESS: Token is valid and API is accessible.");
                }
            } else {
                try (Scanner scanner = new Scanner(conn.getErrorStream())) {
                    String errorBody = scanner.useDelimiter("\\A").next();
                    System.err.println("Response Body (Error):");
                    System.err.println(errorBody);
                    System.err.println("\nFAILURE: Token rejected or API error.");
                }
            }

        } catch (IOException e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
