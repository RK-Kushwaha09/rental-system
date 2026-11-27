package com.rentmanager.controller;

import com.rentmanager.dto.ApiResponse;
import com.rentmanager.dto.PropertyCreateRequest;
import com.rentmanager.dto.RoomCreateDto;
import com.rentmanager.model.Property;
import com.rentmanager.model.Room;
import com.rentmanager.service.PropertyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Property>> createProperty(@RequestBody PropertyCreateRequest request) {
        Property created = propertyService.createPropertyForUser(request);
        return ResponseEntity.ok(ApiResponse.success("Property created successfully", created));
    }

    @GetMapping("/setup-status")
    public ResponseEntity<Map<String, Object>> getSetupStatus() {
        return ResponseEntity.ok(propertyService.getSetupStatus());
    }

    @GetMapping
    public ResponseEntity<Property> getCurrentProperty() {
        return propertyService.getCurrentOwnerProperty()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Property> getProperty(@PathVariable("id") String id) {
        return propertyService.getCurrentOwnerProperty()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Property>> updateProperty(@RequestBody Map<String, Object> updates) {
        Property updated = propertyService.updateCurrentProperty(updates);
        return ResponseEntity.ok(ApiResponse.success("Property updated successfully", updated));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Property>> updatePropertyWithId(@PathVariable("id") String id, @RequestBody Map<String, Object> updates) {
        Property updated = propertyService.updateCurrentProperty(updates);
        return ResponseEntity.ok(ApiResponse.success("Property updated successfully", updated));
    }

    @PostMapping("/rooms")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRoom(@RequestBody RoomCreateDto request) {
        Map<String, Object> created = propertyService.createRoomForProperty(null, request);
        return ResponseEntity.ok(ApiResponse.success("Room created successfully", created));
    }

    @PostMapping("/{id}/rooms")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRoomWithPropertyId(
            @PathVariable("id") String id,
            @RequestBody RoomCreateDto request) {
        Map<String, Object> created = propertyService.createRoomForProperty(id, request);
        return ResponseEntity.ok(ApiResponse.success("Room created successfully", created));
    }

    @PutMapping("/rooms/{roomId}")
    public ResponseEntity<Map<String, Object>> updateRoomDirect(
            @PathVariable("roomId") String roomId,
            @RequestBody Map<String, Object> roomData) {
        Room updated = propertyService.updateRoom(roomId, roomData);
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "SUCCESS");
        resp.put("roomId", roomId);
        resp.put("roomNumber", updated.getRoomNumber());
        resp.put("monthlyRent", updated.getMonthlyRent() != null ? updated.getMonthlyRent() : 0.0);
        resp.put("electricityRate", updated.getElectricityRate() != null ? updated.getElectricityRate() : 0.0);
        resp.put("floor", updated.getFloor() != null ? updated.getFloor() : "");
        resp.put("type", updated.getRoomType() != null ? updated.getRoomType() : "");
        resp.put("updatedData", roomData);
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/{id}/rooms/{roomId}")
    public ResponseEntity<Map<String, Object>> updateRoom(
            @PathVariable("id") String id,
            @PathVariable("roomId") String roomId,
            @RequestBody Map<String, Object> roomData) {
        Room updated = propertyService.updateRoom(roomId, roomData);
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "SUCCESS");
        resp.put("roomId", roomId);
        resp.put("roomNumber", updated.getRoomNumber());
        resp.put("monthlyRent", updated.getMonthlyRent() != null ? updated.getMonthlyRent() : 0.0);
        resp.put("electricityRate", updated.getElectricityRate() != null ? updated.getElectricityRate() : 0.0);
        resp.put("floor", updated.getFloor() != null ? updated.getFloor() : "");
        resp.put("type", updated.getRoomType() != null ? updated.getRoomType() : "");
        resp.put("updatedData", roomData);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(propertyService.getDashboardStats());
    }

    @GetMapping("/rooms-inventory")
    public ResponseEntity<List<Map<String, Object>>> getRoomsInventory() {
        return ResponseEntity.ok(propertyService.getRoomsInventory());
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<Map<String, Object>> getRoomDetail(@PathVariable("roomId") String roomId) {
        return ResponseEntity.ok(propertyService.getRoomDetail(roomId));
    }

    @PostMapping("/rooms/{roomId}/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveRoomHistory(
            @PathVariable("roomId") String roomId,
            @RequestBody Map<String, Object> payload) {
        Map<String, Object> updated = propertyService.saveRoomHistory(roomId, payload);
        return ResponseEntity.ok(ApiResponse.success("Billing history updated successfully", updated));
    }

    @PostMapping("/rooms/{roomId}/vacate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> vacateRoom(
            @PathVariable("roomId") String roomId) {
        Map<String, Object> result = propertyService.vacateRoom(roomId);
        return ResponseEntity.ok(ApiResponse.success("Tenant vacated and room set to VACANT successfully", result));
    }

    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteRoom(
            @PathVariable("roomId") String roomId) {
        Map<String, Object> result = propertyService.deleteRoom(roomId);
        return ResponseEntity.ok(ApiResponse.success("Room deleted successfully", result));
    }

    @DeleteMapping("/{id}/rooms/{roomId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteRoomWithPropertyId(
            @PathVariable("id") String id,
            @PathVariable("roomId") String roomId) {
        Map<String, Object> result = propertyService.deleteRoom(roomId);
        return ResponseEntity.ok(ApiResponse.success("Room deleted successfully", result));
    }
}
