package com.rentmanager.controller;

import com.rentmanager.dto.ApiResponse;
import com.rentmanager.dto.BillCreateRequest;
import com.rentmanager.service.BillService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    @GetMapping("/draft")
    public ResponseEntity<Map<String, Object>> getDraftBill(
            @RequestParam(value = "tenantId", required = false) String tenantId,
            @RequestParam(value = "month", required = false) String month) {
        return ResponseEntity.ok(billService.getDraftBill(tenantId, month));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<Object>> generateBill(@RequestBody BillCreateRequest request) {
        Map<String, Object> invoice = billService.generateBill(request);
        ApiResponse<Object> response = new ApiResponse<>();
        response.setStatus("SUCCESS");
        response.setInvoice(invoice);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getBillsDashboard() {
        return ResponseEntity.ok(billService.getBillsDashboard());
    }

    @GetMapping("/{invoiceNumber}")
    public ResponseEntity<Map<String, Object>> getInvoice(@PathVariable("invoiceNumber") String invoiceNumber) {
        return ResponseEntity.ok(billService.getInvoice(invoiceNumber));
    }
}
