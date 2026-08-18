package com.bala.tracker;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface SalesRecordService {

    SalesRecord saveSalesRecord(SalesRecord record);

    List<SalesRecord> saveAllSalesRecords(List<SalesRecord> records);

    List<SalesRecord> getAllSalesRecords();

    List<SalesRecord> getSalesByDate(LocalDate recordDate);

    Optional<SalesRecord> getSalesByDateAndShop(LocalDate recordDate, String shopName);

    boolean deleteSalesRecordById(Long id);

    boolean deleteSalesRecordByDateAndShop(LocalDate recordDate, String shopName);

    Map<String, Object> getPreviousBalance(String shopName, LocalDate date);

    Map<String, Object> getPreviousEmptyBalance(String shopName, LocalDate date);
}
