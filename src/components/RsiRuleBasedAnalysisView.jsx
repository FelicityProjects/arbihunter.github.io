// RsiRuleBasedAnalysisView.jsx
// 프론트만 사용하는 RSI 룰 기반 "AI 분석" 화면 컴포넌트
// 필요 패키지: npm install technicalindicators

import React, { useState, useEffect, useCallback } from "react";
import { RSI } from "technicalindicators";

// 더미 OHLCV 데이터 생성 (실제 서비스에서는 거래소/백엔드 데이터로 교체)
function generateDummyCandles(count = 200, startPrice = 100) {
  const candles = [];
  let price = startPrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * 60 * 60 * 1000; // 1시간 간격
    const open = price;
    const change = (Math.random() - 0.5) * 2; // -1 ~ 1
    price = Math.max(1, price + change);
    const close = price;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    const volume = Math.random() * 1000;

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}

// RSI 룰 기반 분석 함수
export function ruleBasedRsiAnalysis(candles, options = {}) {
  const {
    symbol = "BTCUSDT",
    timeframe = "1h",
    period = 14,
    oversold = 30,
    overbought = 70,
  } = options;

  if (!candles || candles.length < period + 5) {
    throw new Error(
      `캔들 데이터가 부족합니다. 최소 ${period + 5}개 이상의 캔들이 필요합니다.`
    );
  }

  const closes = candles.map((c) => c.close);
  const rsiArray = RSI.calculate({
    values: closes,
    period,
  });

  if (!rsiArray || rsiArray.length === 0) {
    throw new Error("RSI 계산에 실패했습니다.");
  }

  const latestRsi = rsiArray[rsiArray.length - 1];

  let signal = "neutral";
  let summary = "";
  let buyProbability = 0.4;
  let sellProbability = 0.4;

  if (latestRsi < oversold) {
    signal = "buy";
    summary = `RSI ${latestRsi.toFixed(
      1
    )} → 과매도 구간으로, 단기 반등 가능성이 높은 자리로 해석할 수 있습니다.`;
    buyProbability = 0.75;
    sellProbability = 0.25;
  } else if (latestRsi > overbought) {
    signal = "sell";
    summary = `RSI ${latestRsi.toFixed(
      1
    )} → 과매수 구간으로, 단기 조정 가능성이 높은 자리로 해석할 수 있습니다.`;
    buyProbability = 0.25;
    sellProbability = 0.75;
  } else {
    summary = `RSI ${latestRsi.toFixed(
      1
    )} → 중립 구간으로, 뚜렷한 매수/매도 우위가 보이지 않습니다.`;
  }

  const riskScore =
    signal === "neutral"
      ? 0.5
      : signal === "buy"
      ? 0.65
      : 0.7;

  const confidence =
    signal === "neutral"
      ? 0.55
      : 0.7;

  const factors = [
    `RSI(${period}) 현재 값: ${latestRsi.toFixed(1)}`,
    "최근 캔들 변동성(랜덤 더미 데이터 기준)",
    "단기 모멘텀(과매수/과매도 여부)",
  ];

  return {
    symbol,
    timeframe, // ✅ 전달받은 타임프레임 그대로 분석 결과에 포함
    signal,
    latestRsi,
    buyProbability: Number(buyProbability.toFixed(2)),
    sellProbability: Number(sellProbability.toFixed(2)),
    riskScore: Number(riskScore.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    summary,
    factors,
    createdAt: new Date().toISOString(),
  };
}

const TIMEFRAME_OPTIONS = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "8h", label: "8H" },
  { value: "12h", label: "12H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
];

