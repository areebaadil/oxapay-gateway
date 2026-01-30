import { 
  Transaction, 
  Merchant, 
  Settlement, 
  LedgerEntry, 
  AnalyticsData,
  CoinType,
  TransactionStatus 
} from '@/types';

// Mock Merchants
export const mockMerchants: Merchant[] = [
  {
    id: 'merch_001',
    name: 'GameFi Exchange',
    email: 'admin@gamefi.io',
    webhookUrl: 'https://gamefi.io/webhooks/payments',
    feePercentage: 1.5,
    isEnabled: true,
    createdAt: new Date('2024-01-15'),
    apiKeyId: 'key_001',
  },
  {
    id: 'merch_002',
    name: 'NFT Marketplace Pro',
    email: 'payments@nftpro.com',
    webhookUrl: 'https://api.nftpro.com/crypto-webhook',
    feePercentage: 2.0,
    isEnabled: true,
    createdAt: new Date('2024-02-20'),
    apiKeyId: 'key_002',
  },
  {
    id: 'merch_003',
    name: 'DeFi Solutions',
    email: 'treasury@defi-solutions.io',
    webhookUrl: 'https://defi-solutions.io/hooks/deposit',
    feePercentage: 1.0,
    isEnabled: false,
    createdAt: new Date('2024-03-10'),
    apiKeyId: 'key_003',
  },
  {
    id: 'merch_004',
    name: 'CryptoTrader Hub',
    email: 'finance@cryptotraderhub.com',
    webhookUrl: 'https://cryptotraderhub.com/api/webhooks',
    feePercentage: 1.75,
    isEnabled: true,
    createdAt: new Date('2024-04-05'),
    apiKeyId: 'key_004',
  },
];

// Mock Transactions - All USDT
export const mockTransactions: Transaction[] = [
  {
    id: 'tx_001',
    merchantId: 'merch_001',
    depositIntentId: 'dep_001',
    coin: 'USDT',
    cryptoAmount: 2345.67,
    usdValue: 2345.67,
    exchangeRate: 1.00,
    status: 'CONFIRMED',
    txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    userReference: 'user_12345',
    createdAt: new Date('2025-01-07T10:30:00'),
    confirmedAt: new Date('2025-01-07T10:45:00'),
  },
  {
    id: 'tx_002',
    merchantId: 'merch_001',
    depositIntentId: 'dep_002',
    coin: 'USDT',
    cryptoAmount: 2875.00,
    usdValue: 2875.00,
    exchangeRate: 1.00,
    status: 'PENDING',
    txHash: null,
    userReference: 'user_67890',
    createdAt: new Date('2025-01-08T09:15:00'),
    confirmedAt: null,
  },
  {
    id: 'tx_003',
    merchantId: 'merch_002',
    depositIntentId: 'dep_003',
    coin: 'USDT',
    cryptoAmount: 5000.00,
    usdValue: 5000.00,
    exchangeRate: 1.00,
    status: 'CONFIRMED',
    txHash: '0xabcdef1234567890abcdef1234567890abcdef34',
    userReference: 'buyer_001',
    createdAt: new Date('2025-01-07T14:20:00'),
    confirmedAt: new Date('2025-01-07T14:25:00'),
  },
  {
    id: 'tx_004',
    merchantId: 'merch_002',
    depositIntentId: 'dep_004',
    coin: 'USDT',
    cryptoAmount: 5410.00,
    usdValue: 5410.00,
    exchangeRate: 1.00,
    status: 'FAILED',
    txHash: null,
    userReference: 'buyer_002',
    createdAt: new Date('2025-01-06T16:45:00'),
    confirmedAt: null,
  },
  {
    id: 'tx_005',
    merchantId: 'merch_004',
    depositIntentId: 'dep_005',
    coin: 'USDT',
    cryptoAmount: 8625.00,
    usdValue: 8625.00,
    exchangeRate: 1.00,
    status: 'CONFIRMED',
    txHash: '0x9876543210fedcba9876543210fedcba98765432',
    userReference: 'trader_abc',
    createdAt: new Date('2025-01-08T08:00:00'),
    confirmedAt: new Date('2025-01-08T08:20:00'),
  },
  {
    id: 'tx_006',
    merchantId: 'merch_001',
    depositIntentId: 'dep_006',
    coin: 'USDT',
    cryptoAmount: 1500.00,
    usdValue: 1500.00,
    exchangeRate: 1.00,
    status: 'SETTLED',
    txHash: '0xfedcba0987654321fedcba0987654321fedcba09',
    userReference: 'user_99999',
    createdAt: new Date('2025-01-05T11:30:00'),
    confirmedAt: new Date('2025-01-05T11:35:00'),
  },
  {
    id: 'tx_007',
    merchantId: 'merch_004',
    depositIntentId: 'dep_007',
    coin: 'USDT',
    cryptoAmount: 1162.50,
    usdValue: 1162.50,
    exchangeRate: 1.00,
    status: 'EXPIRED',
    txHash: null,
    userReference: 'trader_xyz',
    createdAt: new Date('2025-01-04T20:00:00'),
    confirmedAt: null,
  },
  {
    id: 'tx_008',
    merchantId: 'merch_002',
    depositIntentId: 'dep_008',
    coin: 'USDT',
    cryptoAmount: 1120.00,
    usdValue: 1120.00,
    exchangeRate: 1.00,
    status: 'PENDING',
    txHash: null,
    userReference: 'collector_001',
    createdAt: new Date('2025-01-08T12:00:00'),
    confirmedAt: null,
  },
];

