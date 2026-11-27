package com.rentmanager.service;

import com.rentmanager.dto.*;
import com.rentmanager.model.User;
import com.rentmanager.repository.PropertyRepository;
import com.rentmanager.repository.UserRepository;
import com.rentmanager.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final OtpService otpService;

    public AuthService(UserRepository userRepository, PropertyRepository propertyRepository,
                       PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider,
                       OtpService otpService) {
        this.userRepository = userRepository;
        this.propertyRepository = propertyRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.otpService = otpService;
    }

    public ApiResponse<Object> login(AuthRequest request) {
        if (request == null || request.getIdentifier() == null || request.getIdentifier().trim().isEmpty()) {
            return ApiResponse.error("Mobile number or email is required.");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            return ApiResponse.error("Password is required.");
        }

        String rawId = request.getIdentifier().trim();
        String cleanMobile = rawId.replaceAll("\\D", "");

        Optional<User> userOpt = Optional.empty();
        if (cleanMobile.length() >= 10) {
            userOpt = userRepository.findByMobile(cleanMobile);
        }
        if (userOpt.isEmpty() && rawId.contains("@")) {
            userOpt = userRepository.findByEmail(rawId.toLowerCase());
        }
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByMobile(rawId)
                    .or(() -> userRepository.findByEmail(rawId))
                    .or(() -> userRepository.findByUserId(rawId));
        }

        if (userOpt.isEmpty()) {
            return ApiResponse.error("Invalid mobile/email or password.");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ApiResponse.error("Invalid mobile/email or password.");
        }

        String token = tokenProvider.generateToken(user.getMobile() != null ? user.getMobile() : user.getUserId());

        ApiResponse<Object> response = new ApiResponse<>();
        response.setStatus("SUCCESS");
        response.setToken(token);

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getUserId());
        userData.put("fullName", user.getFullName());
        userData.put("identifier", rawId);
        userData.put("email", user.getEmail());
        userData.put("mobile", user.getMobile());
        userData.put("role", user.getRole());
        boolean hasProperty = propertyRepository.existsByUser(user);
        boolean setupDone = (user.getSetupCompleted() != null && user.getSetupCompleted()) || hasProperty;
        userData.put("hasProperty", hasProperty);
        userData.put("setupCompleted", setupDone);
        response.setUser(userData);

        return response;
    }

    public ApiResponse<Object> signup(SignupRequest request) {
        if (request == null) {
            return ApiResponse.error("Registration details are required.");
        }

        String fullName = request.getFullName() != null ? request.getFullName().trim() : "";
        if (fullName.isEmpty()) {
            return ApiResponse.error("Full name is required.");
        }

        String rawMobile = request.getMobile() != null ? request.getMobile().trim() : "";
        String cleanMobile = rawMobile.replaceAll("\\D", "");
        if (cleanMobile.length() < 10) {
            return ApiResponse.error("A valid 10-digit mobile number is required.");
        }

        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (email.isEmpty() || !email.contains("@")) {
            return ApiResponse.error("A valid email address is required.");
        }

        String password = request.getPassword() != null ? request.getPassword().trim() : "";
        if (password.length() < 8) {
            return ApiResponse.error("Password is required and must be at least 8 characters long.");
        }

        // Check duplicate mobile
        if (userRepository.findByMobile(cleanMobile).isPresent() || userRepository.findByMobile(rawMobile).isPresent()) {
            return ApiResponse.error("An account with this mobile number already exists. Please log in.");
        }

        // Check duplicate email
        if (userRepository.findByEmail(email).isPresent()) {
            return ApiResponse.error("An account with this email address already exists. Please log in.");
        }

        String userId = "owner-" + System.currentTimeMillis();
        String encodedPassword = passwordEncoder.encode(password);

        User newUser = new User(
                userId,
                fullName,
                cleanMobile,
                email,
                encodedPassword,
                "ROLE_LANDLORD"
        );

        userRepository.save(newUser);

        String token = tokenProvider.generateToken(newUser.getMobile());

        ApiResponse<Object> response = new ApiResponse<>();
        response.setStatus("SUCCESS");
        response.setToken(token);

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", newUser.getUserId());
        userData.put("fullName", newUser.getFullName());
        userData.put("mobile", newUser.getMobile());
        userData.put("email", newUser.getEmail());
        userData.put("role", newUser.getRole());
        userData.put("hasProperty", false);
        userData.put("setupCompleted", false);
        response.setUser(userData);

        return response;
    }

    public ApiResponse<Object> requestOtp(String mobile) {
        if (mobile == null || mobile.trim().isEmpty()) {
            return ApiResponse.error("Mobile number is required.");
        }

        String cleanMobile = mobile.replaceAll("\\D", "");
        if (cleanMobile.length() < 10) {
            return ApiResponse.error("Please enter a valid 10-digit mobile number.");
        }

        Optional<User> userOpt = userRepository.findByMobile(cleanMobile)
                .or(() -> userRepository.findByMobile(mobile));

        if (userOpt.isEmpty()) {
            return ApiResponse.error("No account found with mobile number +91 " + cleanMobile + ". Please sign up first.");
        }

        otpService.generateOtp(cleanMobile);
        return ApiResponse.success("OTP sent successfully to registered mobile +91 " + cleanMobile, null);
    }

    public ApiResponse<Object> verifyOtp(String mobile, String otp) {
        if (mobile == null || mobile.trim().isEmpty()) {
            return ApiResponse.error("Mobile number is required.");
        }
        if (otp == null || otp.trim().isEmpty()) {
            return ApiResponse.error("OTP is required.");
        }

        String cleanMobile = mobile.replaceAll("\\D", "");
        Optional<User> userOpt = userRepository.findByMobile(cleanMobile)
                .or(() -> userRepository.findByMobile(mobile));

        if (userOpt.isEmpty()) {
            return ApiResponse.error("No registered account found with this mobile number.");
        }

        if (otpService.isExpired(cleanMobile)) {
            return ApiResponse.error("OTP has expired. Please request a new OTP.");
        }

        boolean isValid = otpService.verifyOtp(cleanMobile, otp);
        if (!isValid) {
            return ApiResponse.error("Invalid OTP entered. Please try again.");
        }

        User user = userOpt.get();
        String token = tokenProvider.generateToken(user.getMobile());

        ApiResponse<Object> response = new ApiResponse<>();
        response.setStatus("SUCCESS");
        response.setToken(token);

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getUserId());
        userData.put("fullName", user.getFullName());
        userData.put("mobile", user.getMobile());
        userData.put("email", user.getEmail());
        userData.put("role", user.getRole());
        boolean hasProperty = propertyRepository.existsByUser(user);
        boolean setupDone = (user.getSetupCompleted() != null && user.getSetupCompleted()) || hasProperty;
        userData.put("hasProperty", hasProperty);
        userData.put("setupCompleted", setupDone);
        response.setUser(userData);

        return response;
    }
}
