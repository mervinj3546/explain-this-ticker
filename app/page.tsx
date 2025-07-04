/* eslint-disable @next/next/no-img-element */
'use client'

import TradingViewMiniWidget from './TradingViewMiniWidget';
import TradingViewFullWidget from './TradingViewFullWidget';
import TradingViewTechnicalAnalysis from './TradingViewTechnicalAnalysis';
import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { Pie } from 'react-chartjs-2';
import { Bar } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ChartDataLabels
);
// Candlestick chart component using lightweight-charts
type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

type TechnicalAnalysis = {
  ema9?: number | null;
  ema9Array?: number[];
  ema21?: number | null;
  ema21Array?: number[];
  ema34?: number | null;
  ema34Array?: number[];
  ema50?: number | null;
  ema50Array?: number[];
  ema100?: number | null;
  ema100Array?: number[];
  ema200?: number | null;
  ema200Array?: number[];
  macd?: number | null;
  macdArray?: number[];
  macdSignal?: number | null;
  macdSignalArray?: number[];
  obv?: number | null;
  obvHistory?: number[];
  emaTrendAnnotation?: {
    color: string;
    message: string;
  };
  candles?: Candle[];
};


type ApiResponse = {
  ticker: string;
  quote: {
    c: number;
    h: number;
    l: number;
    o: number;
    pc: number;
  };
  news: {
    headline: string;
    summary: string;
    url: string;
    datetime: number;
  }[];
  ytd: {
    priceOnJan1: number | null;
    yearHigh: number | null;
    yearLow: number | null;
    growthPct: number | null;
  };
  sentiment?: {
    title: string;
    text: string;
    subreddit: string;
    permalink: string;
    sentiment: string;
  }[];
  technicalAnalysis?: TechnicalAnalysis;
  aiSummary?: string | Record<string, string> | null;
  stocktwitsSummary?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  stocktwitsPosts?: {
    id: number;
    body: string;
    sentiment?: string;
  }[];
};

