import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TrendPoint {
  date: string;
  count: number;
}

interface SessionsTrendChartProps {
  data: TrendPoint[];
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl shadow-premium-lg border border-gray-200 text-xs">
      <p className="font-semibold text-gray-700 mb-1 font-mono">{label}</p>
      <p className="font-mono font-semibold text-skyglow-600">{payload[0].value} sessions</p>
    </div>
  );
};

const SessionsTrendChart: React.FC<SessionsTrendChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="sessionsTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a5a5a" stopOpacity={0.4} />
            <stop offset="55%" stopColor="#5a5a5a" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#5a5a5a" stopOpacity={0} />
          </linearGradient>
          <filter id="sessionsTrendGlow" x="-40%" y="-100%" width="180%" height="300%">
            <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#5a5a5a" floodOpacity="0.45" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="#e5e5e5" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#8a8a8a', fontFamily: 'IBM Plex Mono' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => (v ? v.slice(5) : v)}
          interval="preserveStartEnd"
        />
        <YAxis hide domain={[0, 'dataMax + 2']} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#5a5a5a', strokeWidth: 1, strokeDasharray: '3 4' }} />
        <Area
          type="monotone"
          dataKey="count"
          name="Sessions"
          stroke="#5a5a5a"
          strokeWidth={2.5}
          fill="url(#sessionsTrendFill)"
          animationDuration={1200}
          animationEasing="ease-out"
          style={{ filter: 'url(#sessionsTrendGlow)' }}
          activeDot={{ r: 5, fill: '#5a5a5a', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default SessionsTrendChart;
