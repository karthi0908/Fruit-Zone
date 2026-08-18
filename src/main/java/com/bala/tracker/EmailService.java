package com.bala.tracker;

public interface EmailService {

    boolean isConfigured();

    boolean sendPasswordResetEmail(String toEmail, String resetUrl, String username);
}
