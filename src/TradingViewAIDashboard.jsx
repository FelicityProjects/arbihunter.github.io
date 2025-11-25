// TradingViewAIDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import LocalChart from "./LocalChart";
import { parsePineScript } from "./pineScriptParser";
import RsiGptFrontOnlyDemo from "./RsiGptFrontOnlyDemo";

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
  // 반응형 (모바일 여부)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
        `to do
    1.4분할 차트 생성 및 git  - > 20251117 시작 -> 20251118 완료
    2.rsi 분석 팝업 화면 -> 20251119 시작 -> 20251119 완료
    3.rsi 데이터 조회 api(fastapi) 생성 및 화면연동 -> 20251120 시작 -> 20251121 완료
    4.github actions 배포 자동화 (microsoft azure service) -> 20251124 완
    5.azure appservice 환경 설정 및 테스트 -> 20251125 완
    6.rsi 지표를 통한 매수 매도 알고리즘 구현 ... 
    7.생성형 ai 기반 투자 전략 학습 구현 ...
      `
    )
  );

  const [selectedChartIdx, setSelectedChartIdx] = useState(0);
  const [customSymbol, setCustomSymbol] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [showRsiView, setShowRsiView] = useState(false);

  // 각 차트별 모드 (tradingview | local)
  const [chartModes, setChartModes] = useState(
    CHART_IDS.map(() => "tradingview")
  );

  // 각 차트별 적용된 Pine Script (로컬 차트용)
  const [appliedPineScripts, setAppliedPineScripts] = useState(
    CHART_IDS.map(() => "")
  );

  // TradingView 위젯 인스턴스 ref
  const widgetRefs = useRef([]);

  // 모바일 스와이프를 위한 touch ref
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;

    const diff = touchStartXRef.current - touchEndXRef.current;
    const threshold = 50; // 스와이프 판정 기준(px)

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // 왼쪽으로 스와이프 → 다음 차트
        setSelectedChartIdx((prev) => (prev + 1) % CHART_IDS.length);
      } else {
        // 오른쪽으로 스와이프 → 이전 차트
        setSelectedChartIdx((prev) =>
          prev === 0 ? CHART_IDS.length - 1 : prev - 1
        );
      }
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // TradingView 위젯 로딩 (각 차트별 설정 사용)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // TradingView 모드인 차트만 처리
    const tradingViewIndices = chartModes
      .map((mode, idx) => (mode === "tradingview" ? idx : -1))
      .filter((idx) => idx !== -1);

    if (tradingViewIndices.length === 0) return;

    const scriptId = "tradingview-widget-script";
    let resizeTimer = null;
    let scriptAppended = false;

    const createWidgets = (attempt = 1) => {
      if (typeof window.TradingView === "undefined") {
        setError("TradingView 스크립트가 로드되지 않았습니다.");
        return;
      }
      setError(null);

      tradingViewIndices.forEach((idx) => {
        const id = CHART_IDS[idx];
        const container = document.getElementById(id);
        if (!container) {
          setError((prev) =>
            prev ? prev + `\n컨테이너 ${id} 없음` : `컨테이너 ${id} 없음`
          );
          return;
        }

        try {
          container.innerHTML = "";

          const cfg = chartConfigs[idx] || {};

          // autosize 사용, 상위 div 높이에 맞춤
          const widget = new window.TradingView.widget({
            symbol: cfg.symbol || DEFAULT_SYMBOLS[0],
            interval: cfg.timeframe || "60",
            timezone: "Asia/Seoul",
            theme: "dark",
            style: "1",
            locale: "kr",
            container_id: id,
            autosize: true,
            allow_symbol_change: false,
            hide_top_toolbar: false,
            hide_side_toolbar: false,
            save_image: false,
            overrides: {},
          });

          widgetRefs.current[idx] = widget;
        } catch (e) {
          console.error("[TV DEBUG] widget 생성 오류:", e);
          setError((prev) =>
            prev
              ? prev + `\nwidget 생성 오류: ${e.message}`
              : `widget 생성 오류: ${e.message}`
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
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        setTimeout(() => createWidgets(1), 300);
      };
      script.onerror = (err) => {
        console.error("[TV DEBUG] tv.js 로드 실패", err);
        setError("TradingView 스크립트 로드 실패 (네트워크/CSP 확인)");
      };
      document.body.appendChild(script);
      scriptAppended = true;
    } else {
      setTimeout(() => createWidgets(1), 100);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);

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

      if (scriptAppended) {
        const s = document.getElementById(scriptId);
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
    };
  }, [chartConfigs, chartModes]);

  const handleRunAnalysis = () => {
    setError(null);
    setShowRsiView(true);
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

  const handleChangePine = (value) => {
    setPineScripts((prev) => {
      const next = [...prev];
      next[selectedChartIdx] = value;
      return next;
    });
  };

  // (필요하다면 local 모드에서만 Pine Script 적용하는 로직은 유지)
  const handleApplyPineScript = () => {
    if (chartModes[selectedChartIdx] === "local") {
      const script = pineScripts[selectedChartIdx] || "";
      const indicators = parsePineScript(script);

      if (indicators.length > 0) {
        setAppliedPineScripts((prev) => {
          const next = [...prev];
          next[selectedChartIdx] = script;
          return next;
        });
        alert(
          `✅ ${indicators.length}개의 지표가 적용되었습니다!\n\n적용된 지표:\n${indicators
            .map(
              (ind, idx) =>
                `${idx + 1}. ${ind.type}${
                  ind.period ? `(${ind.period})` : ""
                }`
            )
            .join("\n")}`
        );
      } else {
        alert(
          "⚠️ 파싱 가능한 지표를 찾을 수 없습니다.\n\n지원 형식:\n- plot(close)\n- plot(sma(close, 20))\n- plot(ema(close, 12))\n- plot(rsi(close, 14))"
        );
      }
    } else {
      alert(
        "로컬 차트 모드로 전환하면 Pine Script를 적용할 수 있습니다.\n\n현재 TradingView 모드에서는 웹 차트에서 직접 적용해야 합니다."
      );
    }
  };

  const chartBoxStyle = {
    width: "100%",
    height: isMobile ? "260px" : "360px",
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

  // PC 레이아웃용 grid
  const gridStyleDesktop = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    alignItems: "stretch",
  };

  return (
    <div
      style={{
        padding: 12,
        background: "#020617",
        minHeight: "100dvh",
        color: "#e5e7eb",
        boxSizing: "border-box",
      }}
    >
      {/* 상단 Pine Script Editor */}
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
            minHeight: 160,
            maxHeight: 260,
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

      {/* 툴바 */}
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
          style={{ height: 36, borderRadius: 6 }}
        >
          <option value="tradingview">TradingView</option>
          <option value="local">로컬 차트 (Pine Script 적용)</option>
        </select>

        <select
          value={chartConfigs[selectedChartIdx]?.timeframe || "60"}
          onChange={(e) =>
            setChartConfigs((prev) => {
              const next = [...prev];
              next[selectedChartIdx] = {
                ...next[selectedChartIdx],
                timeframe: e.target.value,
              };
              return next;
            })
          }
          style={{ height: 36, borderRadius: 6 }}
        >
          {TIMEFRAMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={chartConfigs[selectedChartIdx]?.symbol || DEFAULT_SYMBOLS[0]}
          onChange={(e) =>
            setChartConfigs((prev) => {
              const next = [...prev];
              next[selectedChartIdx] = {
                ...next[selectedChartIdx],
                symbol: e.target.value,
              };
              return next;
            })
          }
          style={{ height: 36, borderRadius: 6, maxWidth: 180 }}
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
          style={{
            minWidth: 160,
            height: 36,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
            flex: 1,
          }}
        />
        <button
          onClick={handleApplyCustomSymbol}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#4b5563",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          적용
        </button>

        <button
          onClick={handleRunAnalysis}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          rsi 분석
        </button>
      </div>

      {/* Pine Script 적용 버튼만 간단히 유지 */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleApplyPineScript}
          style={{
            padding: "8px 16px",
            background:
              chartModes[selectedChartIdx] === "local" ? "#10b981" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          {chartModes[selectedChartIdx] === "local"
            ? "✅ Pine Script 적용"
            : "로컬 모드에서 적용 가능"}
        </button>
      </div>

      {/* 모바일/PC에 따라 다른 차트 영역 */}
      {isMobile ? (
        <>
          {/* 모바일: 상단 탭 + 한 개 차트 + 좌우 스와이프 */}
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 8,
              overflowX: "auto",
            }}
          >
            {CHART_IDS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedChartIdx(idx)}
                style={{
                  flexShrink: 0,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  background:
                    idx === selectedChartIdx ? "#3b82f6" : "#111827",
                  color: idx === selectedChartIdx ? "#fff" : "#e5e7eb",
                }}
              >
                #{idx + 1}{" "}
                {chartConfigs[idx]?.symbol.replace("BINANCE:", "") ??
                  DEFAULT_SYMBOLS[idx]}
              </button>
            ))}
          </div>

          <div
            style={{ ...chartBoxStyle }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {chartModes[selectedChartIdx] === "local" ? (
              <LocalChart
                id={CHART_IDS[selectedChartIdx]}
                symbol={
                  chartConfigs[selectedChartIdx]?.symbol ||
                  DEFAULT_SYMBOLS[0]
                }
                timeframe={
                  chartConfigs[selectedChartIdx]?.timeframe || "60"
                }
                pineScript={appliedPineScripts[selectedChartIdx]}
                height={260}
              />
            ) : (
              <div
                id={CHART_IDS[selectedChartIdx]}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            ← 오른쪽/왼쪽으로 스와이프해서 다른 차트로 이동할 수 있습니다.
          </div>
        </>
      ) : (
        // PC/태블릿: 2×2 그리드
        <div style={gridStyleDesktop}>
          {CHART_IDS.map((id, idx) => (
            <div
              key={id}
              style={{
                ...chartBoxStyle,
                cursor: "pointer",
                outline:
                  idx === selectedChartIdx
                    ? "2px solid #60a5fa"
                    : "none",
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
                  background:
                    chartModes[idx] === "local" ? "#10b981" : "#3b82f6",
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
      )}

      {/* 에러 / 분석 결과 */}
      <div style={{ marginTop: 16 }}>
        {error && (
          <div style={{ color: "#fca5a5", marginBottom: 8 }}>{error}</div>
        )}

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
            {/* 필요시 기존 analysis 렌더링 로직 재사용 */}
          </div>
        )}
      </div>

      {/* RSI 분석 모달 */}
      {showRsiView && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 1000,
              height: "100%",
              maxHeight: "100dvh",
              backgroundColor: "#fff",
              borderRadius: 0,
              overflow: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            <button
              onClick={() => setShowRsiView(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                border: "none",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
                background: "#eeeeee",
              }}
            >
              닫기
            </button>

            <RsiGptFrontOnlyDemo />
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingViewAIDashboard;
