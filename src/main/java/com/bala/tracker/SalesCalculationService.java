package com.bala.tracker;

import java.math.BigDecimal;

public interface SalesCalculationService {

    BigDecimal calculateItemAmount(BigDecimal quantity, BigDecimal rate);

    BigDecimal calculateTotalAmount(BigDecimal... amounts);

    BigDecimal calculateCurrentBalance(BigDecimal totalAmount, BigDecimal oldBalance, BigDecimal givenAmount);

    Integer calculateEmptyBalance(Integer emptyCount, Integer oldEmpty, Integer emptyReturn);
}
