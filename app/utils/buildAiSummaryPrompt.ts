export default function buildAiSummaryPrompt(ticker: string, parsedData: any): string {
  const { quote = {}, technicalAnalysis = {}, news = [], ytd } = parsedData;

  // YTD Performance calculation
  let ytdPerformance: string | null = null;
  const jan1Candle = ytd?.priceOnJan1;
  const currentPrice = quote.currentPrice;
  if (jan1Candle && currentPrice) {
    const change = ((currentPrice - jan1Candle) / jan1Candle) * 100;
    ytdPerformance = `${change.toFixed(2)}%`;
  }

  let ytdLine = '';
  if (ytdPerformance !== null) {
    ytdLine = `- Year-to-date Performance: ${ytdPerformance}\n`;
  }

  // Build EMA string
  let emaString = '';
  if (technicalAnalysis && typeof technicalAnalysis === 'object') {
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

  // Build the final prompt
  const aiPrompt = `
You are a highly skilled equity research analyst at a top-tier investment bank.

Based solely on the provided data, produce a detailed, professional equity research report for ticker ${ticker}.

Your report MUST:
- Be at least 800–1200 words.
- Be structured similarly to professional sell-side research reports.
- Provide depth, analysis, and professional language.

Your report must include the following sections:

1. **Investment Thesis**
2. **Business Overview**
3. **Key Drivers & Catalysts**
4. **Technical Analysis**
5. **Sentiment & News Commentary**
6. **Valuation & Financial Outlook**
7. **Risks & Bear Case**
8. **Verdict & Recommendation**

At the end of your report, explicitly provide your overall outlook on this stock as one of the following words ONLY: Bullish, Bearish, or Neutral.

Include this outlook in a separate JSON field named "verdict".

IMPORTANT RULES:
- Only refer to the data provided. Do not fabricate financial metrics or news.
- Maintain a professional tone.
- Format the result strictly as a JSON object with fields as described.

Here is the provided data:
${ytdLine}Technical Indicators:
- ${emaString}
- MACD: ${technicalAnalysis.macd !== undefined && technicalAnalysis.macd !== null ? technicalAnalysis.macd : ''}
- OBV: ${technicalAnalysis.obv !== undefined && technicalAnalysis.obv !== null ? technicalAnalysis.obv : ''}

Recent News Headlines:
${news.length > 0 ? news.map((item: any) => `- ${item.headline}`).join('\n') : '- None'}
`;

  return aiPrompt;
}