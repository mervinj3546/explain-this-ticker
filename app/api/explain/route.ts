import { NextRequest, NextResponse } from 'next/server'

const positiveWords = ['gain', 'bullish', 'up', 'growth', 'beat', 'profit', 'surge'];
const negativeWords = ['loss', 'bearish', 'down', 'drop', 'miss', 'decline', 'plummet'];

function scoreText(text: string): string {
  const lower = text.toLowerCase();
  if (positiveWords.some(w => lower.includes(w))) return 'POSITIVE';
  if (negativeWords.some(w => lower.includes(w))) return 'NEGATIVE';
  return 'NEUTRAL';
}

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

    const keywords = [ticker.toLowerCase()];

    return NextResponse.json({
      ticker,
      quote: quoteData,
      news: Array.isArray(newsData)
        ? newsData
            .filter((item: any) => {
              const text = (item.headline + ' ' + item.summary).toLowerCase();
              return keywords.some(keyword => text.includes(keyword));
            })
            .sort((a: any, b: any) => b.datetime - a.datetime)
            .slice(0, 5)
            .map((item: any) => ({
              headline: item.headline,
              summary: item.summary,
              url: item.url,
              datetime: item.datetime,
              sentiment: scoreText(item.headline + ' ' + item.summary)
            }))
        : [],
      sentiment: [] // Placeholder for future Reddit sentiment
    })
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