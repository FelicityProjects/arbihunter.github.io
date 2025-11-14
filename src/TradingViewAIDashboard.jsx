import React, { useEffect, useState } from "react";

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

// 기본 심볼 (ETH)
const DEFAULT_SYMBOLS = [
  "BINANCE:ETHUSDT",
  "BINANCE:BTCUSDT",
  "BINANCE:SOLUSDT",
  "NASDAQ:TSLA",
];

function TradingViewAIDashboard() {
  const [symbol, setSymbol] = useState("BINANCE:ETHUSDT");
  const [timeframe, setTimeframe] = useState("60");
  const [customSymbol, setCustomSymbol] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // TradingView 위젯 로딩 (4개 차트 동일 설정)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scriptId = "tradingview-widget-script";

    const createWidgets = () => {
      if (typeof window.TradingView === "undefined") return;

      CHART_IDS.forEach((id) => {
        const container = document.getElementById(id);
        if (!container) return;

        // 기존 내용 초기화
        container.innerHTML = "";

        // 실제 픽셀 높이를 읽어서 숫자로 전달 (autosize 끔)
        const heightPx = Math.max(200, container.clientHeight); // 최소값 방지

        // TradingView 위젯 생성 (height는 숫자(px)로 전달)
        new window.TradingView.widget({
          symbol,
          interval: timeframe,
          timezone: "Asia/Seoul",
          theme: "dark",
          style: "1",
          locale: "kr",
          container_id: id,
          width: "100%",
          height: heightPx,   // 픽셀 높이 전달
          autosize: false,    // 컨테이너 크기에 의존시키지 않음(직접 높이 지정)
          allow_symbol_change: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          save_image: false,
        });
      });
    };

    // 리사이즈시 위젯 재생성 (디바운스)
    let resizeTimer = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        createWidgets();
      }, 200);
    };

    // tv.js가 없다면 스크립트 추가
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = createWidgets;
      document.body.appendChild(script);
    } else {
      createWidgets();
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [symbol, timeframe]);

  // (예시) AI 분석 – 실제론 백엔드/모델 연동
  const runMockAnalysis = () => {
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
      symbol,
      timeframe,
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
          ? `${symbol} 종목은 단기적으로 매수 우세 시그널이 포착되었습니다. 다만 변동성이 높을 수 있으므로 포지션 사이즈 관리가 중요합니다.`
          : signal === "sell"
          ? `${symbol} 종목은 단기 조정 또는 하락 가능성이 상대적으로 높게 나타납니다. 이미 보유 중이라면 리스크 관리 관점에서 손절/부분 청산 전략을 고려할 수 있습니다.`
          : `${symbol} 종목은 현재 뚜렷한 방향성이 없는 구간으로 분석됩니다. 추세 형성까지 관망 또는 소규모 포지션 운용이 적절할 수 있습니다.`,
      createdAt: now.toISOString(),
    };
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const mock = runMockAnalysis();
      await new Promise((resolve) => setTimeout(resolve, 500)); // 살짝 딜레이
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
      setSymbol(customSymbol.trim().toUpperCase());
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

  // 2x2 그리드
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    alignItems: "stretch",
  };

  // 차트 박스 (높이는 필요하면 여기서 숫자 조절)
  const chartBoxStyle = {
    width: "100%",
    height: "250px", // 360px보다 크게(원하면 더 키워도 됨)
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

  return (
    <div style={{ padding: 16, background: "#020617", minHeight: "100vh", color: "#e5e7eb" }}>
      {/* 상단 툴바 */}
      <div style={toolbarStyle}>
        <span style={labelStyle}>타임프레임:</span>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          style={{ padding: "4px 8px" }}
        >
          {TIMEFRAMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <span style={labelStyle}>심볼:</span>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ padding: "4px 8px" }}
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
          style={{ flex: "1 1 auto", padding: "4px 8px" }}
        />
        <button onClick={handleApplyCustomSymbol} style={{ padding: "4px 10px" }}>
          적용
        </button>
        <button onClick={handleRunAnalysis} disabled={isAnalyzing} style={{ padding: "4px 10px" }}>
          {isAnalyzing ? "분석 중..." : "AI 분석 실행"}
        </button>
      </div>

      {/* 2x2 그리드: 각 차트는 가로 1/2 */}
      <div style={gridStyle}>
        {CHART_IDS.map((id) => (
          <div key={id} style={chartBoxStyle}>
            {/* TradingView 위젯이 이 div 내부에 렌더링됨 */}
            <div id={id} style={{ width: "100%", height: "100%" }} />
          </div>
        ))}
      </div>

      {/* 분석 결과 / 에러 */}
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
