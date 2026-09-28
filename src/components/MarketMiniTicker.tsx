import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Activity,
  ShieldCheck,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';

interface TickerAsset {
  symbol: string;
  name: string;
  icon: string;
  iconBg: string;
  priceEUR: number;
  priceUSD: number;
  change24h: number;
  prevPriceEUR: number;
  high24hEUR: number;
  low24hEUR: number;
  lastDirection: 'up' | 'down' | 'neutral';
  history: number[];
  unit?: string;
}

export const MarketMiniTicker: React.FC = () => {
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [pollingActive, setPollingActive] = useState<boolean>(true);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(3000);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [flashAsset, setFlashAsset] = useState<string | null>(null);
  const [tickCount, setTickCount] = useState<number>(0);

  // Initial reference market values (calibrated to institutional 2026 spot benchmarks)
  const [assets, setAssets] = useState<Record<string, TickerAsset>>({
    BTC: {
      symbol: 'BTC',
      name: 'Bitcoin Core',
      icon: '₿',
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      priceEUR: 59420.50,
      priceUSD: 64770.00,
      change24h: 3.42,
      prevPriceEUR: 59420.50,
      high24hEUR: 60180.00,
      low24hEUR: 58210.00,
      lastDirection: 'up',
      history: [58210, 58650, 58400, 58920, 59110, 59420],
    },
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum Staked',
      icon: 'Ξ',
      iconBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      priceEUR: 3245.80,
      priceUSD: 3538.00,
      change24h: 2.18,
      prevPriceEUR: 3245.80,
      high24hEUR: 3290.00,
      low24hEUR: 3160.00,
      lastDirection: 'up',
      history: [3160, 3190, 3215, 3200, 3230, 3245],
    },
    XAU: {
      symbol: 'XAU',
      name: 'Gold (Oz Spot)',
      icon: 'Au',
      iconBg: 'bg-[#d4af37]/15 text-[#996d00] border-[#d4af37]/30',
      priceEUR: 2486.40,
      priceUSD: 2710.20,
      change24h: 0.85,
      prevPriceEUR: 2486.40,
      high24hEUR: 2498.00,
      low24hEUR: 2465.00,
      lastDirection: 'up',
      history: [2465, 2470, 2478, 2482, 2480, 2486],
      unit: '/oz',
    },
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated polling engine
  const executePollTick = () => {
    setAssets((prev) => {
      // Pick random asset to nudge or slightly update all
      const assetKeys = Object.keys(prev);
      const chosenKey = assetKeys[Math.floor(Math.random() * assetKeys.length)];

      const updated = { ...prev };

      assetKeys.forEach((key) => {
        const item = prev[key];
        const isSelected = key === chosenKey || Math.random() > 0.4;

        if (!isSelected) return;

        // Volatility profile: BTC ±0.18%, ETH ±0.22%, Gold ±0.06%
        let maxDelta = 0.0018;
        if (key === 'ETH') maxDelta = 0.0022;
        if (key === 'XAU') maxDelta = 0.0006;

        const deltaFactor = (Math.random() - 0.48) * 2 * maxDelta;
        const newPriceEUR = Math.round((item.priceEUR * (1 + deltaFactor)) * 100) / 100;
        const eurUsdRate = 1.09;
        const newPriceUSD = Math.round((newPriceEUR * eurUsdRate) * 100) / 100;

        const direction: 'up' | 'down' | 'neutral' =
          newPriceEUR > item.priceEUR ? 'up' : newPriceEUR < item.priceEUR ? 'down' : 'neutral';

        const newHistory = [...item.history.slice(1), newPriceEUR];
        const newHigh = Math.max(item.high24hEUR, newPriceEUR);
        const newLow = Math.min(item.low24hEUR, newPriceEUR);

        // Micro-drift on 24h change
        const changeDrift = (Math.random() - 0.48) * 0.08;
        const newChange24h = Math.round((item.change24h + changeDrift) * 100) / 100;

        updated[key] = {
          ...item,
          prevPriceEUR: item.priceEUR,
          priceEUR: newPriceEUR,
          priceUSD: newPriceUSD,
          change24h: newChange24h,
          lastDirection: direction,
          high24hEUR: newHigh,
          low24hEUR: newLow,
          history: newHistory,
        };
      });

      setFlashAsset(chosenKey);
      setTimeout(() => setFlashAsset(null), 900);

      return updated;
    });

    setLastUpdated(new Date());
    setTickCount((c) => c + 1);
  };

  useEffect(() => {
    if (!pollingActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      executePollTick();
    }, pollIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollingActive, pollIntervalMs]);

  // Mini sparkline renderer
  const renderSparkline = (points: number[], color: string) => {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 64;
    const height = 24;

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible opacity-80">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#e4e7eb] relative overflow-hidden">
      {/* Decorative top hairline */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-[#d4af37] to-blue-500" />

      {/* Header with Live Polling Status and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-[#101820] text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30 shadow-xs">
            <Activity className="w-3.5 h-3.5 text-[#d4af37]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#17202a] tracking-tight flex items-center gap-2">
              <span>Institutional Spot Ticker</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                BTC • ETH • GOLD
              </span>
            </h3>
          </div>
        </div>

        {/* Polling Controls & Currency Toggle */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Polling Indicator Pill */}
          <button
            onClick={() => setPollingActive(!pollingActive)}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              pollingActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={pollingActive ? 'Click to pause simulated polling' : 'Click to resume simulated polling'}
          >
            <span className={`w-2 h-2 rounded-full ${pollingActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            <span className="text-[11px]">
              {pollingActive ? `Polling: ${(pollIntervalMs / 1000).toFixed(0)}s` : 'Paused'}
            </span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={executePollTick}
            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            title="Poll Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pollingActive ? 'hover:rotate-180 transition-transform' : ''}`} />
          </button>

          {/* Polling Speed selector dropdown/pill */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 text-[11px] font-bold">
            {[2000, 3000, 5000].map((ms) => (
              <button
                key={ms}
                onClick={() => setPollIntervalMs(ms)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                  pollIntervalMs === ms
                    ? 'bg-[#101820] text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 text-[11px] font-bold">
            <button
              onClick={() => setCurrency('EUR')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                currency === 'EUR'
                  ? 'bg-[#d4af37] text-[#101820] shadow-2xs font-extrabold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              EUR (€)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                currency === 'USD'
                  ? 'bg-[#d4af37] text-[#101820] shadow-2xs font-extrabold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* Three Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.values(assets).map((asset) => {
          const isFlashing = flashAsset === asset.symbol;
          const isUp = asset.change24h >= 0;
          const isLastUp = asset.lastDirection === 'up';
          const price = currency === 'EUR' ? asset.priceEUR : asset.priceUSD;
          const currencySymbol = currency === 'EUR' ? '€' : '$';

          const strokeColor =
            asset.symbol === 'BTC' ? '#f59e0b' : asset.symbol === 'ETH' ? '#3b82f6' : '#d4af37';

          return (
            <div
              key={asset.symbol}
              className={`rounded-xl p-3.5 border transition-all duration-300 relative overflow-hidden ${
                isFlashing
                  ? isLastUp
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                    : 'bg-rose-50/70 border-rose-300 shadow-sm'
                  : 'bg-[#f8fafb] border-[#e9ebed] hover:border-gray-300 hover:bg-white'
              }`}
            >
              {/* Flash glow marker */}
              {isFlashing && (
                <div
                  className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl pointer-events-none -mr-6 -mt-6 ${
                    isLastUp ? 'bg-emerald-400/30' : 'bg-rose-400/30'
                  }`}
                />
              )}

              {/* Asset Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${asset.iconBg}`}
                  >
                    {asset.icon}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      {asset.symbol}
                    </span>
                    <span className="text-[10px] text-gray-500 block leading-tight">
                      {asset.name}
                    </span>
                  </div>
                </div>

                {/* 24h Change badge */}
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isUp
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-600" />
                    )}
                    {isUp ? '+' : ''}{asset.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Main Price Display & Sparkline */}
              <div className="flex items-end justify-between mt-2 pt-1 border-t border-gray-200/60">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-extrabold text-[#101820] tracking-tight font-mono">
                      {currencySymbol}{price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {asset.unit && (
                      <span className="text-[11px] font-medium text-gray-500">
                        {asset.unit}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <span>Range:</span>
                    <span className="font-mono text-gray-600">
                      {currencySymbol}{Math.round(currency === 'EUR' ? asset.low24hEUR : asset.low24hEUR * 1.09)} - {currencySymbol}{Math.round(currency === 'EUR' ? asset.high24hEUR : asset.high24hEUR * 1.09)}
                    </span>
                  </div>
                </div>

                {/* Micro Sparkline */}
                <div className="flex flex-col items-end">
                  {renderSparkline(asset.history, strokeColor)}
                  <span className="text-[9px] text-gray-400 font-mono mt-0.5">
                    Live Drift
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footnote Bar with Source Attribution & Latency */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[#a56b00]">
            <ShieldCheck className="w-3 h-3 text-[#d4af37]" />
            LSEG Institutional Spot Feed & ClearStream Liquidity Desk
          </span>
          <span className="text-gray-300">•</span>
          <span>Ticks Logged: {tickCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span>Sync: {lastUpdated.toLocaleTimeString()} (Simulated Poller)</span>
        </div>
      </div>
    </div>
  );
};
