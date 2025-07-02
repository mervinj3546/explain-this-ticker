'use client'

import TradingViewMiniWidget from './TradingViewMiniWidget';
import TradingViewFullWidget from './TradingViewFullWidget';
import { useState, useEffect, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);
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
  aiSummary?: string | null;
};

export default function Home() {
  const [ticker, setTicker] = useState('')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic');
  const [aiSummary, setAiSummary] = useState<string | null | undefined>(undefined);
  const [aiLoading, setAiLoading] = useState(false);

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
          setAiSummary(json.aiSummary || null);
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
                {!aiLoading && aiSummary && typeof aiSummary === 'object' && (
                  <div className="prose prose-invert space-y-4">
                    {
                      // @ts-ignore
                      Object.entries(aiSummary).map(([section, value]) => {
                        // Skip "references" section
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

                        // Add emoji to header for News Commentary, Valuation Outlook, Risks even if not in map
                        return (
                          <div key={section}>
                            <h3 className="text-base font-bold capitalize mb-1">
                              {emoji && <span className="mr-2">{emoji}</span>}
                              {sectionNormalized}
                            </h3>
                            <p className={textColor}>{value}</p>
                          </div>
                        );
                      })
                    }
                    {/* Copy JSON button (icon only, no label) */}
                    <button
                      className="mt-4 flex items-center px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
                      style={{ gap: '0.5em' }}
                      title="Copy AI Summary JSON"
                      onClick={() => {
                        // @ts-ignore
                        navigator.clipboard.writeText(JSON.stringify(aiSummary, null, 2));
                      }}
                    >
                      <i className="fa fa-copy" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
                {!aiLoading && aiSummary && typeof aiSummary === 'string' && (
                  <div className="prose prose-invert">
                    {aiSummary}
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

                {/* EMA Card */}
                <div className="card bg-[#1E1E1E] p-4 rounded">
                  <h3 className="text-lg font-semibold mb-2 text-white">Exponential Moving Averages (EMA)</h3>
                  {/* EMA Trend Annotation Message */}
                  {data.technicalAnalysis?.emaTrendAnnotation && (
                    <p
                      className={`text-${data.technicalAnalysis.emaTrendAnnotation.color}-500 font-semibold mb-2`}
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
                          <p className="text-white mt-2">{obvSummary}</p>
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

          </div>
        </>
      )}
    </main>
  )
}