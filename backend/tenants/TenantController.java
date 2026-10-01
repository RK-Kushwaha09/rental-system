package tenants;

import common.ApiResponse;
import rooms.Room;
import rooms.RoomRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tenants")
@CrossOrigin(origins = "*")
public class TenantController {

    private final TenantRepository tenantRepository;
    private final RoomRepository roomRepository;

    public TenantController(TenantRepository tenantRepository, RoomRepository roomRepository) {
        this.tenantRepository = tenantRepository;
        this.roomRepository = roomRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Tenant>>> getAllTenants() {
        return ResponseEntity.ok(ApiResponse.ok(tenantRepository.findAllByOrderByCreatedAtDesc()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Tenant>> getTenantById(@PathVariable Long id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found with id: " + id));
        return ResponseEntity.ok(ApiResponse.ok(tenant));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<Tenant>> createTenant(@RequestBody Map<String, Object> body) {
        String name = body.get("name").toString().trim();
        String phone = body.getOrDefault("phone", "").toString().trim();
        String email = body.getOrDefault("email", "").toString().trim();
        String dateStr = body.getOrDefault("joinedDate", "").toString().trim();
        LocalDate joinedDate = dateStr.isBlank() ? LocalDate.now() : LocalDate.parse(dateStr);

        Room assignedRoom = null;
        if (body.get("roomId") != null && !body.get("roomId").toString().isBlank()) {
            Long roomId = Long.valueOf(body.get("roomId").toString());
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + roomId));
            if ("occupied".equalsIgnoreCase(room.getStatus())) {
                throw new IllegalStateException("Room " + room.getRoomNumber() + " is already occupied");
            }
            room.setStatus("occupied");
            roomRepository.save(room);
            assignedRoom = room;
        }

        Tenant tenant = new Tenant(name, phone, email, assignedRoom, joinedDate);
        return ResponseEntity.ok(ApiResponse.ok("Tenant added successfully", tenantRepository.save(tenant)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Tenant>> updateTenant(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found with id: " + id));

        tenant.setName(body.get("name").toString().trim());
        tenant.setPhone(body.getOrDefault("phone", "").toString().trim());
        tenant.setEmail(body.getOrDefault("email", "").toString().trim());

        Room oldRoom = tenant.getRoom();
        Long newRoomId = (body.get("roomId") != null && !body.get("roomId").toString().isBlank())
                ? Long.valueOf(body.get("roomId").toString())
                : null;

        if (newRoomId == null) {
            if (oldRoom != null) {
                oldRoom.setStatus("vacant");
                roomRepository.save(oldRoom);
                tenant.setRoom(null);
            }
        } else if (oldRoom == null || !oldRoom.getId().equals(newRoomId)) {
            Room newRoom = roomRepository.findById(newRoomId)
                    .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + newRoomId));
            if ("occupied".equalsIgnoreCase(newRoom.getStatus())) {
                throw new IllegalStateException("Room " + newRoom.getRoomNumber() + " is already occupied");
            }
            if (oldRoom != null) {
                oldRoom.setStatus("vacant");
                roomRepository.save(oldRoom);
            }
            newRoom.setStatus("occupied");
            roomRepository.save(newRoom);
            tenant.setRoom(newRoom);
        }

        return ResponseEntity.ok(ApiResponse.ok("Tenant updated successfully", tenantRepository.save(tenant)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteTenant(@PathVariable Long id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found with id: " + id));

        if (tenant.getRoom() != null) {
            Room r = tenant.getRoom();
            r.setStatus("vacant");
            roomRepository.save(r);
        }
        tenantRepository.delete(tenant);
        return ResponseEntity.ok(ApiResponse.ok("Tenant deleted successfully", null));
    }
}
