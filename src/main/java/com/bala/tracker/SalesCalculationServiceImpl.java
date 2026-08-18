package com.bala.tracker;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class SalesCalculationServiceImpl implements SalesCalculationService {

    @Override
    public BigDecimal calculateItemAmount(BigDecimal quantity, BigDecimal rate) {
        if (quantity == null || rate == null) {
            return BigDecimal.ZERO;
        }
        return quantity.multiply(rate);
    }

    @Override
    public BigDecimal calculateTotalAmount(BigDecimal... amounts) {
        if (amounts == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal amount : amounts) {
            if (amount != null) {
                total = total.add(amount);
            }
        }
        return total;
    }

    @Override
    public BigDecimal calculateCurrentBalance(BigDecimal totalAmount, BigDecimal oldBalance, BigDecimal givenAmount) {
        BigDecimal total = totalAmount != null ? totalAmount : BigDecimal.ZERO;
        BigDecimal old = oldBalance != null ? oldBalance : BigDecimal.ZERO;
        BigDecimal given = givenAmount != null ? givenAmount : BigDecimal.ZERO;

        return total.add(old).subtract(given);
    }

    @Override
    public Integer calculateEmptyBalance(Integer emptyCount, Integer oldEmpty, Integer emptyReturn) {
        int emp = emptyCount != null ? emptyCount : 0;
        int old = oldEmpty != null ? oldEmpty : 0;
        int ret = emptyReturn != null ? emptyReturn : 0;

        return emp + old - ret;
    }
}
