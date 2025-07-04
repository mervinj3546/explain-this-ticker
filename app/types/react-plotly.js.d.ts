declare module 'react-plotly.js' {
  import * as React from 'react';

  interface PlotParams {
    data: any[];
    layout?: object;
    config?: object;
    style?: React.CSSProperties;
    className?: string;
    onInitialized?: (figure: any) => void;
    onUpdate?: (figure: any) => void;
    onPurge?: () => void;
  }

  export default class Plot extends React.Component<PlotParams> {}
}