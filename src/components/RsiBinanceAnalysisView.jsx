// RsiBinanceAnalysisView.jsx
// 백엔드 없이, 프론트에서 Binance REST API로 1h/4h/1d 등 OHLCV를 받아
// technicalindicators 로 RSI를 계산해 보여주는 예제.
//
// ⚠ 실제 서비스에서는 CORS / 레이트리밋 / 안정성을 위해
//    반드시 백엔드 프록시 서버를 두는 것을 권장합니다.

import React, { useState, useEffect, useCallback } from "react";
import { RSI } from "technicalindicators";

// Binance 스팟 마켓 K라인 엔드포인트 (공개, API 키 불필요)
const BINANCE_BASE_URL = "https://api.binance.com";

// 우리가 사용할 타임프레임 옵션
const TIMEFRAME_OPTIONS = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "8h", label: "8H" },
  { value: "12h", label: "12H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1M", label: "1M" },
];

// Binance REST klines 응답 형식:
// [ [
//   0: openTime,
//   1: open,
//   2: high,
//   3: low,
//   4: close,
//   5: volume,
//   6: closeTime,
//   7: quoteAssetVolume,
//   8: numberOfTrades,
//   9: takerBuyBaseAssetVolume,
//   10: takerBuyQuoteAssetVolume,
//   11: ignore
// ], ... ]
// 문서 참고: GET /api/v3/klines 
async function fetchBinanceKlines(symbol, interval, limit = 500) {
  const url = `${BINANCE_BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url, {
    method: "GET",
    // mode: "cors", // 기본값이 cors라 생략 가능. CORS 에러가 난다면 콘솔 확인 필요.
  });

  if (!res.ok) {
    throw new Error(`Binance API 에러: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // data: 배열(길이 limit) of 배열(길이 12)
  const candles = data.map((k) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }));

  return candles;
}

// RSI 룰 기반 분석 함수
function ruleBasedRsiAnalysis(candles, options = {}) {
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
    "최근 캔들 변동성",
    "단기 모멘텀(과매수/과매도 여부)",
  ];

  return {
    symbol,
    timeframe,
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

const RsiBinanceAnalysisView = ({
  initialSymbol = "BTCUSDT", // 예: BTCUSDT, ETHUSDT ...
  initialTimeframe = "1h",
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(initialTimeframe);
  const [candles, setCandles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoadingCandles, setIsLoadingCandles] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Binance에서 OHLCV 가져오기 + 분석까지 한 번에
  const loadAndAnalyze = useCallback(
    async (timeframeOverride) => {
      const tf = timeframeOverride || selectedTimeframe;

      setError(null);
      setIsLoadingCandles(true);
      setIsAnalyzing(true);

      try {
        // 1) Binance에서 OHLCV 요청
        const fetchedCandles = await fetchBinanceKlines(
          initialSymbol,
          tf,
          500
        );
        setCandles(fetchedCandles);

        // 2) RSI 분석
        const result = ruleBasedRsiAnalysis(fetchedCandles, {
          symbol: initialSymbol,
          timeframe: tf,
          period: 14,
          oversold: 30,
          overbought: 70,
        });
        setAnalysis(result);
      } catch (e) {
        console.error(e);
        setError(
          e.message ||
            "Binance 데이터 요청 또는 RSI 분석 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoadingCandles(false);
        setIsAnalyzing(false);
      }
    },
    [initialSymbol, selectedTimeframe]
  );

  // 처음 화면 열릴 때 자동 분석
  useEffect(() => {
    loadAndAnalyze(selectedTimeframe);
  }, [loadAndAnalyze, selectedTimeframe]);

  const handleTimeframeChange = (e) => {
    const tf = e.target.value;
    setSelectedTimeframe(tf);
    // 타임프레임 변경 시 즉시 재분석
    loadAndAnalyze(tf);
  };

  const handleReAnalyze = () => {
    // 이미 받아온 candles로만 다시 분석하고 싶으면
    // ruleBasedRsiAnalysis(candles, ...) 만 호출해도 되지만,
    // 여기서는 그냥 최신 데이터를 다시 받아오는 쪽으로 구현.
    loadAndAnalyze(selectedTimeframe);
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

  const latestCandle = candles[candles.length - 1];

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
        Binance RSI 분석 (프론트 단 직통)
      </h1>
      <p
        style={{
          color: "#6b7280",
          fontSize: 13,
          marginBottom: 18,
          lineHeight: 1.5,
        }}
      >
        Binance 공개 REST API의{" "}
        <code style={{ background: "#f3f4f6", padding: "1px 4px" }}>
          /api/v3/klines
        </code>{" "}
        엔드포인트에서 OHLCV를 가져와 RSI(14)를 계산한 뒤, 매수/매도/중립
        시그널을 보여주는 예제입니다. 실제 서비스에서는 CORS / 안정성 / 레이트
        리밋 문제 때문에 반드시 백엔드 프록시를 두는 것을 권장합니다.
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
            {initialSymbol} · {selectedTimeframe.toUpperCase()}
          </div>
          {latestCandle && (
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 4,
              }}
            >
              최근 캔들 종가: {latestCandle.close.toFixed(2)}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {/* 타임프레임 콤보박스 */}
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
            onClick={handleReAnalyze}
            disabled={isLoadingCandles || isAnalyzing}
            style={{
              padding: "8px 18px",
              borderRadius: 9999,
              border: "none",
              cursor:
                isLoadingCandles || isAnalyzing ? "default" : "pointer",
              background:
                isLoadingCandles || isAnalyzing ? "#cbd5f5" : "#2563eb",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
              boxShadow:
                isLoadingCandles || isAnalyzing
                  ? "none"
                  : "0 6px 14px rgba(37,99,235,0.35)",
              transition: "background 0.15s ease, transform 0.1s ease",
            }}
          >
            {isLoadingCandles
              ? "데이터 불러오는 중..."
              : isAnalyzing
              ? "RSI 계산 중..."
              : "RSI 분석 다시 실행"}
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
              RSI 기반 매수·매도 시그널
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

      {/* 최근 10개 캔들 미니 테이블 */}
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            marginBottom: 6,
          }}
        >
          최근 10개 캔들 (종가 기준, Binance {selectedTimeframe.toUpperCase()})
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
                  key={c.openTime ?? idx}
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
                    {new Date(c.openTime).toLocaleString("ko-KR", {
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

export default RsiBinanceAnalysisView;
