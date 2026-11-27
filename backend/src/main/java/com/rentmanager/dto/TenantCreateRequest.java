package com.rentmanager.dto;

public class TenantCreateRequest {
    private String fullName;
    private String mobile;
    private String emergencyContact;
    private String email;
    private Object roomId; // Can be Integer, Long, String
    private String roomNumber;
    private String floor;
    private Double monthlyRent;
    private Double openingBalance;
    private String agreementStatus;
    private String joinedDate;

    public TenantCreateRequest() {}

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

    public String getEmergencyContact() {
        return emergencyContact;
    }

    public void setEmergencyContact(String emergencyContact) {
        this.emergencyContact = emergencyContact;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Object getRoomId() {
        return roomId;
    }

    public void setRoomId(Object roomId) {
        this.roomId = roomId;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getRoomIdentifier() {
        if (roomId != null && !String.valueOf(roomId).trim().isEmpty()) {
            return String.valueOf(roomId).trim();
        }
        if (roomNumber != null && !roomNumber.trim().isEmpty()) {
            return roomNumber.trim();
        }
        return null;
    }

    public String getFloor() {
        return floor;
    }

    public void setFloor(String floor) {
        this.floor = floor;
    }

    public Double getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(Double monthlyRent) {
        this.monthlyRent = monthlyRent;
    }

    public Double getOpeningBalance() {
        return openingBalance;
    }

    public void setOpeningBalance(Double openingBalance) {
        this.openingBalance = openingBalance;
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

    private java.util.List<java.util.Map<String, Object>> historicalRecords;

    public java.util.List<java.util.Map<String, Object>> getHistoricalRecords() {
        return historicalRecords;
    }

    public void setHistoricalRecords(java.util.List<java.util.Map<String, Object>> historicalRecords) {
        this.historicalRecords = historicalRecords;
    }

    private Double moveInReading;

    public Double getMoveInReading() {
        return moveInReading;
    }

    public void setMoveInReading(Double moveInReading) {
        this.moveInReading = moveInReading;
    }

    private Double electricityRate;

    public Double getElectricityRate() {
        return electricityRate;
    }

    public void setElectricityRate(Double electricityRate) {
        this.electricityRate = electricityRate;
    }

    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

