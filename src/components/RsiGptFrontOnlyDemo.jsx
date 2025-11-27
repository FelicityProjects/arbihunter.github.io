// RsiGptFrontOnlyDemo.jsx
// ✅ FastAPI 파이썬 백엔드 호출 버전
// ✅ 여러 타임프레임(1m, 5m, 10m, 1h, 4h, 1d ...) 최신 RSI 그리드
// ✅ 선택한 타임프레임의 "최근 20개 가격/RSI/시간/볼륨" 리스트 하단 테이블 출력
// ✅ 수동 새로고침 버튼 제거, 대신 API 호출 중인 상태를 상단에 표시
// ✅ 캔들 리스트에 직전 캔들과의 등락(상방/하방) & 색깔 표시, 최신 캔들이 맨 위로 오도록 정렬
// ⚠ 백엔드 엔드포인트는 FastAPI 예시(main.py)와 맞춰져 있습니다.

import React, { useState, useEffect } from "react";

// ====== 환경별 API 베이스 URL 설정 ======
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE = isLocal
  ? "http://127.0.0.1:8000"
  : "https://fastapi-rsi-c3h0eshmc9g5ffff.koreasouth-01.azurewebsites.net";

// 화면에 보여줄 타임프레임 목록
const TIMEFRAME_OPTIONS = [
  "1m",
  "5m",
  "10m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
];

// ====== 신호 강도별 색상 매핑 함수 ======
function getSignalColor(signal) {
  if (!signal) return "#9ca3af"; // Gray

  // 1. 매수 (Buy) 계열
  if (signal.includes("매수") || signal.includes("BUY")) {
    if (signal.includes("강력")) return "#15803d"; // Deep Green (Strong)
    if (signal.includes("단기") || signal.includes("관점")) return "#4ade80"; // Light Green (Weak)
    return "#16a34a"; // Standard Green
  }

  // 2. 매도 (Sell) 계열
  if (signal.includes("매도") || signal.includes("SELL")) {
    if (signal.includes("강력")) return "#b91c1c"; // Deep Red (Strong)
    if (signal.includes("단기") || signal.includes("관점")) return "#f87171"; // Light Red (Weak)
    return "#dc2626"; // Standard Red
  }

  return "#9ca3af"; // Neutral
}

// ❗ 실제 FastAPI 서비스 호출 (1) : 최신 RSI 한 개
async function fetchLatestRsiFromServer(symbol, timeframe) {
  const url =
    `${API_BASE}/api/indicators/latest-rsi` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&timeframe=${encodeURIComponent(timeframe)}`;

  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("RSI API 오류:", res.status, text);
    throw new Error("RSI API 호출 실패");
  }

  const data = await res.json();
  return {
    rsi: data.rsi,
    ema_short: data.ema_short,
    ema_long: data.ema_long,
    bb_upper: data.bb_upper,
    bb_lower: data.bb_lower,
    divergence: data.divergence,
    signal: data.signal,
    updatedAt: data.updated_at || data.updatedAt,
  };
}

// ❗ 실제 FastAPI 서비스 호출 (2) : 최근 N개 캔들 리스트
async function fetchRecentCandlesFromServer(symbol, timeframe, limit = 20) {
  const url =
    `${API_BASE}/api/indicators/recent-candles` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&timeframe=${encodeURIComponent(timeframe)}` +
    `&limit=${encodeURIComponent(limit)}`;

  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("캔들 API 오류:", res.status, text);
    throw new Error("캔들 API 호출 실패");
  }

  const data = await res.json();
  return data.candles || [];
}

