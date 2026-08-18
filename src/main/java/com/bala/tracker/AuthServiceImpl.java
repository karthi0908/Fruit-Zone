package com.bala.tracker;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    public static class UserSession {
        private final String token;
        private final Long userId;
        private final String username;
        private final Instant createdAt;
        private Instant lastActive;

        public UserSession(String token, Long userId, String username) {
            this.token = token;
            this.userId = userId;
            this.username = username;
            this.createdAt = Instant.now();
            this.lastActive = Instant.now();
        }

        public boolean isExpired() {
            return Instant.now().isAfter(lastActive.plusSeconds(24 * 60 * 60));
        }

        public void touch() {
            this.lastActive = Instant.now();
        }

        public String getToken() {
            return token;
        }

        public Long getUserId() {
            return userId;
        }

        public String getUsername() {
            return username;
        }
    }

    private final ConcurrentHashMap<String, UserSession> sessionStore = new ConcurrentHashMap<>();

    @Autowired
    public AuthServiceImpl(UserRepository userRepository,
                           PasswordResetTokenRepository resetTokenRepository,
                           EmailService emailService) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.emailService = emailService;
    }

    @PostConstruct
    public void initDefaultUser() {
        Optional<User> duplicateEmailUser = userRepository.findByEmailIgnoreCase("karthiashok0908@gmail.com");
        if (duplicateEmailUser.isPresent() && !duplicateEmailUser.get().getUsername().equalsIgnoreCase("rcfruits")) {
            User dup = duplicateEmailUser.get();
            dup.setEmail(dup.getUsername().toLowerCase() + "@rcfruits.com");
            userRepository.save(dup);
        }

        Optional<User> existing = userRepository.findByUsernameIgnoreCase("rcfruits");
        if (existing.isEmpty()) {
            User defaultUser = new User(
                "rcfruits",
                passwordEncoder.encode("123456789"),
                "8778505747",
                "RCFruits",
                "karthiashok0908@gmail.com"
            );
            userRepository.save(defaultUser);
        } else {
            User user = existing.get();
            user.setEmail("karthiashok0908@gmail.com");
            userRepository.save(user);
        }
    }

    @Override
    public User signup(String username, String password, String mobileNumber, String companyName, String email) {
        if (username == null || username.trim().isEmpty() ||
            password == null || password.trim().isEmpty() ||
            companyName == null || companyName.trim().isEmpty()) {
            throw new IllegalArgumentException("All fields are required.");
        }

        String cleanUsername = username.trim();
        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new IllegalStateException("Username already exists.");
        }

        if (password.trim().length() < 8) {
            throw new IllegalArgumentException("Password must contain at least 8 characters.");
        }

        String resolvedMobile = (mobileNumber != null && !mobileNumber.trim().isEmpty())
            ? normalizeMobileNumber(mobileNumber) : "8778505747";

        String cleanEmail;
        if (email != null && !email.trim().isEmpty()) {
            cleanEmail = email.trim().toLowerCase();
            if (!validateEmail(cleanEmail)) {
                throw new IllegalArgumentException("Please enter a valid email address.");
            }
            if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
                throw new IllegalStateException("This email address is already registered.");
            }
        } else {
            cleanEmail = cleanUsername.toLowerCase() + "@rcfruits.com";
            if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
                cleanEmail = cleanUsername.toLowerCase() + "_" + System.currentTimeMillis() + "@rcfruits.com";
            }
        }

        String hashedPassword = passwordEncoder.encode(password.trim());
        String cleanCompany = companyName.trim();

        User newUser = new User(cleanUsername, hashedPassword, resolvedMobile, cleanCompany, cleanEmail);
        return userRepository.save(newUser);
    }

    @Override
    public Map<String, Object> login(String username, String password) {
        Map<String, Object> result = new HashMap<>();

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Username and password are required.");
            return result;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username.trim());
        if (userOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "Invalid username or password.");
            return result;
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            result.put("success", false);
            result.put("message", "Invalid username or password.");
            return result;
        }

        if (!user.isEnabled()) {
            result.put("success", false);
            result.put("message", "Account is disabled. Please contact support.");
            return result;
        }

        String token = generateSecureToken();
        UserSession session = new UserSession(token, user.getId(), user.getUsername());
        sessionStore.put(token, session);

        result.put("success", true);
        result.put("token", token);
        result.put("username", user.getUsername());
        result.put("companyName", user.getCompanyName());
        result.put("message", "Login successful.");
        return result;
    }

    @Override
    public Map<String, Object> validateSession(String token) {
        Map<String, Object> result = new HashMap<>();
        if (token == null || token.trim().isEmpty()) {
            result.put("authenticated", false);
            return result;
        }

        UserSession session = sessionStore.get(token.trim());
        if (session == null || session.isExpired()) {
            if (session != null) {
                sessionStore.remove(token.trim());
            }
            result.put("authenticated", false);
            return result;
        }

        session.touch();
        result.put("authenticated", true);
        result.put("username", session.getUsername());
        return result;
    }

    @Override
    public boolean logout(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        return sessionStore.remove(token.trim()) != null;
    }

    @Override
    public Map<String, Object> changePassword(String token, String currentPassword, String newPassword) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> sessionVal = validateSession(token);
        if (!Boolean.TRUE.equals(sessionVal.get("authenticated"))) {
            result.put("success", false);
            result.put("message", "Session invalid or expired.");
            return result;
        }

        String username = (String) sessionVal.get("username");
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username);
        if (userOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "User not found.");
            return result;
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            result.put("success", false);
            result.put("message", "Incorrect current password.");
            return result;
        }

        if (newPassword == null || newPassword.trim().length() < 8) {
            result.put("success", false);
            result.put("message", "New password must contain at least 8 characters.");
            return result;
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);

        result.put("success", true);
        result.put("message", "Password changed successfully.");
        return result;
    }

    @Override
    public String getCompanyName(String token) {
        Map<String, Object> val = validateSession(token);
        if (!Boolean.TRUE.equals(val.get("authenticated"))) {
            return "RCFruits";
        }
        String username = (String) val.get("username");
        Optional<User> u = userRepository.findByUsernameIgnoreCase(username);
        return u.map(User::getCompanyName).orElse("RCFruits");
    }

    @Override
    public Map<String, Object> lookupUserEmail(String username) {
        Map<String, Object> result = new HashMap<>();
        if (username == null || username.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Username is required.");
            return result;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username.trim());
        if (userOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "Username not found.");
            return result;
        }

        User user = userOpt.get();
        String email = user.getEmail();

        if (email == null || email.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "No registered email address is available for this account. Please contact the administrator or update your account email.");
            return result;
        }

        String maskedEmail = maskEmail(email.trim());
        result.put("success", true);
        result.put("username", user.getUsername());
        result.put("maskedEmail", maskedEmail);
        return result;
    }

    @Override
    public Map<String, Object> lookupUser(String username) {
        Map<String, Object> result = new HashMap<>();
        if (username == null || username.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Username is required.");
            return result;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username.trim());
        if (userOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "Username not found.");
            return result;
        }

        User user = userOpt.get();
        String cleanMobile = normalizeMobileNumber(user.getMobileNumber());
        String last4 = cleanMobile.length() >= 4 ? cleanMobile.substring(cleanMobile.length() - 4) : cleanMobile;
        String maskedPhone = "******" + last4;

        result.put("success", true);
        result.put("username", user.getUsername());
        result.put("maskedPhone", maskedPhone);
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> requestPasswordReset(String username) {
        Map<String, Object> result = new HashMap<>();

        if (username == null || username.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Username is required.");
            return result;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username.trim());
        if (userOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "Username not found.");
            return result;
        }

        User user = userOpt.get();
        String email = user.getEmail();

        if (email == null || email.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "No registered email address is available for this account. Please contact the administrator.");
            return result;
        }

        if (!emailService.isConfigured()) {
            result.put("success", false);
            result.put("message", "Email service is not configured. Configure Gmail SMTP before sending password reset emails.");
            return result;
        }

        List<PasswordResetToken> existingTokens = resetTokenRepository.findByUserAndUsedFalse(user);
        for (PasswordResetToken t : existingTokens) {
            t.setUsed(true);
        }
        resetTokenRepository.saveAll(existingTokens);

        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);
        Instant expiresAt = Instant.now().plusSeconds(15 * 60);

        PasswordResetToken resetTokenEntity = new PasswordResetToken(user, tokenHash, expiresAt);
        resetTokenRepository.save(resetTokenEntity);

        String resetUrl = "http://localhost:8080/reset_password.html?token=" + rawToken;
        boolean sent = emailService.sendPasswordResetEmail(email.trim(), resetUrl, user.getUsername());

        if (!sent) {
            result.put("success", false);
            result.put("message", "Failed to send password reset email. Please try again later or check server logs.");
            return result;
        }

        String maskedEmail = maskEmail(email.trim());
        result.put("success", true);
        result.put("message", "Password reset link sent to your registered email address.");
        result.put("maskedEmail", maskedEmail);
        return result;
    }

    @Override
    public Map<String, Object> validateResetToken(String token) {
        Map<String, Object> result = new HashMap<>();

        if (token == null || token.trim().isEmpty()) {
            result.put("valid", false);
            result.put("message", "This password reset link is invalid.");
            return result;
        }

        String tokenHash = hashToken(token.trim());
        Optional<PasswordResetToken> tokenOpt = resetTokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty()) {
            result.put("valid", false);
            result.put("message", "This password reset link is invalid.");
            return result;
        }

        PasswordResetToken resetToken = tokenOpt.get();

        if (resetToken.isUsed()) {
            result.put("valid", false);
            result.put("message", "This password reset link has already been used.");
            return result;
        }

        if (resetToken.isExpired()) {
            result.put("valid", false);
            result.put("message", "This password reset link has expired. Please request a new one.");
            return result;
        }

        result.put("valid", true);
        result.put("username", resetToken.getUser().getUsername());
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> resetPasswordWithToken(String token, String newPassword) {
        Map<String, Object> result = new HashMap<>();

        if (token == null || token.trim().isEmpty() || newPassword == null || newPassword.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Reset token and new password are required.");
            return result;
        }

        String tokenHash = hashToken(token.trim());
        Optional<PasswordResetToken> tokenOpt = resetTokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "This password reset link is invalid.");
            return result;
        }

        PasswordResetToken resetToken = tokenOpt.get();

        if (resetToken.isUsed()) {
            result.put("success", false);
            result.put("message", "This password reset link has already been used.");
            return result;
        }

        if (resetToken.isExpired()) {
            result.put("success", false);
            result.put("message", "This password reset link has expired. Please request a new one.");
            return result;
        }

        if (newPassword.trim().length() < 8) {
            result.put("success", false);
            result.put("message", "New password must contain at least 8 characters.");
            return result;
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);

        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);

        List<PasswordResetToken> otherTokens = resetTokenRepository.findByUserAndUsedFalse(user);
        for (PasswordResetToken t : otherTokens) {
            t.setUsed(true);
        }
        resetTokenRepository.saveAll(otherTokens);

        invalidateUserSessions(user.getUsername());

        result.put("success", true);
        result.put("message", "Password reset successfully.");
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> resetPasswordForUsername(String username, String newPassword) {
        Map<String, Object> result = new HashMap<>();

        if (username == null || username.trim().isEmpty() || newPassword == null || newPassword.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Username and new password are required.");
            return result;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username.trim());
        if (userOpt.isEmpty()) {
            result.put("success", false);
            result.put("message", "Username not found.");
            return result;
        }

        if (newPassword.trim().length() < 8) {
            result.put("success", false);
            result.put("message", "New password must contain at least 8 characters.");
            return result;
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);

        invalidateUserSessions(user.getUsername());

        result.put("success", true);
        result.put("message", "Password saved successfully.");
        return result;
    }

    private boolean validateEmail(String email) {
        if (email == null || email.isEmpty()) return false;
        return email.matches("^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$");
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "*****";
        int atIdx = email.indexOf('@');
        String local = email.substring(0, atIdx);
        String domain = email.substring(atIdx);
        if (local.isEmpty()) return "*" + domain;
        return local.charAt(0) + "*".repeat(Math.max(1, local.length() - 1)) + domain;
    }

    private String normalizeMobileNumber(String mobile) {
        if (mobile == null) return "";
        return mobile.replaceAll("[^0-9]", "");
    }

    private void invalidateUserSessions(String username) {
        if (username == null) return;
        sessionStore.entrySet().removeIf(e -> username.equalsIgnoreCase(e.getValue().getUsername()));
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return HexFormat.of().formatHex(randomBytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return String.valueOf(rawToken.hashCode());
        }
    }
}
