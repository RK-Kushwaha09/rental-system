import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"buildings", "rooms", "tenants", "payments", "dashboard", "common"})
@EntityScan(basePackages = {"buildings", "rooms", "tenants", "payments", "dashboard", "common"})
@EnableJpaRepositories(basePackages = {"buildings", "rooms", "tenants", "payments", "dashboard", "common"})
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
        System.out.println("=================================================");
        System.out.println("  RentManager Modern Backend is running on port 8080!");
        System.out.println("  API Base URL: http://localhost:8080/api/dashboard");
        System.out.println("  H2 Console:   http://localhost:8080/h2-console");
        System.out.println("=================================================");
    }
}
