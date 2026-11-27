package com.rentmanager.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String userId;

    private String fullName;

    @Column(unique = true, nullable = false)
    private String mobile;

    private String email;

    @Column(nullable = false)
    private String password;

    private String role; // e.g. "ROLE_LANDLORD"

    private Boolean setupCompleted = false;

    private LocalDateTime createdAt;

    public User() {
        this.setupCompleted = false;
        this.createdAt = LocalDateTime.now();
    }

    public User(String userId, String fullName, String mobile, String email, String password, String role) {
        this.userId = userId;
        this.fullName = fullName;
        this.mobile = mobile;
        this.email = email;
        this.password = password;
        this.role = role;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Boolean getSetupCompleted() {
        return setupCompleted;
    }

    public void setSetupCompleted(Boolean setupCompleted) {
        this.setupCompleted = setupCompleted;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
