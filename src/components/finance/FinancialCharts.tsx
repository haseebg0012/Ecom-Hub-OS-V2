import React, { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Wallet } from 'lucide-react';

interface BarDataPoint {
  label: string;
  revenue: number;
  expenses: number;
}

interface TrendDataPoint {
  label: string;
  profit: number;
}

interface CategorySlice {
  label: string;
  value: number;
  color: string;
}

interface ClientRevenuePoint {
  clientName: string;
  amount: number;
  percentage: number;
}

// 1. Revenue vs Expenses Comparison Bar Chart
export const RevenueExpenseBarChart: React.FC<{
  data: BarDataPoint[];
  currencySymbol?: string;
}> = ({ data, currencySymbol = 'PKR' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(
    1,
    ...data.map((d) => Math.max(d.revenue, d.expenses))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#4F46E5]" />
            <span className="text-[#64748B] font-medium">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#F43F5E]" />
            <span className="text-[#64748B] font-medium">Operating Expenses</span>
          </div>
        </div>
        <span className="text-[#94A3B8] font-mono text-[11px]">in {currencySymbol}</span>
      </div>

      <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-[#E2E8F0] relative">
        {data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-[#94A3B8]">
            No financial activity in this period.
          </div>
        ) : (
          data.map((item, idx) => {
            const revHeight = (item.revenue / maxValue) * 100;
            const expHeight = (item.expenses / maxValue) * 100;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-14 z-20 bg-[#0F172A] text-white px-2.5 py-1.5 rounded-lg shadow-lg text-[11px] whitespace-nowrap pointer-events-none">
                    <p className="font-semibold text-slate-200">{item.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-400">
                        Rev: {currencySymbol} {item.revenue.toLocaleString()}
                      </span>
                      <span>•</span>
                      <span className="text-rose-400">
                        Exp: {currencySymbol} {item.expenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bars group */}
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${Math.max(4, revHeight)}%` }}
                    className={`w-1/2 max-w-[20px] rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-[#4338CA]' : 'bg-[#4F46E5]'
                    }`}
                  />
                  {/* Expense Bar */}
                  <div
                    style={{ height: `${Math.max(4, expHeight)}%` }}
                    className={`w-1/2 max-w-[20px] rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-[#E11D48]' : 'bg-[#F43F5E]'
                    }`}
                  />
                </div>

                <span className="text-[10px] font-semibold text-[#64748B] mt-2 truncate max-w-full">
                  {item.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// 2. Profit Trend Spline / Area Chart
export const ProfitTrendLineChart: React.FC<{
  data: TrendDataPoint[];
  currencySymbol?: string;
}> = ({ data, currencySymbol = 'PKR' }) => {
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-[#94A3B8]">
        No profit trend data available for selected range.
      </div>
    );
  }

  const values = data.map((d) => d.profit);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const range = maxVal - minVal || 1;

  const width = 500;
  const height = 180;
  const padding = 20;

  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.profit - minVal) / range) * (height - 2 * padding);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#64748B] font-medium">Net Operating Profit Trend</span>
        {hoveredPoint ? (
          <span className="font-bold text-[#4F46E5]">
            {hoveredPoint.label}: {currencySymbol} {hoveredPoint.profit.toLocaleString()}
          </span>
        ) : (
          <span className="text-[#94A3B8] text-[11px]">Hover over nodes to inspect</span>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Zero baseline */}
          {minVal < 0 && (
            <line
              x1={padding}
              y1={height - padding - ((0 - minVal) / range) * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - ((0 - minVal) / range) * (height - 2 * padding)}
              stroke="#CBD5E1"
              strokeDasharray="4 4"
            />
          )}

          {/* Area */}
          <path d={areaD} fill="url(#profitAreaGrad)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-white stroke-[#4F46E5] stroke-[2.5px] hover:scale-150 transition-transform"
                onMouseEnter={() => setHoveredPoint(p.data)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}
        </svg>

        {/* Labels row */}
        <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-2 px-1 border-t border-[#E2E8F0]">
          {data.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. Category Donut Breakdown
export const CategoryDonutChart: React.FC<{
  slices: CategorySlice[];
  totalAmount: number;
  currencySymbol?: string;
}> = ({ slices, totalAmount, currencySymbol = 'PKR' }) => {
  const [activeSlice, setActiveSlice] = useState<CategorySlice | null>(null);

  if (!slices || slices.length === 0 || totalAmount <= 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-[#94A3B8]">
        No categorized expenses recorded in this period.
      </div>
    );
  }

  // Calculate SVG arc paths
  const size = 180;
  const center = size / 2;
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const arcSegments = slices.map((slice) => {
    const ratio = slice.value / totalAmount;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += ratio * circumference;

    return {
      ...slice,
      ratio,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
      {/* Donut SVG */}
      <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {arcSegments.map((seg, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={seg.color || '#4F46E5'}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="butt"
              className="transition-all duration-300 hover:opacity-85 cursor-pointer"
              onMouseEnter={() => setActiveSlice(seg)}
              onMouseLeave={() => setActiveSlice(null)}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-semibold">
            {activeSlice ? activeSlice.label : 'Total Exp'}
          </span>
          <span className="text-sm font-bold text-[#0F172A] tracking-tight">
            {currencySymbol}{' '}
            {activeSlice
              ? activeSlice.value.toLocaleString()
              : totalAmount.toLocaleString()}
          </span>
          {activeSlice && (
            <span className="text-[10px] text-[#4F46E5] font-semibold">
              {Math.round((activeSlice.value / totalAmount) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
        {slices.map((slice, idx) => {
          const pct = Math.round((slice.value / totalAmount) * 100);
          return (
            <div
              key={idx}
              className={`p-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                activeSlice?.label === slice.label ? 'bg-[#EEF2FF]' : 'hover:bg-[#F8FAFC]'
              }`}
              onMouseEnter={() => setActiveSlice(slice)}
              onMouseLeave={() => setActiveSlice(null)}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-[#0F172A] font-medium truncate">{slice.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-[#0F172A]">
                  {currencySymbol} {slice.value.toLocaleString()}
                </span>
                <span className="text-[10px] text-[#64748B] w-8 text-right font-mono">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. Revenue by Client Horizontal Bar Chart
export const ClientRevenueBarChart: React.FC<{
  clients: ClientRevenuePoint[];
  currencySymbol?: string;
}> = ({ clients, currencySymbol = 'PKR' }) => {
  if (!clients || clients.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-xs text-[#94A3B8]">
        No client revenue recorded yet.
      </div>
    );
  }

  const maxAmt = Math.max(1, ...clients.map((c) => c.amount));

  return (
    <div className="space-y-3">
      {clients.map((c, idx) => {
        const barWidth = Math.max(5, (c.amount / maxAmt) * 100);

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0F172A] truncate max-w-[200px]">
                {c.clientName}
              </span>
              <span className="font-bold text-[#0F172A]">
                {currencySymbol} {c.amount.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                style={{ width: `${barWidth}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
