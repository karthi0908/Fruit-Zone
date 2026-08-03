package com.bala.tracker.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "daily_sales")
public class SalesRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "shop_name", nullable = false)
    private String shopName;

    @Column(name = "govya_qty")
    private Integer govya;

    @Column(name = "grapes_qty")
    private Integer grapes;

    @Column(name = "sapota_qty")
    private Integer sapota;

    @Column(name = "govya_rate")
    private Integer govyaRate;

    @Column(name = "grapes_rate")
    private Integer grapesRate;

    @Column(name = "sapota_rate")
    private Integer sapotaRate;

    @Column(name = "govya_amt")
    private Integer govyaAmount;

    @Column(name = "grapes_amt")
    private Integer grapesAmount;

    @Column(name = "sapota_amt")
    private Integer sapotaAmount;

    @Column(name = "total_amount")
    private Double totalAmount;

    @Column(name = "given_amount")
    private Integer givenAmount;

    @Column(name = "old_balance")
    private Integer oldBalance;

    @Column(name = "empty_qty")
    private Integer empty;

    @Column(name = "empty_return")
    private Integer emptyReturn;

    @Column(name = "balance")
    private Double balance;

    @Column(name = "old_empty")
    private Integer oldEmpty;

    @Column(name = "balance_empty")
    private Integer balanceEmpty;

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getRecordDate() { return recordDate; }
    public void setRecordDate(LocalDate recordDate) { this.recordDate = recordDate; }

    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }

    public int getGovya() { return govya != null ? govya : 0; }
    public void setGovya(int govya) { this.govya = govya; }

    public int getGrapes() { return grapes != null ? grapes : 0; }
    public void setGrapes(int grapes) { this.grapes = grapes; }

    public int getSapota() { return sapota != null ? sapota : 0; }
    public void setSapota(int sapota) { this.sapota = sapota; }

    public int getGovyaRate() { return govyaRate != null ? govyaRate : 0; }
    public void setGovyaRate(int govyaRate) { this.govyaRate = govyaRate; }

    public int getGrapesRate() { return grapesRate != null ? grapesRate : 0; }
    public void setGrapesRate(int grapesRate) { this.grapesRate = grapesRate; }

    public int getSapotaRate() { return sapotaRate != null ? sapotaRate : 0; }
    public void setSapotaRate(int sapotaRate) { this.sapotaRate = sapotaRate; }

    public int getGovyaAmount() { return govyaAmount != null ? govyaAmount : 0; }
    public void setGovyaAmount(int govyaAmount) { this.govyaAmount = govyaAmount; }

    public int getGrapesAmount() { return grapesAmount != null ? grapesAmount : 0; }
    public void setGrapesAmount(int grapesAmount) { this.grapesAmount = grapesAmount; }

    public int getSapotaAmount() { return sapotaAmount != null ? sapotaAmount : 0; }
    public void setSapotaAmount(int sapotaAmount) { this.sapotaAmount = sapotaAmount; }

    public double getTotalAmount() { return totalAmount != null ? totalAmount : 0.0; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }

    public int getGivenAmount() { return givenAmount != null ? givenAmount : 0; }
    public void setGivenAmount(int givenAmount) { this.givenAmount = givenAmount; }

    public int getOldBalance() { return oldBalance != null ? oldBalance : 0; }
    public void setOldBalance(int oldBalance) { this.oldBalance = oldBalance; }

    public int getEmpty() { return empty != null ? empty : 0; }
    public void setEmpty(int empty) { this.empty = empty; }

    public int getEmptyReturn() { return emptyReturn != null ? emptyReturn : 0; }
    public void setEmptyReturn(int emptyReturn) { this.emptyReturn = emptyReturn; }

    public double getBalance() { return balance != null ? balance : 0.0; }
    public void setBalance(double balance) { this.balance = balance; }

    public int getOldEmpty() { return oldEmpty != null ? oldEmpty : 0; }
    public void setOldEmpty(int oldEmpty) { this.oldEmpty = oldEmpty; }

    public int getBalanceEmpty() { return balanceEmpty != null ? balanceEmpty : 0; }
    public void setBalanceEmpty(int balanceEmpty) { this.balanceEmpty = balanceEmpty; }

    @Column(name = "dynamic_data", columnDefinition = "TEXT")
    private String dynamicData;

    public String getDynamicData() { return dynamicData; }
    public void setDynamicData(String dynamicData) { this.dynamicData = dynamicData; }
}
