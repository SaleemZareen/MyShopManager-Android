package com.saleemkhan.myshopmanager.utils

import com.saleemkhan.myshopmanager.model.*

data class FbrSummary(
    val sales: Double = 0.0,
    val purchases: Double = 0.0,
    val directExpenses: Double = 0.0,
    val stockValue: Double = 0.0,
    val openingStockValue: Double = 0.0,
    val rawCogs: Double = 0.0,
    val estimatedCogs: Double? = null,
    val grossProfit: Double? = null,
    val netProfit: Double? = null,
    val totalReceivables: Double = 0.0,
    val totalPayables: Double = 0.0,
    val outstandingLoans: Double = 0.0,
    val totalLiabilities: Double = 0.0,
    val totalAssets: Double = 0.0,
    val netWorth: Double = 0.0,
    val ownerCapital: Double? = null,
    val isStockDataMissing: Boolean = false,
    val isStockUnavailable: Boolean = false,
    val cashAndBank: Double = 0.0,
    val totalBusinessAssets: Double = 0.0
) {
    val totalSales: Double get() = sales
    val cogs: Double get() = estimatedCogs ?: rawCogs
    val closingStockValue: Double get() = stockValue
    val totalSupplierPayables: Double get() = totalPayables
    val totalLoans: Double get() = outstandingLoans
}

object TaxEngine {
    fun calculateFbrSummary(state: AppState): FbrSummary {
        val rawTransactions = state.transactions
        val inventory = state.inventory
        val businessAssets = state.businessAssets
        val personalAssets = state.personalAssets
        val loans = state.loans
        val householdExpenses = state.householdExpenses
        val customers = state.customers
        val suppliers = state.suppliers
        val bankAccounts = state.bankAccounts
        val selectedYear = state.taxRecord.selectedTaxYear.ifBlank { "2026" }

        val isWithinPeriod = { dateStr: String? ->
            if (dateStr.isNullOrBlank()) false
            else if (dateStr.length >= 4) dateStr.substring(0, 4) == selectedYear
            else false
        }

        val transactions = rawTransactions.filter { t ->
            if (!isWithinPeriod(t.date)) return@filter false
            val isLoanTx = t.type == TransactionType.LOAN_TAKEN || (t.type == TransactionType.PAYMENT && t.category.equals("LOAN_REPAYMENT", ignoreCase = true))
            if (isLoanTx && t.loanAccountId == null) {
                return@filter false
            }
            true
        }

        val sales = transactions
            .filter { it.type == TransactionType.SALE }
            .sumOf { it.amount }

        val purchases = transactions
            .filter { it.type == TransactionType.PURCHASE }
            .sumOf { it.amount }

        val directExpensesBase = transactions
            .filter { it.type == TransactionType.EXPENSE && !it.category.equals("DRAWINGS", ignoreCase = true) && !it.category.equals("PERSONAL_DRAWINGS", ignoreCase = true) && !it.category.equals("LOAN_REPAYMENT", ignoreCase = true) }
            .sumOf { it.amount }

        val stockAdjustments = transactions.filter { it.category.equals("STOCK_ADJUSTMENT", ignoreCase = true) }
        val negativeAdjustmentsValue = stockAdjustments
            .filter { (it.totalValueChange ?: 0.0) < 0 }
            .sumOf { Math.abs(it.totalValueChange ?: 0.0) }

        val positiveAdjCapital = stockAdjustments
            .filter { (it.totalValueChange ?: 0.0) > 0 && it.balancingTreatment == "CAPITAL_CONTRIBUTION" }
            .sumOf { it.totalValueChange ?: 0.0 }

        val positiveAdjIncome = stockAdjustments
            .filter { (it.totalValueChange ?: 0.0) > 0 && it.balancingTreatment == "OTHER_INCOME" }
            .sumOf { it.totalValueChange ?: 0.0 }

        val positiveAdjPastError = stockAdjustments
            .filter { (it.totalValueChange ?: 0.0) > 0 && it.balancingTreatment == "PAST_ERROR_CORRECTION" }
            .sumOf { it.totalValueChange ?: 0.0 }

        val positiveAdjUnknown = stockAdjustments
            .filter { (it.totalValueChange ?: 0.0) > 0 && (it.balancingTreatment == null || it.balancingTreatment == "UNKNOWN") }
            .sumOf { it.totalValueChange ?: 0.0 }

        val positiveAdjustmentsValue = positiveAdjCapital + positiveAdjIncome + positiveAdjPastError + positiveAdjUnknown

        val directExpenses = directExpensesBase + negativeAdjustmentsValue

        val isStockDataMissing = inventory.isEmpty()
        val stockValue = inventory.sumOf { it.quantity * it.purchasePrice }
        val openingStockValue = inventory.sumOf { it.openingStock * it.purchasePrice }

        val rawCogs = openingStockValue + purchases - stockValue - negativeAdjustmentsValue + positiveAdjustmentsValue
        val isCogsNegative = !isStockDataMissing && rawCogs < 0
        val isStockUnavailable = isStockDataMissing || isCogsNegative

        val estimatedCogs = if (isStockUnavailable) null else rawCogs
        val grossProfit = if (isStockUnavailable) null else (sales - rawCogs)
        val netProfit = if (isStockUnavailable) null else (sales + positiveAdjIncome - rawCogs - directExpenses)

        val totalReceivables = customers.sumOf { it.totalCredit }
        val totalPayables = suppliers.sumOf { it.totalPayable }

        val outstandingLoans = loans.sumOf { it.outstandingAmount }
        val totalLiabilities = outstandingLoans + totalPayables

        val businessAssetValue = businessAssets.sumOf { it.currentValue }
        val personalAssetValue = personalAssets.sumOf { it.value }
        val totalCashAndBank = bankAccounts.sumOf { it.balance }

        val totalBusinessAssets = businessAssetValue + (if (isStockUnavailable) 0.0 else stockValue) + totalReceivables + totalCashAndBank
        val totalAssets = totalBusinessAssets + personalAssetValue
        val netWorth = totalAssets - totalLiabilities

        val openingOwnerEquity = (state.taxRecord.openingOwnerEquity[selectedYear] ?: 120000.0) + positiveAdjPastError
        val capitalIntroduced = transactions
            .filter { it.type == TransactionType.RECEIPT && (it.category.contains("CAPITAL", ignoreCase = true) || it.category.contains("OWNER", ignoreCase = true)) }
            .sumOf { it.amount } + positiveAdjCapital

        val drawings = householdExpenses.personalDrawings + transactions
            .filter { it.type == TransactionType.PAYMENT && (it.category.contains("DRAWINGS", ignoreCase = true)) }
            .sumOf { it.amount }

        val closingOwnerEquity = if (isStockUnavailable) null else (openingOwnerEquity + capitalIntroduced + (netProfit ?: 0.0) - drawings)

        return FbrSummary(
            sales = sales,
            purchases = purchases,
            directExpenses = directExpenses,
            stockValue = stockValue,
            openingStockValue = openingStockValue,
            rawCogs = rawCogs,
            estimatedCogs = estimatedCogs,
            grossProfit = grossProfit,
            netProfit = netProfit,
            totalReceivables = totalReceivables,
            totalPayables = totalPayables,
            outstandingLoans = outstandingLoans,
            totalLiabilities = totalLiabilities,
            totalAssets = totalAssets,
            netWorth = netWorth,
            ownerCapital = closingOwnerEquity,
            isStockDataMissing = isStockDataMissing,
            isStockUnavailable = isStockUnavailable,
            cashAndBank = totalCashAndBank,
            totalBusinessAssets = totalBusinessAssets
        )
    }
}
