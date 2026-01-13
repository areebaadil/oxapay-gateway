// Core Types for CryptoGate Payment Gateway

export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'SETTLED';

export type CoinType = 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'LTC' | 'TRX';

export type UserRole = 'admin' | 'merchant' | 'agent';

export interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  webhookUrl: string;
  feePercentage: number;
  isEnabled: boolean;
  createdAt: Date;
  apiKeyId: string;
}

export interface ApiKey {
  id: string;
  merchantId: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  isActive: boolean;
}

export interface DepositIntent {
  id: string;
  merchantId: string;
  userReference: string;
  coin: CoinType;
  expectedAmount: number;
  callbackUrl: string | null;
  depositPageUrl: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  merchantId: string;
  depositIntentId: string;
  coin: CoinType;
  cryptoAmount: number;
  usdValue: number;
  exchangeRate: number;
  status: TransactionStatus;
  txHash: string | null;
  userReference: string;
  createdAt: Date;
  confirmedAt: Date | null;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  merchantId: string;
  coin: CoinType;
  entryType: 'CREDIT' | 'DEBIT';
  category: 'DEPOSIT' | 'FEE' | 'SETTLEMENT' | 'PROCESSOR_FEE';
  amount: number;
  usdValueAtTime: number;
  description: string;
  createdAt: Date;
}

export interface Settlement {
  id: string;
  merchantId: string;
  coin: CoinType;
  amount: number;
  usdValueAtRequest: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  walletAddress: string;
  requestedAt: Date;
  processedAt: Date | null;
  processedBy: string | null;
}

export interface ExchangeRate {
  coin: CoinType;
  usdRate: number;
  updatedAt: Date;
}

export interface WebhookLog {
  id: string;
  merchantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  attempts: number;
  lastAttemptAt: Date;
  createdAt: Date;
}

export interface AnalyticsData {
  totalVolume: number;
  totalTransactions: number;
  confirmedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalFees: number;
  volumeByDay: { date: string; volume: number; count: number }[];
  volumeByCoin: { coin: CoinType; volume: number; usdVolume: number }[];
}
