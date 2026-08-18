package com.bala.tracker;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

@Service
public class EmailServiceImpl implements EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Override
    public boolean isConfigured() {
        String username = resolveMailUsername();
        String password = resolveMailPassword();
        return username != null && !username.trim().isEmpty()
            && password != null && !password.trim().isEmpty()
            && mailSender != null;
    }

    @Override
    public boolean sendPasswordResetEmail(String toEmail, String resetUrl, String username) {
        if (!isConfigured()) {
            System.out.println("⚠️ [EMAIL SERVICE] Email is NOT configured.");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(resolveMailUsername());
            helper.setTo(toEmail);
            helper.setSubject("RCFruits - Password Reset Request");

            String htmlContent = buildResetEmailHtml(resetUrl, username);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            return true;

        } catch (MessagingException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private String buildResetEmailHtml(String resetUrl, String username) {
        return "<!DOCTYPE html>"
            + "<html lang='en'><head><meta charset='UTF-8'></head>"
            + "<body style='margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#0f172a;'>"
            + "<div style='max-width:520px;margin:40px auto;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;border:1px solid rgba(255,255,255,0.1);padding:40px 32px;'>"
            + "<div style='text-align:center;margin-bottom:32px;'>"
            + "<h1 style='color:#60a5fa;font-size:28px;margin:0 0 8px 0;'>🍎 RCFruits</h1>"
            + "<p style='color:#94a3b8;font-size:14px;margin:0;'>Password Reset Request</p>"
            + "</div>"
            + "<div style='background:rgba(30,41,59,0.8);border-radius:12px;padding:24px;margin-bottom:24px;'>"
            + "<p style='color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 16px 0;'>Hello <strong style=\"color:#60a5fa;\">" + escapeHtml(username) + "</strong>,</p>"
            + "<p style='color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px 0;'>A password reset was requested for your RCFruits account.</p>"
            + "<p style='color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px 0;'>Click the button below to create a new password:</p>"
            + "<div style='text-align:center;margin:24px 0;'>"
            + "<a href='" + resetUrl + "' style='display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.5px;'>RESET PASSWORD</a>"
            + "</div>"
            + "</div>"
            + "<div style='text-align:center;'>"
            + "<p style='color:#f59e0b;font-size:12px;font-weight:600;margin:0 0 12px 0;'>⏰ This password reset link will expire in 15 minutes.</p>"
            + "<p style='color:#64748b;font-size:12px;line-height:1.5;margin:0;'>If you did not request this password reset, you can safely ignore this email. Your password will not be changed.</p>"
            + "</div>"
            + "</div>"
            + "</body></html>";
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private String resolveMailUsername() {
        if (mailUsername != null && !mailUsername.trim().isEmpty()) {
            return mailUsername.trim();
        }
        return readKeyFromDotEnv("MAIL_USERNAME");
    }

    private String resolveMailPassword() {
        if (mailPassword != null && !mailPassword.trim().isEmpty()) {
            return mailPassword.trim();
        }
        return readKeyFromDotEnv("MAIL_PASSWORD");
    }

    private String readKeyFromDotEnv(String keyName) {
        try {
            Path envPath = Paths.get(System.getProperty("user.dir"), ".env");
            if (!Files.exists(envPath)) return null;

            Properties props = new Properties();
            try (InputStream is = Files.newInputStream(envPath);
                 BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                props.load(reader);
            }

            String value = props.getProperty(keyName);
            if (value != null) value = value.trim();
            return (value != null && !value.isEmpty()) ? value : null;
        } catch (IOException e) {
            return null;
        }
    }
}
