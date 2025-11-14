import React, { useEffect, useState, useRef } from "react";
import LocalChart from "./LocalChart";
import { parsePineScript } from "./pineScriptParser";

// 4개의 차트 컨테이너 ID
const CHART_IDS = [
  "tradingview_chart_1",
  "tradingview_chart_2",
  "tradingview_chart_3",
  "tradingview_chart_4",
];

const TIMEFRAMES = [
  { label: "15m", value: "15" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "1D", value: "D" },
];

// 기본 심볼 (초기값을 차트별로 다르게 설정)
const DEFAULT_SYMBOLS = [
  "BINANCE:ETHUSDT",
  "BINANCE:BTCUSDT",
  "BINANCE:SOLUSDT",
  "NASDAQ:TSLA",
];

function TradingViewAIDashboard() {
  // 각 차트별 설정(state)
  const [chartConfigs, setChartConfigs] = useState(
    CHART_IDS.map((_, idx) => ({
      symbol: DEFAULT_SYMBOLS[idx] || DEFAULT_SYMBOLS[0],
      timeframe: "60",
    }))
  );

  // 각 차트별 Pine Script 저장
  const [pineScripts, setPineScripts] = useState(
    CHART_IDS.map(
      () =>
        `//@version=5
indicator("ETH SuperTrend Signals", overlay=true)

len = input.int(10), factor = input.float(3.0, step=0.1)

[st, dir] = ta.supertrend(factor, len)

long  = dir ==  1 and dir[1] !=  1
short = dir == -1 and dir[1] != -1

plot(st, "SuperTrend", color = dir==1? color.green: color.red)
plotshape(long,  style=shape.triangleup,   location=location.belowbar, color=color.green, text="BUY")
plotshape(short, style=shape.triangledown, location=location.abovebar, color=color.red,   text="SELL")

// 알림(웹훅 JSON, 자리표시자 사용 가능)
alertcondition(long,  "BUY",  '{"side":"buy","symbol":"{{ticker}}","price":{{close}},"time":"{{time}}"}')
alertcondition(short, "SELL", '{"side":"sell","symbol":"{{ticker}}","price":{{close}},"time":"{{time}}"}')`
    )
  );

  const [selectedChartIdx, setSelectedChartIdx] = useState(0);
  const [customSymbol, setCustomSymbol] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  
  // 각 차트별 모드 (tradingview | local)
  const [chartModes, setChartModes] = useState(
    CHART_IDS.map(() => "tradingview")
  );
  
  // 각 차트별 적용된 Pine Script (버튼 클릭 시 적용)
  const [appliedPineScripts, setAppliedPineScripts] = useState(
    CHART_IDS.map(() => "")
  );

  // 위젯 인스턴스 저장용 ref
  const widgetRefs = useRef([]);

  // TradingView 위젯 로딩 (각 차트별 설정 사용) - 디버그 및 재시도 로직 포함
  useEffect(() => {
    if (typeof window === "undefined") return;

    // TradingView 모드인 차트만 처리
    const tradingViewIndices = chartModes
      .map((mode, idx) => mode === "tradingview" ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (tradingViewIndices.length === 0) return;

    const scriptId = "tradingview-widget-script";
    let resizeTimer = null;
    let scriptAppended = false;

    const createWidgets = (attempt = 1) => {
      console.log(
        `[TV DEBUG] createWidgets 호출 (attempt ${attempt}), window.TradingView:`,
        !!window.TradingView
      );
      if (typeof window.TradingView === "undefined") {
        setError("TradingView 스크립트가 로드되지 않았습니다.");
        return;
      }
      setError(null);

      tradingViewIndices.forEach((idx) => {
        const id = CHART_IDS[idx];
        const container = document.getElementById(id);
        console.log(
          `[TV DEBUG] container ${id}:`,
          !!container,
          "config:",
          chartConfigs[idx]
        );
        if (!container) {
          setError((prev) =>
            prev ? prev + `\n컨테이너 ${id} 없음` : `컨테이너 ${id} 없음`
          );
          return;
        }

        try {
          container.innerHTML = "";

          const heightPx = Math.max(200, container.clientHeight);

          const cfg = chartConfigs[idx] || {};
          console.log(
            `[TV DEBUG] 위젯 생성 시작: id=${id}, symbol=${cfg.symbol}, interval=${cfg.timeframe}, height=${heightPx}`
          );

          const widget = new window.TradingView.widget({
            symbol: cfg.symbol || DEFAULT_SYMBOLS[0],
            interval: cfg.timeframe || "60",
            timezone: "Asia/Seoul",
            theme: "dark",
            style: "1",
            locale: "kr",
            container_id: id,
            width: "100%",
            height: heightPx,
            autosize: false,
            allow_symbol_change: false,
            hide_top_toolbar: false,
            hide_side_toolbar: false,
            save_image: false,
            overrides: {},
          });

          // 인스턴스 저장 (정리용)
          try {
            widgetRefs.current[idx] = widget;
          } catch (_) {}

          setTimeout(() => {
            try {
              console.log(
                `[TV DEBUG] ${id} innerHTML length:`,
                container.innerHTML.length
              );
              const children = Array.from(container.children).map((c) => ({
                tag: c.tagName,
                id: c.id || null,
                class: c.className || null,
                htmlLength: c.innerHTML ? c.innerHTML.length : 0,
              }));
              console.log(`[TV DEBUG] ${id} children:`, children);

              const iframes = Array.from(
                container.querySelectorAll("iframe")
              ).map((f) => {
                const cs = window.getComputedStyle(f);
                try {
                  f.style.display = "block";
                  f.style.visibility = "visible";
                  f.style.opacity = "1";
                  f.style.zIndex = "9999";
                  f.style.width = "100%";
                  f.style.height = "100%";
                  f.style.pointerEvents = "auto";
                } catch (_) {}
                return {
                  src: f.src,
                  width: f.width || f.clientWidth,
                  height: f.height || f.clientHeight,
                  display: cs.display,
                  visibility: cs.visibility,
                  opacity: cs.opacity,
                };
              });
              console.log(`[TV DEBUG] ${id} iframes:`, iframes);

              if (container.innerHTML.trim().length === 0 && attempt < 4) {
                console.warn(
                  `[TV DEBUG] ${id}에 위젯 내용 없음 — 재시도 ${attempt + 1}`
                );
                setTimeout(() => createWidgets(attempt + 1), 1000);
              }

              if (iframes.length > 0) {
                const zeroSize = iframes.some(
                  (f) => f.width === 0 || f.height === 0
                );
                if (zeroSize) {
                  console.warn(`[TV DEBUG] ${id} iframe 중 0 크기 발견`);
                }
              }
            } catch (e) {
              console.error("[TV DEBUG] innerHTML 체크 오류:", e);
            }
          }, 600);
        } catch (e) {
          console.error("[TV DEBUG] widget 생성 오류:", e);
          setError((prev) =>
            prev ? prev + `\nwidget 생성 오류: ${e.message}` : `widget 생성 오류: ${e.message}`
          );
        }
      });
    };

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        createWidgets();
      }, 200);
    };

    if (!document.getElementById(scriptId)) {
      console.log("[TV DEBUG] tv.js 스크립트 추가 시도");
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        console.log("[TV DEBUG] tv.js 로드 완료");
        setTimeout(() => createWidgets(1), 300);
      };
      script.onerror = (err) => {
        console.error("[TV DEBUG] tv.js 로드 실패", err);
        setError("TradingView 스크립트 로드 실패 (네트워크/CSP 확인)");
      };
      document.body.appendChild(script);
      scriptAppended = true;
    } else {
      console.log("[TV DEBUG] tv.js 이미 존재, createWidgets 호출 (지연 100ms)");
      setTimeout(() => createWidgets(1), 100);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);

      // 위젯 정리
      widgetRefs.current.forEach((w, i) => {
        try {
          if (w && typeof w.remove === "function") {
            w.remove();
          } else {
            const el = document.getElementById(CHART_IDS[i]);
            if (el) el.innerHTML = "";
          }
        } catch (_) {}
      });
      widgetRefs.current = [];

      // 스크립트 제거 (이 컴포넌트가 추가한 경우에만)
      if (scriptAppended) {
        const s = document.getElementById(scriptId);
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
    };
    // chartConfigs, chartModes 변경 시 각 위젯 재생성
  }, [chartConfigs, chartModes]);

  const runMockAnalysis = (cfg) => {
    const now = new Date();
    const r = Math.random();

    let signal;
    if (r > 0.66) signal = "buy";
    else if (r < 0.33) signal = "sell";
    else signal = "neutral";

    const buyProbability =
      signal === "buy" ? 0.7 + Math.random() * 0.2 : 0.2 + Math.random() * 0.2;
    const sellProbability =
      signal === "sell" ? 0.7 + Math.random() * 0.2 : 0.2 + Math.random() * 0.2;

    return {
      symbol: cfg.symbol,
      timeframe: cfg.timeframe,
      signal,
      confidence: 0.6 + Math.random() * 0.35,
      buyProbability: Number(buyProbability.toFixed(2)),
      sellProbability: Number(sellProbability.toFixed(2)),
      riskScore: Number((0.3 + Math.random() * 0.6).toFixed(2)),
      factors: [
        "단기 추세 모멘텀",
        "거래량 변화율",
        "최근 고점·저점 위치",
        "변동성 클러스터링",
      ],
      summary:
        signal === "buy"
          ? `${cfg.symbol} 종목은 단기적으로 매수 우세 시그널이 포착되었습니다. 다만 변동성이 높을 수 있으므로 포지션 사이즈 관리가 중요합니다.`
          : signal === "sell"
          ? `${cfg.symbol} 종목은 단기 조정 또는 하락 가능성이 상대적으로 높게 나타납니다. 이미 보유 중이라면 리스크 관리 관점에서 손절/부분 청산 전략을 고려할 수 있습니다.`
          : `${cfg.symbol} 종목은 현재 뚜렷한 방향성이 없는 구간으로 분석됩니다. 추세 형성까지 관망 또는 소규모 포지션 운용이 적절할 수 있습니다.`,
      createdAt: now.toISOString(),
    };
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const cfg = chartConfigs[selectedChartIdx];
      const mock = runMockAnalysis(cfg);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAnalysis(mock);
    } catch (e) {
      console.error(e);
      setError(e.message || "분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyCustomSymbol = () => {
    if (customSymbol.trim()) {
      setChartConfigs((prev) => {
        const next = [...prev];
        next[selectedChartIdx] = {
          ...next[selectedChartIdx],
          symbol: customSymbol.trim().toUpperCase(),
        };
        return next;
      });
      setCustomSymbol("");
    }
  };

  const renderSignalBadge = () => {
    if (!analysis) return null;
    const base = {
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      marginLeft: 8,
    };

    if (analysis.signal === "buy") {
      return (
        <span
          style={{
            ...base,
            background: "rgba(16, 185, 129, 0.1)",
            color: "#6ee7b7",
            border: "1px solid rgba(16, 185, 129, 0.5)",
          }}
        >
          ● 매수 우세
        </span>
      );
    }
    if (analysis.signal === "sell") {
      return (
        <span
          style={{
            ...base,
            background: "rgba(248, 113, 113, 0.1)",
            color: "#fecaca",
            border: "1px solid rgba(248, 113, 113, 0.5)",
          }}
        >
          ● 매도 우세
        </span>
      );
    }
    return (
      <span
        style={{
          ...base,
          background: "rgba(148, 163, 184, 0.1)",
          color: "#e5e7eb",
          border: "1px solid rgba(148, 163, 184, 0.5)",
        }}
      >
        ● 중립 / 관망
      </span>
    );
  };

  const handleDownloadPine = (idx = selectedChartIdx) => {
    const content = pineScripts[idx] || "";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${CHART_IDS[idx]}_script.pine`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleOpenTradingView = () => {
    const cfg = chartConfigs[selectedChartIdx];
    const sym = encodeURIComponent(cfg.symbol);
    const interval = encodeURIComponent(cfg.timeframe === "D" ? "D" : `${cfg.timeframe}`);
    const url = `https://www.tradingview.com/chart/?symbol=${sym}&interval=${interval}`;
    window.open(url, "_blank");
  };

  const handleCopyPineToClipboard = async (idx = selectedChartIdx) => {
    try {
      const text = pineScripts[idx] || "";
      await navigator.clipboard.writeText(text);
      alert("Pine 스크립트가 클립보드에 복사되었습니다. TradingView Pine Editor에 붙여넣으세요.");
      const cfg = chartConfigs[idx];
      const sym = encodeURIComponent(cfg.symbol);
      const interval = encodeURIComponent(cfg.timeframe === "D" ? "D" : `${cfg.timeframe}`);
      window.open(`https://www.tradingview.com/chart/?symbol=${sym}&interval=${interval}`, "_blank");
    } catch (e) {
      console.error(e);
      alert("클립보드 복사에 실패했습니다. 수동으로 복사하세요.");
    }
  };

  const handleChangePine = (value) => {
    setPineScripts((prev) => {
      const next = [...prev];
      next[selectedChartIdx] = value;
      return next;
    });
  };

  const handleApplyPineScript = () => {
    if (chartModes[selectedChartIdx] === "local") {
      // 로컬 차트 모드: Pine Script 적용
      const script = pineScripts[selectedChartIdx] || "";
      const indicators = parsePineScript(script);
      
      if (indicators.length > 0) {
        setAppliedPineScripts((prev) => {
          const next = [...prev];
          next[selectedChartIdx] = script;
          return next;
        });
        alert(`✅ ${indicators.length}개의 지표가 적용되었습니다!\n\n적용된 지표:\n${indicators.map((ind, idx) => `${idx + 1}. ${ind.type}${ind.period ? `(${ind.period})` : ''}`).join('\n')}`);
      } else {
        alert("⚠️ 파싱 가능한 지표를 찾을 수 없습니다.\n\n지원 형식:\n- plot(close)\n- plot(sma(close, 20))\n- plot(ema(close, 12))\n- plot(rsi(close, 14))");
      }
    } else {
      alert("로컬 차트 모드로 전환하면 Pine Script를 적용할 수 있습니다.\n\n현재 TradingView 모드에서는 웹 차트에서 직접 적용해야 합니다.");
    }
  };

  const handleLoadExampleScript = () => {
    const examples = [
      `//@version=5
indicator("기본 예시", overlay=true)
plot(close)`,
      `//@version=5
indicator("SMA 예시", overlay=true)
plot(close)
plot(sma(close, 20))`,
      `//@version=5
indicator("EMA 예시", overlay=true)
plot(close)
plot(ema(close, 12))`,
      `//@version=5
indicator("RSI 예시", overlay=true)
plot(close)
plot(rsi(close, 14))`,
      `//@version=5
indicator("복합 지표", overlay=true)
plot(close)
plot(sma(close, 20))
plot(ema(close, 12))`,
    ];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    setPineScripts((prev) => {
      const next = [...prev];
      next[selectedChartIdx] = randomExample;
      return next;
    });
  };

  const handleLoadSuperTrendScript = () => {
    const superTrendScript = `//@version=5
indicator("ETH SuperTrend Signals", overlay=true)

len = input.int(10), factor = input.float(3.0, step=0.1)

[st, dir] = ta.supertrend(factor, len)

long  = dir ==  1 and dir[1] !=  1
short = dir == -1 and dir[1] != -1

plot(st, "SuperTrend", color = dir==1? color.green: color.red)
plotshape(long,  style=shape.triangleup,   location=location.belowbar, color=color.green, text="BUY")
plotshape(short, style=shape.triangledown, location=location.abovebar, color=color.red,   text="SELL")

// 알림(웹훅 JSON, 자리표시자 사용 가능)
alertcondition(long,  "BUY",  '{"side":"buy","symbol":"{{ticker}}","price":{{close}},"time":"{{time}}"}')
alertcondition(short, "SELL", '{"side":"sell","symbol":"{{ticker}}","price":{{close}},"time":"{{time}}"}')`;
    
    setPineScripts((prev) => {
      const next = [...prev];
      next[selectedChartIdx] = superTrendScript;
      return next;
    });
  };

  const copyPineToAll = () => {
    setPineScripts((prev) => prev.map(() => prev[selectedChartIdx] || ""));
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    alignItems: "stretch",
  };

  const chartBoxStyle = {
    width: "100%",
    height: "360px",
    border: "1px solid #1f2937",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#020617",
  };

  const toolbarStyle = {
    marginBottom: 12,
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  };

  const labelStyle = { fontSize: 14, color: "#e5e7eb" };

  const updateSelectedChartConfig = (patch) => {
    setChartConfigs((prev) => {
      const next = [...prev];
      next[selectedChartIdx] = { ...next[selectedChartIdx], ...patch };
      return next;
    });
  };

  const toggleChartMode = (idx) => {
    setChartModes((prev) => {
      const next = [...prev];
      next[idx] = next[idx] === "tradingview" ? "local" : "tradingview";
      return next;
    });
  };

  return (
    <div style={{ padding: 16, background: "#020617", minHeight: "100vh", color: "#e5e7eb" }}>
      <div style={{ marginBottom: 12 }}>
        <textarea
          value={pineScripts[selectedChartIdx]}
          onChange={(e) => handleChangePine(e.target.value)}
          placeholder={`//@version=5
indicator("My Indicator", overlay=true)
plot(close)
plot(sma(close, 20))`}
          style={{
            width: "100%",
            minHeight: 180,
            maxHeight: 300,
            padding: 12,
            background: "#0b1220",
            color: "#e5e7eb",
            borderRadius: 6,
            border: "1px solid #1f2937",
            fontFamily: "monospace",
            fontSize: 13,
            resize: "vertical",
          }}
        />
      </div>

      <div style={toolbarStyle}>
        <div style={labelStyle}>선택 차트: #{selectedChartIdx + 1}</div>

        <select
          value={chartModes[selectedChartIdx] || "tradingview"}
          onChange={(e) => {
            setChartModes((prev) => {
              const next = [...prev];
              next[selectedChartIdx] = e.target.value;
              return next;
            });
          }}
          style={{ marginRight: 8 }}
        >
          <option value="tradingview">TradingView</option>
          <option value="local">로컬 차트 (Pine Script 적용)</option>
        </select>

        <select
          value={chartConfigs[selectedChartIdx]?.timeframe || "60"}
          onChange={(e) => updateSelectedChartConfig({ timeframe: e.target.value })}
        >
          {TIMEFRAMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={chartConfigs[selectedChartIdx]?.symbol || DEFAULT_SYMBOLS[0]}
          onChange={(e) => updateSelectedChartConfig({ symbol: e.target.value })}
        >
          {DEFAULT_SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          placeholder="심볼 입력 (예: BINANCE:ADAUSDT)"
          value={customSymbol}
          onChange={(e) => setCustomSymbol(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <button onClick={handleApplyCustomSymbol}>적용</button>

        <button onClick={handleRunAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? "분석 중..." : "AI 분석 실행"}
        </button>
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 220, maxWidth: 360 }}>
          <div style={{ marginBottom: 6, color: "#9ca3af", fontSize: 13 }}>
            선택 차트: #{selectedChartIdx + 1} · {chartConfigs[selectedChartIdx]?.symbol} ·{" "}
            {TIMEFRAMES.find((t) => t.value === chartConfigs[selectedChartIdx]?.timeframe)?.label || ""}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => handleDownloadPine(selectedChartIdx)} style={{ padding: "6px 10px" }}>
              선택 차트 다운로드
            </button>
          </div>
          <div style={{ marginTop: 8, color: "#9ca3af", fontSize: 12 }}>
            {chartModes[selectedChartIdx] === "local" ? (
              <>
                <strong>로컬 차트 모드:</strong> Pine Script를 작성한 후 "적용" 버튼을 클릭하세요. 
                지원 지표: plot(close), plot(sma(close, period)), plot(ema(close, period)), plot(rsi(close, period))
              </>
            ) : (
              <>
                <strong>TradingView 모드:</strong> 임베디드 위젯에는 스크립트를 자동 적용할 수 없습니다. 
                TradingView 웹 차트에서 Pine Editor에 붙여넣어 사용하세요.
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button 
            onClick={handleApplyPineScript}
            style={{ 
              padding: "8px 16px",
              background: chartModes[selectedChartIdx] === "local" ? "#10b981" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            {chartModes[selectedChartIdx] === "local" ? "✅ Pine Script 적용" : "📋 적용 안내"}
          </button>
          <button 
            onClick={handleLoadSuperTrendScript}
            style={{ 
              padding: "8px 16px",
              background: "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            🚀 SuperTrend 스크립트 로드
          </button>
          <button 
            onClick={handleLoadExampleScript}
            style={{ 
              padding: "8px 16px",
              background: "#1f2937",
              color: "#e5e7eb",
              border: "1px solid #374151",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            📝 예시 스크립트 로드
          </button>
        </div>
      </div>

      <div style={gridStyle}>
        {CHART_IDS.map((id, idx) => (
          <div
            key={id}
            style={{
              ...chartBoxStyle,
              cursor: "pointer",
              outline: idx === selectedChartIdx ? "2px solid #60a5fa" : "none",
              position: "relative",
            }}
            onClick={() => setSelectedChartIdx(idx)}
            title={`차트 선택: ${idx + 1} (클릭하여 Pine Editor 대상 변경)`}
          >
            {chartModes[idx] === "local" ? (
              <LocalChart
                id={id}
                symbol={chartConfigs[idx]?.symbol || DEFAULT_SYMBOLS[0]}
                timeframe={chartConfigs[idx]?.timeframe || "60"}
                pineScript={appliedPineScripts[idx]}
                height={360}
              />
            ) : (
              <div id={id} style={{ width: "100%", height: "100%" }} />
            )}
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                padding: "4px 8px",
                background: chartModes[idx] === "local" ? "#10b981" : "#3b82f6",
                color: "#fff",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                pointerEvents: "none",
              }}
            >
              {chartModes[idx] === "local" ? "로컬" : "TradingView"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {error && <div style={{ color: "#fca5a5", marginBottom: 8 }}>{error}</div>}

        {analysis && (
          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: 8,
              padding: 12,
              background: "#020617",
              fontSize: 13,
            }}
          >
            <div style={{ marginBottom: 6, display: "flex", alignItems: "center" }}>
              <strong>
                AI 매수·매도 시그널 · {analysis.symbol} · {analysis.timeframe}
              </strong>
              {renderSignalBadge()}
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
              <div>매수 확률: {(analysis.buyProbability * 100).toFixed(0)}%</div>
              <div>매도 확률: {(analysis.sellProbability * 100).toFixed(0)}%</div>
              <div>리스크 지수: {(analysis.riskScore * 100).toFixed(0)} / 100</div>
              <div>신뢰도: {(analysis.confidence * 100).toFixed(0)}%</div>
            </div>
            <div style={{ marginBottom: 8 }}>{analysis.summary}</div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>주요 판단 근거</div>
            <ul style={{ marginTop: 0, paddingLeft: 18 }}>
              {analysis.factors.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
            <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
              분석 시각:{" "}
              {new Date(analysis.createdAt).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TradingViewAIDashboard;