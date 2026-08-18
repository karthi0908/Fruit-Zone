package com.bala.tracker;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository resetTokenRepository;

    @Mock
    private EmailService emailService;

    private AuthServiceImpl authService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(userRepository, resetTokenRepository, emailService);
    }

    @Test
    @DisplayName("Signup Success: Creates User with BCrypt Hashed Password")
    void testSignup_Success() {
        when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("newuser@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User user = authService.signup("newuser", "StrongPassword123", "8778505747", "RCFruits", "newuser@example.com");

        assertNotNull(user);
        assertEquals("newuser", user.getUsername());
        assertEquals("RCFruits", user.getCompanyName());
        assertEquals("newuser@example.com", user.getEmail());
        assertTrue(passwordEncoder.matches("StrongPassword123", user.getPassword()));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("8778505747", captor.getValue().getMobileNumber());
    }

    @Test
    @DisplayName("Signup Invalid Email Format: Throws IllegalArgumentException")
    void testSignup_InvalidEmail() {
        when(userRepository.existsByUsernameIgnoreCase("badmail")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () ->
            authService.signup("badmail", "StrongPassword123", "8778505747", "RCFruits", "not-an-email")
        );
    }

    @Test
    @DisplayName("Signup Empty Email: Generates Default Email Successfully")
    void testSignup_EmptyEmail() {
        when(userRepository.existsByUsernameIgnoreCase("noemail")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("noemail@rcfruits.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User user = authService.signup("noemail", "StrongPassword123", "8778505747", "RCFruits", "");
        assertNotNull(user);
        assertEquals("noemail@rcfruits.com", user.getEmail());
    }

    @Test
    @DisplayName("Signup Duplicate Email: Throws IllegalStateException")
    void testSignup_DuplicateEmail() {
        when(userRepository.existsByUsernameIgnoreCase("anotheruser")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
            authService.signup("anotheruser", "StrongPassword123", "8778505747", "RCFruits", "taken@example.com")
        );
        assertEquals("This email address is already registered.", ex.getMessage());
    }

    @Test
    @DisplayName("Signup Duplicate Username: Throws IllegalStateException")
    void testSignup_DuplicateUsername() {
        when(userRepository.existsByUsernameIgnoreCase("existing")).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
            authService.signup("existing", "StrongPassword123", "8778505747", "RCFruits", "user@example.com")
        );
        assertEquals("Username already exists.", ex.getMessage());
    }

    @Test
    @DisplayName("Login Success: Returns Session Token & User Info")
    void testLogin_Success() {
        User user = new User("testuser", passwordEncoder.encode("Password123"), "8778505747", "RCFruits", "test@example.com");
        when(userRepository.findByUsernameIgnoreCase("testuser")).thenReturn(Optional.of(user));

        Map<String, Object> result = authService.login("testuser", "Password123");

        assertTrue((Boolean) result.get("success"));
        assertNotNull(result.get("token"));
        assertEquals("testuser", result.get("username"));
        assertEquals("RCFruits", result.get("companyName"));
    }

    @Test
    @DisplayName("Login Wrong Password: Returns Failure")
    void testLogin_WrongPassword() {
        User user = new User("testuser", passwordEncoder.encode("Password123"), "8778505747", "RCFruits", "test@example.com");
        when(userRepository.findByUsernameIgnoreCase("testuser")).thenReturn(Optional.of(user));

        Map<String, Object> result = authService.login("testuser", "WrongPassword");

        assertFalse((Boolean) result.get("success"));
        assertEquals("Invalid username or password.", result.get("message"));
    }

    @Test
    @DisplayName("Request Password Reset Success: Stores Token Hash & Sends Email")
    void testRequestPasswordReset_Success() {
        User user = new User("testuser", "hashed", "8778505747", "RCFruits", "user@example.com");
        when(userRepository.findByUsernameIgnoreCase("testuser")).thenReturn(Optional.of(user));
        when(emailService.isConfigured()).thenReturn(true);
        when(emailService.sendPasswordResetEmail(anyString(), anyString(), anyString())).thenReturn(true);
        when(resetTokenRepository.findByUserAndUsedFalse(user)).thenReturn(Collections.emptyList());

        Map<String, Object> result = authService.requestPasswordReset("testuser");

        assertTrue((Boolean) result.get("success"));
        assertEquals("Password reset link sent to your registered email address.", result.get("message"));
        verify(resetTokenRepository).save(any(PasswordResetToken.class));
    }
}