export default function Home() {
  const [ticker, setTicker] = useState<string>('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('basic');
  // aiSummary can be string, object, null, or undefined (while loading)
  const [aiSummary, setAiSummary] = useState<string | Record<string, string> | null | undefined>(undefined);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!ticker) return;
    const normalizedTicker = ticker.trim().toUpperCase();
    setLoading(true);
    setAiSummary(undefined); // Reset AI summary when fetching new ticker
    try {
      const res = await fetch(`/api/basic?ticker=${normalizedTicker}`);
      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error:", errorData.error);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) {
        // Show the actual error message from backend (not just generic)
        console.error("API responded with error:", data.error);
        setLoading(false);
        return;
      }
      setData(data);
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch AI summary only when switching to 'ai' tab and only if not already fetched
  useEffect(() => {
    if (
      activeTab === 'ai' &&
      data &&
      typeof aiSummary === 'undefined' &&
      ticker.trim()
    ) {
      const fetchAiSummary = async () => {
        setAiLoading(true);
        try {
          const res = await fetch(`/api/ai-summary`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticker: ticker.trim().toUpperCase(),
              data,
            }),
          });

          if (!res.ok) {
            throw new Error("API returned non-200");
          }

          const json = await res.json();
          // Accept string, object, or null
          setAiSummary(
            typeof json.aiSummary === 'string' || json.aiSummary === null
              ? json.aiSummary
              : typeof json.aiSummary === 'object' && json.aiSummary !== null
                ? json.aiSummary as Record<string, string>
                : null
          );
        } catch (e) {
          console.error(e);
          setAiSummary(null);
        } finally {
          setAiLoading(false);
        }
      };

      fetchAiSummary();
    }
  }, [activeTab, data, ticker, aiSummary]);

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">🧠 Explain This Ticker</h1>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Enter a ticker (e.g. AAPL)"
        className="border px-4 py-2 rounded w-full mb-4"
      />
      <button
        onClick={handleSubmit}
        className="button-blue"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Explain'}
      </button>

      {data && (
        <>
          <div className="flex space-x-4 mt-6 border-b border-gray-700">
            {['basic', 'ai', 'news', 'technical', 'sentiment'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-3 border-b-2 ${activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                {tab === 'basic' && 'Basic stock details'}
                {tab === 'ai' && 'AI summary'}
                {tab === 'news' && 'News'}
                {tab === 'technical' && 'Technical analysis'}
                {tab === 'sentiment' && 'Sentiment analysis'}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === 'basic' && (
              <>
                {/* TradingView mini widget at the top */}
                <section className="mb-6">
                  {/* Mini TradingView widget */}
                  <TradingViewMiniWidget ticker={ticker.trim().toUpperCase()} />
                </section>
                {/* Cards in the middle row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#1E1E1E] p-4 rounded">
                    <h2 className="text-lg font-semibold mb-2">Price details</h2>
                    <p>
                      Current Price:{' '}
                      <span className={
                        data.quote.c !== null && data.quote.pc !== null && data.quote.c > data.quote.pc
                          ? 'text-green-500'
                          : data.quote.c !== null && data.quote.pc !== null && data.quote.c < data.quote.pc
                          ? 'text-red-500'
                          : 'text-white'
                      }>
                        {data.quote.c}
                      </span>
                    </p>
                    <p>High: {data.quote.h}</p>
                    <p>Low: {data.quote.l}</p>
                    <p>Open: {data.quote.o}</p>
                    <p>Previous Close: {data.quote.pc}</p>
                  </div>
                  <div className="bg-[#1E1E1E] p-4 rounded">
                    <h2 className="text-lg font-semibold mb-2">Year to date (2025)</h2>
                    <p>
                      Growth:{' '}
                      <span className={
                        data.ytd.growthPct !== null && data.ytd.growthPct > 0
                          ? 'text-green-500'
                          : data.ytd.growthPct !== null && data.ytd.growthPct < 0
                          ? 'text-red-500'
                          : 'text-white'
                      }>
                        {data.ytd.growthPct !== null
                          ? data.ytd.growthPct.toFixed(2) + '%'
                          : 'N/A'}
                      </span>
                    </p>
                    <p>Price on Jan 1st: {data.ytd.priceOnJan1 ?? 'N/A'}</p>
                    <p>Year High: {data.ytd.yearHigh ?? 'N/A'}</p>
                    <p>Year Low: {data.ytd.yearLow ?? 'N/A'}</p>
                  </div>
                </div>
                {/* Full TradingView chart below the cards */}
                <section className="mt-4">
                  <TradingViewFullWidget ticker={ticker.trim().toUpperCase()} />
                </section>
              </>
            )}

            {activeTab === 'ai' && (
              <div className="text-white bg-[#1E1E1E] p-4 rounded">
                {/* Stock logo above AI summary */}
                {ticker.trim() && (
                  <img
                    src={`https://storage.googleapis.com/iex/api/logos/${ticker.trim().toUpperCase()}.png`}
                    alt={`${ticker.trim().toUpperCase()} logo`}
                    className="h-12 w-12 mb-4"
                  />
                )}
                {aiLoading && (
                  <div className="flex justify-center items-center py-8">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"></path>
                    </svg>
                  </div>
                )}
                {/* Render AI summary object if present, otherwise string fallback */}
                {!aiLoading && aiSummary && typeof aiSummary === 'object' && aiSummary !== null && (
                  <div className="prose prose-invert space-y-4">
                    {Object.entries(aiSummary).map(([section, value]) => {
                      // Only render string values, skip references/empty
                      if (
                        section.toLowerCase() === 'references' ||
                        typeof value !== 'string' ||
                        !value.trim() ||
                        ['n/a', 'data not available', 'data not provided'].includes(value.trim().toLowerCase())
                      ) {
                        return null;
                      }
                      // Emoji map with explicit mapping for News Commentary, Valuation Outlook, Risks
                      const emojiMap: Record<string, string> = {
                        'investment thesis': '💡',
                        'business overview': '🏢',
                        'key drivers': '⚡',
                        'technical analysis': '📈',
                        'sentiment & news commentary': '📰',
                        'news commentary': '📰',
                        'valuation & financial outlook': '💰',
                        'valuation outlook': '💰',
                        'valuation': '💰',
                        'risks & bear case': '⚠️',
                        'risks': '⚠️',
                        'verdict & recommendation': '✅',
                        'recommendation summary': '📋',
                      };
                      // Normalize section name for emoji lookup
                      const sectionNormalized = section
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .trim();
                      const sectionLower = sectionNormalized.toLowerCase();
                      // Always show emoji for News Commentary, Valuation Outlook, Risks
                      const emoji =
                        emojiMap[sectionLower]
                        || (sectionLower.includes('news commentary') ? '📰'
                            : sectionLower.includes('valuation outlook') || sectionLower.includes('valuation') ? '💰'
                            : sectionLower.includes('risks') ? '⚠️'
                            : (sectionLower.startsWith('verdict') ? '✅'
                              : sectionLower.startsWith('recommendation') ? '📋'
                              : ''));

                      let textColor = 'text-white';
                      if (
                        sectionLower === 'verdict' ||
                        sectionLower.startsWith('verdict')
                      ) {
                        const verdictLower = value.toLowerCase();
                        textColor =
                          verdictLower.includes('buy') ? 'text-green-500'
                          : verdictLower.includes('sell') ? 'text-red-500'
                          : verdictLower.includes('hold') ? 'text-orange-400'
                          : 'text-white';
                      }
                      return (
                        <div key={section}>
                          <h3 className="text-base font-bold capitalize mb-1">
                            {emoji && <span className="mr-2">{emoji}</span>}
                            {sectionNormalized}
                          </h3>
                          <p className={textColor}>{value}</p>
                        </div>
                      );
                    })}
                    {/* Copy JSON button (icon only, no label) */}
                    {Object.keys(aiSummary).length > 0 && (
                      <button
                        className="mt-4 flex items-center px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
                        style={{ gap: '0.5em' }}
                        title="Copy AI Summary JSON"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(aiSummary, null, 2));
                        }}
                      >
                        <i className="fa fa-copy" aria-hidden="true"></i>
                      </button>
                    )}
                  </div>
                )}
                {!aiLoading && aiSummary && typeof aiSummary === 'string' && (
                  <div className="prose prose-invert">
                    {aiSummary}
                    {aiSummary.trim() && (
                      <button
                        className="mt-4 flex items-center px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
                        style={{ gap: '0.5em' }}
                        title="Copy AI Summary"
                        onClick={() => {
                          navigator.clipboard.writeText(aiSummary);
                        }}
                      >
                        <i className="fa fa-copy" aria-hidden="true"></i>
                      </button>
                    )}
                  </div>
                )}
                {!aiLoading && aiSummary === null && (
                  <div className="text-red-400 mt-4">
                    Failed to load AI summary.
                    <button
                      className="ml-2 underline text-blue-400"
                      onClick={() => setAiSummary(undefined)}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'news' && data.news && (
              <div>
                <h2 className="text-xl font-bold mb-2">Recent News</h2>
                <ul className="list-disc ml-5">
                  {data.news.slice(0, 10).map((article, index) => (
                    <li key={index}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {article.headline}
                      </a>
                      <p className="text-sm text-gray-400">{article.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

{activeTab === 'technical' && data?.technicalAnalysis && (
  <div className="space-y-4">
    {(() => {
      // Use closes from candles if available
      const closes = data.technicalAnalysis?.candles?.map(c => c.c) || [];

      // --- VWAP (approximate) ---
      const avgVwap = closes.length > 0
        ? closes.reduce((a, b) => a + b, 0) / closes.length
        : null;

      const price = data.quote?.c || avgVwap || 0;

      const vwapText = avgVwap !== null
        ? price > avgVwap
          ? "Price above VWAP → Bullish bias."
          : price < avgVwap
            ? "Price below VWAP → Bearish bias."
            : "Price at VWAP → Neutral bias."
        : "VWAP unavailable.";

      // --- Fibonacci ---
      const high =
        data.ytd?.yearHigh !== null && data.ytd?.yearHigh !== undefined
          ? data.ytd.yearHigh
          : data.quote?.h || 110;

      const low =
        data.ytd?.yearLow !== null && data.ytd?.yearLow !== undefined
          ? data.ytd.yearLow
          : data.quote?.l || 95;

      const fibLevels = [
        high - (high - low) * 0.236,
        high - (high - low) * 0.382,
        high - (high - low) * 0.5,
        high - (high - low) * 0.618,
      ];

      // --- OBV Summary for use in technical score ---
      let obvSummary: string | null = null;
      if (data.technicalAnalysis?.obvHistory?.length) {
        const obvHistory = data.technicalAnalysis.obvHistory;
        const currentObv = obvHistory.at(-1);
        const priorObv = obvHistory.length > 10 ? obvHistory.at(-11) : obvHistory[0];

        if (currentObv !== undefined && priorObv !== undefined && priorObv !== 0) {
          const diff = currentObv - priorObv;
          const pctChange = (diff / Math.abs(priorObv)) * 100;
          if (pctChange > 2) {
            obvSummary = `OBV has risen ${pctChange.toFixed(2)}% over the past 10 periods, suggesting buying pressure.`;
          } else if (pctChange < -2) {
            obvSummary = `OBV has fallen ${Math.abs(pctChange).toFixed(2)}% over the past 10 periods, suggesting selling pressure.`;
          } else {
            obvSummary = `OBV is relatively flat over the past 10 periods, indicating neutral market sentiment.`;
          }
        }
      }

      // --- Overall Technical Score ---
      let technicalScore = 0;

      const emaAnnotation = data.technicalAnalysis?.emaTrendAnnotation?.message || "";
      if (emaAnnotation.toLowerCase().includes("bullish")) {
        technicalScore += 3;
      } else if (emaAnnotation.toLowerCase().includes("bearish")) {
        technicalScore -= 3;
      }

      const macdValue = data.technicalAnalysis?.macd;
      const macdSignal = data.technicalAnalysis?.macdSignal;
      const macdDiff =
        macdValue !== null && macdValue !== undefined &&
        macdSignal !== null && macdSignal !== undefined
          ? macdValue - macdSignal
          : null;

      if (macdDiff !== null) {
        technicalScore += macdDiff > 0 ? 2 : macdDiff < 0 ? -2 : 0;
      }

      if (obvSummary) {
        if (obvSummary.includes("buying pressure")) {
          technicalScore += 1;
        } else if (obvSummary.includes("selling pressure")) {
          technicalScore -= 1;
        }
      }

      // Add VWAP influence
      if (avgVwap !== null) {
        if (price > avgVwap) {
          technicalScore += 1;
        } else if (price < avgVwap) {
          technicalScore -= 1;
        }
      }

      let technicalSummary = "Overall technical trend is Neutral.";
      let techColor = "text-yellow-400";

      if (technicalScore > 2) {
        technicalSummary = "Overall technical trend is Bullish.";
        techColor = "text-green-500";
      } else if (technicalScore < -2) {
        technicalSummary = "Overall technical trend is Bearish.";
        techColor = "text-red-500";
      }

      return (
        <>
          <div className="bg-[#1E1E1E] p-4 rounded mb-4">
            <p className={`text-center mt-2 text-2xl ${techColor}`}>
              {technicalSummary}
            </p>
          </div>

          <section className="mb-6">
            <TradingViewMiniWidget ticker={ticker.trim().toUpperCase()} />
          </section>

          <div className="bg-[#1E1E1E] p-4 rounded mb-4">
            <h3 className="text-xl font-bold text-center">Key Technical Metrics</h3>
            <ul className="mt-2 space-y-2 text-white">
              <li>
                <span className="font-bold text-purple-400">VWAP (approximate):</span>{' '}
                {avgVwap?.toFixed(2) || 'N/A'} —{' '}
                <span className={
                  vwapText.includes('Bullish') ? 'text-green-500' :
                  vwapText.includes('Bearish') ? 'text-red-500' :
                  'text-white'
                }>
                  {vwapText}
                </span>
              </li>
              <li>
                <span className="font-bold text-purple-400">Fibonacci Levels:</span>{' '}
                {fibLevels
                  .map((lvl, idx) => {
                    const labels = ['23.6%', '38.2%', '50%', '61.8%'];
                    return `${lvl.toFixed(2)} (${labels[idx]})`;
                  })
                  .join(', ')}
              </li>
            </ul>
          </div>
        </>
      );
    })()}

                {/* EMA Card */}
                <div className="card bg-[#1E1E1E] p-4 rounded">
                  <h3 className="text-lg font-semibold mb-2 text-white">Exponential Moving Averages (EMA)</h3>
                  {/* EMA Trend Annotation Message */}
                  {data.technicalAnalysis?.emaTrendAnnotation && (
                    <p
                      className={`${
                        data.technicalAnalysis.emaTrendAnnotation.message ===
                        'Neutral trend: EMAs are mixed, show caution'
                          ? 'text-yellow-400'
                          : `text-${data.technicalAnalysis.emaTrendAnnotation.color}-500`
                      } font-semibold mb-2`}
                    >
                      {data.technicalAnalysis.emaTrendAnnotation.message}
                    </p>
                  )}
                  <ul className="space-y-1 mb-4">
                    {(['ema9', 'ema21', 'ema34', 'ema50', 'ema100', 'ema200'] as const).map((key) => (
                      <li key={key}>
                        <span className={`font-semibold ema-${key.replace('ema', '')}`}>{key.toUpperCase()}:</span>{' '}
                        {typeof data.technicalAnalysis?.[key] === 'number'
                          ? (data.technicalAnalysis?.[key] as number).toFixed(2)
                          : 'N/A'}
                      </li>
                    ))}
                  </ul>

                  {(['ema9Array', 'ema21Array', 'ema34Array', 'ema50Array', 'ema100Array', 'ema200Array'] as (keyof TechnicalAnalysis)[]).some(
                    key => Array.isArray(data.technicalAnalysis?.[key]) && (data.technicalAnalysis?.[key] as unknown[]).length
                  ) && (
                    <Line
                      data={{
                        labels: Array.isArray(data.technicalAnalysis?.ema9Array)
                          ? data.technicalAnalysis.ema9Array.map((_, i) => i + 1)
                          : [],
                        datasets: [
                          {
                            label: 'EMA 9',
                            data: data.technicalAnalysis?.ema9Array || [],
                            borderColor: 'blue',
                            fill: false,
                          },
                          {
                            label: 'EMA 21',
                            data: data.technicalAnalysis?.ema21Array || [],
                            borderColor: 'orange',
                            fill: false,
                          },
                          {
                            label: 'EMA 34',
                            data: data.technicalAnalysis?.ema34Array || [],
                            borderColor: 'purple',
                            fill: false,
                          },
                          {
                            label: 'EMA 50',
                            data: data.technicalAnalysis?.ema50Array || [],
                            borderColor: 'green',
                            fill: false,
                          },
                          {
                            label: 'EMA 100',
                            data: data.technicalAnalysis?.ema100Array || [],
                            borderColor: 'pink',
                            fill: false,
                          },
                          {
                            label: 'EMA 200',
                            data: data.technicalAnalysis?.ema200Array || [],
                            borderColor: 'red',
                            fill: false,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: true, labels: { color: '#fff' } },
                          datalabels: { display: false },
                        },
                        scales: {
                          x: { ticks: { color: '#fff' } },
                          y: { ticks: { color: '#fff' } },
                        },
                      }}
                    />
                  )}
                </div>

                {/* MACD Card */}
                <div className="card bg-[#1E1E1E] p-4 rounded">
                  {(() => {
                    const macdValue = data.technicalAnalysis?.macd;
                    const macdSignal = data.technicalAnalysis?.macdSignal;
                    const macdDiff =
                      macdValue !== null && macdValue !== undefined &&
                      macdSignal !== null && macdSignal !== undefined
                        ? macdValue - macdSignal
                        : null;
                    const macdInterpretation =
                      macdDiff !== null
                        ? macdDiff > 0
                          ? 'Bullish crossover — momentum is rising.'
                          : macdDiff < 0
                            ? 'Bearish crossover — momentum is falling.'
                            : 'MACD and Signal are equal.'
                        : null;
                    return (
                      <>
                        <h3 className="text-lg font-semibold mb-2 text-white">MACD</h3>
                        <ul className="space-y-1 mb-4">
                          <li>
                            <span className="font-semibold">MACD:</span>{' '}
                            <span className={
                              macdDiff !== null && macdDiff > 0
                                ? 'text-green-500'
                                : macdDiff !== null && macdDiff < 0
                                  ? 'text-red-500'
                                  : 'text-white'
                            }>
                              {macdValue !== null && macdValue !== undefined ? macdValue.toFixed(2) : 'N/A'}
                            </span>
                          </li>
                          <li>
                            <span className="font-semibold">MACD Signal:</span>{' '}
                            {macdSignal !== null && macdSignal !== undefined ? macdSignal.toFixed(2) : 'N/A'}
                          </li>
                          {macdInterpretation && (
                            <li className={
                              macdDiff !== null
                                ? macdDiff > 0
                                  ? 'text-green-500'
                                  : macdDiff < 0
                                    ? 'text-red-500'
                                    : 'text-white'
                                : 'text-white'
                            }>
                              {macdInterpretation}
                            </li>
                          )}
                        </ul>
                        {Array.isArray(data.technicalAnalysis?.macdArray) &&
                         Array.isArray(data.technicalAnalysis?.macdSignalArray) &&
                         data.technicalAnalysis?.macdArray.length && (
                          <Line
                            data={{
                              labels: data.technicalAnalysis.macdArray.map((_, i) => i + 1),
                              datasets: [
                                {
                                  label: 'MACD',
                                  data: data.technicalAnalysis.macdArray,
                                  borderColor: 'orange',
                                  fill: false,
                                },
                                {
                                  label: 'MACD Signal',
                                  data: data.technicalAnalysis.macdSignalArray,
                                  borderColor: 'blue',
                                  fill: false,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { display: true, labels: { color: '#fff' } },
                                datalabels: { display: false },
                              },
                              scales: {
                                x: { ticks: { color: '#fff' } },
                                y: { ticks: { color: '#fff' } },
                              },
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* OBV Card */}
                <div className="card bg-[#1E1E1E] p-4 rounded">
                  <h3 className="text-lg font-semibold mb-2 text-white">On-Balance Volume (OBV)</h3>
                  {(() => {
                    let obvSummary: string | null = null;
                    if (data.technicalAnalysis?.obvHistory?.length) {
                      const obvHistory = data.technicalAnalysis.obvHistory;
                      const currentObv = obvHistory.at(-1);
                      const priorObv = obvHistory.length > 10 ? obvHistory.at(-11) : obvHistory[0];

                      if (currentObv !== undefined && priorObv !== undefined && priorObv !== 0) {
                        const diff = currentObv - priorObv;
                        const pctChange = (diff / Math.abs(priorObv)) * 100;
                        if (pctChange > 2) {
                          obvSummary = `OBV has risen ${pctChange.toFixed(2)}% over the past 10 periods, suggesting buying pressure.`;
                        } else if (pctChange < -2) {
                          obvSummary = `OBV has fallen ${Math.abs(pctChange).toFixed(2)}% over the past 10 periods, suggesting selling pressure.`;
                        } else {
                          obvSummary = `OBV is relatively flat over the past 10 periods, indicating neutral market sentiment.`;
                        }
                      }
                    }
                    return (
                      <>
                        {obvSummary && (
                          <p
                            className={`mt-2 ${
                              obvSummary.includes('buying pressure')
                                ? 'text-green-500'
                                : obvSummary.includes('selling pressure')
                                  ? 'text-red-500'
                                  : obvSummary.includes('neutral sentiment')
                                    ? 'text-yellow-400'
                                    : 'text-white'
                            }`}
                          >
                            {obvSummary}
                          </p>
                        )}
                        {data.technicalAnalysis?.obvHistory?.length ? (
                          <Line
                            data={{
                              labels: data.technicalAnalysis.obvHistory.map((_, i) => i + 1),
                              datasets: [
                                {
                                  label: 'OBV',
                                  data: data.technicalAnalysis.obvHistory,
                                  borderColor: 'rgba(59, 130, 246, 1)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                  fill: true,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { display: false },
                                datalabels: { display: false },
                              },
                              scales: {
                                x: {
                                  ticks: { color: '#fff' },
                                },
                                y: {
                                  ticks: { color: '#fff' },
                                },
                              },
                            }}
                          />
                        ) : (
                          <p className="text-white">
                            {data.technicalAnalysis?.obv !== null
                              ? data.technicalAnalysis?.obv?.toFixed(0)
                              : 'N/A'}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

              </div>
            )}

            {activeTab === 'sentiment' && (
              (() => {
                // Sentiment analysis logic
                const positiveWeights: Record<string, number> = {
                  gain: 1,
                  gains: 1,
                  gained: 1,
                  bullish: 2,
                  up: 1,
                  rally: 2,
                  growth: 2,
                  beat: 2,
                  beats: 2,
                  profit: 2,
                  profits: 2,
                  surge: 3,
                  soar: 3,
                  'record high': 3,
                  jump: 2,
                  jumps: 2,
                  increase: 1,
                  upside: 2,
                  improve: 1,
                  improves: 1,
                  improved: 1,
                  optimistic: 2,
                  strong: 2,
                  outperform: 2,
                  upgrade: 2,
                  buys: 2,
                  'buy rating': 2,
                  positive: 1,
                  momentum: 1,
                  exceeds: 2,
                  'tops estimates': 2,
                  'better than expected': 2,
                  expands: 1,
                  rebound: 2,
                  recovers: 2,
                  highs: 1,
                  'all-time high': 3,
                };

                const negativeWeights: Record<string, number> = {
                  loss: -1,
                  losses: -1,
                  bearish: -2,
                  down: -1,
                  drop: -1,
                  drops: -1,
                  miss: -2,
                  decline: -1,
                  plummet: -3,
                  falls: -1,
                  falling: -1,
                  decrease: -1,
                  weak: -2,
                  downgrade: -2,
                  'sell rating': -2,
                  warning: -2,
                  'profit warning': -2,
                  'cut guidance': -2,
                  'misses estimates': -2,
                  disappoints: -2,
                  concerns: -1,
                  risks: -1,
                  slump: -2,
                  tumbles: -2,
                  retreats: -1,
                  dips: -1,
                  suffers: -2,
                  missed: -2,
                  underperform: -2,
                  shortfall: -2,
                  pessimistic: -2,
                };

                function scoreText(text: string): number {
                  const lower = text.toLowerCase();
                  let score = 0;

                  for (const [word, weight] of Object.entries(positiveWeights)) {
                    if (lower.includes(word)) {
                      score += weight;
                    }
                  }

                  for (const [word, weight] of Object.entries(negativeWeights)) {
                    if (lower.includes(word)) {
                      score += weight; // negative weights subtract
                    }
                  }

                  return score;
                }

                const redditCounts = { bullish: 0, bearish: 0, neutral: 0 };
                const redditScores: number[] = [];
                const newsScores: number[] = [];
                const stocktwitsCounts = { bullish: 0, bearish: 0, neutral: 0 };
                const stocktwitsScores: number[] = [];

                if (Array.isArray(data?.sentiment) && data.sentiment.length > 0) {
                  data.sentiment.forEach(item => {
                    const text = `${item.title} ${item.text}`;
                    const score = scoreText(text);
                    redditScores.push(score);
                    if (score > 0) redditCounts.bullish++;
                    else if (score < 0) redditCounts.bearish++;
                    else redditCounts.neutral++;
                  });
                }

                const newsCounts = { bullish: 0, bearish: 0, neutral: 0 };
                data?.news?.forEach(article => {
                  const score = scoreText(article.headline + ' ' + article.summary);
                  newsScores.push(score);
                  if (score > 0) newsCounts.bullish++;
                  else if (score < 0) newsCounts.bearish++;
                  else newsCounts.neutral++;
                });

                // Process Stocktwits data
                if (Array.isArray(data?.stocktwitsPosts) && data.stocktwitsPosts.length > 0) {
                  data.stocktwitsPosts.forEach(item => {
                    const score = scoreText(item.body);
                    stocktwitsScores.push(score);
                    if (score > 0) stocktwitsCounts.bullish++;
                    else if (score < 0) stocktwitsCounts.bearish++;
                    else stocktwitsCounts.neutral++;
                  });
                }

                // Compute averages
                const avgRedditScore =
                  redditScores.length > 0
                    ? redditScores.reduce((a, b) => a + b, 0) / redditScores.length
                    : 0;

                const avgNewsScore =
                  newsScores.length > 0
                    ? newsScores.reduce((a, b) => a + b, 0) / newsScores.length
                    : 0;

                const avgStocktwitsScore =
                  stocktwitsScores.length > 0
                    ? stocktwitsScores.reduce((a, b) => a + b, 0) / stocktwitsScores.length
                    : 0;

                // Combined average score for all sources
                const combinedAvgScore =
                  (avgRedditScore * redditScores.length +
                   avgNewsScore * newsScores.length +
                   avgStocktwitsScore * stocktwitsScores.length) /
                  (redditScores.length + newsScores.length + stocktwitsScores.length || 1);

                // Compute sentiment bins
                function binScores(scores: number[]) {
                  return scores.reduce(
                    (acc, score) => {
                      if (score >= 3) acc.strongBullish++;
                      else if (score >= 1) acc.moderateBullish++;
                      else if (score <= -3) acc.strongBearish++;
                      else if (score <= -1) acc.moderateBearish++;
                      else acc.neutral++;
                      return acc;
                    },
                    {
                      strongBullish: 0,
                      moderateBullish: 0,
                      neutral: 0,
                      moderateBearish: 0,
                      strongBearish: 0,
                    }
                  );
                }

                const redditBins = binScores(redditScores);
                const newsBins = binScores(newsScores);
                const stocktwitsBins = binScores(stocktwitsScores);

                return (
                  <div className="space-y-4 text-white">
                    {/* Overall Sentiment Summary Box */}
                    <div className="bg-[#1E1E1E] p-4 rounded mb-4">
                      <h3 className="text-xl font-bold text-center">Overall Sentiment Summary</h3>
                      {(() => {
                        let text = "";
                        let color = "text-white";

                        if (combinedAvgScore > 1) {
                          text = "Overall sentiment is strongly bullish.";
                          color = "text-green-500";
                        } else if (combinedAvgScore > 0) {
                          text = "Overall sentiment is mildly bullish.";
                          color = "text-green-500";
                        } else if (combinedAvgScore < -1) {
                          text = "Overall sentiment is strongly bearish.";
                          color = "text-red-500";
                        } else if (combinedAvgScore < 0) {
                          text = "Overall sentiment is mildly bearish.";
                          color = "text-red-500";
                        } else {
                          text = "Overall sentiment is neutral.";
                          color = "text-yellow-400";
                        }

                        return (
                          <p className={`text-center mt-2 text-2xl ${color}`}>
                            {text}
                          </p>
                        );
                      })()}
                    </div>
                    <h2 className="text-xl font-bold">Sentiment Overview</h2>


                    {/* Charts: histogram, avg bar, stacked bins */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Average Sentiment Score Chart */}
                      <div className="bg-[#1E1E1E] p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2 text-center">
                          Average Sentiment Score
                        </h3>
                        <Bar
                          data={{
                            labels: ['Reddit', 'News', 'Stocktwits'],
                            datasets: [{
                              label: 'Avg Score',
                              data: [avgRedditScore, avgNewsScore, avgStocktwitsScore],
                              backgroundColor: [
                                avgRedditScore > 0 ? '#10B981' : '#EF4444',
                                avgNewsScore > 0 ? '#10B981' : '#EF4444',
                                avgStocktwitsScore > 0 ? '#9333EA' : '#EF4444',
                              ],
                              barThickness: 30,
                            }],
                          }}
                          options={{
                            animation: {
                              duration: 1500,
                              easing: 'easeOutBounce',
                            },
                            plugins: {
                              legend: { labels: { color: '#fff' } },
                              datalabels: {
                                color: '#fff',
                                font: {
                                  weight: 'bold',
                                  size: 14,
                                },
                                formatter: (value: number) => value.toFixed(2),
                              },
                            },
                            scales: {
                              x: { ticks: { color: '#fff' } },
                              y: { ticks: { color: '#fff' } },
                            },
                          }}
                        />
                      </div>

                      {/* Stacked Bar Chart of Sentiment Bins */}
                      <div className="bg-[#1E1E1E] p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2 text-center">
                          Sentiment Distribution Bins
                        </h3>
                        <Bar
                          data={{
                            labels: ['Strong Bullish', 'Moderate Bullish', 'Neutral', 'Moderate Bearish', 'Strong Bearish'],
                            datasets: [
                              {
                                label: 'Reddit',
                                data: [
                                  redditBins.strongBullish,
                                  redditBins.moderateBullish,
                                  redditBins.neutral,
                                  redditBins.moderateBearish,
                                  redditBins.strongBearish,
                                ],
                                backgroundColor: '#10B981',
                                barThickness: 30,
                              },
                              {
                                label: 'News',
                                data: [
                                  newsBins.strongBullish,
                                  newsBins.moderateBullish,
                                  newsBins.neutral,
                                  newsBins.moderateBearish,
                                  newsBins.strongBearish,
                                ],
                                backgroundColor: '#3B82F6',
                                barThickness: 30,
                              },
                              {
                                label: 'Stocktwits',
                                data: [
                                  stocktwitsBins.strongBullish,
                                  stocktwitsBins.moderateBullish,
                                  stocktwitsBins.neutral,
                                  stocktwitsBins.moderateBearish,
                                  stocktwitsBins.strongBearish,
                                ],
                                backgroundColor: [
                                  '#9333EA',
                                  '#A855F7',
                                  '#FBBF24',
                                  '#F87171',
                                  '#EF4444',
                                ],
                                barThickness: 30,
                              },
                            ],
                          }}
                          options={{
                            animation: {
                              duration: 1500,
                              easing: 'easeOutBounce',
                            },
                            plugins: {
                              legend: { labels: { color: '#fff' } },
                              datalabels: {
                                color: '#ffffff',
                                font: {
                                  weight: 'bold',
                                  size: 14,
                                },
                                formatter: (value: number) => (value > 0 ? value : ''),
                              },
                            },
                            scales: {
                              x: { stacked: true, ticks: { color: '#fff' } },
                              y: { stacked: true, ticks: { color: '#fff' } },
                            },
                          }}
                        />
                      </div>
                    </div>

                    {/* Donut charts under the sentiment tiles */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <div className="bg-[#1E1E1E] p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2 text-center">Reddit Sentiment </h3>
                        <Pie
                          data={{
                            labels: ['Bullish', 'Bearish', 'Neutral'],
                            datasets: [
                              {
                                data: [redditCounts.bullish, redditCounts.bearish, redditCounts.neutral],
                                backgroundColor: ['#10B981', '#EF4444', '#FBBF24'],
                              },
                            ],
                          }}
                          options={{
                            animation: {
                              animateRotate: true,
                              animateScale: true,
                              duration: 1500,
                              easing: 'easeOutCirc',
                            },
                            plugins: {
                              legend: {
                                labels: { color: '#fff' },
                              },
                              datalabels: {
                                color: '#fff',
                                font: {
                                  weight: 'bold',
                                  size: 14,
                                },
                                formatter: (value: number) => (value > 0 ? value : ''),
                              },
                            },
                            cutout: '70%',
                          }}
                        />
                      </div>

                      <div className="bg-[#1E1E1E] p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2 text-center">News Sentiment </h3>
                        <Pie
                          data={{
                            labels: ['Bullish', 'Bearish', 'Neutral'],
                            datasets: [
                              {
                                data: [newsCounts.bullish, newsCounts.bearish, newsCounts.neutral],
                                backgroundColor: ['#10B981', '#EF4444', '#FBBF24'],
                              },
                            ],
                          }}
                          options={{
                            animation: {
                              animateRotate: true,
                              animateScale: true,
                              duration: 1500,
                              easing: 'easeOutCirc',
                            },
                            plugins: {
                              legend: {
                                labels: { color: '#fff' },
                              },
                              datalabels: {
                                color: '#fff',
                                font: {
                                  weight: 'bold',
                                  size: 14,
                                },
                                formatter: (value: number) => (value > 0 ? value : ''),
                              },
                            },
                            cutout: '70%',
                          }}
                        />
                      </div>

                      <div className="bg-[#1E1E1E] p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2 text-center">Stocktwits Sentiment</h3>
                        <Pie
                          data={{
                            labels: ['Bullish', 'Bearish', 'Neutral'],
                            datasets: [
                              {
                                data: [stocktwitsCounts.bullish, stocktwitsCounts.bearish, stocktwitsCounts.neutral],
                                backgroundColor: ['#9333EA', '#EF4444', '#FBBF24'],
                              },
                            ],
                          }}
                          options={{
                            animation: {
                              animateRotate: true,
                              animateScale: true,
                              duration: 1500,
                              easing: 'easeOutCirc',
                            },
                            plugins: {
                              legend: {
                                labels: { color: '#fff' },
                              },
                              datalabels: {
                                color: '#fff',
                                font: {
                                  weight: 'bold',
                                  size: 14,
                                },
                                formatter: (value: number) => (value > 0 ? value : ''),
                              },
                            },
                            cutout: '70%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </>
      )}
    </main>
  )
}