type NewsItem = {
  headline: string;
  summary: string;
  url: string;
  datetime: number;
};

type RedditPost = {
  title: string;
  text: string;
  subreddit: string;
  permalink: string;
};

type Candle = {
  v: number;
  vw: number;
  o: number;
  c: number;
  h: number;
  l: number;
  t: number;
  n: number;
};

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 })
  }

  const token = process.env.FINNHUB_API_KEY

  try {
    // Fetch quote data
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${token}`
    const quoteRes = await fetch(quoteUrl, { cache: "no-store" })
    if (quoteRes.status === 429) {
      return NextResponse.json(
        { error: "Finnhub rate limit exceeded" },
        { status: 429 }
      );
    }
    const quoteData = await quoteRes.json()

    if (!quoteData || quoteData.c === 0) {
      return NextResponse.json(
        { error: `No data found for ticker '${ticker}'` },
        { status: 404 }
      )
    }

    // Calculate date range for news (last 5 days)
    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(toDate.getDate() - 5)

    const from = fromDate.toISOString().split('T')[0]
    const to = toDate.toISOString().split('T')[0]

    // Fetch news data
    const newsUrl = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${token}`
    const newsRes = await fetch(newsUrl, { cache: "no-store" })
    const newsData = await newsRes.json()

    // Fetch YTD (year-to-date) daily candles from Polygon.io
    const polygonApiKey = process.env.POLYGON_API_KEY;

    // Get start of current year
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ytdFrom = yearStart.toISOString().split('T')[0];
    const ytdTo = now.toISOString().split('T')[0];

    const candlesUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${ytdFrom}/${ytdTo}?apiKey=${polygonApiKey}`;
    const candlesRes = await fetch(candlesUrl, { cache: 'no-store' });
    if (candlesRes.status === 429) {
      return NextResponse.json(
        { error: "Polygon.io rate limit exceeded" },
        { status: 429 }
      );
    }
    const candlesJson = await candlesRes.json();

    if (candlesJson.status === "NOT_FOUND") {
      return NextResponse.json(
        { error: `Ticker '${ticker}' not found on Polygon.` },
        { status: 404 }
      );
    }

    let priceOnJan1 = null;
    let yearHigh = null;
    let yearLow = null;
    let growthPct = null;

    async function fetchRedditPosts(ticker: string): Promise<RedditPost[]> {
      const subreddits = ['stocks', 'wallstreetbets', 'investing', 'StockMarket'];
      let redditPosts: RedditPost[] = [];

      for (const sub of subreddits) {
        const redditUrl = `https://www.reddit.com/r/${sub}/search.json?q=$${ticker}&restrict_sr=1&limit=5`;
        try {
          const redditRes = await fetch(redditUrl, { cache: "no-store" });
          if (!redditRes.ok) {
            console.error(`Reddit API returned status ${redditRes.status}`);
            continue;
          }
          const redditJson = await redditRes.json();

          const subredditPosts = await Promise.all(
            (redditJson.data?.children || []).map(async (post: any) => {
              const title = post.data.title;
              const text = post.data.selftext || "";
              const subreddit = post.data.subreddit;
              const permalink = post.data.permalink;

              return { title, text, subreddit, permalink };
            })
          );

          redditPosts.push(...subredditPosts);

        } catch (e) {
          console.error(`Failed to fetch Reddit posts for ${sub}:`, e);
        }
      }

      redditPosts = redditPosts
        .filter(
          (post, index, self) =>
            index === self.findIndex(p => p.title === post.title)
        )
        .slice(0, 10);

      return redditPosts;
    }

    if (candlesJson.results && candlesJson.results.length > 0) {
      const candles: Candle[] = candlesJson.results;
      priceOnJan1 = candles[0].c;
      yearHigh = Math.max(...candles.map(item => item.h));
      yearLow = Math.min(...candles.map(item => item.l));
      const latestClose = candles[candles.length - 1].c;
      growthPct = priceOnJan1 ? ((latestClose - priceOnJan1) / priceOnJan1) * 100 : null;

      const closes = candles.map(c => c.c);
      const ema9Array = calculateEMA(closes, 9);
      const ema9 = ema9Array.length > 0 ? ema9Array.at(-1) : null;
      const ema21Array = calculateEMA(closes, 21);
      const ema21 = ema21Array.length > 0 ? ema21Array.at(-1) : null;
      const ema34Array = calculateEMA(closes, 34);
      const ema34 = ema34Array.length > 0 ? ema34Array.at(-1) : null;
      const ema50Array = calculateEMA(closes, 50);
      const ema50 = ema50Array.length > 0 ? ema50Array.at(-1) : null;

      let emaTrendAnnotation = null;
      if (
        typeof ema9 === "number" &&
        typeof ema21 === "number" &&
        typeof ema34 === "number" &&
        typeof ema50 === "number"
      ) {
        if (ema9 > ema21 && ema21 > ema34 && ema34 > ema50) {
          emaTrendAnnotation = {
            message: "Bullish trend: EMA values decreasing smoothly",
            color: "green",
          };
        } else if (ema9 < ema21 && ema21 < ema34 && ema34 < ema50) {
          emaTrendAnnotation = {
            message: "Bearish trend: EMA values increasing smoothly",
            color: "red",
          };
        } else {
          emaTrendAnnotation = {
            message: "Neutral trend: EMAs are mixed, show caution",
            color: "orange",
          };
        }
      }

      const ema100Array = calculateEMA(closes, 100);
      const ema100 = ema100Array.length > 0 ? ema100Array.at(-1) : null;
      const ema200Array = calculateEMA(closes, 200);
      const ema200 = ema200Array.length > 0 ? ema200Array.at(-1) : null;

      // MACD calculation
      const ema12Array = calculateEMA(closes, 12);
      const ema26Array = calculateEMA(closes, 26);
      const macdArray = ema12Array.slice(ema12Array.length - ema26Array.length).map((val, idx) => val - ema26Array[idx]);
      const macdSignalArray = calculateEMA(macdArray, 9);
      const macd = macdArray.length > 0 ? macdArray.at(-1) : null;
      const macdSignal = macdSignalArray.length > 0 ? macdSignalArray.at(-1) : null;

      // OBV calculation
      let obv = 0;
      const obvHistory = [];
      for (let i = 1; i < candles.length; i++) {
        if (candles[i].c > candles[i - 1].c) {
          obv += candles[i].v;
        } else if (candles[i].c < candles[i - 1].c) {
          obv -= candles[i].v;
        }
        obvHistory.push(obv);
      }

      const redditPosts = await fetchRedditPosts(ticker);

      // Fetch Stocktwits messages
      const stocktwitsUrl = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`;

      let stocktwitsMessages: { id: number; body: string; sentiment?: string }[] = [];
      let stocktwitsSummary = { positive: 0, neutral: 0, negative: 0 };

      try {
        const stocktwitsRes = await fetch(stocktwitsUrl, { cache: "no-store" });
        if (stocktwitsRes.ok) {
          const stocktwitsJson = await stocktwitsRes.json();
          const messages = stocktwitsJson.messages || [];

          stocktwitsMessages = messages.map((msg: any) => {
            let sentiment = "neutral";
            const lower = msg.body?.toLowerCase() || "";
            if (lower.includes("bullish")) sentiment = "positive";
            if (lower.includes("bearish")) sentiment = "negative";

            stocktwitsSummary[sentiment as keyof typeof stocktwitsSummary] += 1;

            return {
              id: msg.id,
              body: msg.body,
              sentiment,
            };
          });
        }
      } catch (e) {
        console.error("Failed to fetch Stocktwits data:", e);
      }

      // Define mapping of company names for common tickers
      const companyNamesMap: Record<string, string[]> = {
        AAPL: ['apple'],
        MSFT: ['microsoft'],
        GOOGL: ['google', 'alphabet'],
        AMZN: ['amazon'],
        META: ['meta', 'facebook'],
      };

      // Prepare data for AI summary
      const newsSummary = (newsData as NewsItem[])
        .filter(item => {
          const headline = item.headline?.toLowerCase() || "";
          const tickerMatch = headline.includes(ticker.toLowerCase());
          const names = companyNamesMap[ticker.toUpperCase()] || [];
          const nameMatch = names.some(name => headline.includes(name));
          return tickerMatch || nameMatch;
        })
        .map(item => ({
          headline: item.headline,
          summary: item.summary,
          url: item.url,
          datetime: item.datetime,
        }));

      return NextResponse.json({
        ticker,
        quote: quoteData,
        news: newsSummary,
        ytd: {
          priceOnJan1,
          yearHigh,
          yearLow,
          growthPct,
        },
        technicalAnalysis: {
          ema9,
          ema9Array,
          ema21,
          ema21Array,
          ema34,
          ema34Array,
          ema50,
          ema50Array,
          ema100,
          ema100Array,
          ema200,
          ema200Array,
          macd,
          macdArray,
          macdSignal,
          macdSignalArray,
          obv,
          obvHistory,
          emaTrendAnnotation,
          candles,
        },
        sentiment: redditPosts,
        stocktwitsSummary,
        stocktwitsPosts: stocktwitsMessages,
      })
    } else {
      // If no candles data, still fetch Reddit posts and return minimal data
      const redditPosts = await fetchRedditPosts(ticker);

      // Fetch Stocktwits messages
      const stocktwitsUrl = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`;

      let stocktwitsMessages: { id: number; body: string; sentiment?: string }[] = [];
      let stocktwitsSummary = { positive: 0, neutral: 0, negative: 0 };

      try {
        const stocktwitsRes = await fetch(stocktwitsUrl, { cache: "no-store" });
        if (stocktwitsRes.ok) {
          const stocktwitsJson = await stocktwitsRes.json();
          const messages = stocktwitsJson.messages || [];

          stocktwitsMessages = messages.map((msg: any) => {
            let sentiment = "neutral";
            const lower = msg.body?.toLowerCase() || "";
            if (lower.includes("bullish")) sentiment = "positive";
            if (lower.includes("bearish")) sentiment = "negative";

            stocktwitsSummary[sentiment as keyof typeof stocktwitsSummary] += 1;

            return {
              id: msg.id,
              body: msg.body,
              sentiment,
            };
          });
        }
      } catch (e) {
        console.error("Failed to fetch Stocktwits data:", e);
      }

      // Define mapping of company names for common tickers
      const companyNamesMap: Record<string, string[]> = {
        AAPL: ['apple'],
        MSFT: ['microsoft'],
        GOOGL: ['google', 'alphabet'],
        AMZN: ['amazon'],
        META: ['meta', 'facebook'],
      };

      return NextResponse.json({
        ticker,
        quote: quoteData,
        news: (newsData as NewsItem[])
          .filter(item => {
            const headline = item.headline?.toLowerCase() || "";
            const tickerMatch = headline.includes(ticker.toLowerCase());
            const names = companyNamesMap[ticker.toUpperCase()] || [];
            const nameMatch = names.some(name => headline.includes(name));
            return tickerMatch || nameMatch;
          })
          .map(item => ({
            headline: item.headline,
            summary: item.summary,
            url: item.url,
            datetime: item.datetime,
          })),
        ytd: {
          priceOnJan1,
          yearHigh,
          yearLow,
          growthPct,
        },
        technicalAnalysis: {
          ema9: null,
          ema9Array: [],
          ema21: null,
          ema21Array: [],
          ema34: null,
          ema34Array: [],
          ema50: null,
          ema50Array: [],
          ema100: null,
          ema100Array: [],
          ema200: null,
          ema200Array: [],
          macd: null,
          macdArray: [],
          macdSignal: null,
          macdSignalArray: [],
          obv: null,
          obvHistory: [],
          emaTrendAnnotation: null,
          candles: [],
        },
        sentiment: redditPosts,
        stocktwitsSummary,
        stocktwitsPosts: stocktwitsMessages,
      })
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: 'Failed to fetch data from Finnhub' },
      { status: 500 }
    )
  }
}

function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  let emaPrev = prices[0];
  const emaArray = [emaPrev];

  for (let i = 1; i < prices.length; i++) {
    emaPrev = prices[i] * k + emaPrev * (1 - k);
    emaArray.push(emaPrev);
  }

  return emaArray;
}