import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';

interface RedditPost {
  title: string;
  url: string;
  score: number;
  sentiment?: string;
}

interface StocktwitsMessage {
  id: number;
  body: string;
  sentiment?: string;
}

type SentimentLabel = 'positive' | 'neutral' | 'negative';

export async function POST(req: NextRequest) {
  try {
    const { ticker } = await req.json();

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker symbol required.' },
        { status: 400 }
      );
    }

    const subreddits = [
      'stocks',
      'wallstreetbets',
      'investing',
      'StockMarket'
    ];

    let allPosts: RedditPost[] = [];

    for (const sub of subreddits) {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${ticker}&restrict_sr=1&sort=top&t=week`;
      const res = await fetch(url);
      const json = await res.json();

      const posts: RedditPost[] = json.data?.children?.map((item: any) => {
      const selftext = item.data.selftext || '';
      const description = selftext
        .split('\n')
        .find((line: string) => line.trim() !== '') || '';

      return {
        title: item.data.title,
        url: `https://reddit.com${item.data.permalink}`,
        score: item.data.score
      };
    }) || [];

      allPosts = allPosts.concat(posts);
    }

    const uniquePosts: RedditPost[] = Array.from(
      new Map(allPosts.map(p => [p.title, p])).values()
    );

    const stocktwitsUrl = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`;
    const stocktwitsRes = await fetch(stocktwitsUrl);
    const stocktwitsJson = await stocktwitsRes.json();

    const stocktwitsMessages: StocktwitsMessage[] = stocktwitsJson.messages?.map((msg: any) => ({
      id: msg.id,
      body: msg.body,
    })) || [];

    const classifier = await pipeline(
      'sentiment-analysis',
      'Xenova/cardiffnlp-twitter-roberta-base-sentiment'
    );

    let sentimentSummary: Record<SentimentLabel, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    const analyzedPosts: RedditPost[] = [];

    for (const post of uniquePosts) {
      const sentimentResult = await classifier(post.title);
      const label = Array.isArray(sentimentResult) && 'label' in sentimentResult[0]
        ? (sentimentResult[0] as { label: string }).label.toLowerCase()
        : 'neutral';

      let sentimentLabel: SentimentLabel = 'neutral';
      if (label.includes('positive')) sentimentLabel = 'positive';
      else if (label.includes('negative')) sentimentLabel = 'negative';

      sentimentSummary[sentimentLabel] += 1;

      analyzedPosts.push({
        ...post,
        sentiment: sentimentLabel
      });
    }

    let stocktwitsSummary: Record<SentimentLabel, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    const analyzedStocktwits: StocktwitsMessage[] = [];

    for (const message of stocktwitsMessages) {
      const sentimentResult = await classifier(message.body);
      const label = Array.isArray(sentimentResult) && 'label' in sentimentResult[0]
        ? (sentimentResult[0] as { label: string }).label.toLowerCase()
        : 'neutral';

      let sentimentLabel: SentimentLabel = 'neutral';
      if (label.includes('positive')) sentimentLabel = 'positive';
      else if (label.includes('negative')) sentimentLabel = 'negative';

      stocktwitsSummary[sentimentLabel] += 1;

      analyzedStocktwits.push({
        ...message,
        sentiment: sentimentLabel,
      });
    }

    return NextResponse.json({
      ticker,
      summary: sentimentSummary,
      posts: analyzedPosts,
      stocktwitsSummary,
      stocktwitsPosts: analyzedStocktwits,
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Failed to fetch Reddit sentiment data' },
      { status: 500 }
    );
  }
}