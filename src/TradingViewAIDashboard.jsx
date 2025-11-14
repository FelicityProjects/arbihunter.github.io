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

        container.innerHTML = "";

        new window.TradingView.widget({
          symbol,
          interval: timeframe,
          timezone: "Asia/Seoul",
          theme: "dark",
          style: "1",
          locale: "kr",
          container_id: id,
          width: "100%",
          height: "100%",
          allow_symbol_change: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          save_image: false,
        });
      });
    };

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
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAnalysis(mock);
    } catch (e) {
      console.error(e);
      setError(e.message || "분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyCustomSymbol = () => {
    if (!customSymbol.trim()) return;
    setSymbol(customSymbol.trim().toUpperCase());
  };

  const renderSignalBadge = () => {
    if (!analysis) return null;

    const baseClass =
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";
    if (analysis.signal === "buy") {
      return (
        <span
          className={`${baseClass} bg-emerald-500/10 text-emerald-300 border border-emerald-500/40`}
        >
          ● 매수 우세
        </span>
      );
    }
    if (analysis.signal === "sell") {
      return (
        <span
          className={`${baseClass} bg-rose-500/10 text-rose-300 border border-rose-500/40`}
        >
          ● 매도 우세
        </span>
      );
    }
    return (
      <span
        className={`${baseClass} bg-slate-500/10 text-slate-200 border border-slate-500/40`}
      >
        ● 중립 / 관망
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              ETH TradingView + AI 매수·매도 분석 대시보드
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              이더리움(ETHUSDT) 차트를 화면 절반씩 2×2로 배치하고, 아래에서 AI 분석 결과를 확인하는 예시입니다.
            </p>
          </div>

          {/* 심볼 & 타임프레임 / 분석 버튼 */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                {DEFAULT_SYMBOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                placeholder="직접 심볼 입력 (예: BINANCE:ETHUSDT)"
                className="w-56 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleApplyCustomSymbol}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium hover:bg-slate-700"
              >
                적용
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                      timeframe === tf.value
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    분석 중...
                  </>
                ) : (
                  <>AI 분석 실행</>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* 메인 */}
        <main className="mt-6 space-y-6">
          {/* 🔹 차트 4개: 2×2, 각 차트가 화면 가로의 절반 정도 차지 */}
          <section>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 backdrop-blur">
              <div className="flex items-center justify-between px-1 pb-2">
                <div className="text-sm font-medium text-slate-200">
                  ETH 차트 4분할 · {symbol} · {timeframe}
                </div>
                <div className="text-xs text-slate-500">
                  Powered by TradingView (tv.js 임베드 예시)
                </div>
              </div>

              {/* ✨ 핵심: 항상 2컬럼 그리드 (한 행에 두 개) */}
              <div className="grid grid-cols-2 gap-4">
                {CHART_IDS.map((id, index) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                      <div className="text-xs font-medium text-slate-200">
                        차트 {index + 1} · {symbol} · {timeframe}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        위·아래 차트를 좌·우로 배치
                      </div>
                    </div>
                    <div
                      id={id}
                      className="h-[1600px] w-full"  // 높이 크게 설정 (원하면 이 숫자만 조절)
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI 분석 영역 */}
          <section>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-100">
                      AI 매수·매도 시그널
                    </h2>
                    {renderSignalBadge()}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    ETH 차트에서 추출한 피처를 기반으로 한 모델 출력(예시)을 보여주는 영역입니다.
                  </p>
                </div>
                {analysis && (
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">
                    신뢰도 {(analysis.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-rose-500/50 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
                  {error}
                </div>
              )}

              {!analysis && !error && (
                <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-4 text-xs text-slate-400">
                  아직 분석 결과가 없습니다. 상단의{" "}
                  <span className="font-semibold text-emerald-400">AI 분석 실행</span> 버튼을 눌러
                  현재 심볼/타임프레임에 대한 매수·매도 시그널을 생성하세요.
                </div>
              )}

              {analysis && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2">
                      <div className="text-[11px] text-emerald-200">매수 확률</div>
                      <div className="mt-1 text-lg font-semibold text-emerald-100">
                        {(analysis.buyProbability * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2">
                      <div className="text-[11px] text-rose-200">매도 확률</div>
                      <div className="mt-1 text-lg font-semibold text-rose-100">
                        {(analysis.sellProbability * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-600/60 bg-slate-950/40 px-3 py-2">
                      <div className="text-[11px] text-slate-300">리스크 지수</div>
                      <div className="mt-1 text-lg font-semibold text-slate-100">
                        {(analysis.riskScore * 100).toFixed(0)} / 100
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                    <div className="mb-1 text-[11px] font-semibold text-slate-400">
                      해석 요약
                    </div>
                    <p className="leading-relaxed">{analysis.summary}</p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                    <div className="mb-1 text-[11px] font-semibold text-slate-400">
                      주요 판단 근거
                    </div>
                    <ul className="mt-1 space-y-1">
                      {analysis.factors.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-[3px] h-[6px] w-[6px] rounded-full bg-emerald-400/80" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      심볼: <span className="font-medium text-slate-300">{analysis.symbol}</span>{" "}
                      · 타임프레임:{" "}
                      <span className="font-medium text-slate-300">{analysis.timeframe}</span>
                    </span>
                    <span>
                      분석 시각:{" "}
                      {new Date(analysis.createdAt).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="mt-6 border-t border-slate-900 pt-3 text-[10px] text-slate-500">
          ※ 본 화면은 데모 UI 예시이며, 실제 매매 전략/시그널을 제공하지 않습니다. 모든 투자
          판단과 책임은 사용자 본인에게 있습니다.
        </footer>
      </div>
    </div>
  );
}

export default TradingViewAIDashboard;
