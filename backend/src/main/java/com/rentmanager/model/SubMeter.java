package com.rentmanager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "sub_meters")
public class SubMeter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String meterCode; // e.g. "#E-204"

    private Double previousReading; // e.g. 1250.0

    private String previousReadingDate; // "01/10/2026"

    private Double currentReading; // e.g. 1384.0

    private String currentReadingDate; // "Logged today"

    private Double unitsConsumed; // e.g. 134.0

    private Boolean readingLogged = false;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    @JsonIgnoreProperties({"subMeter", "property", "tenant", "hibernateLazyInitializer", "handler"})
    private Room room;

    public SubMeter() {
    }

    public SubMeter(String meterCode, Double previousReading, String previousReadingDate,
                    Double currentReading, String currentReadingDate, Double unitsConsumed,
                    Boolean readingLogged, Room room) {
        this.meterCode = meterCode;
        this.previousReading = previousReading;
        this.previousReadingDate = previousReadingDate;
        this.currentReading = currentReading;
        this.currentReadingDate = currentReadingDate;
        this.unitsConsumed = unitsConsumed;
        this.readingLogged = readingLogged != null ? readingLogged : false;
        this.room = room;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMeterCode() {
        return meterCode;
    }

    public void setMeterCode(String meterCode) {
        this.meterCode = meterCode;
    }

    public Double getPreviousReading() {
        return previousReading;
    }

    public void setPreviousReading(Double previousReading) {
        this.previousReading = previousReading;
    }

    public String getPreviousReadingDate() {
        return previousReadingDate;
    }

    public void setPreviousReadingDate(String previousReadingDate) {
        this.previousReadingDate = previousReadingDate;
    }

    public Double getCurrentReading() {
        return currentReading;
    }

    public void setCurrentReading(Double currentReading) {
        this.currentReading = currentReading;
    }

    public String getCurrentReadingDate() {
        return currentReadingDate;
    }

    public void setCurrentReadingDate(String currentReadingDate) {
        this.currentReadingDate = currentReadingDate;
    }

    public Double getUnitsConsumed() {
        return unitsConsumed;
    }

    public void setUnitsConsumed(Double unitsConsumed) {
        this.unitsConsumed = unitsConsumed;
    }

    public Boolean getReadingLogged() {
        return readingLogged;
    }

    public void setReadingLogged(Boolean readingLogged) {
        this.readingLogged = readingLogged;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }
}
