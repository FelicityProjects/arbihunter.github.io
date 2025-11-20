// RsiGptFrontOnlyDemo.jsx
// ✅ AI 호출 제거 버전
// ✅ 여러 타임프레임(1m, 10m, 1h, 4h, 1d ...) 최신 RSI 그리드
// ✅ 선택한 타임프레임의 "최근 10개 가격/RSI/시간/볼륨" 리스트 하단 테이블 출력
// ⚠ 현재 값들은 모두 데모용 랜덤 데이터입니다.
//    실제 서비스에서는 fetchLatestRsiFromServer, fetchRecentCandlesFromServer
//    두 함수만 본인 백엔드 API 호출 코드로 교체하면 됩니다.

import React, { useState, useEffect } from "react";

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

// ❗ 실제 서비스용으로 교체할 자리 (1) : 최신 RSI 한 개
async function fetchLatestRsiFromServer(symbol, timeframe) {
  // 예: 실제 구현
  // const res = await fetch(
  //   `/api/indicators/latest-rsi?symbol=${symbol}&timeframe=${timeframe}`
  // );
  // if (!res.ok) throw new Error("RSI API 호출 실패");
  // const data = await res.json();
  // return {
  //   rsi: data.rsi,
  //   updatedAt: data.updatedAt,
  // };

  // 💡 데모용 랜덤 RSI (20 ~ 80)
  const rsi = 20 + Math.random() * 60;
  return {
    rsi: Number(rsi.toFixed(2)),
    updatedAt: new Date().toISOString(),
  };
}

