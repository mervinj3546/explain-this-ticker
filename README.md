# Explain This Ticker 📊

> **Archived project** — my first prototype of a stock-analysis tool, later rebuilt as [stock-explainer](https://github.com/mervinj3546/stock-explainer) and eventually Kronos. Kept as a snapshot; not maintained.

A lightweight Next.js app: enter a stock ticker and get a quick, beginner-friendly explanation of what's going on with it — price action, technicals, sentiment, and an AI-written summary.

## Features

- **Ticker lookup** with company basics and YTD price action (Finnhub + Polygon)
- **TradingView widgets** — full chart, symbol overview, and technical-analysis gauge
- **Stocktwits sentiment** integration
- **AI summary** — an LLM turns the raw data into a plain-English explanation

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Plotly · Finnhub, Polygon, and Stocktwits APIs

## Running locally

1. `npm install`
2. Create `.env.local` with your own keys: `FINNHUB_API_KEY`, `POLYGON_API_KEY`
3. `npm run dev` and open `http://localhost:3000`

## Disclaimer

Educational side project — nothing it outputs is financial advice.

## License

MIT
