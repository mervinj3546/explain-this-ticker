"use client";

import { useEffect } from "react";

export default function TradingViewSymbolOverview({
  symbol,
}: {
  symbol: string;
}) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[symbol, symbol]],
      chartOnly: false,
      width: "100%",
      height: 220,
      locale: "en",
      colorTheme: "dark",
      autosize: true,
    });

    const container = document.getElementById(
      "tradingview-symbol-overview-container"
    );
    if (container) {
      container.innerHTML = "";
      container.appendChild(script);
    }
  }, [symbol]);

  return <div id="tradingview-symbol-overview-container" />;
}