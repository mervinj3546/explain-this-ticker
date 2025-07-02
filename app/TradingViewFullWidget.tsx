'use client';

interface Props {
  ticker: string;
}

export default function TradingViewFullWidget({ ticker }: Props) {
  const symbol = ticker || 'AAPL';

  return (
    <div className="w-full mt-4">
      <iframe
        src={`https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=D&theme=dark&style=1&locale=en&utm_source=localhost`}
        width="100%"
        height="500"
        frameBorder="0"
        allowFullScreen
      ></iframe>
    </div>
  );
}