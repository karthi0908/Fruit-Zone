package com.bala.tracker.repository;

import com.bala.tracker.model.SalesRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesRepository extends JpaRepository<SalesRecord, Long> {
    
    // Custom query to fetch all records for a specific date
    List<SalesRecord> findByRecordDate(LocalDate recordDate);
    
    // Custom query to find a record for a specific date and specific shop
    Optional<SalesRecord> findByRecordDateAndShopName(LocalDate recordDate, String shopName);

    // Custom query to find the most recent balance for a shop prior to a specific date
    Optional<SalesRecord> findTopByShopNameIgnoreCaseAndRecordDateLessThanOrderByRecordDateDesc(String shopName, LocalDate recordDate);
}
