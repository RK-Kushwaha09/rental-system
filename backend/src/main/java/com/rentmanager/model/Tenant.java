package com.rentmanager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String tenantCode; // e.g. "tenant-204"

    @Column(nullable = false)
    private String fullName; // e.g. "Amit Patel"

    private String initials; // e.g. "AP"

    private String mobile; // e.g. "+91 98240 77123"

    private String emergencyContact;

    private String email;

    private String floor; // e.g. "1st Floor"

    private String status = "ACTIVE"; // "ACTIVE", "INACTIVE", etc.

    private String agreementStatus; // e.g. "Active Agreement"

    private String joinedDate; // e.g. "12 Jan 2026"

    private Double openingBalance; // 0.0

    private Double currentBalance; // 9239.0

    private String avatarUrl;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    @JsonIgnoreProperties({"tenant", "property", "subMeter", "hibernateLazyInitializer", "handler"})
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    @JsonIgnoreProperties({"rooms", "user", "hibernateLazyInitializer", "handler"})
    private Property property;

    public Tenant() {
    }

    public Tenant(String tenantCode, String fullName, String initials, String mobile,
                  String email, String floor, String agreementStatus, String joinedDate,
                  Double openingBalance, Double currentBalance, String avatarUrl, Room room) {
        this.tenantCode = tenantCode;
        this.fullName = fullName;
        this.initials = initials;
        this.mobile = mobile;
        this.email = email;
        this.floor = floor;
        this.agreementStatus = agreementStatus;
        this.joinedDate = joinedDate;
        this.openingBalance = openingBalance != null ? openingBalance : 0.0;
        this.currentBalance = currentBalance != null ? currentBalance : 0.0;
        this.avatarUrl = avatarUrl;
        this.room = room;
        if (room != null) {
            this.property = room.getProperty();
        }
        this.status = "ACTIVE";
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTenantCode() {
        return tenantCode;
    }

    public void setTenantCode(String tenantCode) {
        this.tenantCode = tenantCode;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getInitials() {
        return initials;
    }

    public void setInitials(String initials) {
        this.initials = initials;
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

    public String getFloor() {
        return floor;
    }

    public void setFloor(String floor) {
        this.floor = floor;
    }

    public String getAgreementStatus() {
        return agreementStatus;
    }

    public void setAgreementStatus(String agreementStatus) {
        this.agreementStatus = agreementStatus;
    }

    public String getJoinedDate() {
        return joinedDate;
    }

    public void setJoinedDate(String joinedDate) {
        this.joinedDate = joinedDate;
    }

    public Double getOpeningBalance() {
        return openingBalance;
    }

    public void setOpeningBalance(Double openingBalance) {
        this.openingBalance = openingBalance;
    }

    public Double getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(Double currentBalance) {
        this.currentBalance = currentBalance;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public String getEmergencyContact() {
        return emergencyContact;
    }

    public void setEmergencyContact(String emergencyContact) {
        this.emergencyContact = emergencyContact;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Property getProperty() {
        return property;
    }

    public void setProperty(Property property) {
        this.property = property;
    }
}
