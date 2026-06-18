export type MortgageInput = {
    propertyPrice: number
    downPaymentPercent: number
    annualInterestRatePercent: number
    loanTermYears: number
}

export type MortgageResult = {
    downPaymentAmount: number
    loanAmount: number
    monthlyPayment: number
    totalPayment: number
    totalInterest: number
}

/** 元利均等返済の月次返済額（目安） */
export function calcMortgagePayment(input: MortgageInput): MortgageResult | null {
    const { propertyPrice, downPaymentPercent, annualInterestRatePercent, loanTermYears } = input

    if (!Number.isFinite(propertyPrice) || propertyPrice <= 0) return null
    if (!Number.isFinite(loanTermYears) || loanTermYears <= 0) return null

    const pct = Math.min(100, Math.max(0, downPaymentPercent))
    const downPaymentAmount = Math.round(propertyPrice * (pct / 100))
    const loanAmount = Math.max(0, propertyPrice - downPaymentAmount)
    const months = Math.round(loanTermYears * 12)

    if (loanAmount === 0) {
        return {
            downPaymentAmount,
            loanAmount: 0,
            monthlyPayment: 0,
            totalPayment: downPaymentAmount,
            totalInterest: 0,
        }
    }

    const monthlyRate = annualInterestRatePercent / 100 / 12
    let monthlyPayment: number

    if (monthlyRate <= 0) {
        monthlyPayment = loanAmount / months
    } else {
        const factor = Math.pow(1 + monthlyRate, months)
        monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1)
    }

    monthlyPayment = Math.round(monthlyPayment)
    const loanRepaymentTotal = monthlyPayment * months
    const totalInterest = Math.max(0, Math.round(loanRepaymentTotal - loanAmount))

    return {
        downPaymentAmount,
        loanAmount,
        monthlyPayment,
        totalPayment: downPaymentAmount + loanRepaymentTotal,
        totalInterest,
    }
}
