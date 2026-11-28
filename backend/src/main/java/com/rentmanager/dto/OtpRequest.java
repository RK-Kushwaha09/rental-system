package com.rentmanager.dto;

public class OtpRequest {
    private String mobile;
    private String identifier;

    public OtpRequest() {}

    public OtpRequest(String mobile) {
        this.mobile = mobile;
    }

    public String getMobile() {
        return (mobile != null && !mobile.trim().isEmpty()) ? mobile : identifier;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }
}
