package com.rentmanager.controller;

import com.rentmanager.dto.*;
import com.rentmanager.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Object>> login(@RequestBody AuthRequest request) {
        ApiResponse<Object> response = authService.login(request);
        if ("ERROR".equalsIgnoreCase(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Object>> signup(@RequestBody SignupRequest request) {
        ApiResponse<Object> response = authService.signup(request);
        if ("ERROR".equalsIgnoreCase(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/send")
    public ResponseEntity<ApiResponse<Object>> requestOtp(@RequestBody OtpRequest request) {
        ApiResponse<Object> response = authService.requestOtp(request.getMobile());
        if ("ERROR".equalsIgnoreCase(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<ApiResponse<Object>> verifyOtp(@RequestBody OtpVerifyRequest request) {
        ApiResponse<Object> response = authService.verifyOtp(request.getMobile(), request.getOtp());
        if ("ERROR".equalsIgnoreCase(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Object>> resetPassword(@RequestBody ResetPasswordRequest request) {
        ApiResponse<Object> response = authService.resetPassword(request);
        if ("ERROR".equalsIgnoreCase(response.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.ok(response);
    }
}