// ❗ 실제 서비스용으로 교체할 자리 (2) : 최근 N개 캔들 리스트
async function fetchRecentCandlesFromServer(symbol, timeframe, limit = 10) {
  // 예: 실제 구현
  // const res = await fetch(
  //   `/api/indicators/recent-candles?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
  // );
  // if (!res.ok) throw new Error("캔들 API 호출 실패");
  // const data = await res.json();
  // return data.candles; // [{ time, open, high, low, close, volume, rsi }, ...]

  // 💡 데모용 랜덤 캔들 생성
  const now = new Date();
  const candles = [];
  const basePrice = 20000 + Math.random() * 30000; // 기초 가격

  const minutesPerCandle = (() => {
    switch (timeframe) {
      case "1m":
        return 1;
      case "5m":
        return 5;
      case "10m":
        return 10;
      case "15m":
        return 15;
      case "30m":
        return 30;
      case "1h":
        return 60;
      case "4h":
        return 240;
      case "1d":
        return 1440;
      default:
        return 60;
    }
  })();

  for (let i = 0; i < limit; i++) {
    const t = new Date(
      now.getTime() - i * minutesPerCandle * 60 * 1000
    );
    const noise = (Math.random() - 0.5) * 0.04; // ±2% 정도 변동
    const close = basePrice * (1 + noise);
    const high = close * (1 + Math.random() * 0.01);
    const low = close * (1 - Math.random() * 0.01);
    const open =
      (high + low) / 2 + (Math.random() - 0.5) * (high - low) * 0.3;
    const volume = 10 + Math.random() * 90;
    const rsi = 20 + Math.random() * 60;

    candles.push({
      time: t.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
      rsi: Number(rsi.toFixed(2)),
    });
  }

  // 최신 순(가장 최근이 위로 오게) 정렬
  candles.sort((a, b) => new Date(b.time) - new Date(a.time));
  return candles;
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

const RsiGptFrontOnlyDemo = () => {
  // 기본 심볼 (원하면 props로 받아도 됨)
  const [symbol, setSymbol] = useState("BTCUSDT");

  // 각 타임프레임별 RSI 값 저장용
  // 예: { "1m": { rsi: 32.4, updatedAt: "..." }, "1h": {...}, ... }
  const [rsiMap, setRsiMap] = useState({});
  const [selectedTf, setSelectedTf] = useState("1h");

  // 선택된 타임프레임의 최근 10개 캔들
  const [recentCandles, setRecentCandles] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdatedAll, setLastUpdatedAll] = useState(null);
  const [error, setError] = useState(null);

  // 심볼이 바뀔 때마다 자동으로 전체 타임프레임 + 선택된 타임프레임 캔들 업데이트
  useEffect(() => {
    refreshAllTimeframesAndCandles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, selectedTf]);

  // 모든 타임프레임의 최신 RSI + 선택된 타임프레임의 최근 10개 캔들 갱신
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

      // 2) 선택된 타임프레임의 최근 10개 캔들
      const candles = await fetchRecentCandlesFromServer(
        symbol,
        selectedTf,
        10
      );
      setRecentCandles(candles);

      setLastUpdatedAll(new Date().toISOString());
    } catch (e) {
      console.error(e);
      setError(e.message || "RSI/캔들 갱신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTimeframe = async (tf) => {
    setSelectedTf(tf);
    // selectedTf는 useEffect에서 감지되어 자동으로 캔들 & RSI를 갱신합니다.
    // 만약 클릭할 때 바로 캔들만 새로고침하고 싶다면 아래 주석 해제:
    // await refreshSingleTimeframeCandles(tf);
  };

  // (선택) 특정 타임프레임 캔들만 개별로 새로고침하고 싶을 때 사용할 함수
  const refreshSingleTimeframeCandles = async (tf) => {
    try {
      setIsLoading(true);
      setError(null);
      const candles = await fetchRecentCandlesFromServer(symbol, tf, 10);
      setRecentCandles(candles);
      setLastUpdatedAll(new Date().toISOString());
    } catch (e) {
      console.error(e);
      setError(e.message || "캔들 갱신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
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
      <h1
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 4,
          letterSpacing: "-0.02em",
        }}
      >
        다중 타임프레임 RSI + 최근 10개 캔들
      </h1>
      <p
        style={{
          color: "#6b7280",
          fontSize: 12,
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        심볼 하나에 대해 1m · 10m · 1h · 4h · 1d 등 여러 타임프레임의 최신 RSI를
        위쪽 그리드에서 확인하고,
        <br />
        아래 리스트에서 <strong>선택한 타임프레임의 최근 10개 캔들(가격 + RSI + 볼륨)</strong>
        정보를 확인하는 데모용 컴포넌트입니다.
      </p>

      {/* 심볼 입력 + 전체 새로고침 버튼 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: "1 1 120px", minWidth: 160 }}>
          <label
            style={{
              fontSize: 11,
              color: "#6b7280",
              display: "block",
              marginBottom: 4,
            }}
          >
            심볼 (예: BTCUSDT, ETHUSDT)
          </label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              borderRadius: 8,
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        <button
          onClick={refreshAllTimeframesAndCandles}
          disabled={isLoading}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            cursor: isLoading ? "default" : "pointer",
            background: isLoading ? "#e5e7eb" : "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: 13,
            boxShadow: isLoading
              ? "none"
              : "0 6px 14px rgba(37,99,235,0.35)",
            minWidth: 140,
          }}
        >
          {isLoading ? "갱신 중..." : "RSI & 캔들 새로고침"}
        </button>
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
          }}
        >
          {TIMEFRAME_OPTIONS.map((tf) => {
            const info = rsiMap[tf];
            const isActive = tf === selectedTf;

            // RSI 색상: 과매수/과매도 대략적인 느낌
            let valueColor = "#111827";
            if (info?.rsi >= 70) valueColor = "#b91c1c"; // 과매수
            else if (info?.rsi <= 30) valueColor = "#1d4ed8"; // 과매도

            return (
              <div
                key={tf}
                style={{
                  borderRadius: 10,
                  padding: 8,
                  background: isActive ? "#111827" : "#ffffff",
                  border: isActive
                    ? "1px solid #111827"
                    : "1px solid #e5e7eb",
                  color: isActive ? "#f9fafb" : "#111827",
                  boxShadow: isActive
                    ? "0 4px 10px rgba(15,23,42,0.35)"
                    : "none",
                  transition: "background 0.1s ease, box-shadow 0.1s ease",
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
                  {info ? info.rsi.toFixed(2) : "---"}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isActive ? "#e5e7eb" : "#9ca3af",
                  }}
                >
                  {info
                    ? formatKoreanDateTime(info.updatedAt)
                    : "데이터 없음"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단: 선택 타임프레임 기준 최근 10개 캔들 리스트 */}
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
              최근 10개 캔들 · {symbol} · {selectedTf.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              시간 · 종가 · RSI · 고가 · 저가 · 거래량 등을 확인할 수 있습니다.
            </div>
          </div>

          <button
            onClick={() => refreshSingleTimeframeCandles(selectedTf)}
            disabled={isLoading}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#374151",
              fontSize: 11,
              cursor: isLoading ? "default" : "pointer",
            }}
          >
            {isLoading ? "갱신 중..." : "이 타임프레임만 새로고침"}
          </button>
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
              minWidth: 620,
              borderCollapse: "collapse",
              fontSize: 11,
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
                  고가
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  저가
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
                        {candle.close.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                          color: rsiColor,
                          fontWeight:
                            idx === 0 ? 800 : 600,
                        }}
                      >
                        {candle.rsi.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                        }}
                      >
                        {candle.high.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                        }}
                      >
                        {candle.low.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "right",
                        }}
                      >
                        {candle.volume.toLocaleString("en-US", {
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
                    colSpan={6}
                    style={{
                      padding: "10px 8px",
                      textAlign: "center",
                      color: "#9ca3af",
                    }}
                  >
                    최근 캔들 데이터가 없습니다. 상단에서 새로고침을 눌러
                    데이터를 갱신해 주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "#9ca3af",
          lineHeight: 1.4,
        }}
      >
        🔎 Tip: 이 컴포넌트는 <strong>프론트엔드 UI 데모</strong>입니다.  
        백엔드에서 거래소 OHLCV 데이터를 기반으로 RSI 및 캔들 정보를
        계산한 뒤 REST API로 제공하면,
        위의 <code>fetchLatestRsiFromServer</code>,
        <code>fetchRecentCandlesFromServer</code> 두 함수만
        실제 API 호출로 교체해서 바로 실서비스에 사용할 수 있습니다.
      </div>
    </div>
  );
};

export default RsiGptFrontOnlyDemo;