// 날짜 포맷 (서울 기준)
function formatKoreanDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const RsiGptFrontOnlyDemo = ({ activeSymbol, activeTimeframe }) => {
  // ✅ 기본 심볼: 비트코인 (BTCUSDT)
  const [symbol, setSymbol] = useState(activeSymbol || "BTCUSDT");

  // 각 타임프레임별 RSI 값 저장용
  const [rsiMap, setRsiMap] = useState({});
  const [selectedTf, setSelectedTf] = useState(activeTimeframe || "1h");

  // 선택된 타임프레임의 최근 20개 캔들 (최신이 맨 위)
  const [recentCandles, setRecentCandles] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdatedAll, setLastUpdatedAll] = useState(null);
  const [error, setError] = useState(null);

  // Sync state with props
  useEffect(() => {
    if (activeSymbol) setSymbol(activeSymbol);
  }, [activeSymbol]);

  useEffect(() => {
    refreshAllTimeframesAndCandles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, selectedTf]);

  // 모든 타임프레임의 최신 RSI + 선택된 타임프레임의 최근 20개 캔들 갱신
  const refreshAllTimeframesAndCandles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1) 전체 타임프레임 RSI
      const entries = await Promise.all(
        TIMEFRAME_OPTIONS.map(async (tf) => {
          const data = await fetchLatestRsiFromServer(symbol, tf);
          return [tf, data];
        })
      );
      const nextMap = {};
      entries.forEach(([tf, data]) => {
        nextMap[tf] = data;
      });
      setRsiMap(nextMap);

      // 2) 선택된 타임프레임의 최근 20개 캔들
      const candles = await fetchRecentCandlesFromServer(
        symbol,
        selectedTf,
        20
      );
      // 🔹 최신 캔들이 맨 위로 오도록 시간 기준 내림차순 정렬
      const sortedCandles = [...candles].sort(
        (a, b) => new Date(b.time) - new Date(a.time)
      );
      setRecentCandles(sortedCandles);

      setLastUpdatedAll(new Date().toISOString());
    } catch (e) {
      console.error(e);
      setError(e.message || "RSI/캔들 갱신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTimeframe = (tf) => {
    setSelectedTf(tf);
  };

  return (
    <div
      style={{
        position: "relative", // 오버레이를 위한 relative 포지션
        maxWidth: 900,
        margin: "24px auto",
        padding: 16,
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 20px rgba(15,23,42,0.14)",
        fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        background: "#ffffff",
        color: "#111827",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
          marginBottom: 4,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          다중 타임프레임 RSI + 최근 20개 캔들
        </h1>

        {/* API 호출 상태 표시 배지 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 999,
              backgroundColor: isLoading ? "#eff6ff" : "#f3f4f6",
              color: isLoading ? "#1d4ed8" : "#6b7280",
              border: isLoading
                ? "1px solid #bfdbfe"
                : "1px solid #e5e7eb",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "999px",
                backgroundColor: isLoading ? "#1d4ed8" : "#9ca3af",
              }}
            />
            {isLoading ? "서비스 호출 중..." : "최신 데이터 적용됨"}
          </span>
        </div>
      </div>

      <p
        style={{
          color: "#6b7280",
          fontSize: 12,
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        비트코인 / 이더리움 심볼에 대해 1m · 10m · 1h · 4h · 1d 등 여러 타임프레임의
        최신 RSI를 위쪽 그리드에서 확인하고,
        <br />
        아래 리스트에서 <strong>선택한 타임프레임의 최근 20개 캔들(가격 + RSI + 볼륨)</strong>
        및 <strong>직전 캔들과의 등락(상방/하방)</strong>을 확인할 수 있는 컴포넌트입니다.
      </p>

      {/* 심볼 선택: 비트코인 / 이더리움 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <label
            style={{
              fontSize: 11,
              color: "#6b7280",
              display: "block",
              marginBottom: 4,
            }}
          >
            심볼 선택
          </label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="BTCUSDT">비트코인 (BTCUSDT)</option>
            <option value="ETHUSDT">이더리움 (ETHUSDT)</option>
          </select>
        </div>
      </div>

      {/* 타임프레임 선택 탭 (상단) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {TIMEFRAME_OPTIONS.map((tf) => {
          const active = tf === selectedTf;
          return (
            <button
              key={tf}
              onClick={() => handleSelectTimeframe(tf)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                background: active ? "#111827" : "#f3f4f6",
                color: active ? "#f9fafb" : "#374151",
                opacity: isLoading && !active ? 0.7 : 1,
              }}
            >
              {tf.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: 12,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* 상단 RSI 그리드 */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          padding: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span>
            심볼: <strong>{symbol}</strong>
          </span>
          <span>
            전체 기준 시각:{" "}
            <strong>{formatKoreanDateTime(lastUpdatedAll)}</strong>
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
            gap: 8,
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {TIMEFRAME_OPTIONS.map((tf) => {
            const info = rsiMap[tf];
            const isActive = tf === selectedTf;

            // RSI 색상: 과매수/과매도 대략적인 느낌
            let valueColor = "#111827";
            let bgColor = "#f9fafb"; // Default light gray for unselected

            if (info?.rsi >= 70) {
              valueColor = "#b91c1c";
              bgColor = "#fef2f2"; // Light red for overbought
            } else if (info?.rsi <= 30) {
              valueColor = "#1d4ed8";
              bgColor = "#eff6ff"; // Light blue for oversold
            }

            return (
              <div
                key={tf}
                onClick={() => handleSelectTimeframe(tf)}
                style={{
                  borderRadius: 10,
                  padding: 8,
                  background: isActive ? "#1e293b" : bgColor,
                  border: isActive
                    ? "2px solid #3b82f6" // Blue border for active
                    : "1px solid #e5e7eb",
                  color: isActive ? "#f9fafb" : "#111827",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(59, 130, 246, 0.5)" // Blue shadow
                    : "none",
                  cursor: "pointer", // Pointer cursor
                  transition: "all 0.2s ease",
                  transform: isActive ? "scale(1.02)" : "scale(1)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: isActive ? "#e5e7eb" : "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  {tf.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginBottom: 4,
                    color: isActive ? "#f97316" : valueColor,
                  }}
                >
                  {info ? Number(info.rsi).toFixed(2) : "---"}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isActive ? "#e5e7eb" : "#9ca3af",
                  }}
                >
                  {info
                    ? formatKoreanDateTime(info.updatedAt)
                    : isLoading
                      ? "불러오는 중..."
                      : "데이터 없음"}
                </div>
                {/* Signal Badge */}
                {info?.signal && info.signal !== "관망 (중립)" && info.signal !== "N/A" && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      background: getSignalColor(info.signal),
                      padding: "2px 6px",
                      borderRadius: 4,
                      display: "inline-block",
                    }}
                  >
                    {info.signal}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단: 선택 타임프레임 기준 최근 20개 캔들 리스트 */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          padding: 12,
        }}
      >
        <div
          style={{
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              최근 20개 캔들 · {symbol} · {selectedTf.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              시간 · 종가 · <strong>등락</strong> · RSI · <strong>EMA(50/200) · 볼린저 · 신호</strong> · 거래량
              등을 확인할 수 있습니다.
            </div>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 720,
              borderCollapse: "collapse",
              fontSize: 11,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f3f4f6",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  시각
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  종가
                </th>
                {/* 새 컬럼: 직전 캔들과 등락 */}
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  등락(직전 캔들)
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  RSI
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  EMA(50)
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  EMA(200)
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  볼린저(20,2)
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  신호
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  거래량
                </th>
              </tr>
            </thead>
            <tbody>
              {recentCandles && recentCandles.length > 0 ? (
                recentCandles.map((candle, idx) => {
                  // RSI 색상 강조
                  let rsiColor = "#111827";
                  if (candle.rsi >= 70) rsiColor = "#b91c1c";
                  else if (candle.rsi <= 30) rsiColor = "#1d4ed8";

                  // 🔹 직전(이전 시간) 캔들과 등락 계산
                  // 배열 0번이 최신, 1번이 그 바로 이전, ... 이라고 가정
                  const prevCandle =
                    idx < recentCandles.length - 1
                      ? recentCandles[idx + 1]
                      : null;

                  let changeText = "-";
                  let changeColor = "#6b7280";

                  if (prevCandle && prevCandle.close) {
                    const prevClose = Number(prevCandle.close); // 직전 캔들 종가
                    const currClose = Number(candle.close); // 현재 행 종가
                    const diff = currClose - prevClose;
                    const diffPct =
                      prevClose !== 0
                        ? (diff / prevClose) * 100
                        : 0;

                    const dirLabel =
                      diff > 0 ? "상방" : diff < 0 ? "하방" : "보합";
                    const arrow =
                      diff > 0 ? "▲" : diff < 0 ? "▼" : "■";
                    const sign = diff > 0 ? "+" : diff < 0 ? "" : "";

                    changeText = `${arrow} ${dirLabel} ${sign}${diffPct.toFixed(
                      2
                    )}%`;

                    if (diff > 0) changeColor = "#b91c1c"; // 상승: 빨강
                    else if (diff < 0) changeColor = "#1d4ed8"; // 하락: 파랑
                  }

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background:
                          idx === 0 ? "#f9fafb" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "5px 8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatKoreanDateTime(candle.time)}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          fontWeight: idx === 0 ? 700 : 500,
                        }}
                      >
                        {Number(candle.close).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      {/* 새 컬럼: 등락(상방/하방) */}
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          color: changeColor,
                          fontWeight: idx === 0 ? 700 : 500,
                        }}
                      >
                        {changeText}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          color: rsiColor,
                          fontWeight: idx === 0 ? 800 : 600,
                        }}
                      >
                        {Number(candle.rsi).toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          color: "#4b5563",
                        }}
                      >
                        {candle.ema_short ? Number(candle.ema_short).toFixed(2) : "-"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          color: "#4b5563",
                        }}
                      >
                        {candle.ema_long ? Number(candle.ema_long).toFixed(2) : "-"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          color: "#4b5563",
                          fontSize: 10,
                        }}
                      >
                        {candle.bb_upper && candle.bb_lower ? (
                          <>
                            <div style={{ color: "#ef4444" }}>{Number(candle.bb_upper).toFixed(2)}</div>
                            <div style={{ color: "#3b82f6" }}>{Number(candle.bb_lower).toFixed(2)}</div>
                          </>
                        ) : "-"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          fontWeight: 700,
                        }}
                      >
                        {(() => {
                          const sig = candle.signal || "-";
                          const color = getSignalColor(sig);
                          return <span style={{ color, fontSize: 11 }}>{sig}</span>;
                        })()}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                        }}
                      >
                        {Number(candle.volume).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "10px 8px",
                      textAlign: "center",
                      color: "#9ca3af",
                    }}
                  >
                    {isLoading
                      ? "최근 캔들 데이터를 불러오는 중입니다..."
                      : "최근 캔들 데이터가 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 로딩 오버레이 (최초 로딩 시에만 보여줘도 되고, isLoading일 때마다 보여줘도 됨) */}
      {/* 여기서는 isLoading && !recentCandles.length 일 때만 보여주거나, 
          혹은 상단 배지로 대체했으므로 생략 가능. 
          하지만 '서비스 연결 중' 느낌을 위해 남겨둠 */}
      {isLoading && recentCandles.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(255,255,255,0.8)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "24px 32px",
              borderRadius: 12,
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              textAlign: "center",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #3b82f6",
                borderRadius: "50%",
                margin: "0 auto 16px",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
            <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
              서비스 연결 중
            </h3>
            <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600, color: "#2563eb" }}>Azure</span>에 등록한 서비스를 동작중입니다.
              <br />
              최초 요청 시 구동 시간이 소요될 수 있습니다.
              <br />
              <span style={{ fontWeight: 600 }}>잠시만 기다려주세요.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RsiGptFrontOnlyDemo;
