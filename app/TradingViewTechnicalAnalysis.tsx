

"use client";

import { useEffect } from "react";

export default function TradingViewTechnicalAnalysis({
  symbol,
}: {
  symbol: string;
}) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: "1D",
      width: "100%",
      isTransparent: true,
      symbol,
      height: 450,
      locale: "en",
    });

    const container = document.getElementById(
      "tradingview-tech-analysis-container"
    );
    if (container) {
      container.innerHTML = "";
      container.appendChild(script);
    }
  }, [symbol]);

  return <div id="tradingview-tech-analysis-container" />;
}