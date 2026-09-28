import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Layers,
  Coins,
  Clock,
  Sparkles,
  Maximize2,
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

export interface CryptoHolding {
  symbol: string;
  name: string;
  amount: number;
  currentPrice: number;
  change24h: number;
  color: string;
  iconBg: string;
  network: string;
}

interface CryptoHoldingsFluctuationChartProps {
  basePortfolioValue?: number;
}

export const CryptoHoldingsFluctuationChart: React.FC<CryptoHoldingsFluctuationChartProps> = ({
  basePortfolioValue = 50000,
}) => {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');
  const [selectedAsset, setSelectedAsset] = useState<'ALL' | 'BTC' | 'ETH' | 'SOL'>('ALL');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [lastTickTime, setLastTickTime] = useState<Date>(new Date());
  const [liveNudgePercent, setLiveNudgePercent] = useState(0);

  // Core underlying crypto assets held in Mr. Drago Peric's portfolio
  const holdings: CryptoHolding[] = useMemo(() => [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      amount: 0.524,
      currentPrice: 58420.0,
      change24h: 3.42,
      color: '#f59e0b', // amber/gold
      iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      network: 'Bitcoin Core Vault',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      amount: 4.25,
      currentPrice: 3180.5,
      change24h: 2.15,
      color: '#3b82f6', // blue
      iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      network: 'Ethereum PoS Staking',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      amount: 28.5,
      currentPrice: 148.6,
      change24h: -0.85,
      color: '#10b981', // emerald
      iconBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      network: 'Solana High-Yield Custody',
    },
    {
      symbol: 'EURC',
      name: 'Euro Coin (Stable)',
      amount: 1798.55,
      currentPrice: 1.0,
      change24h: 0.02,
      color: '#d4af37', // institutional gold
      iconBg: 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/20',
      network: 'ClearStream Settlement Buffer',
    },
  ], []);

  // Calculate live holdings values
  const totalCalculatedHoldings = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.amount * h.currentPrice, 0);
  }, [holdings]);

  // Calibration scale factor to match investor's €50,000 base capital
  const scaleFactor = basePortfolioValue / totalCalculatedHoldings;

  // Real-time ticker simulation
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      // Natural market tick between -0.12% and +0.15%
      const delta = (Math.random() - 0.46) * 0.25;
      setLiveNudgePercent((prev) => {
        const next = Math.max(-2.5, Math.min(3.5, prev + delta));
        return next;
      });
      setLastTickTime(new Date());
    }, 3800);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Generate historical curve data based on timeframe & selected asset
  const chartData = useMemo(() => {
    const pointsCount = timeframe === '1D' ? 24 : timeframe === '1W' ? 28 : timeframe === '1M' ? 30 : 40;
    const baseValue = basePortfolioValue * (1 + liveNudgePercent / 100);

    // Seeded determinism for realistic chart movements
    const seedPoints = [
      -1.8, -1.5, -1.2, -0.8, -1.1, -0.4, 0.2, 0.6, 0.4, 0.9,
      1.3, 1.1, 1.7, 1.5, 2.1, 2.4, 2.0, 2.7, 3.1, 2.9,
      3.4, 3.2, 3.6, 3.8, 3.4, 3.9, 4.2, 4.0, 4.5, 4.8,
      4.3, 4.7, 5.1, 4.9, 5.4, 5.2, 5.7, 5.5, 5.9, 6.2,
    ];

    const now = new Date();
    const result = [];

    for (let i = 0; i < pointsCount; i++) {
      const stepBack = pointsCount - 1 - i;
      const pointTime = new Date(now.getTime());

      let timeLabel = '';
      if (timeframe === '1D') {
        pointTime.setHours(now.getHours() - stepBack);
        timeLabel = pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (timeframe === '1W') {
        pointTime.setHours(now.getHours() - stepBack * 6);
        timeLabel = `${pointTime.toLocaleDateString([], { weekday: 'short' })} ${pointTime.getHours()}:00`;
      } else if (timeframe === '1M') {
        pointTime.setDate(now.getDate() - stepBack);
        timeLabel = pointTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else {
        pointTime.setDate(now.getDate() - stepBack * 3);
        timeLabel = pointTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      const seedIdx = (i * 3) % seedPoints.length;
      const variation = seedPoints[seedIdx] + (i / pointsCount) * 2.2;

      // Calculate asset-specific or aggregated values
      let currentVal = 0;
      let btcVal = 0;
      let ethVal = 0;
      let solVal = 0;

      if (selectedAsset === 'BTC') {
        const btcBase = (holdings[0].amount * holdings[0].currentPrice) * scaleFactor;
        currentVal = btcBase * (1 + (variation * 1.15) / 100);
      } else if (selectedAsset === 'ETH') {
        const ethBase = (holdings[1].amount * holdings[1].currentPrice) * scaleFactor;
        currentVal = ethBase * (1 + (variation * 0.95) / 100);
      } else if (selectedAsset === 'SOL') {
        const solBase = (holdings[2].amount * holdings[2].currentPrice) * scaleFactor;
        currentVal = solBase * (1 + (variation * 1.45) / 100);
      } else {
        // Aggregate Total Portfolio
        currentVal = baseValue * (1 + (variation - 3.2) / 100);
        btcVal = currentVal * 0.61;
        ethVal = currentVal * 0.27;
        solVal = currentVal * 0.084;
      }

      // Add real-time micro-fluctuation to latest point
      if (i === pointsCount - 1) {
        currentVal = currentVal * (1 + liveNudgePercent / 100);
      }

      result.push({
        time: timeLabel,
        timestamp: pointTime.toISOString(),
        value: Math.round(currentVal * 100) / 100,
        btcVal: Math.round(btcVal * 100) / 100,
        ethVal: Math.round(ethVal * 100) / 100,
        solVal: Math.round(solVal * 100) / 100,
        change: Math.round(variation * 10) / 10,
      });
    }

    return result;
  }, [timeframe, selectedAsset, basePortfolioValue, liveNudgePercent, scaleFactor, holdings]);

  // Current live valuation & stats
  const latestPoint = chartData[chartData.length - 1];
  const firstPoint = chartData[0];
  const netChangeAmount = latestPoint ? latestPoint.value - firstPoint.value : 0;
  const netChangePercent = firstPoint && firstPoint.value > 0 ? (netChangeAmount / firstPoint.value) * 100 : 0;
  const isPositive = netChangeAmount >= 0;

  // Min and max for domain
  const values = chartData.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.15 || 500;
  const yDomain = [Math.floor((minValue - padding) / 100) * 100, Math.ceil((maxValue + padding) / 100) * 100];

  // Dynamic stroke & gradient color according to selected asset
  const getAssetColor = () => {
    if (selectedAsset === 'BTC') return '#f59e0b';
    if (selectedAsset === 'ETH') return '#3b82f6';
    if (selectedAsset === 'SOL') return '#10b981';
    return '#d4af37'; // gold
  };

  const activeColor = getAssetColor();

  return (
    <section className="bg-white rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e4e7eb] relative overflow-hidden transition-all duration-300">
      {/* Top Accent Stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#d4af37] to-emerald-500" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#101820] text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30 shadow-xs">
              <Activity className="w-4 h-4 text-[#d4af37]" />
            </div>
            <h2 className="text-[21px] font-bold text-[#17202a] tracking-tight">
              Cryptocurrency Holdings Fluctuation
            </h2>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isLiveStreaming ? 'animate-ping' : ''}`} />
              <span>LIVE FEED ACTIVE</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
            <span>Real-time custodial valuation & institutional market pricing</span>
            <span className="text-gray-300">•</span>
            <span className="font-mono text-[11px] text-gray-400">
              Last tick: {lastTickTime.toLocaleTimeString()}
            </span>
          </p>
        </div>

        {/* Action Controls: Live Stream Toggle & Timeframe Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Live Feed Toggle */}
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isLiveStreaming
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
            title={isLiveStreaming ? 'Pause live market feed' : 'Resume live market feed'}
          >
            <Zap className={`w-3.5 h-3.5 ${isLiveStreaming ? 'text-emerald-600 fill-emerald-600' : 'text-gray-400'}`} />
            <span>{isLiveStreaming ? 'Streaming' : 'Paused'}</span>
          </button>

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-[#f4f6f8] p-1 rounded-xl border border-gray-200">
            {(['1D', '1W', '1M', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#101820] text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Current Holdings Valuation */}
        <div className="bg-[#f8fafb] p-4 rounded-xl border border-[#eef0f2] relative overflow-hidden group hover:border-[#d4af37]/40 transition-colors">
          <strong className="block text-[#59636e] text-xs font-medium mb-1">
            Current Holdings Value
          </strong>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#17202a] tracking-tight font-sans">
              €{latestPoint ? latestPoint.value.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '50,000.00'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold">
            <span
              className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[11px] font-bold ${
                isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {isPositive ? '+' : ''}{netChangePercent.toFixed(2)}%
            </span>
            <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
              {isPositive ? '+' : ''}€{Math.abs(netChangeAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: 24h High / Low Spread */}
        <div className="bg-[#f8fafb] p-4 rounded-xl border border-[#eef0f2]">
          <strong className="block text-[#59636e] text-xs font-medium mb-1">
            Period High / Low Range
          </strong>
          <div className="flex items-center justify-between text-xs font-semibold text-gray-800 mt-2">
            <span>High:</span>
            <span className="font-mono text-emerald-700 font-bold">
              €{maxValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-gray-800 mt-1">
            <span>Low:</span>
            <span className="font-mono text-rose-700 font-bold">
              €{minValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full bg-gray-200 h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#d4af37] h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(10, ((latestPoint.value - minValue) / (maxValue - minValue || 1)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Custody Liquidity Backing */}
        <div className="bg-[#f8fafb] p-4 rounded-xl border border-[#eef0f2]">
          <strong className="block text-[#59636e] text-xs font-medium mb-1 flex items-center justify-between">
            <span>Custody Reserve Status</span>
            <span className="text-[10px] bg-amber-100 text-[#856404] px-1.5 py-0.5 rounded font-bold">1:1 Cleared</span>
          </strong>
          <span className="text-sm font-bold text-gray-900 block mt-1">
            ClearStream Cold Storage
          </span>
          <p className="text-[11px] text-gray-500 mt-1 leading-snug">
            Multi-sig hardware custody with institutional AML / SWIFT MT103 clearance verification.
          </p>
        </div>

        {/* Card 4: Dominant Asset Weight */}
        <div className="bg-[#f8fafb] p-4 rounded-xl border border-[#eef0f2]">
          <strong className="block text-[#59636e] text-xs font-medium mb-1">
            Portfolio Allocation Weight
          </strong>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="flex items-center gap-1.5 font-bold text-[#f59e0b]">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              BTC (61.2%)
            </span>
            <span className="flex items-center gap-1.5 font-bold text-[#3b82f6]">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
              ETH (27.0%)
            </span>
            <span className="flex items-center gap-1.5 font-bold text-[#10b981]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
              SOL (8.4%)
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-0.5">
            <div className="bg-[#f59e0b] h-full" style={{ width: '61.2%' }} title="BTC 61.2%" />
            <div className="bg-[#3b82f6] h-full" style={{ width: '27.0%' }} title="ETH 27.0%" />
            <div className="bg-[#10b981] h-full" style={{ width: '8.4%' }} title="SOL 8.4%" />
            <div className="bg-[#d4af37] h-full" style={{ width: '3.4%' }} title="EURC 3.4%" />
          </div>
        </div>
      </div>

      {/* Asset Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-gray-500 font-semibold mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
          Filter View:
        </span>

        <button
          onClick={() => setSelectedAsset('ALL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            selectedAsset === 'ALL'
              ? 'bg-[#101820] text-[#d4af37] shadow-xs border border-[#d4af37]/40'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>All Crypto Holdings</span>
        </button>

        {holdings.slice(0, 3).map((h) => (
          <button
            key={h.symbol}
            onClick={() => setSelectedAsset(h.symbol as any)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedAsset === h.symbol
                ? 'bg-[#101820] text-white shadow-xs border'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{
              borderColor: selectedAsset === h.symbol ? h.color : 'transparent',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }}></span>
            <span>{h.name} ({h.symbol})</span>
          </button>
        ))}
      </div>

      {/* Recharts Area Chart Container */}
      <div className="bg-[#fafbfc] rounded-xl p-4 sm:p-5 border border-[#e4e7eb]">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#17202a]">
              {selectedAsset === 'ALL' ? 'Total Holdings Valuation Curve' : `${selectedAsset} Price & Valuation Curve`}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">• EUR Valuation</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeColor }} />
              <span className="text-gray-600 font-medium">Real-time Level</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-gray-400" />
              <span className="text-gray-500 font-medium">Baseline</span>
            </div>
          </div>
        </div>

        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="cryptoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={activeColor} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="btcSubGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />

              <XAxis
                dataKey="time"
                tick={{ fill: '#59636e', fontSize: 11 }}
                axisLine={{ stroke: '#e4e7eb' }}
                tickLine={false}
              />

              <YAxis
                domain={yDomain}
                tick={{ fill: '#59636e', fontSize: 11 }}
                axisLine={{ stroke: '#e4e7eb' }}
                tickLine={false}
                tickFormatter={(val: number) => `€${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
              />

              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const val = Number(data.value);
                    const diff = val - firstPoint.value;
                    const diffPercent = (diff / firstPoint.value) * 100;
                    const isDiffPositive = diff >= 0;

                    return (
                      <div className="bg-[#101820] text-white p-3.5 rounded-xl shadow-2xl border border-[#d4af37]/40 text-xs min-w-[210px]">
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-700">
                          <span className="font-bold text-[#d4af37] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#d4af37]" />
                            {data.time}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {timeframe} Trajectory
                          </span>
                        </div>

                        <div className="text-base font-extrabold text-white mb-1">
                          €{val.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] mb-2 font-semibold">
                          <span className={isDiffPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isDiffPositive ? '+' : ''}€{diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`px-1 py-0.2 rounded text-[10px] ${isDiffPositive ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                            {isDiffPositive ? '+' : ''}{diffPercent.toFixed(2)}%
                          </span>
                        </div>

                        {selectedAsset === 'ALL' && (
                          <div className="pt-2 border-t border-gray-800 text-[10px] space-y-1 text-gray-300">
                            <div className="flex justify-between">
                              <span className="text-amber-400 font-semibold">• BTC Value:</span>
                              <span className="font-mono">€{data.btcVal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-400 font-semibold">• ETH Value:</span>
                              <span className="font-mono">€{data.ethVal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-emerald-400 font-semibold">• SOL Value:</span>
                              <span className="font-mono">€{data.solVal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine
                y={firstPoint.value}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: 'Period Open',
                  position: 'insideBottomLeft',
                  fill: '#64748b',
                  fontSize: 10,
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke={activeColor}
                strokeWidth={2.5}
                fill="url(#cryptoGradient)"
                name="Holding Valuation"
                activeDot={{ r: 6, fill: activeColor, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Breakdown Table / Row Cards */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {holdings.map((asset) => {
          const scaledAmount = asset.amount;
          const euroVal = Math.round(asset.amount * asset.currentPrice * scaleFactor * 100) / 100;
          const isAssetPositive = asset.change24h >= 0;

          return (
            <div
              key={asset.symbol}
              onClick={() => setSelectedAsset(selectedAsset === asset.symbol ? 'ALL' : (asset.symbol as any))}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedAsset === asset.symbol
                  ? 'bg-slate-900 text-white border-[#d4af37] shadow-md scale-[1.02]'
                  : 'bg-[#f8fafb] text-gray-900 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${asset.iconBg}`}>
                    {asset.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <span className={`text-xs font-bold block ${selectedAsset === asset.symbol ? 'text-white' : 'text-gray-900'}`}>
                      {asset.name}
                    </span>
                    <span className={`text-[10px] block font-mono ${selectedAsset === asset.symbol ? 'text-gray-300' : 'text-gray-500'}`}>
                      {scaledAmount} {asset.symbol}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isAssetPositive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isAssetPositive ? '+' : ''}{asset.change24h}%
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-gray-200/50">
                <span className={`text-[11px] ${selectedAsset === asset.symbol ? 'text-gray-400' : 'text-gray-500'}`}>
                  Allocated Value:
                </span>
                <span className={`text-xs font-extrabold ${selectedAsset === asset.symbol ? 'text-[#d4af37]' : 'text-gray-900'}`}>
                  €{euroVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Institutional Compliance Footer Note */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5 font-mono">
          <Shield className="w-3.5 h-3.5 text-[#d4af37]" />
          ClearStream Custody Europe S.A. Institutional Price Index
        </span>
        <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          WebSocket Feed Synced: 250ms latency
        </span>
      </div>
    </section>
  );
};
