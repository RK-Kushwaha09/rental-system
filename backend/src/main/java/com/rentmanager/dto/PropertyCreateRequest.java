package com.rentmanager.dto;

import java.util.List;

public class PropertyCreateRequest {
    private String name;
    private String propertyName;
    private String address;
    private String propertyType;
    private Integer roomCount;
    private String roomType;
    private Double monthlyRent;
    private Double electricityRate;
    private Double defaultMonthlyRent;
    private Double defaultElectricityRate;
    private List<String> roomNumbers;
    private List<RoomCreateDto> rooms;

    public PropertyCreateRequest() {
    }

    public String getEffectiveName() {
        if (name != null && !name.trim().isEmpty()) {
            return name.trim();
        }
        if (propertyName != null && !propertyName.trim().isEmpty()) {
            return propertyName.trim();
        }
        return "My Property";
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPropertyName() {
        return propertyName;
    }

    public void setPropertyName(String propertyName) {
        this.propertyName = propertyName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public Integer getRoomCount() {
        return roomCount;
    }

    public void setRoomCount(Integer roomCount) {
        this.roomCount = roomCount;
    }

    public Double getDefaultMonthlyRent() {
        return defaultMonthlyRent;
    }

    public void setDefaultMonthlyRent(Double defaultMonthlyRent) {
        this.defaultMonthlyRent = defaultMonthlyRent;
    }

    public Double getDefaultElectricityRate() {
        return defaultElectricityRate;
    }

    public void setDefaultElectricityRate(Double defaultElectricityRate) {
        this.defaultElectricityRate = defaultElectricityRate;
    }

    public List<RoomCreateDto> getRooms() {
        return rooms;
    }

    public void setRooms(List<RoomCreateDto> rooms) {
        this.rooms = rooms;
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

    public List<String> getRoomNumbers() {
        return roomNumbers;
    }

    public void setRoomNumbers(List<String> roomNumbers) {
        this.roomNumbers = roomNumbers;
    }
}
