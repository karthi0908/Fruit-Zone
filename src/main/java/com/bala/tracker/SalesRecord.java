package com.bala.tracker;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "sales_records")
public class SalesRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "shop_name", nullable = false)
    private String shopName;

    @Column(name = "govya", precision = 15, scale = 2)
    private BigDecimal govya;

    @Column(name = "grapes", precision = 15, scale = 2)
    private BigDecimal grapes;

    @Column(name = "sapota", precision = 15, scale = 2)
    private BigDecimal sapota;

    @Column(name = "govya_rate", precision = 15, scale = 2)
    private BigDecimal govyaRate;

    @Column(name = "grapes_rate", precision = 15, scale = 2)
    private BigDecimal grapesRate;

    @Column(name = "sapota_rate", precision = 15, scale = 2)
    private BigDecimal sapotaRate;

    @Column(name = "govya_amount", precision = 15, scale = 2)
    private BigDecimal govyaAmount;

    @Column(name = "grapes_amount", precision = 15, scale = 2)
    private BigDecimal grapesAmount;

    @Column(name = "sapota_amount", precision = 15, scale = 2)
    private BigDecimal sapotaAmount;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "given_amount", precision = 15, scale = 2)
    private BigDecimal givenAmount;

    @Column(name = "old_balance", precision = 15, scale = 2)
    private BigDecimal oldBalance;

    @Column(name = "balance", precision = 15, scale = 2)
    private BigDecimal balance;

    @Column(name = "empty")
    private Integer empty;

    @Column(name = "empty_return")
    private Integer emptyReturn;

    @Column(name = "old_empty")
    private Integer oldEmpty;

    @Column(name = "balance_empty")
    private Integer balanceEmpty;

    @Column(name = "dynamic_data", columnDefinition = "TEXT")
    private String dynamicData;

    public SalesRecord() {
    }

    public SalesRecord(LocalDate recordDate, String shopName) {
        this.recordDate = recordDate;
        this.shopName = shopName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getRecordDate() {
        return recordDate;
    }

    public void setRecordDate(LocalDate recordDate) {
        this.recordDate = recordDate;
    }

    public String getShopName() {
        return shopName;
    }

    public void setShopName(String shopName) {
        this.shopName = shopName;
    }

    public BigDecimal getGovya() {
        return govya;
    }

    public void setGovya(BigDecimal govya) {
        this.govya = govya;
    }

    public BigDecimal getGrapes() {
        return grapes;
    }

    public void setGrapes(BigDecimal grapes) {
        this.grapes = grapes;
    }

    public BigDecimal getSapota() {
        return sapota;
    }

    public void setSapota(BigDecimal sapota) {
        this.sapota = sapota;
    }

    public BigDecimal getGovyaRate() {
        return govyaRate;
    }

    public void setGovyaRate(BigDecimal govyaRate) {
        this.govyaRate = govyaRate;
    }

    public BigDecimal getGrapesRate() {
        return grapesRate;
    }

    public void setGrapesRate(BigDecimal grapesRate) {
        this.grapesRate = grapesRate;
    }

    public BigDecimal getSapotaRate() {
        return sapotaRate;
    }

    public void setSapotaRate(BigDecimal sapotaRate) {
        this.sapotaRate = sapotaRate;
    }

    public BigDecimal getGovyaAmount() {
        return govyaAmount;
    }

    public void setGovyaAmount(BigDecimal govyaAmount) {
        this.govyaAmount = govyaAmount;
    }

    public BigDecimal getGrapesAmount() {
        return grapesAmount;
    }

    public void setGrapesAmount(BigDecimal grapesAmount) {
        this.grapesAmount = grapesAmount;
    }

    public BigDecimal getSapotaAmount() {
        return sapotaAmount;
    }

    public void setSapotaAmount(BigDecimal sapotaAmount) {
        this.sapotaAmount = sapotaAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getGivenAmount() {
        return givenAmount;
    }

    public void setGivenAmount(BigDecimal givenAmount) {
        this.givenAmount = givenAmount;
    }

    public BigDecimal getOldBalance() {
        return oldBalance;
    }

    public void setOldBalance(BigDecimal oldBalance) {
        this.oldBalance = oldBalance;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public Integer getEmpty() {
        return empty;
    }

    public void setEmpty(Integer empty) {
        this.empty = empty;
    }

    public Integer getEmptyReturn() {
        return emptyReturn;
    }

    public void setEmptyReturn(Integer emptyReturn) {
        this.emptyReturn = emptyReturn;
    }

    public Integer getOldEmpty() {
        return oldEmpty;
    }

    public void setOldEmpty(Integer oldEmpty) {
        this.oldEmpty = oldEmpty;
    }

    public Integer getBalanceEmpty() {
        return balanceEmpty;
    }

    public void setBalanceEmpty(Integer balanceEmpty) {
        this.balanceEmpty = balanceEmpty;
    }

    public String getDynamicData() {
        return dynamicData;
    }

    public void setDynamicData(String dynamicData) {
        this.dynamicData = dynamicData;
    }
}
