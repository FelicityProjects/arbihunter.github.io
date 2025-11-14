// Pine Script 기본 지표를 JavaScript로 변환하는 유틸리티

/**
 * Pine Script의 기본 지표를 계산하는 함수들
 */

// Simple Moving Average
export function sma(data, period) {
  if (data.length < period) return [];
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    result.push(sum / period);
  }
  return result;
}

// Exponential Moving Average
export function ema(data, period) {
  if (data.length === 0) return [];
  const multiplier = 2 / (period + 1);
  const result = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    result.push((data[i] - result[result.length - 1]) * multiplier + result[result.length - 1]);
  }
  return result;
}

// RSI (Relative Strength Index)
export function rsi(data, period = 14) {
  if (data.length < period + 1) return [];
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  const result = [];
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < gains.length; i++) {
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
    
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  
  return result;
}

// MACD
export function macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = ema(data, fastPeriod);
  const slowEMA = ema(data, slowPeriod);
  
  const macdLine = [];
  const minLength = Math.min(fastEMA.length, slowEMA.length);
  const offset = Math.abs(fastEMA.length - slowEMA.length);
  
  for (let i = 0; i < minLength; i++) {
    const fastIdx = fastEMA.length > slowEMA.length ? i + offset : i;
    const slowIdx = slowEMA.length > fastEMA.length ? i + offset : i;
    macdLine.push(fastEMA[fastIdx] - slowEMA[slowIdx]);
  }
  
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = [];
  
  for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  
  return { macdLine, signalLine, histogram };
}

// Bollinger Bands
export function bollingerBands(data, period = 20, stdDev = 2) {
  const smaValues = sma(data, period);
  const result = { middle: [], upper: [], lower: [] };
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = smaValues[i - period + 1];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    result.middle.push(mean);
    result.upper.push(mean + stdDev * std);
    result.lower.push(mean - stdDev * std);
  }
  
  return result;
}

// ATR (Average True Range)
export function atr(high, low, close, period = 14) {
  if (high.length < period + 1 || low.length < period + 1 || close.length < period + 1) {
    return [];
  }
  
  const trueRanges = [];
  for (let i = 1; i < high.length; i++) {
    const tr = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
    trueRanges.push(tr);
  }
  
  // 첫 ATR은 SMA로 계산
  const result = [];
  let atrValue = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(atrValue);
  
  // 이후는 EMA 방식으로 계산
  for (let i = period; i < trueRanges.length; i++) {
    atrValue = (atrValue * (period - 1) + trueRanges[i]) / period;
    result.push(atrValue);
  }
  
  return result;
}

