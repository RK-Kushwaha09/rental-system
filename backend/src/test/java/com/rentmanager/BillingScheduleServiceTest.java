package com.rentmanager;

import com.rentmanager.model.Bill;
import com.rentmanager.model.Room;
import com.rentmanager.model.Tenant;
import com.rentmanager.service.BillService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class BillingScheduleServiceTest {

    private final BillService billService = new BillService(null, null, null, null, null, null, null);

    @Test
    @DisplayName("Scenario 1: Newly joined tenant (Aish) joining today 09 Oct 2026 -> Due 09 Nov 2026 (31 days countdown, locked)")
    public void testNewlyJoinedTenantAish() {
        LocalDate today = LocalDate.of(2026, 10, 9);
        Tenant aish = new Tenant();
        aish.setId(99L);
        aish.setFullName("Aish");
        aish.setJoinedDate("09 October 2026");
        Room room = new Room();
        room.setRoomNumber("104");
        room.setMonthlyRent(1000.0);
        aish.setRoom(room);

        BillService.TenantBillingSchedule schedule = billService.calculateSchedule(aish, Collections.emptyList(), today);

        assertNotNull(schedule);
        assertEquals(LocalDate.of(2026, 11, 9), schedule.nextBillDate, "First monthly bill date must be 09 Nov 2026");
        assertEquals(31, schedule.daysRemaining, "Days countdown must be 31 days");
        assertFalse(schedule.canGenerate, "Generate bill button must be disabled when > 5 days");
        assertFalse(schedule.isWindowOpen, "Window must not be open when > 5 days");
        assertEquals("Upcoming", schedule.statusBadge, "Status badge must be 'Upcoming'");
        assertEquals("in 31 days", schedule.countdownText, "Countdown text must be 'in 31 days'");
        assertEquals(LocalDate.of(2026, 11, 4), schedule.windowOpenDate, "Pre-billing window must open 5 days prior on 04 Nov 2026");
        assertFalse(schedule.isActionRequired, "Must not flag as urgent action required");
    }

    @Test
    @DisplayName("Scenario 2: Tenant exactly 5 days before due date -> Window opens, button enabled")
    public void testWindowOpenExactly5Days() {
        LocalDate today = LocalDate.of(2026, 10, 9);
        Tenant tenant = new Tenant();
        tenant.setId(101L);
        tenant.setFullName("5-Day Tenant");
        tenant.setJoinedDate("14 September 2026"); // 1 month is 14 Oct 2026 (5 days away)

        BillService.TenantBillingSchedule schedule = billService.calculateSchedule(tenant, Collections.emptyList(), today);

        assertNotNull(schedule);
        assertEquals(LocalDate.of(2026, 10, 14), schedule.nextBillDate);
        assertEquals(5, schedule.daysRemaining);
        assertTrue(schedule.isWindowOpen, "Window must be open at 5 days");
        assertTrue(schedule.canGenerate, "Button must be enabled at 5 days");
        assertEquals("Ready to Bill", schedule.statusBadge);
        assertEquals("in 5 days", schedule.countdownText);
    }

    @Test
    @DisplayName("Scenario 3: Tenant on due date (0 days remaining) -> Due Today, button enabled")
    public void testOnDueDate() {
        LocalDate today = LocalDate.of(2026, 10, 9);
        Tenant tenant = new Tenant();
        tenant.setId(102L);
        tenant.setFullName("Due Tenant");
        tenant.setJoinedDate("09 September 2026"); // 1 month is 09 Oct 2026 (today)

        BillService.TenantBillingSchedule schedule = billService.calculateSchedule(tenant, Collections.emptyList(), today);

        assertNotNull(schedule);
        assertEquals(LocalDate.of(2026, 10, 9), schedule.nextBillDate);
        assertEquals(0, schedule.daysRemaining);
        assertTrue(schedule.isWindowOpen);
        assertTrue(schedule.canGenerate);
        assertEquals("Due Today", schedule.statusBadge);
        assertEquals("Due today", schedule.countdownText);
    }

    @Test
    @DisplayName("Scenario 4: Genuinely overdue tenant (1 day overdue) -> Overdue, button enabled")
    public void testOverdueTenant() {
        LocalDate today = LocalDate.of(2026, 10, 9);
        Tenant tenant = new Tenant();
        tenant.setId(103L);
        tenant.setFullName("Overdue Tenant");
        tenant.setJoinedDate("08 September 2026"); // 1 month is 08 Oct 2026 (yesterday)

        BillService.TenantBillingSchedule schedule = billService.calculateSchedule(tenant, Collections.emptyList(), today);

        assertNotNull(schedule);
        assertEquals(LocalDate.of(2026, 10, 8), schedule.nextBillDate);
        assertEquals(-1, schedule.daysRemaining);
        assertTrue(schedule.isOverdue);
        assertTrue(schedule.isWindowOpen);
        assertTrue(schedule.canGenerate);
        assertEquals("Overdue", schedule.statusBadge);
        assertEquals("1 day overdue", schedule.countdownText);
    }

    @Test
    @DisplayName("Scenario 5: Month-end joining dates and variable month lengths")
    public void testMonthEndAndVariableMonthLengths() {
        // 31 Jan 2026
        LocalDate moveInJan31 = LocalDate.of(2026, 1, 31);
        assertEquals(LocalDate.of(2026, 2, 28), moveInJan31.plusMonths(1), "31 Jan + 1 mo must clamp to 28 Feb in non-leap year");
        assertEquals(LocalDate.of(2026, 3, 31), moveInJan31.plusMonths(2), "31 Jan + 2 mo must resolve to 31 Mar");
        assertEquals(LocalDate.of(2026, 4, 30), moveInJan31.plusMonths(3), "31 Jan + 3 mo must clamp to 30 Apr");
        assertEquals(LocalDate.of(2026, 5, 31), moveInJan31.plusMonths(4), "31 Jan + 4 mo must resolve to 31 May");

        // 31 Aug 2026
        LocalDate moveInAug31 = LocalDate.of(2026, 8, 31);
        assertEquals(LocalDate.of(2026, 9, 30), moveInAug31.plusMonths(1), "31 Aug + 1 mo must clamp to 30 Sep");
        assertEquals(LocalDate.of(2026, 10, 31), moveInAug31.plusMonths(2), "31 Aug + 2 mo must resolve to 31 Oct");

        Tenant tenantJan31 = new Tenant();
        tenantJan31.setId(104L);
        tenantJan31.setFullName("Month End Tenant");
        tenantJan31.setJoinedDate("31 Jan 2026");

        LocalDate today = LocalDate.of(2026, 10, 9);

        // With September cycle billed, next cycle is 31 Oct
        Bill sepBill = new Bill();
        sepBill.setBillingMonth("SEPTEMBER");
        sepBill.setTenant(tenantJan31);
        List<Bill> bills = Collections.singletonList(sepBill);

        BillService.TenantBillingSchedule sched = billService.calculateSchedule(tenantJan31, bills, today);
        assertNotNull(sched);
        assertEquals(LocalDate.of(2026, 10, 31), sched.nextBillDate, "October cycle date for 31 Jan tenant is 31 Oct 2026");
        assertEquals(22, sched.daysRemaining, "Days remaining to 31 Oct from 09 Oct is 22 days");
        assertEquals("Upcoming", sched.statusBadge);
        assertFalse(sched.canGenerate);
    }

    @Test
    @DisplayName("Scenario 6: Duplicate bill prevention and advancing to next cycle")
    public void testDuplicateBillAdvancesToNextCycle() {
        LocalDate today = LocalDate.of(2026, 10, 9);
        Tenant rahul = new Tenant();
        rahul.setId(10L);
        rahul.setFullName("rahul");
        rahul.setJoinedDate("07 September 2026"); // Joined Sept -> Cycle 1 is 07 Oct

        // Bill already generated for OCTOBER cycle (07 Oct)
        Bill octBill = new Bill();
        octBill.setId(44L);
        octBill.setInvoiceNumber("#INV-2026-14897");
        octBill.setBillingMonth("OCTOBER");
        octBill.setBillingPeriod("01 Oct - 31 Oct 2026");
        octBill.setStatus("PAID");
        octBill.setTenant(rahul);

        List<Bill> existingBills = new ArrayList<>();
        existingBills.add(octBill);

        BillService.TenantBillingSchedule schedule = billService.calculateSchedule(rahul, existingBills, today);

        assertNotNull(schedule);
        assertEquals(LocalDate.of(2026, 11, 7), schedule.nextBillDate, "Because October was already billed, next cycle is 07 Nov 2026");
        assertEquals(29, schedule.daysRemaining);
        assertEquals("Upcoming", schedule.statusBadge);
        assertFalse(schedule.canGenerate, "Cannot generate early bill for Nov cycle");
    }

    @Test
    @DisplayName("Scenario 7: Date string parsing robustness across all standard formats")
    public void testDateParsingFormats() {
        assertEquals(LocalDate.of(2026, 10, 9), BillService.parseJoinedDate("09 October 2026"));
        assertEquals(LocalDate.of(2026, 10, 9), BillService.parseJoinedDate("9 October 2026"));
        assertEquals(LocalDate.of(2026, 10, 9), BillService.parseJoinedDate("09 Oct 2026"));
        assertEquals(LocalDate.of(2026, 10, 9), BillService.parseJoinedDate("9 Oct 2026"));
        assertEquals(LocalDate.of(2026, 10, 9), BillService.parseJoinedDate("2026-10-09"));
        assertEquals(LocalDate.of(2025, 1, 8), BillService.parseJoinedDate("08 Jan 2025"));
        assertEquals(LocalDate.of(2025, 1, 8), BillService.parseJoinedDate("8 Jan 2025"));
        assertEquals(LocalDate.of(2026, 10, 9), BillService.parseJoinedDate("09/10/2026"));
    }
}
