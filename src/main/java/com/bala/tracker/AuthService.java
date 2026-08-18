package com.bala.tracker;

import java.util.Map;

public interface AuthService {

    User signup(String username, String password, String mobileNumber, String companyName, String email);

    Map<String, Object> login(String username, String password);

    Map<String, Object> validateSession(String token);

    boolean logout(String token);

    Map<String, Object> changePassword(String token, String currentPassword, String newPassword);

    String getCompanyName(String token);

    Map<String, Object> lookupUser(String username);

    Map<String, Object> lookupUserEmail(String username);

    Map<String, Object> requestPasswordReset(String username);

    Map<String, Object> validateResetToken(String token);

    Map<String, Object> resetPasswordWithToken(String token, String newPassword);

    Map<String, Object> resetPasswordForUsername(String username, String newPassword);
}
