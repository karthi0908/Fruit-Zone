package com.bala.tracker;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class SalesController {

    private final SalesRecordService salesRecordService;
    private final AuthService authService;

    @Autowired
    public SalesController(SalesRecordService salesRecordService, AuthService authService) {
        this.salesRecordService = salesRecordService;
        this.authService = authService;
    }

    @GetMapping({"/test", "/ping"})
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Sales API is up and running!");
    }

    @GetMapping("/all")
    public ResponseEntity<List<SalesRecord>> getAllRecords() {
        return ResponseEntity.ok(salesRecordService.getAllSalesRecords());
    }

    @GetMapping({"", "/date"})
    public ResponseEntity<List<SalesRecord>> getRecordsByDate(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(salesRecordService.getSalesByDate(date));
    }

    @GetMapping("/shop")
    public ResponseEntity<Object> getRecordByDateAndShop(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("shopName") String shopName) {
        Optional<SalesRecord> record = salesRecordService.getSalesByDateAndShop(date, shopName);
        if (record.isPresent()) {
            return ResponseEntity.ok(record.get());
        }
        return ResponseEntity.status(404).body(Map.of(
            "success", false,
            "message", "Sales record for date and shop not found."
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String user = credentials.get("username");
        String pass = credentials.get("password");

        Map<String, Object> response = authService.login(user, pass);
        if (Boolean.TRUE.equals(response.get("success"))) {
            response.put("sessionToken", response.get("token"));
            response.put("status", "SUCCESS");
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(401).body(Map.of(
            "success", false,
            "status", "FAILED",
            "message", "Invalid username or password."
        ));
    }

    @PostMapping("/signup")
    public ResponseEntity<Object> signup(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String companyName = body.get("companyName");
        String email = body.get("email");
        String mobileNumber = body.get("mobileNumber");
        if (mobileNumber == null || mobileNumber.trim().isEmpty()) {
            mobileNumber = body.get("phoneNumber");
        }
        if (mobileNumber == null || mobileNumber.trim().isEmpty()) {
            mobileNumber = body.get("phone");
        }

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.status(400).body(Map.of(
                "success", false,
                "message", "Username and password are required."
            ));
        }

        if (password.trim().length() < 8) {
            return ResponseEntity.status(400).body(Map.of(
                "success", false,
                "message", "Password must contain at least 8 characters."
            ));
        }

        try {
            authService.signup(
                username,
                password,
                mobileNumber != null ? mobileNumber : "8778505747",
                companyName != null ? companyName : "RCFruits",
                email
            );
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User registered successfully."
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/companyName")
    public ResponseEntity<String> getCompanyName(@RequestParam(value = "token", required = false) String token) {
        return ResponseEntity.ok(authService.getCompanyName(token));
    }

    @PostMapping({"/lookupUser", "/lookup-user"})
    public ResponseEntity<Map<String, Object>> lookupUser(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        Map<String, Object> response = authService.lookupUser(username);
        if (Boolean.TRUE.equals(response.get("success"))) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(400).body(response);
    }

    @PostMapping({"/lookupUserEmail", "/lookup-user-email"})
    public ResponseEntity<Map<String, Object>> lookupUserEmail(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        Map<String, Object> response = authService.lookupUserEmail(username);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/resetPasswordDirect", "/reset-password-direct"})
    public ResponseEntity<Map<String, Object>> resetPasswordDirect(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.trim().isEmpty()) {
            newPassword = body.get("password");
        }
        Map<String, Object> response = authService.resetPasswordForUsername(username, newPassword);
        if (Boolean.TRUE.equals(response.get("success"))) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(400).body(response);
    }

    @PostMapping({"/requestPasswordReset", "/request-password-reset"})
    public ResponseEntity<Map<String, Object>> requestPasswordReset(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        Map<String, Object> response = authService.requestPasswordReset(username);
        if (Boolean.TRUE.equals(response.get("success"))) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(400).body(response);
    }

    @GetMapping({"/validateResetToken", "/validate-reset-token"})
    public ResponseEntity<Map<String, Object>> validateResetToken(@RequestParam("token") String token) {
        Map<String, Object> response = authService.validateResetToken(token);
        if (Boolean.TRUE.equals(response.get("valid"))) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(400).body(response);
    }

    @PostMapping({"/resetPassword", "/reset-password"})
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.trim().isEmpty()) {
            token = body.get("resetToken");
        }
        String newPassword = body.get("newPassword");

        Map<String, Object> response = authService.resetPasswordWithToken(token, newPassword);
        if (Boolean.TRUE.equals(response.get("success"))) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(400).body(response);
    }

    @PostMapping("/changePassword")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.trim().isEmpty()) {
            token = body.get("sessionToken");
        }
        String oldPass = body.get("oldPassword");
        if (oldPass == null || oldPass.trim().isEmpty()) {
            oldPass = body.get("currentPassword");
        }
        String newPass = body.get("newPassword");

        Map<String, Object> response = authService.changePassword(token, oldPass, newPass);
        if (Boolean.TRUE.equals(response.get("success"))) {
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(400).body(response);
    }

    @PostMapping("/save")
    public ResponseEntity<SalesRecord> saveRecord(@RequestBody SalesRecord record) {
        SalesRecord saved = salesRecordService.saveSalesRecord(record);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/saveAll")
    public ResponseEntity<List<SalesRecord>> saveAllRecords(@RequestBody List<SalesRecord> records) {
        List<SalesRecord> savedList = salesRecordService.saveAllSalesRecords(records);
        return ResponseEntity.ok(savedList);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Map<String, Object>> deleteRecordById(@PathVariable("id") Long id) {
        boolean deleted = salesRecordService.deleteSalesRecordById(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Sales record deleted successfully."
            ));
        }
        return ResponseEntity.status(404).body(Map.of(
            "success", false,
            "message", "Sales record not found."
        ));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Object> deleteRecord(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("shopName") String shopName) {
        boolean deleted = salesRecordService.deleteSalesRecordByDateAndShop(date, shopName);
        if (deleted) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Sales record deleted successfully."
            ));
        }
        return ResponseEntity.status(404).body(Map.of(
            "success", false,
            "message", "Sales record not found."
        ));
    }

    @GetMapping("/previousBalance")
    public ResponseEntity<Map<String, Object>> getPreviousBalance(
            @RequestParam("shopName") String shopName,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Map<String, Object> result = salesRecordService.getPreviousBalance(shopName, date);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/previousEmptyBalance")
    public ResponseEntity<Map<String, Object>> getPreviousEmptyBalance(
            @RequestParam("shopName") String shopName,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Map<String, Object> result = salesRecordService.getPreviousEmptyBalance(shopName, date);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/session/validate")
    public ResponseEntity<Map<String, Object>> validateSessionEndpoint(@RequestParam("token") String token) {
        Map<String, Object> response = authService.validateSession(token);
        boolean isValid = Boolean.TRUE.equals(response.get("authenticated"));
        return ResponseEntity.ok(Map.of(
            "valid", isValid,
            "authenticated", isValid,
            "username", response.getOrDefault("username", "")
        ));
    }
}
