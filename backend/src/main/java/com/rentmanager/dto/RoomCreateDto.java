package com.rentmanager.dto;

public class RoomCreateDto {
    private String roomNumber;
    private String floor;
    private String roomType;
    private Double monthlyRent;
    private Double electricityRate;
    private String status;

    public RoomCreateDto() {
    }

    public RoomCreateDto(String roomNumber, String floor, String roomType, Double monthlyRent, Double electricityRate, String status) {
        this.roomNumber = roomNumber;
        this.floor = floor;
        this.roomType = roomType;
        this.monthlyRent = monthlyRent;
        this.electricityRate = electricityRate;
        this.status = status;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getFloor() {
        return floor;
    }

    public void setFloor(String floor) {
        this.floor = floor;
    }

    public String getRoomType() {
        return roomType;
    }

    public void setRoomType(String roomType) {
        this.roomType = roomType;
    }

    public Double getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(Double monthlyRent) {
        this.monthlyRent = monthlyRent;
    }

    public Double getElectricityRate() {
        return electricityRate;
    }

    public void setElectricityRate(Double electricityRate) {
        this.electricityRate = electricityRate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
