import { NextRequest, NextResponse } from 'next/server';
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  const { ticker, data } = await req.json();
  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  let parsedData;
  try {
    parsedData = data;
  } catch {
    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
  }

const { quote = {}, technicalAnalysis = {}, news = [] } = parsedData;

// Calculate YTD performance if possible
let ytdPerformance: string | null = null;
const jan1Candle = parsedData.ytd?.priceOnJan1;
const currentPrice = quote.currentPrice;
if (jan1Candle && currentPrice) {
  const change = ((currentPrice - jan1Candle) / jan1Candle) * 100;
  ytdPerformance = `${change.toFixed(2)}%`;
}

// Dynamically generate EMA string for prompt
let emaString = '';
if (technicalAnalysis && typeof technicalAnalysis === 'object') {
  // Find all keys that look like EMA levels (e.g. ema9, ema21, etc.)
  const emaEntries = Object.entries(technicalAnalysis)
    .filter(([key, value]) => /^ema\d+$/i.test(key) && value !== undefined && value !== null)
    .map(([key, value]) => `${key.toUpperCase()}: ${value}`);
  if (emaEntries.length > 0) {
    emaString = emaEntries.join(', ');
  } else if (technicalAnalysis.ema !== undefined && technicalAnalysis.ema !== null) {
    emaString = `EMA: ${technicalAnalysis.ema}`;
  } else {
    emaString = 'No EMA available.';
  }
} else {
  emaString = 'No EMA available.';
}

let ytdLine = '';
if (ytdPerformance !== null) {
  ytdLine = `- Year-to-date Performance: ${ytdPerformance}\n`;
}

const aiPrompt = `
You are a highly skilled equity research analyst at a top-tier investment bank.

Based solely on the provided data, produce a detailed, professional equity research report for ticker ${ticker}.

Your report MUST:
- Be at least 800–1200 words.
- Be structured similarly to professional sell-side research reports.
- Provide depth, analysis, and professional language.

Your report must include the following sections:

1. **Investment Thesis**
   - Summarize why an investor should consider buying, holding, or selling the stock.

2. **Business Overview**
   - Brief description of the company, products, market positioning, business model.

3. **Key Drivers & Catalysts**
   - Highlight any news events, macro trends, or technical signals that could significantly influence the stock.

4. **Technical Analysis**
   - Discuss technical indicators provided, e.g. EMAs, MACD, OBV, and interpret what they imply for near-term trends.

5. **Sentiment & News Commentary**
   - Summarize recent news headlines. Discuss sentiment or potential impact.

6. **Valuation & Financial Outlook**
   - Comment on valuation relative to peers or market. Include any relevant metrics if available.

7. **Risks & Bear Case**
   - Identify key risks to the bullish case.

8. **Verdict & Recommendation**
   - Provide a clear verdict (Strong Buy, Buy, Hold, Sell, Strong Sell).
   - Justify the recommendation.

IMPORTANT RULES:
- Only refer to the data provided. Do not fabricate financial metrics or news.
- Maintain a professional tone.
- Format the result strictly as a JSON object with these fields:

{
  "verdict": "Strong Buy",
  "investmentThesis": "...",
  "businessOverview": "...",
  "keyDrivers": "...",
  "technicalAnalysis": "...",
  "newsCommentary": "...",
  "valuationOutlook": "...",
  "risks": "...",
  "recommendationSummary": "..."
}

Omit any fields for which you have no information.

Here is the provided data:
${ytdLine}Technical Indicators:
- ${emaString}
- MACD: ${technicalAnalysis.macd !== undefined && technicalAnalysis.macd !== null ? technicalAnalysis.macd : ''}
- OBV: ${technicalAnalysis.obv !== undefined && technicalAnalysis.obv !== null ? technicalAnalysis.obv : ''}

Recent News Headlines:
${news.length > 0 ? news.map((item: any) => `- ${item.headline}`).join('\n') : '- None'}
`;

let aiSummary = null;
try {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a financial analyst who outputs strictly JSON responses as instructed." },
      { role: "user", content: aiPrompt }
    ],
  });
  const rawContent = completion.choices[0].message?.content?.trim() || null;

  aiSummary = rawContent ? JSON.parse(rawContent) : { error: "No summary available." };

} catch (error) {
  aiSummary = { error: "No summary available due to an error." };
}

return NextResponse.json({ aiSummary });
}