'use client';

import React, { useEffect, useRef } from 'react';

type Props = {
  ticker: string;
};

export default function TradingViewMiniWidget({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: ticker,
      width: '100%',
      height: 150,
      locale: 'en',
      dateRange: '3M',
      colorTheme: 'dark',
      trendLineColor: 'rgba(41, 98, 255, 1)',
      underLineColor: 'rgba(41, 98, 255, 0.3)',
      isTransparent: false,
      autosize: true,
    });

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);
  }, [ticker]);

  return <div ref={containerRef} />;
}