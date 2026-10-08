// property-balance.model.ts

export interface PropertyBalanceFilter {
  allotteeCode: string;
  district: string;
  marketCommittee: string;
  propertyType: string;
  mandiCategory: string;
  mandi: string;
  plotNumber: string;
  dispatched: boolean;
  installmentPenalty: number;
  balanceDate: string;
}

export interface PropertyInfo {
  allotteeCode: string;
  agencyName: string;
  mandiName: string;
  nameOfAllottee: string;
  plotNo: string;
  address: string;
  sizeOfPlot: string;
  plotType: string;
  allotmentDate: string;
  // allotmentAmount: number;
  finalBidPrice: number;
  auctionDate: string;
}

export interface ReceiptDetail {
  receiptNo: string;
  receiptDate: string;
  draftChequeRtgsNo: string;
  draftChequeRtgsDate: string;
  paymentMode: string;
  bank: string;
  amount: number;
}

export interface InstallmentDetail {
  installmentNo: string;
  dueDate: string;
  dueAmount: number;
  interest: number;
  totalDueAmount: number;
}

export interface InstallmentReceipt {
  receiptNo: string;
  receiptDate: string;
  draftNo: string;
  draftRtgsDate: string;
  paymentMode: string;
  draftRtgsBank: string;
  draftAmount: number;
}

export interface OtherAmountDetail {
  paymentType: string;
  receiptNo: string;
  receiptDate: string;
  draftNo: string;
  draftRtgsDate: string;
  paymentMode: string;
  draftRtgsBank: string;
  draftAmount: number;
}

export interface InterstAndPanalityDetail {
  installmentId: number;
  installmentNo: number;
  dueDate: string;
  installmentAmount: number;
  receiptDate: string;
  receivedAmount: number;
  delayDays: number;
  penalInterest: number;
  penaltyAmount: number;
  totalPenaltyAmount: number;
  extraAmount: number;
}

export interface PropertyBalanceSummary {
  rebate: number;
  totalPaymentReceivedTillDate: number;
  totalBalanceFromSaleOfPlot: number;
  interestOnLateInstallments: number;
  penaltyOnLateInstallments: number;
  totalRecoverableAmount: number;
}

export interface PropertyBalanceResponse {
  propertyInfo: PropertyInfo;
  initialDeposits: ReceiptDetail[];
  dueInstallments: InstallmentDetail[];
  installmentReceipts: InstallmentReceipt[];
  futureInstallments: InstallmentDetail[];
  otherAmounts: OtherAmountDetail[];
  interestAndPenaltyDetails: InterstAndPanalityDetail[];
  summary: PropertyBalanceSummary;
}