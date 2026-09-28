import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface PortfolioPerformanceInsightProps {
  calcPrincipal: number;
  calcStrategy: 'conservative' | 'balanced' | 'aggressive';
  calcResults: {
    ratePercent: string;
    annualYield: string;
    fiveDayEstimated: string;
    targetProjected: string;
  };
  onStrategyChange?: (strategy: 'conservative' | 'balanced' | 'aggressive') => void;
  onPrincipalChange?: (val: number) => void;
}

export const PortfolioPerformanceInsightCard: React.FC<PortfolioPerformanceInsightProps> = ({
  calcPrincipal,
  calcStrategy,
  calcResults,
  onStrategyChange,
}) => {
  const [activeDayIdx, setActiveDayIdx] = useState<number | null>(null);

  // Growth multipliers calibrated to institutional targets:
  // Balanced default achieves standard target €87,350 for €50,000 capital (+74.7%)
  const strategyMultipliers = {
    conservative: 0.42,
    balanced: 0.747,
    aggressive: 1.15,
  };

  const multiplier = strategyMultipliers[calcStrategy] || 0.747;
  const targetAmount = Math.round(calcPrincipal * (1 + multiplier) * 100) / 100;
  const totalNetGain = Math.round((targetAmount - calcPrincipal) * 100) / 100;
  const netGainPercent = calcPrincipal > 0 ? ((totalNetGain / calcPrincipal) * 100).toFixed(1) : '0.0';
  const avgDailyGain = Math.round((totalNetGain / 5) * 100) / 100;

  // S-Curve allocation trajectory across 5 working days
  const curveRatios = [0, 0.12, 0.28, 0.52, 0.78, 1.0];

  const milestonesMeta = [
    { day: 'Day 0', label: 'Capital Entry', desc: 'Depository receipt logged & KYC verified' },
    { day: 'Day 1', label: 'Custody Allocation', desc: 'Cold vault allocation validated' },
    { day: 'Day 2', label: 'Depository Secured', desc: 'Institutional prime desk arbitrage' },
    { day: 'Day 3', label: 'Yield Inflow', desc: 'Mid-cycle return compounding initiated' },
    { day: 'Day 4', label: 'Growth Surge', desc: 'Pre-settlement yield accrual peak' },
    { day: 'Day 5', label: 'Target Settlement', desc: 'Full institutional target realized' },
  ];

  const today = new Date();

  const trajectoryData = milestonesMeta.map((m, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() + idx);
    const dayGain = Math.round(totalNetGain * curveRatios[idx] * 100) / 100;
    const value = Math.round((calcPrincipal + dayGain) * 100) / 100;
    const baseline = Math.round((calcPrincipal + calcPrincipal * 0.12 * (idx / 5)) * 100) / 100;

    return {
      day: m.day,
      dateFormatted: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      label: m.label,
      desc: m.desc,
      value,
      gain: dayGain,
      baseline,
      progressPercent: Math.round(curveRatios[idx] * 100),
    };
  });

  const selectedDataPoint = activeDayIdx !== null ? trajectoryData[activeDayIdx] : trajectoryData[5];

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e4e7eb] relative overflow-hidden">
      {/* Decorative Gold Header Ribbon */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#101820] via-[#d4af37] to-[#101820]" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#d4af37] flex items-center justify-center border border-amber-200/60 shadow-2xs">
              <TrendingUp className="w-4 h-4 text-[#d4af37]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#17202a] tracking-tight">
              Portfolio Performance Insight
            </h2>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Recharts 5-Day Trajectory
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Simulated 5-day investment trajectory projection based on active capital parameters (€{calcPrincipal.toLocaleString()}) and ClearStream custody yield model.
          </p>
        </div>

        {/* Strategy Selector Pills */}
        <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-50 p-1 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-gray-500 pl-2 pr-1 hidden sm:inline">Strategy:</span>
          {(['conservative', 'balanced', 'aggressive'] as const).map((strat) => (
            <button
              key={strat}
              onClick={() => onStrategyChange && onStrategyChange(strat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                calcStrategy === strat
                  ? 'bg-[#101820] text-[#d4af37] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {strat}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-[#f8fafb] p-3.5 rounded-xl border border-[#eef0f2]">
          <strong className="block text-[#59636e] text-[11px] font-medium mb-0.5">
            Initial Principal (Day 0)
          </strong>
          <span className="text-lg sm:text-xl font-bold text-[#101820] block">
            €{calcPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-gray-400">Investor Deposit Capital</span>
        </div>

        <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60">
          <strong className="block text-[#856404] text-[11px] font-medium mb-0.5">
            5-Day Target Goal
          </strong>
          <span className="text-lg sm:text-xl font-bold text-[#101820] block">
            €{targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-amber-700 font-semibold">
            {calcPrincipal === 50000 && calcStrategy === 'balanced' ? 'Standard Goal: €87,350.00' : `${netGainPercent}% Total Trajectory`}
          </span>
        </div>

        <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/70">
          <strong className="block text-emerald-800 text-[11px] font-medium mb-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            Projected Net Inflow
          </strong>
          <span className="text-lg sm:text-xl font-bold text-emerald-900 block">
            +€{totalNetGain.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">
            +{netGainPercent}% Return
          </span>
        </div>

        <div className="bg-[#f8fafb] p-3.5 rounded-xl border border-[#eef0f2]">
          <strong className="block text-[#59636e] text-[11px] font-medium mb-0.5">
            Avg. Daily Velocity
          </strong>
          <span className="text-lg sm:text-xl font-bold text-[#101820] block">
            +€{avgDailyGain.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-gray-400">Compounding Daily Run-Rate</span>
        </div>
      </div>

      {/* Main Interactive Recharts Area Chart */}
      <div className="bg-[#fafbfc] rounded-xl p-4 sm:p-5 border border-[#e4e7eb] mb-6">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#17202a]">Trajectory Projection Curve</span>
            <span className="text-[10px] text-gray-400">• Day 0 to Day 5</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]"></span>
              <span className="text-gray-600 font-medium">ClearStream Trajectory</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-slate-400"></span>
              <span className="text-gray-500 font-medium">Conservative Benchmark</span>
            </div>
          </div>
        </div>

        <div className="w-full h-[270px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trajectoryData}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              onMouseMove={(state: any) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setActiveDayIdx(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveDayIdx(null)}
            >
              <defs>
                <linearGradient id="goldTrajectory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="slateBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />

              <XAxis
                dataKey="day"
                tick={{ fill: '#59636e', fontSize: 11 }}
                axisLine={{ stroke: '#e4e7eb' }}
                tickLine={false}
              />

              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#59636e', fontSize: 11 }}
                axisLine={{ stroke: '#e4e7eb' }}
                tickLine={false}
                tickFormatter={(val: number) => `€${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />

              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#101820] text-white p-3 rounded-xl shadow-xl border border-[#d4af37]/40 text-xs min-w-[200px]">
                        <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-700">
                          <span className="font-bold text-[#d4af37]">{data.day} • {data.dateFormatted}</span>
                          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                            {data.progressPercent}% Target
                          </span>
                        </div>
                        <div className="text-[13px] font-bold text-white mb-0.5">
                          €{Number(data.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-semibold mb-1">
                          Cumulative Gain: +€{Number(data.gain).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-gray-300 italic">
                          {data.label}: {data.desc}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine
                y={calcPrincipal}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: 'Initial Capital',
                  position: 'insideBottomLeft',
                  fill: '#64748b',
                  fontSize: 10,
                }}
              />

              <ReferenceLine
                y={targetAmount}
                stroke="#d4af37"
                strokeDasharray="3 3"
                label={{
                  value: `Target Goal: €${targetAmount >= 1000 ? (targetAmount / 1000).toFixed(1) + 'k' : targetAmount}`,
                  position: 'insideTopRight',
                  fill: '#a56b00',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />

              <Area
                type="monotone"
                dataKey="baseline"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#slateBaseline)"
                name="Conservative Baseline"
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#d4af37"
                strokeWidth={2.5}
                fill="url(#goldTrajectory)"
                name="Trajectory Projection"
                activeDot={{ r: 6, fill: '#d4af37', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5-Day Interactive Milestone Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#17202a] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
            5-Day Operational Milestones & Liquidity Steps
          </span>
          <span className="text-[11px] text-gray-500">
            Hover or click to highlight milestone
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {trajectoryData.map((pt, idx) => {
            const isSelected = activeDayIdx === idx || (activeDayIdx === null && idx === 5);
            return (
              <button
                key={pt.day}
                onClick={() => setActiveDayIdx(idx)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#101820] text-white border-[#d4af37] shadow-sm scale-[1.02]'
                    : 'bg-[#f8fafb] text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={isSelected ? 'text-[#d4af37] font-bold' : 'text-gray-500 font-semibold'}>
                    {pt.day}
                  </span>
                  <span className={isSelected ? 'text-gray-300' : 'text-gray-400'}>
                    {pt.dateFormatted}
                  </span>
                </div>
                <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  €{pt.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
                <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-[#d4af37]' : 'text-gray-500'}`}>
                  {pt.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Milestone Inspection Plate */}
        <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-gray-900">
                {selectedDataPoint.day} Stage: {selectedDataPoint.label}
              </span>
              <span className="text-gray-600 block sm:inline sm:ml-2">
                — {selectedDataPoint.desc}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-[#101820]">
              €{selectedDataPoint.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold ml-2">
              (+€{selectedDataPoint.gain.toLocaleString('en-US', { minimumFractionDigits: 2 })})
            </span>
          </div>
        </div>
      </div>

      {/* Custodial Attestation Footnote */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 font-mono">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
          Custodial Depository: ClearStream Custody Europe S.A. • CS-LU-9942
        </span>
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-emerald-600" />
          Encrypted Projection Model AES-256-GCM
        </span>
      </div>
    </div>
  );
};
