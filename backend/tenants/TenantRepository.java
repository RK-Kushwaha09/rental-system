package tenants;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findByRoomId(Long roomId);
    List<Tenant> findAllByOrderByCreatedAtDesc();
}
