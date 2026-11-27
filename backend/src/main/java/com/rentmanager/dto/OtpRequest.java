package com.rentmanager.dto;

public class OtpRequest {
    private String mobile;

    public OtpRequest() {}

    public OtpRequest(String mobile) {
        this.mobile = mobile;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }
}
