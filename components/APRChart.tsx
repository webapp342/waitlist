'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart
} from 'recharts';

// Generate daily data from July 20, 2025 to today
function getDateArray(start: Date, end: Date) {
  const arr = [];
  let dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

const startDate = new Date('2025-07-20');
const today = new Date();
const dateArray = getDateArray(startDate, today);

// Generate dummy APR data for each day
const data = dateArray.map((d, i) => {
  // Simulate some volatility
  const base = 12 + Math.sin(i / 5) * 2 + Math.random() * 0.5;
  const realized = 2 + Math.sin(i / 7) * 0.5 + Math.random() * 0.2;
  const accruing = base - realized;
  return {
    date: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
    totalAPR: Number(base.toFixed(2)),
    realizedAPR: Number(realized.toFixed(2)),
    accruingAPR: Number(accruing.toFixed(2)),
  };
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const APRChart = ({ onDataGenerated }: { onDataGenerated?: (data: any[]) => void }) => {
  React.useEffect(() => {
    if (onDataGenerated) {
      onDataGenerated(data);
    }
  }, [onDataGenerated]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                 <defs>
           <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
             <stop offset="5%" stopColor="#f7ff9b" stopOpacity={0.8}/>
             <stop offset="95%" stopColor="#f7ff9b" stopOpacity={0.1}/>
           </linearGradient>
           <linearGradient id="colorAccruing" x1="0" y1="0" x2="0" y2="1">
             <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
             <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1}/>
           </linearGradient>
         </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                 <XAxis 
           dataKey="date" 
           stroke="#9ca3af" 
           fontSize={9}
           tickLine={false}
           axisLine={false}
           interval={2}
           tick={{ fontSize: 9 }}
         />
                 <YAxis 
           stroke="#9ca3af" 
           fontSize={10}
           tickLine={false}
           axisLine={false}
           domain={[0, 25]}
           ticks={[0, 5, 10, 15, 20, 25]}
           width={35}
           tick={{ fontSize: 10 }}
         />
        <Tooltip content={<CustomTooltip />} />
                 <Area
           type="monotone"
           dataKey="realizedAPR"
           stackId="1"
           stroke="#f7ff9b"
           fill="url(#colorRealized)"
           name="Realized APR"
         />
                  <Area
           type="monotone"
           dataKey="accruingAPR"
           stackId="1"
           stroke="#fbbf24"
           fill="url(#colorAccruing)"
           name="Accruing APR"
         />


       </AreaChart>
    </ResponsiveContainer>
  );
};

export default APRChart; 