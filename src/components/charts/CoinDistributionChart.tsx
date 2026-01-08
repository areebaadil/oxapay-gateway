import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CoinType } from '@/types';

interface CoinDistributionChartProps {
  data: { coin: CoinType; volume: number; usdVolume: number }[];
}

const COLORS: Record<CoinType, string> = {
  BTC: 'hsl(43, 96%, 56%)',
  ETH: 'hsl(240, 60%, 60%)',
  USDT: 'hsl(160, 84%, 39%)',
  USDC: 'hsl(210, 100%, 50%)',
  LTC: 'hsl(210, 15%, 60%)',
  TRX: 'hsl(0, 72%, 55%)',
};

export function CoinDistributionChart({ data }: CoinDistributionChartProps) {
  const chartData = data.map(item => ({
    name: item.coin,
    value: item.usdVolume,
    volume: item.volume,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell 
                key={`cell-${entry.name}`} 
                fill={COLORS[entry.name as CoinType]} 
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(222, 47%, 10%)',
              border: '1px solid hsl(217, 33%, 18%)',
              borderRadius: '8px',
              boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.3)',
            }}
            formatter={(value: number, name: string, props: any) => [
              `$${value.toLocaleString()} (${props.payload.volume.toFixed(4)} ${name})`,
              name
            ]}
          />
          <Legend 
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: 'hsl(215, 20%, 65%)', fontSize: '12px' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
