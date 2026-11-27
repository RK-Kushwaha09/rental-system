package com.rentmanager.dto;

public class BillCreateRequest {
    private String tenantId;
    private String roomId;
    private String tenantCode;
    private String roomNumber;
    private String billingPeriod;
    private String billingMonth;
    private String dueDate;
    private Double baseRent;
    private Double powerReadingPrev;
    private Double powerReadingCurr;
    private Double powerUnits;
    private Double powerRate;
    private Double powerAmount;
    private Double pastArrears;
    private Double totalPayable;

    public BillCreateRequest() {}

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getTenantCode() {
        return tenantCode;
    }

    public void setTenantCode(String tenantCode) {
        this.tenantCode = tenantCode;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getBillingPeriod() {
        return billingPeriod;
    }

    public void setBillingPeriod(String billingPeriod) {
        this.billingPeriod = billingPeriod;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public Double getBaseRent() {
        return baseRent;
    }

    public void setBaseRent(Double baseRent) {
        this.baseRent = baseRent;
    }

    public Double getPowerReadingPrev() {
        return powerReadingPrev;
    }

    public void setPowerReadingPrev(Double powerReadingPrev) {
        this.powerReadingPrev = powerReadingPrev;
    }

    public Double getPowerReadingCurr() {
        return powerReadingCurr;
    }

    public void setPowerReadingCurr(Double powerReadingCurr) {
        this.powerReadingCurr = powerReadingCurr;
    }

    public Double getPowerUnits() {
        return powerUnits;
    }

    public void setPowerUnits(Double powerUnits) {
        this.powerUnits = powerUnits;
    }

    public Double getPowerRate() {
        return powerRate;
    }

    public void setPowerRate(Double powerRate) {
        this.powerRate = powerRate;
    }

    public Double getPowerAmount() {
        return powerAmount;
    }

    public void setPowerAmount(Double powerAmount) {
        this.powerAmount = powerAmount;
    }

    public Double getPastArrears() {
        return pastArrears;
    }

    public void setPastArrears(Double pastArrears) {
        this.pastArrears = pastArrears;
    }

    public Double getTotalPayable() {
        return totalPayable;
    }

    public void setTotalPayable(Double totalPayable) {
        this.totalPayable = totalPayable;
    }
}
