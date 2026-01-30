import { cn } from '@/lib/utils';
import { CoinType } from '@/types';

interface CoinBadgeProps {
  coin: CoinType;
  showIcon?: boolean;
  className?: string;
}

// Only USDT is supported, but keep other configs for legacy data display
const coinConfig: Record<CoinType, { icon: string; className: string }> = {
  USDT: {
    icon: '₮',
    className: 'coin-usdt',
  },
  // Legacy coins (for historical data display only)
  BTC: {
    icon: '₿',
    className: 'coin-btc',
  },
  ETH: {
    icon: 'Ξ',
    className: 'coin-eth',
  },
  USDC: {
    icon: '$',
    className: 'coin-usdt',
  },
  LTC: {
    icon: 'Ł',
    className: 'bg-[hsl(210_15%_50%/0.15)] text-[hsl(210_15%_65%)] border-[hsl(210_15%_50%/0.3)]',
  },
  TRX: {
    icon: '◈',
    className: 'bg-[hsl(0_72%_51%/0.15)] text-[hsl(0_72%_61%)] border-[hsl(0_72%_51%/0.3)]',
  },
  JAZZCASH: {
    icon: 'J',
    className: 'bg-[hsl(348_83%_47%/0.15)] text-[hsl(348_83%_57%)] border-[hsl(348_83%_47%/0.3)]',
  },
};

export function CoinBadge({ coin, showIcon = true, className }: CoinBadgeProps) {
  const config = coinConfig[coin];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border font-mono',
        config.className,
        className
      )}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {coin}
    </span>
  );
}
