import React, { useEffect, useRef } from 'react';
import { 
  createChart, 
  ColorType,
  CandlestickSeries,
  LineSeries
} from 'lightweight-charts';
import { parsePineScript, applyIndicators } from './pineScriptParser';

function LocalChart({ 
  id, 
  symbol, 
  timeframe, 
  pineScript, 
  height = 360,
  onChartReady 
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const lineSeriesRefs = useRef([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 차트 생성 (TradingView 스타일)
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
        fontSize: 12,
      },
      grid: {
        vertLines: { 
          color: '#1e222d',
          style: 0, // 0 = solid
        },
        horzLines: { 
          color: '#1e222d',
          style: 0,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 0, // Normal
        vertLine: {
          color: '#758696',
          width: 1,
          style: 0,
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 0,
        },
      },
    });

    chartRef.current = chart;

    // 캔들스틱 시리즈 생성 (TradingView 스타일)
    const seriesOptions = {
      upColor: '#26a69a', // TradingView 녹색
      downColor: '#ef5350', // TradingView 빨간색
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
    };
    
    // lightweight-charts v5 API: CandlestickSeries를 import해서 사용
    let candlestickSeries;
    
    try {
      if (CandlestickSeries && typeof chart.addSeries === 'function') {
        // v5 API: addSeries(CandlestickSeries, options)
        candlestickSeries = chart.addSeries(CandlestickSeries, seriesOptions);
      } else if (typeof chart.addCandlestickSeries === 'function') {
        // 이전 버전 호환성
        candlestickSeries = chart.addCandlestickSeries(seriesOptions);
      } else {
        throw new Error('CandlestickSeries를 생성할 수 없습니다. CandlestickSeries:', CandlestickSeries, 'addSeries:', typeof chart.addSeries);
      }
    } catch (error) {
      console.error('[LocalChart] 캔들스틱 시리즈 생성 오류:', error);
      console.error('[LocalChart] CandlestickSeries:', CandlestickSeries);
      console.error('[LocalChart] chart.addSeries:', typeof chart.addSeries);
      console.error('[LocalChart] chart.addCandlestickSeries:', typeof chart.addCandlestickSeries);
      throw error;
    }

    seriesRef.current = candlestickSeries;

    // 실제 Binance API에서 데이터 가져오기
    const fetchBinanceData = async () => {
      try {
        // 심볼 파싱 (BINANCE:ETHUSDT -> ETHUSDT)
        const binanceSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
        
        // 타임프레임 변환
        let interval = '1h';
        if (timeframe === 'D') {
          interval = '1d';
        } else if (timeframe === '15') {
          interval = '15m';
        } else if (timeframe === '60') {
          interval = '1h';
        } else if (timeframe === '240') {
          interval = '4h';
        } else {
          interval = `${timeframe}m`;
        }

        // Binance API 호출
        const limit = 500; // 최대 500개 캔들
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
        
        console.log(`[LocalChart ${id}] Binance API 호출:`, url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Binance API 오류: ${response.status}`);
        }
        
        const klines = await response.json();
        
        // Binance 데이터 형식: [openTime, open, high, low, close, volume, ...]
        const data = klines
          .map(k => ({
            time: Math.floor(k[0] / 1000), // 밀리초를 초로 변환
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
          }))
          .filter(item => 
            item.time > 0 && 
            !isNaN(item.open) && 
            !isNaN(item.high) && 
            !isNaN(item.low) && 
            !isNaN(item.close) &&
            item.high >= item.low &&
            item.high >= Math.max(item.open, item.close) &&
            item.low <= Math.min(item.open, item.close)
          )
          .sort((a, b) => a.time - b.time); // 시간순 정렬
        
        console.log(`[LocalChart ${id}] Binance 데이터 로드 완료:`, data.length, '개 캔들');
        if (data.length > 0) {
          console.log(`[LocalChart ${id}] 첫 캔들:`, data[0]);
          console.log(`[LocalChart ${id}] 마지막 캔들:`, data[data.length - 1]);
        }
        return data;
      } catch (error) {
        console.error(`[LocalChart ${id}] Binance API 오류:`, error);
        // API 실패 시 샘플 데이터 생성 (더 현실적인 가격으로)
        return generateFallbackData(symbol);
      }
    };

    // API 실패 시 대체 데이터 생성
    const generateFallbackData = (sym) => {
      const data = [];
      const now = Date.now();
      const interval = timeframe === 'D' ? 86400000 : parseInt(timeframe) * 60000;
      
      // 심볼별 기본 가격 설정
      let basePrice = 3000; // ETH 기본 가격
      if (sym.includes('BTC')) basePrice = 60000;
      else if (sym.includes('SOL')) basePrice = 150;
      else if (sym.includes('TSLA')) basePrice = 250;
      
      let currentPrice = basePrice;
      
      for (let i = 200; i >= 0; i--) {
        const time = Math.floor((now - i * interval) / 1000);
        // 더 현실적인 가격 변동 (랜덤 워크)
        const changePercent = (Math.random() - 0.5) * 0.02; // ±1% 변동
        const open = currentPrice;
        const close = open * (1 + changePercent);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        
        currentPrice = close;
        
        data.push({
          time: time,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
        });
      }
      
      return data;
    };

    // 초기 데이터는 빈 배열로 시작
    let validData = [];
    
    // 비동기 데이터 로드
    fetchBinanceData().then(data => {
      // 데이터 검증
      validData = data.filter(item => 
        item && 
        item.time != null && 
        !isNaN(item.open) && 
        !isNaN(item.high) && 
        !isNaN(item.low) && 
        !isNaN(item.close) &&
        item.high >= item.low &&
        item.high >= Math.max(item.open, item.close) &&
        item.low <= Math.min(item.open, item.close)
      );
      
      if (validData.length > 0) {
        candlestickSeries.setData(validData);
        
        // Pine Script가 있으면 적용
        if (pineScript && pineScript.trim()) {
          setTimeout(() => {
            try {
              const indicators = parsePineScript(pineScript);
              if (indicators.length > 0) {
                const result = applyIndicators(validData, indicators);
                
                // 기존 라인 시리즈 제거
                lineSeriesRefs.current.forEach(lineSeries => {
                  try {
                    chartRef.current.removeSeries(lineSeries);
                  } catch (e) {}
                });
                lineSeriesRefs.current = [];

                // 새로운 라인 시리즈 추가
                result.lines.forEach((lineConfig, idx) => {
                  try {
                    if (!lineConfig.data || lineConfig.data.length === 0) return;
                    
                    const cleanedData = lineConfig.data
                      .filter(item => item && item.time != null && item.value != null && !isNaN(item.value))
                      .map(item => ({
                        time: item.time,
                        value: Number(item.value)
                      }))
                      .filter(item => !isNaN(item.value) && isFinite(item.value));

                    if (cleanedData.length === 0) return;

                    let lineSeries;
                    if (LineSeries && typeof chartRef.current.addSeries === 'function') {
                      lineSeries = chartRef.current.addSeries(LineSeries, {
                        color: lineConfig.color || '#60a5fa',
                        lineWidth: lineConfig.lineWidth || 1,
                        title: lineConfig.title || `Indicator ${idx + 1}`,
                      });
                    } else if (typeof chartRef.current.addLineSeries === 'function') {
                      lineSeries = chartRef.current.addLineSeries({
                        color: lineConfig.color || '#60a5fa',
                        lineWidth: lineConfig.lineWidth || 1,
                        title: lineConfig.title || `Indicator ${idx + 1}`,
                      });
                    } else {
                      return;
                    }
                    
                    lineSeries.setData(cleanedData);
                    lineSeriesRefs.current.push(lineSeries);
                  } catch (e) {
                    console.error(`[LocalChart ${id}] 초기 라인 시리즈 추가 오류:`, e);
                  }
                });
                
                // 마커 추가 (BUY/SELL 신호)
                if (result.markers && result.markers.length > 0) {
                  try {
                    console.log(`[LocalChart ${id}] 마커 추가 시도:`, result.markers.length, '개');
                    // 모든 마커를 한 번에 설정
                    seriesRef.current.setMarkers(result.markers);
                    console.log(`[LocalChart ${id}] 마커 추가 완료:`, result.markers);
                  } catch (e) {
                    console.error(`[LocalChart ${id}] 마커 추가 오류:`, e);
                    console.error(`[LocalChart ${id}] 마커 데이터:`, result.markers);
                  }
                } else {
                  console.log(`[LocalChart ${id}] 마커가 없습니다`);
                }
              }
            } catch (error) {
              console.error(`[LocalChart ${id}] 초기 Pine Script 파싱 오류:`, error);
            }
          }, 200);
        }
      } else {
        console.error('[LocalChart] 유효한 캔들스틱 데이터가 없습니다');
      }
    }).catch(error => {
      console.error(`[LocalChart ${id}] 데이터 로드 실패:`, error);
    });


    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    if (onChartReady) {
      onChartReady(chart);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [id, symbol, timeframe, height, onChartReady, pineScript]);

  // Pine Script 변경 시 지표 재적용 (버튼 클릭 시에만 적용)
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) {
      console.log(`[LocalChart ${id}] 차트가 아직 초기화되지 않음`);
      return;
    }

    // pineScript가 비어있으면 기존 지표 제거
    if (!pineScript || pineScript.trim() === "") {
      console.log(`[LocalChart ${id}] Pine Script가 비어있음 - 지표 제거`);
      lineSeriesRefs.current.forEach(lineSeries => {
        try {
          chartRef.current.removeSeries(lineSeries);
        } catch (e) {
          console.warn(`[LocalChart ${id}] 시리즈 제거 오류:`, e);
        }
      });
      lineSeriesRefs.current = [];
      return;
    }

    console.log(`[LocalChart ${id}] Pine Script 적용 시작:`, pineScript.substring(0, 50) + '...');

    try {
      const indicators = parsePineScript(pineScript);
      console.log(`[LocalChart ${id}] 파싱된 지표:`, indicators);
      
      if (indicators.length === 0) {
        console.warn(`[LocalChart ${id}] 파싱 가능한 지표 없음`);
        // 지표가 없으면 라인 제거
        lineSeriesRefs.current.forEach(lineSeries => {
          try {
            chartRef.current.removeSeries(lineSeries);
          } catch (e) {
            console.warn(`[LocalChart ${id}] 시리즈 제거 오류:`, e);
          }
        });
        lineSeriesRefs.current = [];
        return;
      }

      // 현재 캔들스틱 데이터 가져오기
      const currentData = seriesRef.current.data();
      console.log(`[LocalChart ${id}] 캔들스틱 데이터 개수:`, currentData ? currentData.length : 0);
      
      if (!currentData || currentData.length === 0) {
        console.warn(`[LocalChart ${id}] 캔들스틱 데이터가 없음`);
        return;
      }

      const result = applyIndicators(currentData, indicators);
      console.log(`[LocalChart ${id}] 적용할 라인 개수:`, result.lines.length);

      // 기존 라인 시리즈 제거
      lineSeriesRefs.current.forEach(lineSeries => {
        try {
          chartRef.current.removeSeries(lineSeries);
        } catch (e) {
          console.warn(`[LocalChart ${id}] 시리즈 제거 오류:`, e);
        }
      });
      lineSeriesRefs.current = [];

      // 새로운 라인 시리즈 추가
      result.lines.forEach((lineConfig, idx) => {
        try {
          // 데이터 검증 및 정리
          if (!lineConfig.data || lineConfig.data.length === 0) {
            console.warn(`[LocalChart ${id}] 라인 ${idx + 1} 데이터가 없음`);
            return;
          }

          // 데이터 형식 검증 및 정리
          const cleanedData = lineConfig.data
            .filter(item => item && item.time != null && item.value != null && !isNaN(item.value))
            .map(item => ({
              time: typeof item.time === 'number' ? item.time : item.time,
              value: Number(item.value)
            }))
            .filter(item => !isNaN(item.value) && isFinite(item.value));

          if (cleanedData.length === 0) {
            console.warn(`[LocalChart ${id}] 라인 ${idx + 1} 유효한 데이터가 없음`);
            return;
          }

          // v5 API: LineSeries 사용
          let lineSeries;
          if (LineSeries && typeof chartRef.current.addSeries === 'function') {
            lineSeries = chartRef.current.addSeries(LineSeries, {
              color: lineConfig.color || '#60a5fa',
              lineWidth: lineConfig.lineWidth || 1,
              title: lineConfig.title || `Indicator ${idx + 1}`,
            });
          } else if (typeof chartRef.current.addLineSeries === 'function') {
            lineSeries = chartRef.current.addLineSeries({
              color: lineConfig.color || '#60a5fa',
              lineWidth: lineConfig.lineWidth || 1,
              title: lineConfig.title || `Indicator ${idx + 1}`,
            });
          } else {
            throw new Error('LineSeries를 생성할 수 없습니다');
          }

          lineSeries.setData(cleanedData);
          lineSeriesRefs.current.push(lineSeries);
          console.log(`[LocalChart ${id}] 라인 시리즈 ${idx + 1} 추가 완료, 데이터 개수:`, cleanedData.length);
        } catch (e) {
          console.error(`[LocalChart ${id}] 라인 시리즈 추가 오류:`, e);
        }
      });
      
      // 마커 추가 (plotshape) - BUY/SELL 신호
      if (result.markers && result.markers.length > 0) {
        try {
          console.log(`[LocalChart ${id}] 마커 추가 시도:`, result.markers.length, '개');
          // 기존 마커 제거 후 새로 추가
          seriesRef.current.setMarkers([]);
          seriesRef.current.setMarkers(result.markers);
          console.log(`[LocalChart ${id}] 마커 ${result.markers.length}개 추가 완료:`, result.markers);
        } catch (e) {
          console.error(`[LocalChart ${id}] 마커 추가 오류:`, e);
          console.error(`[LocalChart ${id}] 마커 데이터:`, result.markers);
        }
      } else {
        // 마커가 없으면 기존 마커 제거
        try {
          seriesRef.current.setMarkers([]);
        } catch (e) {
          // 무시
        }
      }
      
      console.log(`[LocalChart ${id}] Pine Script 적용 완료`);
    } catch (error) {
      console.error(`[LocalChart ${id}] Pine Script 적용 오류:`, error);
    }
  }, [pineScript, id, symbol, timeframe]);

  return (
    <div 
      ref={chartContainerRef} 
      style={{ 
        width: '100%', 
        height: `${height}px`,
        position: 'relative'
      }} 
    />
  );
}

export default LocalChart;

