package com.rentmanager.controller;

import com.rentmanager.dto.ApiResponse;
import com.rentmanager.dto.TenantCreateRequest;
import com.rentmanager.model.Tenant;
import com.rentmanager.service.TenantService;
import com.rentmanager.service.AiDiaryScannerService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantService tenantService;
    private final AiDiaryScannerService aiDiaryScannerService;

    public TenantController(TenantService tenantService, AiDiaryScannerService aiDiaryScannerService) {
        this.tenantService = tenantService;
        this.aiDiaryScannerService = aiDiaryScannerService;
    }

    @PostMapping(value = "/diary/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> scanDiary(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "tenantName", required = false) String tenantName,
            @RequestParam(value = "roomNumber", required = false) String roomNumber,
            @RequestParam(value = "monthlyRent", required = false) Double monthlyRent,
            @RequestParam(value = "electricityRate", required = false) Double electricityRate) {
        Map<String, Object> scanResult = aiDiaryScannerService.scanDiaryPages(files, tenantName, roomNumber, monthlyRent, electricityRate);
        return ResponseEntity.ok(ApiResponse.success("Diary scanned successfully", scanResult));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getTenants() {
        return ResponseEntity.ok(tenantService.getTenants());
    }

    @GetMapping("/ledger-summary")
    public ResponseEntity<Map<String, Object>> getLedgerSummary(@RequestParam(value = "month", required = false, defaultValue = "OCT") String month) {
        return ResponseEntity.ok(tenantService.getLedgerSummary(month));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getTenantById(@PathVariable("id") String id) {
        return ResponseEntity.ok(tenantService.getTenantById(id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<Map<String, Object>> getTenantHistory(@PathVariable("id") String tenantId) {
        return ResponseEntity.ok(tenantService.getTenantHistory(tenantId));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Tenant>> createTenant(@RequestBody TenantCreateRequest request) {
        Tenant created = tenantService.createTenant(request);
        return ResponseEntity.ok(ApiResponse.success("Tenant created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTenant(
            @PathVariable("id") String id,
            @RequestBody TenantCreateRequest request) {
        Map<String, Object> updated = tenantService.updateTenant(id, request);
        return ResponseEntity.ok(ApiResponse.success("Tenant updated successfully", updated));
    }

    @PostMapping("/{id}/vacate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> vacateTenant(
            @PathVariable("id") String id) {
        Map<String, Object> result = tenantService.vacateTenant(id);
        return ResponseEntity.ok(ApiResponse.success("Tenant vacated successfully", result));
    }
}