// SuperTrend
export function superTrend(high, low, close, factor = 3.0, period = 10) {
  if (high.length < period + 1) {
    console.warn('[SuperTrend] 데이터가 부족합니다:', high.length, '필요:', period + 1);
    return { st: [], dir: [] };
  }
  
  // ATR 계산
  const atrValues = atr(high, low, close, period);
  if (atrValues.length === 0) {
    console.warn('[SuperTrend] ATR 계산 실패');
    return { st: [], dir: [] };
  }
  
  console.log('[SuperTrend] 계산 시작:', { factor, period, dataLength: high.length, atrLength: atrValues.length });
  
  const st = [];
  const dir = [];
  const hl2 = []; // (high + low) / 2
  
  for (let i = 0; i < high.length; i++) {
    hl2.push((high[i] + low[i]) / 2);
  }
  
  // ATR은 trueRanges 때문에 1개 적음
  // trueRanges는 high.length - 1 개
  // atrValues는 trueRanges.length - period + 1 개
  const atrStartIdx = period - 1; // ATR이 시작되는 인덱스
  
  let prevUpperBand = null;
  let prevLowerBand = null;
  let prevSt = null;
  
  for (let i = 0; i < high.length; i++) {
    if (i < atrStartIdx) {
      // 초기값 설정
      st.push(close[i]);
      dir.push(1);
      continue;
    }
    
    const atrIdx = i - atrStartIdx;
    if (atrIdx >= atrValues.length) {
      // ATR 범위를 벗어남
      st.push(prevSt || close[i]);
      dir.push(prevSt && close[i] > prevSt ? 1 : -1);
      continue;
    }
    
    const atrValue = atrValues[atrIdx];
    
    // 기본 밴드 계산
    const basicUpperBand = hl2[i] + (factor * atrValue);
    const basicLowerBand = hl2[i] - (factor * atrValue);
    
    // 최종 상위 밴드
    const finalUpperBand = prevUpperBand === null || close[i] <= prevUpperBand
      ? basicUpperBand
      : Math.max(basicUpperBand, prevUpperBand);
    
    // 최종 하위 밴드
    const finalLowerBand = prevLowerBand === null || close[i] >= prevLowerBand
      ? basicLowerBand
      : Math.min(basicLowerBand, prevLowerBand);
    
    // SuperTrend 계산
    let currentSt;
    if (prevSt === null) {
      currentSt = close[i] > basicUpperBand ? finalLowerBand : finalUpperBand;
    } else {
      currentSt = close[i] > prevSt ? finalLowerBand : finalUpperBand;
    }
    
    // 방향 결정
    const currentDir = close[i] > currentSt ? 1 : -1;
    
    st.push(currentSt);
    dir.push(currentDir);
    
    prevUpperBand = finalUpperBand;
    prevLowerBand = finalLowerBand;
    prevSt = currentSt;
  }
  
  console.log('[SuperTrend] 계산 완료:', { stLength: st.length, dirLength: dir.length });
  return { st, dir };
}

/**
 * Pine Script 코드를 파싱하여 지표 정보 추출
 */
