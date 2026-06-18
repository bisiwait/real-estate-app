'use client'

import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { calcMortgagePayment } from '@/lib/mortgage/calcMortgagePayment'

type MortgageDict = {
    mortgage_simulator_title?: string
    mortgage_simulator_desc?: string
    mortgage_property_price?: string
    mortgage_down_payment?: string
    mortgage_loan_amount?: string
    mortgage_interest_rate?: string
    mortgage_loan_term?: string
    mortgage_loan_term_years?: string
    mortgage_monthly_payment?: string
    mortgage_total_interest?: string
    mortgage_total_payment?: string
    mortgage_disclaimer?: string
}

type MortgageSimulatorProps = {
    salePrice: number
    dict: MortgageDict
    locale: string
}

const DEFAULT_DOWN_PAYMENT_PERCENT = 20
const DEFAULT_INTEREST_RATE = 5.5
const DEFAULT_LOAN_TERM_YEARS = 20

function formatThb(value: number, locale: string): string {
    return `${value.toLocaleString(locale === 'jp' ? 'ja-JP' : locale === 'th' ? 'th-TH' : 'en-US')} ฿`
}

function loanTermLabel(dict: MortgageDict, years: number): string {
    const template = dict.mortgage_loan_term_years ?? '{n}'
    return template.replace('{n}', String(years))
}

export default function MortgageSimulator({ salePrice, dict, locale }: MortgageSimulatorProps) {
    const [downPaymentPercent, setDownPaymentPercent] = useState(DEFAULT_DOWN_PAYMENT_PERCENT)
    const [interestRate, setInterestRate] = useState(DEFAULT_INTEREST_RATE)
    const [loanTermYears, setLoanTermYears] = useState(DEFAULT_LOAN_TERM_YEARS)

    const result = useMemo(
        () =>
            calcMortgagePayment({
                propertyPrice: salePrice,
                downPaymentPercent,
                annualInterestRatePercent: interestRate,
                loanTermYears,
            }),
        [salePrice, downPaymentPercent, interestRate, loanTermYears]
    )

    const fieldClass =
        'w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-[#1A2B56] outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100'

    return (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-normal text-[#2A4076] mb-2 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                {dict.mortgage_simulator_title}
            </h2>
            <p className="text-[12px] text-slate-400 mb-8 leading-relaxed">{dict.mortgage_simulator_desc}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {dict.mortgage_property_price}
                    </label>
                    <div className="rounded-xl border border-blue-100/60 bg-[#F8FAFF] px-4 py-3 text-sm font-bold text-[#1A2B56] tabular-nums">
                        {formatThb(salePrice, locale)}
                    </div>
                </div>

                <div>
                    <label htmlFor="mortgage-down-payment" className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {dict.mortgage_down_payment} ({downPaymentPercent}%)
                    </label>
                    <input
                        id="mortgage-down-payment"
                        type="range"
                        min={0}
                        max={80}
                        step={5}
                        value={downPaymentPercent}
                        onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                        className="w-full accent-[#2A4076]"
                    />
                    <div className="mt-2 text-sm font-bold text-[#1A2B56] tabular-nums">
                        {formatThb(result?.downPaymentAmount ?? 0, locale)}
                    </div>
                </div>

                <div>
                    <label htmlFor="mortgage-interest-rate" className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {dict.mortgage_interest_rate}
                    </label>
                    <input
                        id="mortgage-interest-rate"
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                        className={fieldClass}
                    />
                </div>

                <div>
                    <label htmlFor="mortgage-loan-term" className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {dict.mortgage_loan_term}
                    </label>
                    <select
                        id="mortgage-loan-term"
                        value={loanTermYears}
                        onChange={(e) => setLoanTermYears(Number(e.target.value))}
                        className={fieldClass}
                    >
                        {[5, 10, 15, 20, 25, 30].map((years) => (
                            <option key={years} value={years}>
                                {loanTermLabel(dict, years)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="rounded-2xl border border-blue-100/60 bg-gradient-to-br from-[#F8FAFF] to-white p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {dict.mortgage_loan_amount}
                        </p>
                        <p className="text-lg font-bold text-[#1A2B56] tabular-nums">
                            {formatThb(result?.loanAmount ?? 0, locale)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {dict.mortgage_monthly_payment}
                        </p>
                        <p className="text-3xl font-normal text-[#1A2B56] tabular-nums leading-none">
                            {formatThb(result?.monthlyPayment ?? 0, locale)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {dict.mortgage_total_interest}
                        </p>
                        <p className="text-base font-bold text-slate-600 tabular-nums">
                            {formatThb(result?.totalInterest ?? 0, locale)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {dict.mortgage_total_payment}
                        </p>
                        <p className="text-base font-bold text-slate-600 tabular-nums">
                            {formatThb(result?.totalPayment ?? 0, locale)}
                        </p>
                    </div>
                </div>
            </div>

            <p className="mt-5 text-[11px] text-slate-400 leading-relaxed">{dict.mortgage_disclaimer}</p>
        </div>
    )
}
