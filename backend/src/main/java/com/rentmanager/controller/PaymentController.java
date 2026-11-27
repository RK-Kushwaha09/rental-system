package com.rentmanager.controller;

import com.rentmanager.dto.ApiResponse;
import com.rentmanager.dto.PaymentRecordRequest;
import com.rentmanager.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/record")
    public ResponseEntity<ApiResponse<Object>> recordPayment(@RequestBody PaymentRecordRequest request) {
        Map<String, Object> receipt = paymentService.recordPayment(request);
        ApiResponse<Object> response = new ApiResponse<>();
        response.setStatus("SUCCESS");
        response.setReceipt(receipt);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{receiptNumber}")
    public ResponseEntity<Map<String, Object>> getReceipt(@PathVariable("receiptNumber") String receiptNumber) {
        return ResponseEntity.ok(paymentService.getReceipt(receiptNumber));
    }
}