export function parsePineScript(pineCode) {
  const indicators = [];
  const lines = pineCode.split('\n');
  
  // input 파라미터 추출
  const inputParams = {};
  for (const line of lines) {
    const trimmed = line.trim();
    // input.int(10) 또는 input.int(10, title="...")
    const intInputMatch = trimmed.match(/len\s*=\s*input\.int\s*\(\s*(\d+)/);
    if (intInputMatch) {
      inputParams.len = parseInt(intInputMatch[1]);
    }
    // input.float(3.0, step=0.1)
    const floatInputMatch = trimmed.match(/factor\s*=\s*input\.float\s*\(\s*([\d.]+)/);
    if (floatInputMatch) {
      inputParams.factor = parseFloat(floatInputMatch[1]);
    }
  }
  
  const len = inputParams.len || 10;
  const factor = inputParams.factor || 3.0;
  
  // ta.supertrend() 호출 찾기
  let hasSuperTrend = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/\[.*\]\s*=\s*ta\.supertrend/)) {
      hasSuperTrend = true;
      break;
    }
  }
  
  // SuperTrend가 있으면 먼저 추가
  if (hasSuperTrend) {
    indicators.push({ 
      type: 'supertrend', 
      factor: factor,
      period: len
    });
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // plot(close) 같은 기본 plot
    const plotMatch = trimmed.match(/plot\s*\(\s*(\w+)\s*\)/);
    if (plotMatch) {
      const source = plotMatch[1];
      indicators.push({ type: 'plot', source });
      continue;
    }
    
    // plot(sma(close, 20))
    const smaPlotMatch = trimmed.match(/plot\s*\(\s*sma\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)\s*\)/);
    if (smaPlotMatch) {
      indicators.push({ 
        type: 'sma', 
        source: smaPlotMatch[1], 
        period: parseInt(smaPlotMatch[2]) 
      });
      continue;
    }
    
    // plot(ema(close, 12))
    const emaPlotMatch = trimmed.match(/plot\s*\(\s*ema\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)\s*\)/);
    if (emaPlotMatch) {
      indicators.push({ 
        type: 'ema', 
        source: emaPlotMatch[1], 
        period: parseInt(emaPlotMatch[2]) 
      });
      continue;
    }
    
    // plot(rsi(close, 14))
    const rsiPlotMatch = trimmed.match(/plot\s*\(\s*rsi\s*\(\s*(\w+)\s*(?:,\s*(\d+))?\s*\)\s*\)/);
    if (rsiPlotMatch) {
      indicators.push({ 
        type: 'rsi', 
        source: rsiPlotMatch[1], 
        period: rsiPlotMatch[2] ? parseInt(rsiPlotMatch[2]) : 14 
      });
      continue;
    }
    
    // plot(st, "SuperTrend", ...) - SuperTrend 라인 (st 변수 사용)
    const stPlotMatch = trimmed.match(/plot\s*\(\s*st\s*,/);
    if (stPlotMatch && !hasSuperTrend) {
      // 이미 추가했으면 스킵
      indicators.push({ 
        type: 'supertrend', 
        factor: factor,
        period: len
      });
      continue;
    }
    
    // plotshape(long, ...) - BUY 신호
    const buyShapeMatch = trimmed.match(/plotshape\s*\(\s*long\s*,/);
    if (buyShapeMatch) {
      indicators.push({ 
        type: 'plotshape', 
        signal: 'buy',
        condition: 'long'
      });
      continue;
    }
    
    // plotshape(short, ...) - SELL 신호
    const sellShapeMatch = trimmed.match(/plotshape\s*\(\s*short\s*,/);
    if (sellShapeMatch) {
      indicators.push({ 
        type: 'plotshape', 
        signal: 'sell',
        condition: 'short'
      });
      continue;
    }
  }
  
  return indicators;
}

/**
 * 차트 데이터에 지표 적용
 */
export function applyIndicators(candlestickData, indicators) {
  const result = {
    candlesticks: candlestickData,
    lines: [],
    areas: [],
    markers: [], // plotshape용 마커
  };
  
  // SuperTrend 계산 (한 번만)
  let superTrendData = null;
  let superTrendDir = null;
  const superTrendIndicator = indicators.find(ind => ind.type === 'supertrend');
  if (superTrendIndicator) {
    const high = candlestickData.map(d => d.high);
    const low = candlestickData.map(d => d.low);
    const close = candlestickData.map(d => d.close);
    const stResult = superTrend(high, low, close, superTrendIndicator.factor, superTrendIndicator.period);
    superTrendData = stResult.st;
    superTrendDir = stResult.dir;
  }
  
  for (const indicator of indicators) {
    let sourceData = [];
    
    // 소스 데이터 추출
    if (indicator.source) {
      switch (indicator.source) {
        case 'close':
          sourceData = candlestickData.map(d => d.close);
          break;
        case 'open':
          sourceData = candlestickData.map(d => d.open);
          break;
        case 'high':
          sourceData = candlestickData.map(d => d.high);
          break;
        case 'low':
          sourceData = candlestickData.map(d => d.low);
          break;
        default:
          sourceData = candlestickData.map(d => d.close);
      }
    }
    
    // 지표 계산
    switch (indicator.type) {
      case 'plot':
        const plotData = [];
        for (let idx = 0; idx < Math.min(sourceData.length, candlestickData.length); idx++) {
          if (sourceData[idx] != null && !isNaN(sourceData[idx]) && isFinite(sourceData[idx])) {
            plotData.push({
              time: candlestickData[idx].time,
              value: Number(sourceData[idx]),
            });
          }
        }
        if (plotData.length > 0) {
          result.lines.push({
            data: plotData,
            color: '#60a5fa',
            lineWidth: 1,
          });
        }
        break;
        
      case 'sma':
        const smaValues = sma(sourceData, indicator.period);
        const smaData = [];
        const startIdx = indicator.period - 1;
        for (let idx = 0; idx < smaValues.length && (startIdx + idx) < candlestickData.length; idx++) {
          const value = smaValues[idx];
          if (value != null && !isNaN(value) && isFinite(value)) {
            smaData.push({
              time: candlestickData[startIdx + idx].time,
              value: Number(value),
            });
          }
        }
        if (smaData.length > 0) {
          result.lines.push({
            data: smaData,
            color: '#10b981',
            lineWidth: 2,
            title: `SMA(${indicator.period})`,
          });
        }
        break;
        
      case 'ema':
        const emaValues = ema(sourceData, indicator.period);
        const emaData = [];
        for (let idx = 0; idx < Math.min(emaValues.length, candlestickData.length); idx++) {
          const value = emaValues[idx];
          if (value != null && !isNaN(value) && isFinite(value)) {
            emaData.push({
              time: candlestickData[idx].time,
              value: Number(value),
            });
          }
        }
        if (emaData.length > 0) {
          result.lines.push({
            data: emaData,
            color: '#f59e0b',
            lineWidth: 2,
            title: `EMA(${indicator.period})`,
          });
        }
        break;
        
      case 'rsi':
        const rsiValues = rsi(sourceData, indicator.period);
        const rsiData = [];
        const rsiStartIdx = indicator.period + 1;
        for (let idx = 0; idx < rsiValues.length && (rsiStartIdx + idx) < candlestickData.length; idx++) {
          const value = rsiValues[idx];
          if (value != null && !isNaN(value) && isFinite(value) && value >= 0 && value <= 100) {
            rsiData.push({
              time: candlestickData[rsiStartIdx + idx].time,
              value: Number(value),
            });
          }
        }
        if (rsiData.length > 0) {
          result.lines.push({
            data: rsiData,
            color: '#8b5cf6',
            lineWidth: 2,
            title: `RSI(${indicator.period})`,
          });
        }
        break;
        
      case 'supertrend':
        if (superTrendData && superTrendDir) {
          console.log('[applyIndicators] SuperTrend 적용:', { 
            stLength: superTrendData.length, 
            dirLength: superTrendDir.length,
            candleLength: candlestickData.length 
          });
          
          // SuperTrend 라인 - 데이터 검증 포함
          const stData = [];
          const minLength = Math.min(candlestickData.length, superTrendData.length);
          for (let i = 0; i < minLength; i++) {
            const value = superTrendData[i];
            if (value != null && !isNaN(value) && isFinite(value)) {
              stData.push({
                time: candlestickData[i].time,
                value: Number(value),
              });
            }
          }
          
          if (stData.length > 0) {
            result.lines.push({
              data: stData,
              color: '#10b981',
              lineWidth: 2,
              title: `SuperTrend(${indicator.period}, ${indicator.factor})`,
            });
            console.log('[applyIndicators] SuperTrend 라인 추가 완료:', stData.length, '개 포인트');
          } else {
            console.warn('[applyIndicators] SuperTrend 유효한 데이터가 없습니다');
          }
        } else {
          console.warn('[applyIndicators] SuperTrend 데이터가 계산되지 않았습니다');
        }
        break;
        
      case 'plotshape':
        if (superTrendDir) {
          // long 신호: dir == 1 and dir[1] != 1
          // short 신호: dir == -1 and dir[1] != -1
          const markers = [];
          for (let i = 1; i < candlestickData.length && i < superTrendDir.length; i++) {
            const currentDir = superTrendDir[i];
            const prevDir = superTrendDir[i - 1];
            
            if (indicator.signal === 'buy' && currentDir === 1 && prevDir !== 1) {
              markers.push({
                time: candlestickData[i].time,
                position: 'belowBar',
                color: '#26a69a', // TradingView 녹색
                shape: 'arrowUp', // lightweight-charts v5 형식
                text: 'BUY',
                size: 2,
              });
            } else if (indicator.signal === 'sell' && currentDir === -1 && prevDir !== -1) {
              markers.push({
                time: candlestickData[i].time,
                position: 'aboveBar',
                color: '#ef5350', // TradingView 빨간색
                shape: 'arrowDown', // lightweight-charts v5 형식
                text: 'SELL',
                size: 2,
              });
            }
          }
          if (markers.length > 0) {
            console.log(`[applyIndicators] ${indicator.signal} 마커 ${markers.length}개 생성`);
            result.markers.push(...markers);
          }
        } else {
          console.warn('[applyIndicators] plotshape: superTrendDir이 없습니다');
        }
        break;
    }
  }
  
  return result;
}