// Mock Settlements - All USDT
export const mockSettlements: Settlement[] = [
  {
    id: 'set_001',
    merchantId: 'merch_001',
    coin: 'USDT',
    amount: 6492.07,
    usdValueAtRequest: 6492.07,
    status: 'PENDING',
    walletAddress: 'TJYXRvfR5C6xY1uyPJB8p1bC7iSmKWZvKr',
    requestedAt: new Date('2025-01-08T10:00:00'),
    processedAt: null,
    processedBy: null,
  },
  {
    id: 'set_002',
    merchantId: 'merch_002',
    coin: 'USDT',
    amount: 12500.00,
    usdValueAtRequest: 12500.00,
    status: 'APPROVED',
    walletAddress: 'TJYXRvfR5C6xY1uyPJB8p1bC7iSmKWZvKr',
    requestedAt: new Date('2025-01-07T14:30:00'),
    processedAt: new Date('2025-01-08T09:00:00'),
    processedBy: 'admin_001',
  },
  {
    id: 'set_003',
    merchantId: 'merch_004',
    coin: 'USDT',
    amount: 12075.00,
    usdValueAtRequest: 12075.00,
    status: 'COMPLETED',
    walletAddress: 'TJYXRvfR5C6xY1uyPJB8p1bC7iSmKWZvKr',
    requestedAt: new Date('2025-01-05T16:00:00'),
    processedAt: new Date('2025-01-06T11:00:00'),
    processedBy: 'admin_001',
  },
  {
    id: 'set_004',
    merchantId: 'merch_001',
    coin: 'USDT',
    amount: 4600.00,
    usdValueAtRequest: 4600.00,
    status: 'REJECTED',
    walletAddress: 'TJYXRvfR5C6xY1uyPJB8p1bC7iSmKWZvKr',
    requestedAt: new Date('2025-01-04T08:00:00'),
    processedAt: new Date('2025-01-04T12:00:00'),
    processedBy: 'admin_001',
  },
];

