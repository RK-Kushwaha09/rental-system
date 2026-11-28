package com.rentmanager.dto;

public class OtpVerifyRequest {
    private String mobile;
    private String identifier;
    private String otp;

    public OtpVerifyRequest() {}

    public OtpVerifyRequest(String mobile, String otp) {
        this.mobile = mobile;
        this.otp = otp;
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

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }
}
