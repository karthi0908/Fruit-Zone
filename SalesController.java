package com.bala.tracker.controller;

import com.bala.tracker.model.SalesRecord;
import com.bala.tracker.repository.SalesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/sales")
public class SalesController {

    @Autowired
    private SalesRepository salesRepository;

    // ============ SESSION MANAGEMENT ============

    private static class SessionInfo {
        final String username;
        final Instant loginTime;
        Instant lastActive;

        SessionInfo(String username) {
            this.username = username;
            this.loginTime = Instant.now();
            this.lastActive = Instant.now();
        }

        boolean isExpired() {
            // Sessions expire after 24 hours of inactivity
            return Instant.now().isAfter(lastActive.plusSeconds(24 * 60 * 60));
        }

        void touch() {
            this.lastActive = Instant.now();
        }
    }

    private static final ConcurrentHashMap<String, SessionInfo> sessionStore = new ConcurrentHashMap<>();

    // Ping endpoint for UI connection testing
    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }

    // Validate an existing session token
    @GetMapping("/session/validate")
    public ResponseEntity<Map<String, Object>> validateSession(@RequestParam("token") String token) {
        // Clean up expired sessions lazily
        sessionStore.entrySet().removeIf(e -> e.getValue().isExpired());

        SessionInfo session = sessionStore.get(token);
        if (session != null && !session.isExpired()) {
            session.touch();
            return ResponseEntity.ok(Map.of(
                "valid", true,
                "username", session.username
            ));
        }
        // Remove if expired
        if (session != null) {
            sessionStore.remove(token);
        }
        return ResponseEntity.ok(Map.of("valid", false));
    }

    // Logout endpoint — invalidate a session token
    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestBody Map<String, String> body) {
        String token = body.get("sessionToken");
        if (token != null) {
            sessionStore.remove(token);
        }
        return ResponseEntity.ok("LOGGED_OUT");
    }

    // Get all records for a specific date
    @GetMapping
    public List<SalesRecord> getRecordsByDate(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return salesRepository.findByRecordDate(date);
    }

    private static final String CRED_FILE = "./data/credentials.json";
    private static final java.util.Map<String, String> userStore = new java.util.concurrent.ConcurrentHashMap<>();

    static {
        userStore.put("rcfruits", "123456789");
        loadCredentials();
    }

    private static synchronized void loadCredentials() {
        try {
            java.io.File file = new java.io.File(CRED_FILE);
            if (file.exists()) {
                String content = new String(java.nio.file.Files.readAllBytes(file.toPath()));
                content = content.trim();
                if (content.startsWith("{") && content.endsWith("}")) {
                    content = content.substring(1, content.length() - 1);
                    String[] pairs = content.split(",");
                    for (String pair : pairs) {
                        String[] keyValue = pair.split(":");
                        if (keyValue.length == 2) {
                            String k = keyValue[0].trim().replace("\"", "");
                            String v = keyValue[1].trim().replace("\"", "");
                            userStore.put(k, v);
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Fallback to default
        }
    }

    private static synchronized void saveCredentials() {
        try {
            java.io.File dir = new java.io.File("./data");
            if (!dir.exists()) dir.mkdirs();
            java.io.File file = new java.io.File(CRED_FILE);
            StringBuilder sb = new StringBuilder("{");
            int count = 0;
            for (java.util.Map.Entry<String, String> entry : userStore.entrySet()) {
                if (count > 0) sb.append(",");
                sb.append("\"").append(entry.getKey()).append("\":\"").append(entry.getValue()).append("\"");
                count++;
            }
            sb.append("}");
            java.nio.file.Files.write(file.toPath(), sb.toString().getBytes());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Authentication with session token generation
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String user = credentials.get("username");
        String pass = credentials.get("password");
        if (user != null && pass != null && pass.equals(userStore.get(user))) {
            // Generate a unique session token
            String sessionToken = UUID.randomUUID().toString();
            sessionStore.put(sessionToken, new SessionInfo(user));

            // Clean up expired sessions lazily
            sessionStore.entrySet().removeIf(e -> e.getValue().isExpired());

            return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "sessionToken", sessionToken,
                "username", user
            ));
        }
        return ResponseEntity.ok(Map.of("status", "FAILED"));
    }

    private static final String COMPANY_FILE = "./data/company.txt";

    private static synchronized String getSavedCompanyName() {
        try {
            java.io.File file = new java.io.File(COMPANY_FILE);
            if (file.exists()) {
                String content = new String(java.nio.file.Files.readAllBytes(file.toPath())).trim();
                if (!content.isEmpty()) return content;
            }
        } catch (Exception e) {}
        return "RCFruits";
    }

    private static synchronized void saveCompanyNameToFile(String companyName) {
        try {
            java.io.File dir = new java.io.File("./data");
            if (!dir.exists()) dir.mkdirs();
            java.io.File file = new java.io.File(COMPANY_FILE);
            java.nio.file.Files.write(file.toPath(), companyName.getBytes());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Sign up endpoint
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody Map<String, String> body) {
        String user = body.get("username");
        String pass = body.get("password");
        String company = body.get("companyName");

        if (user == null || user.trim().isEmpty() || pass == null || pass.trim().isEmpty()) {
            return ResponseEntity.ok("INVALID_INPUT");
        }

        userStore.put(user.trim(), pass);
        saveCredentials();

        if (company != null && !company.trim().isEmpty()) {
            saveCompanyNameToFile(company.trim());
        }
        return ResponseEntity.ok("SUCCESS");
    }

    // Get Company Name endpoint
    @GetMapping("/companyName")
    public ResponseEntity<String> getCompanyName() {
        return ResponseEntity.ok(getSavedCompanyName());
    }

    // Update Company Name endpoint
    @PostMapping("/companyName")
    public ResponseEntity<String> updateCompanyName(@RequestBody Map<String, String> body) {
        String name = body.get("companyName");
        if (name != null && !name.trim().isEmpty()) {
            saveCompanyNameToFile(name.trim());
            return ResponseEntity.ok("SUCCESS");
        }
        return ResponseEntity.ok("INVALID_INPUT");
    }

    // Change Password endpoint
    @PostMapping("/changePassword")
    public ResponseEntity<String> changePassword(@RequestBody Map<String, String> body) {
        String user = body.get("username");
        String oldPass = body.get("oldPassword");
        String newPass = body.get("newPassword");

        if (user == null || oldPass == null || newPass == null || newPass.trim().isEmpty()) {
            return ResponseEntity.ok("INVALID_INPUT");
        }

        String currentPass = userStore.get(user);
        if (currentPass != null && currentPass.equals(oldPass)) {
            userStore.put(user, newPass);
            saveCredentials();
            return ResponseEntity.ok("SUCCESS");
        }

        return ResponseEntity.ok("INVALID_OLD_PASSWORD");
    }

    // Save a single row (if it exists, it will update instead)
    @PostMapping("/save")
    public SalesRecord saveRecord(@RequestBody SalesRecord record) {
        Optional<SalesRecord> existing = salesRepository.findByRecordDateAndShopName(
                record.getRecordDate(), record.getShopName());
        
        if (existing.isPresent()) {
            SalesRecord toUpdate = existing.get();
            toUpdate.setGovya(record.getGovya());
            toUpdate.setGovyaRate(record.getGovyaRate());
            toUpdate.setGovyaAmount(record.getGovyaAmount());
            toUpdate.setGrapes(record.getGrapes());
            toUpdate.setGrapesRate(record.getGrapesRate());
            toUpdate.setGrapesAmount(record.getGrapesAmount());
            toUpdate.setSapota(record.getSapota());
            toUpdate.setSapotaRate(record.getSapotaRate());
            toUpdate.setSapotaAmount(record.getSapotaAmount());
            toUpdate.setTotalAmount(record.getTotalAmount());
            toUpdate.setGivenAmount(record.getGivenAmount());
            toUpdate.setOldBalance(record.getOldBalance());
            toUpdate.setEmpty(record.getEmpty());
            toUpdate.setEmptyReturn(record.getEmptyReturn());
            toUpdate.setOldEmpty(record.getOldEmpty());
            toUpdate.setBalanceEmpty(record.getBalanceEmpty());
            toUpdate.setBalance(record.getBalance());
            toUpdate.setDynamicData(record.getDynamicData());
            return salesRepository.save(toUpdate);
        } else {
            return salesRepository.save(record);
        }
    }

    // Save multiple records at once
    @PostMapping("/saveAll")
    public List<SalesRecord> saveAllRecords(@RequestBody List<SalesRecord> records) {
        if(records == null || records.isEmpty()) return List.of();
        for (SalesRecord record : records) {
            saveRecord(record);
        }
        return salesRepository.findByRecordDate(records.get(0).getRecordDate());
    }

    // Delete a specific record
    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteRecord(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("shopName") String shopName) {
        Optional<SalesRecord> existing = salesRepository.findByRecordDateAndShopName(date, shopName);
        if (existing.isPresent()) {
            salesRepository.delete(existing.get());
            return ResponseEntity.ok("DELETED");
        }
        return ResponseEntity.ok("NOT_FOUND");
    }

    // Get previous balance statically
    @GetMapping("/previousBalance")
    public ResponseEntity<Integer> getPreviousBalance(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("shopName") String shopName) {
        Optional<SalesRecord> previous = salesRepository.findTopByShopNameIgnoreCaseAndRecordDateLessThanOrderByRecordDateDesc(shopName, date);
        if (previous.isPresent()) {
            return ResponseEntity.ok((int) previous.get().getBalance());
        }
        return ResponseEntity.ok(0);
    }

    // Get previous empty balance statically
    @GetMapping("/previousEmptyBalance")
    public ResponseEntity<Integer> getPreviousEmptyBalance(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("shopName") String shopName) {
        Optional<SalesRecord> previous = salesRepository.findTopByShopNameIgnoreCaseAndRecordDateLessThanOrderByRecordDateDesc(shopName, date);
        if (previous.isPresent()) {
            return ResponseEntity.ok(previous.get().getBalanceEmpty());
        }
        return ResponseEntity.ok(0);
    }
}