// Mock Ledger Entries - All USDT
export const mockLedgerEntries: LedgerEntry[] = [
  {
    id: 'led_001',
    transactionId: 'tx_001',
    merchantId: 'merch_001',
    coin: 'USDT',
    entryType: 'CREDIT',
    category: 'DEPOSIT',
    amount: 2345.67,
    usdValueAtTime: 2345.67,
    description: 'Deposit from user_12345',
    createdAt: new Date('2025-01-07T10:45:00'),
  },
  {
    id: 'led_002',
    transactionId: 'tx_001',
    merchantId: 'merch_001',
    coin: 'USDT',
    entryType: 'DEBIT',
    category: 'FEE',
    amount: 35.19,
    usdValueAtTime: 35.19,
    description: 'Platform fee (1.5%)',
    createdAt: new Date('2025-01-07T10:45:00'),
  },
  {
    id: 'led_003',
    transactionId: 'tx_003',
    merchantId: 'merch_002',
    coin: 'USDT',
    entryType: 'CREDIT',
    category: 'DEPOSIT',
    amount: 5000.00,
    usdValueAtTime: 5000.00,
    description: 'Deposit from buyer_001',
    createdAt: new Date('2025-01-07T14:25:00'),
  },
  {
    id: 'led_004',
    transactionId: 'tx_003',
    merchantId: 'merch_002',
    coin: 'USDT',
    entryType: 'DEBIT',
    category: 'FEE',
    amount: 100.00,
    usdValueAtTime: 100.00,
    description: 'Platform fee (2.0%)',
    createdAt: new Date('2025-01-07T14:25:00'),
  },
  {
    id: 'led_005',
    transactionId: 'tx_005',
    merchantId: 'merch_004',
    coin: 'USDT',
    entryType: 'CREDIT',
    category: 'DEPOSIT',
    amount: 8625.00,
    usdValueAtTime: 8625.00,
    description: 'Deposit from trader_abc',
    createdAt: new Date('2025-01-08T08:20:00'),
  },
  {
    id: 'led_006',
    transactionId: 'tx_005',
    merchantId: 'merch_004',
    coin: 'USDT',
    entryType: 'DEBIT',
    category: 'FEE',
    amount: 150.94,
    usdValueAtTime: 150.94,
    description: 'Platform fee (1.75%)',
    createdAt: new Date('2025-01-08T08:20:00'),
  },
];

// Analytics Data Generator
export const getAnalyticsData = (merchantId?: string): AnalyticsData => {
  const filteredTx = merchantId 
    ? mockTransactions.filter(tx => tx.merchantId === merchantId)
    : mockTransactions;

  const confirmedTx = filteredTx.filter(tx => tx.status === 'CONFIRMED' || tx.status === 'SETTLED');
  
  const totalVolume = confirmedTx.reduce((sum, tx) => sum + tx.usdValue, 0);
  const totalFees = totalVolume * 0.015; // Average fee

  // Volume by day (last 7 days)
  const volumeByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayTx = confirmedTx.filter(tx => 
      tx.createdAt.toISOString().split('T')[0] === dateStr
    );
    return {
      date: dateStr,
      volume: dayTx.reduce((sum, tx) => sum + tx.usdValue, 0),
      count: dayTx.length,
    };
  });

  // Volume by coin - Only USDT
  const coins: CoinType[] = ['USDT'];
  const volumeByCoin = coins.map(coin => {
    const coinTx = confirmedTx.filter(tx => tx.coin === coin);
    return {
      coin,
      volume: coinTx.reduce((sum, tx) => sum + tx.cryptoAmount, 0),
      usdVolume: coinTx.reduce((sum, tx) => sum + tx.usdValue, 0),
    };
  }).filter(c => c.volume > 0);

  return {
    totalVolume,
    totalTransactions: filteredTx.length,
    confirmedTransactions: confirmedTx.length,
    pendingTransactions: filteredTx.filter(tx => tx.status === 'PENDING').length,
    failedTransactions: filteredTx.filter(tx => tx.status === 'FAILED').length,
    totalFees,
    volumeByDay,
    volumeByCoin,
  };
};

// Exchange Rates - Only USDT
export const exchangeRates = {
  USDT: 1.00,
};