const RsiRuleBasedAnalysisView = ({
  initialSymbol = "BTCUSDT",
  initialTimeframe = "1h",
  externalCandles,
}) => {
  // 외부에서 캔들을 안 넘기면 더미 데이터 사용
  const [candles] = useState(
    () =>
      externalCandles && externalCandles.length > 0
        ? externalCandles
        : generateDummyCandles(200, 100)
  );

  const [selectedTimeframe, setSelectedTimeframe] = useState(
    initialTimeframe || "1h"
  );
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // ✅ 항상 최신 selectedTimeframe을 사용하는 분석 함수
  const runAnalysis = useCallback(
    (timeframeOverride) => {
      const tf = timeframeOverride || selectedTimeframe;
      setIsAnalyzing(true);
      setError(null);
      try {
        const result = ruleBasedRsiAnalysis(candles, {
          symbol: initialSymbol,
          timeframe: tf,
          period: 14,
          oversold: 30,
          overbought: 70,
        });
        setAnalysis(result);
      } catch (e) {
        console.error(e);
        setError(e.message || "분석 중 오류가 발생했습니다.");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [candles, initialSymbol, selectedTimeframe]
  );

  const handleRunAnalysis = () => {
    
    runAnalysis(); // ✅ 현재 selectedTimeframe 기준 재분석
  };

  // 🔹 처음 화면 open 시 자동으로 RSI 분석 실행
  useEffect(() => {
    runAnalysis(selectedTimeframe);
  }, [runAnalysis, selectedTimeframe]);

  // 🔹 타임프레임 변경 시, state 업데이트 + 바로 재분석
  const handleTimeframeChange = (e) => {
    const tf = e.target.value;
    setSelectedTimeframe(tf);
    runAnalysis(tf); // ✅ 방금 선택한 값으로 바로 분석
  };

  const formatDateTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 30px rgba(15,23,42,0.18)",
        fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        background: "#ffffff",
        color: "#111827",
      }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        RSI 룰 기반 AI 분석 데모
      </h1>
      <p
        style={{
          color: "#6b7280",
          fontSize: 13,
          marginBottom: 18,
          lineHeight: 1.5,
        }}
      >
        이 화면은 <code>technicalindicators</code> 라이브러리의 RSI 지표를 이용해서
        프론트엔드에서만 간단한 매수/매도/중립 시그널을 생성하는 데모입니다.
        현재는 랜덤 더미 캔들을 사용하고 있으므로, 실제 투자 판단에는 절대 사용하지 마세요.
      </p>

      {/* 상단 정보 + 타임프레임 콤보 + 버튼 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginBottom: 2,
            }}
          >
            현재 심볼 / 타임프레임
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {initialSymbol} · {selectedTimeframe.toUpperCase()} (더미 데이터)
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {/* 🔹 타임프레임 콤보박스 */}
          <select
            value={selectedTimeframe}
            onChange={handleTimeframeChange}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              fontSize: 13,
              cursor: "pointer",
              backgroundColor: "#f9fafb",
              color: "#111827",
            }}
          >
            {TIMEFRAME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            style={{
              padding: "8px 18px",
              borderRadius: 9999,
              border: "none",
              cursor: isAnalyzing ? "default" : "pointer",
              background: isAnalyzing ? "#cbd5f5" : "#2563eb",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: isAnalyzing
                ? "none"
                : "0 6px 14px rgba(37,99,235,0.35)",
              transition: "background 0.15s ease, transform 0.1s ease",
            }}
          >
            {isAnalyzing ? "분석 중..." : "RSI 분석 다시 실행"}
          </button>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* 분석 결과 카드 */}
      {analysis && (
        <div
          style={{
            marginTop: 4,
            marginBottom: 24,
            padding: 16,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            background:
              analysis.signal === "buy"
                ? "linear-gradient(135deg,#ecfdf3,#ffffff)"
                : analysis.signal === "sell"
                ? "linear-gradient(135deg,#fef2f2,#ffffff)"
                : "linear-gradient(135deg,#f3f4f6,#ffffff)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              gap: 8,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              AI 매수·매도 시그널
            </div>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background:
                  analysis.signal === "buy"
                    ? "#dcfce7"
                    : analysis.signal === "sell"
                    ? "#fee2e2"
                    : "#e5e7eb",
                color:
                  analysis.signal === "buy"
                    ? "#166534"
                    : analysis.signal === "sell"
                    ? "#b91c1c"
                    : "#374151",
              }}
            >
              {analysis.signal === "buy"
                ? "매수 우위"
                : analysis.signal === "sell"
                ? "매도 우위"
                : "중립"}
            </div>
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            심볼: <strong>{analysis.symbol}</strong> · 타임프레임:{" "}
            <strong>{analysis.timeframe.toUpperCase()}</strong>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <InfoBlock label="RSI(14)" value={analysis.latestRsi.toFixed(2)} />
            <InfoBlock
              label="매수 확률"
              value={`${(analysis.buyProbability * 100).toFixed(0)}%`}
            />
            <InfoBlock
              label="매도 확률"
              value={`${(analysis.sellProbability * 100).toFixed(0)}%`}
            />
            <InfoBlock
              label="리스크 스코어"
              value={analysis.riskScore.toFixed(2)}
            />
            <InfoBlock
              label="신뢰도"
              value={`${(analysis.confidence * 100).toFixed(0)}%`}
            />
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              fontSize: 13,
              marginBottom: 12,
              lineHeight: 1.5,
              color: "#374151",
            }}
          >
            {analysis.summary}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            판단 근거
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 13,
              color: "#4b5563",
            }}
          >
            {analysis.factors.map((f, idx) => (
              <li key={idx}>{f}</li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#9ca3af",
              fontStyle: "italic",
            }}
          >
            분석 시각(서울 기준): {formatDateTime(analysis.createdAt)}
          </div>
        </div>
      )}

      {/* 최근 캔들 미니 테이블 */}
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            marginBottom: 6,
          }}
        >
          최근 10개 더미 캔들 (종가 기준)
        </div>
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["시간", "시가", "고가", "저가", "종가"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 6,
                      borderBottom: "1px solid #e5e7eb",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#4b5563",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candles.slice(-10).map((c, idx) => (
                <tr
                  key={idx}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                  }}
                >
                  <td
                    style={{
                      padding: 6,
                      borderBottom: "1px solid #f3f4f6",
                      whiteSpace: "nowrap",
                      color: "#4b5563",
                    }}
                  >
                    {new Date(c.time).toLocaleString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td
                    style={{
                      padding: 6,
                      borderBottom: "1px solid #f3f4f6",
                      color: "#111827",
                    }}
                  >
                    {c.open.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: 6,
                      borderBottom: "1px solid #f3f4f6",
                      color: "#111827",
                    }}
                  >
                    {c.high.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: 6,
                      borderBottom: "1px solid #f3f4f6",
                      color: "#111827",
                    }}
                  >
                    {c.low.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: 6,
                      borderBottom: "1px solid #f3f4f6",
                      color: "#111827",
                    }}
                  >
                    {c.close.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 정보 블록 공통 컴포넌트
const InfoBlock = ({ label, value }) => (
  <div>
    <div
      style={{
        fontSize: 12,
        color: "#9ca3af",
        marginBottom: 2,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 18,
        fontWeight: 800,
        color: "#111827",
      }}
    >
      {value}
    </div>
  </div>
);

export default RsiRuleBasedAnalysisView;
