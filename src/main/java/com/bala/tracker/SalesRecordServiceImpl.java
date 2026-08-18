package com.bala.tracker;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class SalesRecordServiceImpl implements SalesRecordService {

    private final SalesRepository salesRepository;

    @Autowired
    public SalesRecordServiceImpl(SalesRepository salesRepository) {
        this.salesRepository = salesRepository;
    }

    @Override
    @Transactional
    public SalesRecord saveSalesRecord(SalesRecord record) {
        if (record == null) {
            throw new IllegalArgumentException("Sales record cannot be null");
        }
        if (record.getRecordDate() == null) {
            throw new IllegalArgumentException("Record date is required");
        }
        if (record.getShopName() == null || record.getShopName().trim().isEmpty()) {
            throw new IllegalArgumentException("Shop name is required");
        }

        record.setShopName(record.getShopName().trim());

        Optional<SalesRecord> existingOpt = salesRepository.findByRecordDateAndShopNameIgnoreCase(
                record.getRecordDate(), record.getShopName());

        if (existingOpt.isPresent()) {
            SalesRecord existing = existingOpt.get();
            record.setId(existing.getId());
        }

        return salesRepository.save(record);
    }

    @Override
    @Transactional
    public List<SalesRecord> saveAllSalesRecords(List<SalesRecord> records) {
        if (records == null || records.isEmpty()) {
            return Collections.emptyList();
        }
        List<SalesRecord> savedList = new ArrayList<>();
        for (SalesRecord record : records) {
            savedList.add(saveSalesRecord(record));
        }
        return savedList;
    }

    @Override
    public List<SalesRecord> getAllSalesRecords() {
        return salesRepository.findAll();
    }

    @Override
    public List<SalesRecord> getSalesByDate(LocalDate recordDate) {
        if (recordDate == null) {
            return Collections.emptyList();
        }
        return salesRepository.findByRecordDate(recordDate);
    }

    @Override
    public Optional<SalesRecord> getSalesByDateAndShop(LocalDate recordDate, String shopName) {
        if (recordDate == null || shopName == null || shopName.trim().isEmpty()) {
            return Optional.empty();
        }
        return salesRepository.findByRecordDateAndShopNameIgnoreCase(recordDate, shopName.trim());
    }

    @Override
    @Transactional
    public boolean deleteSalesRecordById(Long id) {
        if (id == null || !salesRepository.existsById(id)) {
            return false;
        }
        salesRepository.deleteById(id);
        return true;
    }

    @Override
    @Transactional
    public boolean deleteSalesRecordByDateAndShop(LocalDate recordDate, String shopName) {
        if (recordDate == null || shopName == null || shopName.trim().isEmpty()) {
            return false;
        }
        Optional<SalesRecord> recordOpt = salesRepository.findByRecordDateAndShopNameIgnoreCase(recordDate, shopName.trim());
        if (recordOpt.isPresent()) {
            salesRepository.delete(recordOpt.get());
            return true;
        }
        return false;
    }

    @Override
    public Map<String, Object> getPreviousBalance(String shopName, LocalDate date) {
        Map<String, Object> result = new HashMap<>();
        if (shopName == null || shopName.trim().isEmpty() || date == null) {
            result.put("previousBalance", BigDecimal.ZERO);
            return result;
        }

        List<SalesRecord> previousRecords = salesRepository.findPreviousRecordsForShop(shopName.trim(), date);
        if (!previousRecords.isEmpty()) {
            SalesRecord lastRecord = previousRecords.get(0);
            BigDecimal prevBal = lastRecord.getBalance();
            result.put("previousBalance", prevBal != null ? prevBal : BigDecimal.ZERO);
        } else {
            result.put("previousBalance", BigDecimal.ZERO);
        }
        return result;
    }

    @Override
    public Map<String, Object> getPreviousEmptyBalance(String shopName, LocalDate date) {
        Map<String, Object> result = new HashMap<>();
        if (shopName == null || shopName.trim().isEmpty() || date == null) {
            result.put("previousEmptyBalance", 0);
            return result;
        }

        List<SalesRecord> previousRecords = salesRepository.findPreviousRecordsForShop(shopName.trim(), date);
        if (!previousRecords.isEmpty()) {
            SalesRecord lastRecord = previousRecords.get(0);
            Integer prevEmpty = lastRecord.getBalanceEmpty();
            result.put("previousEmptyBalance", prevEmpty != null ? prevEmpty : 0);
        } else {
            result.put("previousEmptyBalance", 0);
        }
        return result;
    }
}
