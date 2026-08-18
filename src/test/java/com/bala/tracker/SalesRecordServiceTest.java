package com.bala.tracker;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesRecordServiceTest {

    @Mock
    private SalesRepository salesRepository;

    private SalesRecordServiceImpl salesRecordService;

    @BeforeEach
    void setUp() {
        salesRecordService = new SalesRecordServiceImpl(salesRepository);
    }

    @Test
    @DisplayName("Save SalesRecord: Success")
    void testSaveSalesRecord_Success() {
        SalesRecord record = new SalesRecord(LocalDate.now(), "Fresh Fruits Shop");
        record.setGovyaAmount(new BigDecimal("500.00"));

        when(salesRepository.findByRecordDateAndShopNameIgnoreCase(any(), any())).thenReturn(Optional.empty());
        when(salesRepository.save(any(SalesRecord.class))).thenAnswer(i -> i.getArgument(0));

        SalesRecord saved = salesRecordService.saveSalesRecord(record);

        assertNotNull(saved);
        assertEquals("Fresh Fruits Shop", saved.getShopName());
        verify(salesRepository).save(record);
    }

    @Test
    @DisplayName("Get Previous Balance: Returns Previous Record Balance")
    void testGetPreviousBalance() {
        SalesRecord prevRecord = new SalesRecord(LocalDate.now().minusDays(1), "Shop A");
        prevRecord.setBalance(new BigDecimal("1500.00"));

        when(salesRepository.findPreviousRecordsForShop(eq("Shop A"), any(LocalDate.class)))
                .thenReturn(List.of(prevRecord));

        Map<String, Object> result = salesRecordService.getPreviousBalance("Shop A", LocalDate.now());

        assertEquals(new BigDecimal("1500.00"), result.get("previousBalance"));
    }
}
