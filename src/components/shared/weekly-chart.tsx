'use client'

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import { WeeklyPerformance } from '@/types/dashboard'

export interface WeeklyChartProps {
  data: WeeklyPerformance[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as WeeklyPerformance
    const isProfit = data.pnl >= 0
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-lg text-xs space-y-1">
        <p className="font-bold text-foreground">{label}</p>
        <p
          className={`font-mono font-extrabold ${
            isProfit ? 'text-profit' : 'text-loss'
          }`}
        >
          PnL: {isProfit ? '+' : ''}${data.pnl.toFixed(2)}
        </p>
        <p className="text-muted-foreground text-[11px]">
          Total: {data.tradesCount} Transaksi
        </p>
      </div>
    )
  }
  return null
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-base font-bold text-foreground">
          Performa PnL Mingguan
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Akumulasi profit/loss per minggu dalam bulan berjalan
        </p>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="weekName"
              stroke="#8B93A1"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8B93A1"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#252A33" strokeDasharray="3 3" />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
