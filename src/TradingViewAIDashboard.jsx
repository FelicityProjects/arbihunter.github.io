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
        `// Pine Script 예시\n//@version=5\nindicator("Chart pipeline example", overlay=true)\nplot(close)`
    )
  );

  const [selectedChartIdx, setSelectedChartIdx] = useState(0);
  const [customSymbol, setCustomSymbol] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // TradingView 위젯 로딩 (각 차트별 설정 사용) - 디버그 및 재시도 로직 포함
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scriptId = "tradingview-widget-script";

    const createWidgets = (attempt = 1) => {
      console.log(`[TV DEBUG] createWidgets 호출 (attempt ${attempt}), window.TradingView:`, !!window.TradingView);
      if (typeof window.TradingView === "undefined") {
        setError("TradingView 스크립트가 로드되지 않았습니다.");
        return;
      }
      setError(null);

      CHART_IDS.forEach((id, idx) => {
        const container = document.getElementById(id);
        console.log(`[TV DEBUG] container ${id}:`, !!container, "config:", chartConfigs[idx]);
        if (!container) {
          // UI에 보이도록 오류 상태 설정
          setError((prev) => (prev ? prev + `\n컨테이너 ${id} 없음` : `컨테이너 ${id} 없음`));
          return;
        }

        try {
          // 기존 내용 초기화
          container.innerHTML = "";

          // 컨테이너 실제 픽셀 높이를 읽어서 숫자로 전달
          const heightPx = Math.max(200, container.clientHeight);

          const cfg = chartConfigs[idx] || {};
          console.log(`[TV DEBUG] 위젯 생성 시작: id=${id}, symbol=${cfg.symbol}, interval=${cfg.timeframe}, height=${heightPx}`);

          new window.TradingView.widget({
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

          // 생성 직후 DOM 확인 (widget이 내부에 삽입되었는지)
          setTimeout(() => {
            try {
              console.log(`[TV DEBUG] ${id} innerHTML length:`, container.innerHTML.length);
              // 내부에 iframe/div 등 요소가 없으면 재시도
              if (container.innerHTML.trim().length === 0 && attempt < 4) {
                console.warn(`[TV DEBUG] ${id}에 위젯 내용 없음 — 재시도 ${attempt + 1}`);
                setTimeout(() => createWidgets(attempt + 1), 1000);
              }
            } catch (e) {
              console.error("[TV DEBUG] innerHTML 체크 오류:", e);
            }
          }, 600);
        } catch (e) {
          console.error("[TV DEBUG] widget 생성 오류:", e);
          setError((prev) => (prev ? prev + `\nwidget 생성 오류: ${e.message}` : `widget 생성 오류: ${e.message}`));
        }
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

    // tv.js가 없다면 스크립트 추가 (onerror 추가)
    if (!document.getElementById(scriptId)) {
      console.log("[TV DEBUG] tv.js 스크립트 추가 시도");
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        console.log("[TV DEBUG] tv.js 로드 완료");
        // DOM이 완전히 렌더링되도록 짧게 지연 후 생성 시도
        setTimeout(() => createWidgets(1), 300);
      };
      script.onerror = (err) => {
        console.error("[TV DEBUG] tv.js 로드 실패", err);
        setError("TradingView 스크립트 로드 실패 (네트워크/CSP 확인)");
      };
      document.body.appendChild(script);
    } else {
      console.log("[TV DEBUG] tv.js 이미 존재, createWidgets 호출 (지연 100ms)");
      setTimeout(() => createWidgets(1), 100);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
    // chartConfigs 변경 시 각 위젯 재생성
  }, [chartConfigs]);

  // (예시) AI 분석 – 선택된 차트의 설정 사용
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

  // Pine script 파일 다운로드 (차트 인덱스 지정 가능)
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

  // 선택 차트의 Pine 스크립트를 클립보드에 복사하고 TradingView를 새 탭으로 엽니다.
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

  const copyPineToAll = () => {
    setPineScripts((prev) => prev.map(() => prev[selectedChartIdx] || ""));
  };

  // 2x2 그리드 스타일 및 차트 박스
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

  // 선택된 차트의 설정 편집 핸들러
  const updateSelectedChartConfig = (patch) => {
    setChartConfigs((prev) => {
      const next = [...prev];
      next[selectedChartIdx] = { ...next[selectedChartIdx], ...patch };
      return next;
    });
  };

  return (
    <div style={{ padding: 16, background: "#020617", minHeight: "100vh", color: "#e5e7eb" }}>
      {/* 툴바: 선택 차트 설정 */}
      <div style={toolbarStyle}>
        <div style={labelStyle}>선택 차트: #{selectedChartIdx + 1}</div>

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

      {/* Pine Editor 패널 */}
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
            <button onClick={handleDownloadPine} style={{ padding: "6px 10px" }}>
              전체 다운로드(선택)
            </button>
            <button onClick={copyPineToAll} style={{ padding: "6px 10px" }}>
              모든 차트에 복사
            </button>
            <button onClick={handleOpenTradingView} style={{ padding: "6px 10px" }}>
              TradingView에서 열기
            </button>
            <button onClick={() => handleCopyPineToClipboard(selectedChartIdx)} style={{ padding: "6px 10px" }}>
              복사 후 TradingView 열기
            </button>
          </div>
          <div style={{ marginTop: 8, color: "#9ca3af", fontSize: 12 }}>
            참고: 임베디드 위젯에는 스크립트를 자동 적용할 수 없습니다. TradingView 웹 차트에서 Pine Editor에 붙여넣어 사용하세요.
          </div>
        </div>

        <textarea
          value={pineScripts[selectedChartIdx]}
          onChange={(e) => handleChangePine(e.target.value)}
          style={{
            flex: "1 1 auto",
            minHeight: 140,
            maxHeight: 500,
            width: 720,
            padding: 8,
            background: "#0b1220",
            color: "#e5e7eb",
            borderRadius: 6,
            border: "1px solid #1f2937",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        />
      </div>

      {/* 2x2 그리드: 각 차트는 가로 1/2 */}
      <div style={gridStyle}>
        {CHART_IDS.map((id, idx) => (
          <div
            key={id}
            style={{
              ...chartBoxStyle,
              cursor: "pointer",
              outline: idx === selectedChartIdx ? "2px solid #60a5fa" : "none",
            }}
            onClick={() => setSelectedChartIdx(idx)}
            title={`차트 선택: ${idx + 1} (클릭하여 Pine Editor 대상 변경)`}
          >
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