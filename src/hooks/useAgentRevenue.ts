import { useMemo } from 'react';
import { useAgent, useAgentMerchants } from './useAgents';
import { useTransactions } from './useTransactions';

export interface MerchantRevenue {
  merchantId: string;
  merchantName: string;
  depositFeeSet: number;
  withdrawalFeeSet: number;
  depositMargin: number;
  withdrawalMargin: number;
  totalVolume: number;
  confirmedVolume: number;
  earnedRevenue: number;
  potentialRevenue: number;
  transactionCount: number;
}

export interface AgentRevenueStats {
  totalEarnedRevenue: number;
  totalPotentialRevenue: number;
  totalVolume: number;
  confirmedVolume: number;
  averageDepositMargin: number;
  averageWithdrawalMargin: number;
  merchantBreakdown: MerchantRevenue[];
  revenueByStatus: {
    confirmed: number;
    pending: number;
    settled: number;
  };
}

export function useAgentRevenue(agentId: string | null) {
  const { data: agent, isLoading: agentLoading } = useAgent(agentId);
  const { data: agentMerchants, isLoading: merchantsLoading } = useAgentMerchants(agentId);
  const { data: allTransactions, isLoading: txLoading } = useTransactions();

  // Agent's platform fees (what the platform charges this agent)
  const agentDepositFee = agent?.deposit_fee_percentage ?? 1.5;
  const agentWithdrawalFee = agent?.withdrawal_fee_percentage ?? 1.5;

  const revenueStats = useMemo<AgentRevenueStats>(() => {
    if (!agentMerchants || !allTransactions) {
      return {
        totalEarnedRevenue: 0,
        totalPotentialRevenue: 0,
        totalVolume: 0,
        confirmedVolume: 0,
        averageDepositMargin: 0,
        averageWithdrawalMargin: 0,
        merchantBreakdown: [],
        revenueByStatus: { confirmed: 0, pending: 0, settled: 0 },
      };
    }

    // Create a map of merchant IDs to their data
    const merchantMap = new Map<string, {
      id: string;
      name: string;
      deposit_fee_percentage: number;
      withdrawal_fee_percentage: number;
    }>();

    agentMerchants.forEach((am: { merchant_id: string; merchant?: { id: string; name: string; deposit_fee_percentage: number; withdrawal_fee_percentage: number } }) => {
      if (am.merchant) {
        merchantMap.set(am.merchant_id, am.merchant);
      }
    });

    const merchantIds = Array.from(merchantMap.keys());
    
    // Filter transactions for this agent's merchants
    const agentTransactions = allTransactions.filter(tx => 
      merchantIds.includes(tx.merchant_id)
    );

    // Calculate revenue per merchant
    const merchantBreakdown: MerchantRevenue[] = [];
    let totalEarnedRevenue = 0;
    let totalPotentialRevenue = 0;
    let totalVolume = 0;
    let confirmedVolume = 0;
    let totalDepositMargin = 0;
    let totalWithdrawalMargin = 0;
    const revenueByStatus = { confirmed: 0, pending: 0, settled: 0 };

    merchantMap.forEach((merchant, merchantId) => {
      const merchantTxs = agentTransactions.filter(tx => tx.merchant_id === merchantId);
      
      // Agent's margin = Merchant fee - Agent's platform fee
      const depositMargin = merchant.deposit_fee_percentage - agentDepositFee;
      const withdrawalMargin = merchant.withdrawal_fee_percentage - agentWithdrawalFee;
      
      let merchantVolume = 0;
      let merchantConfirmedVolume = 0;
      let merchantEarned = 0;
      let merchantPotential = 0;

      merchantTxs.forEach(tx => {
        const usdValue = Number(tx.usd_value);
        merchantVolume += usdValue;

        // Calculate potential revenue from deposit margin on all transactions
        const potentialFromTx = usdValue * (depositMargin / 100);
        merchantPotential += potentialFromTx;

        // Only count earned revenue from confirmed/settled transactions
        if (tx.status === 'CONFIRMED' || tx.status === 'SETTLED') {
          merchantConfirmedVolume += usdValue;
          const earnedFromTx = usdValue * (depositMargin / 100);
          merchantEarned += earnedFromTx;

          if (tx.status === 'CONFIRMED') {
            revenueByStatus.confirmed += earnedFromTx;
          } else if (tx.status === 'SETTLED') {
            revenueByStatus.settled += earnedFromTx;
          }
        } else if (tx.status === 'PENDING') {
          revenueByStatus.pending += potentialFromTx;
        }
      });

      merchantBreakdown.push({
        merchantId,
        merchantName: merchant.name,
        depositFeeSet: merchant.deposit_fee_percentage,
        withdrawalFeeSet: merchant.withdrawal_fee_percentage,
        depositMargin,
        withdrawalMargin,
        totalVolume: merchantVolume,
        confirmedVolume: merchantConfirmedVolume,
        earnedRevenue: merchantEarned,
        potentialRevenue: merchantPotential,
        transactionCount: merchantTxs.length,
      });

      totalEarnedRevenue += merchantEarned;
      totalPotentialRevenue += merchantPotential;
      totalVolume += merchantVolume;
      confirmedVolume += merchantConfirmedVolume;
      totalDepositMargin += depositMargin;
      totalWithdrawalMargin += withdrawalMargin;
    });

    const merchantCount = merchantMap.size || 1;

    return {
      totalEarnedRevenue,
      totalPotentialRevenue,
      totalVolume,
      confirmedVolume,
      averageDepositMargin: totalDepositMargin / merchantCount,
      averageWithdrawalMargin: totalWithdrawalMargin / merchantCount,
      merchantBreakdown: merchantBreakdown.sort((a, b) => b.earnedRevenue - a.earnedRevenue),
      revenueByStatus,
    };
  }, [agentMerchants, allTransactions, agentDepositFee, agentWithdrawalFee]);

  return {
    ...revenueStats,
    agentDepositFee,
    agentWithdrawalFee,
    isLoading: agentLoading || merchantsLoading || txLoading,
  };
}
