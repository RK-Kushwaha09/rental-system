package com.rentmanager;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rentmanager.dto.AuthRequest;
import com.rentmanager.dto.OtpRequest;
import com.rentmanager.dto.OtpVerifyRequest;
import com.rentmanager.dto.SignupRequest;
import com.rentmanager.model.User;
import com.rentmanager.repository.UserRepository;
import com.rentmanager.security.JwtTokenProvider;
import com.rentmanager.service.OtpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RentManagerApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private OtpService otpService;

    @Autowired
    private ObjectMapper objectMapper;

    private String testMobile;
    private String testPassword;

    @BeforeEach
    void setUp() {
        testMobile = "9" + (System.currentTimeMillis() % 1_000_000_000L);
        testPassword = "SecurePass123!";
    }

    @Test
    @DisplayName("Context Loads & MySQL Connection Verified")
    void contextLoads() {
        assertThat(userRepository).isNotNull();
    }

    @Test
    @DisplayName("TEST 1: Signup with new user -> User saved in MySQL, BCrypt hashed, JWT returned")
    void test1_signupNewUser() throws Exception {
        String uniqueMobile = "9" + (System.currentTimeMillis() % 1_000_000_000L);
        String uniqueEmail = "user_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";

        SignupRequest request = new SignupRequest(
                "Aakash Sharma",
                uniqueMobile,
                uniqueEmail,
                testPassword
        );

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.fullName").value("Aakash Sharma"))
                .andExpect(jsonPath("$.user.mobile").value(uniqueMobile));

        // Verify MySQL persistence
        User saved = userRepository.findByMobile(uniqueMobile).orElse(null);
        assertThat(saved).isNotNull();
        assertThat(saved.getPassword()).isNotEqualTo(testPassword);
        assertThat(passwordEncoder.matches(testPassword, saved.getPassword())).isTrue();
    }

    @Test
    @DisplayName("TEST 2: Login using correct credentials -> HTTP 200, JWT returned")
    void test2_loginSuccess() throws Exception {
        // Create user directly in MySQL
        String mobile = "9" + (System.currentTimeMillis() % 1_000_000_000L);
        User user = new User("owner-" + System.currentTimeMillis(), "Login Tester", mobile,
                "login_" + mobile + "@test.com", passwordEncoder.encode(testPassword), "ROLE_LANDLORD");
        userRepository.save(user);

        AuthRequest request = new AuthRequest(mobile, testPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.mobile").value(mobile));
    }

    @Test
    @DisplayName("TEST 3: Login using wrong password -> HTTP 401, error displayed")
    void test3_loginWrongPassword() throws Exception {
        String mobile = "9" + (System.currentTimeMillis() % 1_000_000_000L);
        User user = new User("owner-" + System.currentTimeMillis(), "Wrong Pwd Tester", mobile,
                "wrongpwd_" + mobile + "@test.com", passwordEncoder.encode(testPassword), "ROLE_LANDLORD");
        userRepository.save(user);

        AuthRequest request = new AuthRequest(mobile, "TotallyWrongPassword!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid mobile/email or password."));
    }

    @Test
    @DisplayName("TEST 4: Login using unknown mobile/email -> HTTP 401, error displayed")
    void test4_loginUnknownUser() throws Exception {
        AuthRequest request = new AuthRequest("9999999999", "RandomPassword123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid mobile/email or password."));
    }

    @Test
    @DisplayName("TEST 7: Call protected API without JWT -> HTTP 401 Unauthorized")
    void test7_protectedApiWithoutJwt() throws Exception {
        mockMvc.perform(get("/api/properties/dashboard-stats"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Unauthorized: Missing or invalid JWT token"));
    }

    @Test
    @DisplayName("TEST 8: Call protected API with valid JWT -> HTTP 200 OK")
    void test8_protectedApiWithValidJwt() throws Exception {
        String mobile = "9" + (System.currentTimeMillis() % 1_000_000_000L);
        User user = new User("owner-" + System.currentTimeMillis(), "Valid JWT Tester", mobile,
                "validjwt_" + mobile + "@test.com", passwordEncoder.encode(testPassword), "ROLE_LANDLORD");
        userRepository.save(user);

        String token = tokenProvider.generateToken(user.getMobile());

        mockMvc.perform(get("/api/properties/dashboard-stats")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.propertyName").isNotEmpty());
    }

    @Test
    @DisplayName("TEST 9: OTP verification with incorrect OTP -> HTTP 401, verification fails")
    void test9_otpIncorrectFails() throws Exception {
        String mobile = "9" + (System.currentTimeMillis() % 1_000_000_000L);
        User user = new User("owner-" + System.currentTimeMillis(), "OTP Tester", mobile,
                "otp_" + mobile + "@test.com", passwordEncoder.encode(testPassword), "ROLE_LANDLORD");
        userRepository.save(user);

        // Generate OTP
        otpService.generateOtp(mobile);

        OtpVerifyRequest verifyReq = new OtpVerifyRequest(mobile, "000000"); // Wrong OTP

        mockMvc.perform(post("/api/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid OTP entered. Please try again."));
    }

    @Test
    @DisplayName("TEST 10: OTP verification with expired OTP -> HTTP 401, verification fails")
    void test10_otpExpiredFails() throws Exception {
        String mobile = "9" + (System.currentTimeMillis() % 1_000_000_000L);
        User user = new User("owner-" + System.currentTimeMillis(), "OTP Expire Tester", mobile,
                "otpexp_" + mobile + "@test.com", passwordEncoder.encode(testPassword), "ROLE_LANDLORD");
        userRepository.save(user);

        // Set expired OTP
        otpService.setOtpForTesting(mobile, "654321", Instant.now().minusSeconds(10));

        OtpVerifyRequest verifyReq = new OtpVerifyRequest(mobile, "654321");

        mockMvc.perform(post("/api/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("OTP has expired. Please request a new OTP."));
    }
}
