package com.bala.tracker;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesRepository extends JpaRepository<SalesRecord, Long> {

    List<SalesRecord> findByRecordDate(LocalDate recordDate);

    Optional<SalesRecord> findByRecordDateAndShopNameIgnoreCase(LocalDate recordDate, String shopName);

    boolean existsByRecordDateAndShopNameIgnoreCase(LocalDate recordDate, String shopName);

    void deleteByRecordDateAndShopNameIgnoreCase(LocalDate recordDate, String shopName);

    @Query("SELECT s FROM SalesRecord s WHERE LOWER(s.shopName) = LOWER(:shopName) AND s.recordDate < :date ORDER BY s.recordDate DESC")
    List<SalesRecord> findPreviousRecordsForShop(@Param("shopName") String shopName, @Param("date") LocalDate date);
}
