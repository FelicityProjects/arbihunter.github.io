import React, { useEffect, useState, useRef } from "react";
import RsiGptFrontOnlyDemo from "./RsiGptFrontOnlyDemo";

// 4개의 차트 컨테이너 ID
const CHART_IDS = [
  "tradingview_chart_1",
];

const TIMEFRAMES = [
  { label: "1m", value: "1" },
  { label: "15m", value: "15" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "1D", value: "D" },
];

// 기본 심볼 (초기값을 차트별로 다르게 설정)
const DEFAULT_SYMBOLS = [
  "BINANCE:ETHUSDT",
];

// Refactored To-Do Data
const TODO_DATA = [
  {
    id: 1,
    status: 'done',
    title: '웹 애플리케이션 초기 아키텍처 설계 및 반응형 차트 시스템 구현',
    desc: '✅ React 18 기반 SPA(Single Page Application) 프로젝트 초기화 및 디렉토리 구조 설계\n✅ TradingView Advanced Real-Time Chart Widget 연동 및 커스텀 옵션 적용\n✅ CSS Grid 활용 반응형 차트 레이아웃 (Desktop/Mobile 최적화)\n✅ GitHub Pages 정적 호스팅 환경 구축 및 배포 자동화 기반 마련'
  },
  {
    id: 2,
    status: 'done',
    title: '다중 타임프레임 RSI 분석 모달 및 데이터 시각화 UI 개발',
    desc: '✅ React Portal 기반의 오버레이 RSI 분석 모달 컴포넌트 구현\n✅ 8개 타임프레임(1m~1d) RSI 지표 동시 모니터링을 위한 Grid 시스템 구축\n✅ 최근 20개 캔들 데이터(OHLCV, 지표) 정밀 분석을 위한 인터랙티브 테이블 구현\n✅ 선택된 차트 심볼(Symbol)과 모달 데이터 간의 실시간 동기화 로직 적용'
  },
  {
    id: 3,
    status: 'done',
    title: 'FastAPI 기반 기술적 지표 산출 백엔드 서버 구축',
    desc: '✅ Python FastAPI 프레임워크를 이용한 고성능 RESTful API 서버 개발\n✅ Binance Spot API 연동을 통한 실시간 OHLCV 시장 데이터 수집 파이프라인 구축\n✅ Pandas/NumPy 활용 RSI, EMA(50/200), 볼린저 밴드 등 기술적 지표 연산 로직 구현\n✅ CORS(Cross-Origin Resource Sharing) 정책 설정 및 환경별(Local/Prod) 엔드포인트 분기 처리'
  },
  {
    id: 4,
    status: 'done',
    title: 'GitHub Actions 기반 CI/CD 파이프라인 및 배포 자동화',
    desc: '✅ GitHub Actions Workflow 작성을 통한 빌드 및 배포 프로세스 자동화\n✅ Microsoft Azure Web App Service 연동 및 배포 프로필(Publish Profile) 보안 설정\n✅ Main 브랜치 푸시 시 자동 빌드/배포 트리거 설정으로 지속적 통합/배포 환경 구축\n✅ 빌드 상태 모니터링 및 에러 핸들링 프로세스 정립'
  },
  {
    id: 5,
    status: 'done',
    title: 'Azure 클라우드 인프라 프로비저닝 및 런타임 환경 최적화',
    desc: '✅ Azure App Service (Linux Plan) 리소스 그룹 생성 및 인스턴스 프로비저닝\n✅ Python 3.9+ 런타임 환경 구성 및 의존성 패키지(requirements.txt) 관리 전략 수립\n✅ 애플리케이션 성능 최적화를 위한 Gunicorn WSGI 서버 설정 및 워커 튜닝\n✅ 프로덕션 환경 변수 관리 및 로깅 시스템 구성'
  },
  {
    id: 6,
    status: 'done',
    title: 'RSI 및 EMA 기반 복합 추세 추종 매매 알고리즘 구현',
    desc: '✅ **전략 개요**: RSI(14) + EMA(200) + 볼린저 밴드(20,2) + 다이버전스를 결합한 고승률 매매 전략\n✅ **매수 시그널**: 가격 > 200 EMA (상승 추세) AND (RSI < 30 과매도 OR 상승 다이버전스 발생 OR 볼린저 하단 터치)\n✅ **매도 시그널**: 가격 < 200 EMA (하락 추세) AND (RSI > 70 과매수 OR 하락 다이버전스 발생 OR 볼린저 상단 터치)\n✅ **신호 강도 시각화**: 강력(Strong)/일반(Normal)/단기(Weak) 3단계 신호 강도 구분 및 직관적 컬러 코딩(Deep/Light Green & Red) 적용'
  },
  {
    id: 11,
    status: 'planned',
    title: '자동 매매 결과 UI 구축 및 백엔드 API 연동',
    desc: '✅ 메인 윈도우 스크롤바 이슈 해결 (Viewport Height 고정 및 Overflow 처리)\n✅ "Automatic Trading Results" 섹션 UI 구현 (요약 카드, 최근 거래 내역 테이블)\n✅ 결과 섹션 탭 인터페이스 도입 (RSI/볼벤, MACD/KDJ 등 확장성 고려)\n✅ 탭 스타일 개선 (Bottom Border Highlight 적용으로 시인성 강화)\n✅ /api/trading/history 엔드포인트 연동 및 실시간 데이터 바인딩\n✅ 탭 활성화 시 데이터 자동 갱신 로직 구현 (초기 로드 및 탭 전환 시 Fetch)'
  },
  {
    id: 7,
    status: 'planned',
    title: 'OpenAI GPT-4o API 연동 및 시장 데이터 심층 분석',
    desc: 'OpenAI GPT-4o API 연동을 통한 시장 데이터 심층 분석 및 투자 인사이트 도출'
  },
  {
    id: 8,
    status: 'planned',
    title: '뉴스 감성 분석 및 거시 경제 지표 멀티모달 분석',
    desc: '뉴스 감성 분석(Sentiment Analysis) 및 거시 경제 지표를 결합한 멀티모달 분석 모델 도입'
  },
  {
    id: 9,
    status: 'planned',
    title: '자가 학습 메커니즘 및 로직 개선 시스템',
    desc: '축적된 캔들 데이터와 매수/매도 기록을 재분석하여 로직을 지속적으로 개선하는 자가 학습 메커니즘 구현'
  },
  {
    id: 10,
    status: 'planned',
    title: '사용자 대화형 투자 어드바이저 챗봇 인터페이스',
    desc: '사용자 대화형 투자 어드바이저 챗봇 인터페이스 구현'
  },
];

// Mock Data for Auto Trading Results
const TRADING_RESULTS = {
  summary: {
    totalProfit: "+ $1,245.50",
    winRate: "68.5%",
    profitFactor: "1.85",
    totalTrades: 42,
  },
  recentTrades: [
    { id: 1, type: "SELL", symbol: "ETHUSDT", price: "3,450.20", amount: "1.5 ETH", time: "2024-05-20 14:30", pnl: "+ $120.50", status: "Closed", pnlClass: "text-green-500" },
    { id: 2, type: "BUY", symbol: "ETHUSDT", price: "3,410.00", amount: "1.5 ETH", time: "2024-05-20 09:15", pnl: "-", status: "Open", pnlClass: "text-gray-400" },
    { id: 3, type: "SELL", symbol: "BTCUSDT", price: "68,500.00", amount: "0.1 BTC", time: "2024-05-19 18:45", pnl: "- $50.00", status: "Closed", pnlClass: "text-red-500" },
    { id: 4, type: "BUY", symbol: "BTCUSDT", price: "68,200.00", amount: "0.1 BTC", time: "2024-05-19 10:00", pnl: "+ $300.00", status: "Closed", pnlClass: "text-green-500" },
    { id: 5, type: "SELL", symbol: "SOLUSDT", price: "175.50", amount: "20 SOL", time: "2024-05-18 22:10", pnl: "+ $85.20", status: "Closed", pnlClass: "text-green-500" },
    { id: 6, type: "BUY", symbol: "SOLUSDT", price: "170.00", amount: "20 SOL", time: "2024-05-18 15:30", pnl: "-", status: "Closed", pnlClass: "text-gray-400" },
  ]
};

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



  // To-Do List State
  const [todos, setTodos] = useState(TODO_DATA);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  // Handlers for To-Do List
  const handleAddTodo = (status) => {
    const newTodo = {
      id: Date.now(),
      status,
      title: "새로운 작업",
      desc: "작업 내용을 입력하세요...",
    };
    setTodos((prev) => [...prev, newTodo]);
    setSelectedTodo(newTodo);
  };

  const handleDeleteTodo = (status) => {
    if (!selectedTodo) {
      alert("삭제할 작업을 선택해주세요.");
      return;
    }
    if (selectedTodo.status !== status) {
      alert("선택된 작업이 이 리스트에 없습니다.");
      return;
    }
    if (window.confirm(`'${selectedTodo.title}' 작업을 삭제하시겠습니까?`)) {
      setTodos((prev) => prev.filter((t) => t.id !== selectedTodo.id));
      setSelectedTodo(null);
    }
  };

  const handleEditClick = (todo) => {
    setEditingTodo({ ...todo });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTodo) return;
    setTodos((prev) =>
      prev.map((t) => (t.id === editingTodo.id ? editingTodo : t))
    );
    // Update selectedTodo if it's the one being edited
    if (selectedTodo && selectedTodo.id === editingTodo.id) {
      setSelectedTodo(editingTodo);
    }
    setIsEditModalOpen(false);
    setEditingTodo(null);
  };


  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [showRsiView, setShowRsiView] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("rsi_bb");
  const [tradingHistory, setTradingHistory] = useState(null);

  // TradingView 위젯 인스턴스 ref
  const widgetRefs = useRef([]);

  // 모바일 스와이프를 위한 touch ref


  // TradingView 위젯 로딩 (각 차트별 설정 사용)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 모든 차트 처리
    const tradingViewIndices = CHART_IDS.map((_, idx) => idx);

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
        if (idx === 1) return; // Skip Bitcoin chart widget creation

        if (!container) {
          // setError((prev) =>
          //   prev ? prev + `\n컨테이너 ${id} 없음` : `컨테이너 ${id} 없음`
          // );
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
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_side_toolbar: false,
            save_image: false,
            details: false,
            hotlist: false,
            calendar: false,
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
        } catch (_) { }
      });
      widgetRefs.current = [];

      if (scriptAppended) {
        const s = document.getElementById(scriptId);
        if (s) s.remove();
      }
    };
  }, [chartConfigs]);

  // Trading History API 호출
  const fetchTradingHistory = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/trading/history");
      if (!response.ok) {
        throw new Error("Failed to fetch trading history");
      }
      const data = await response.json();
      setTradingHistory(data);
    } catch (err) {
      console.error("Error fetching trading history:", err);
    }
  };

  useEffect(() => {
    if (activeResultTab === "rsi_bb") {
      fetchTradingHistory();
      // 30초마다 갱신
      const interval = setInterval(fetchTradingHistory, 30000);
      return () => clearInterval(interval);
    }
  }, [activeResultTab]);

  // 차트 설정 변경 핸들러
  const handleSymbolChange = (idx, newSymbol) => {
    setChartConfigs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], symbol: newSymbol };
      return next;
    });
  };

  const handleTimeframeChange = (idx, newTf) => {
    setChartConfigs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], timeframe: newTf };
      return next;
    });
  };

  // RSI 분석 버튼 클릭
  const handleRsiAnalysis = async () => {
    // 첫 번째 차트의 심볼을 기본값으로 사용
    const targetSymbol = chartConfigs[0]?.symbol?.replace("BINANCE:", "") || "BTCUSDT";
    // RSI 분석 모달 열기
    setShowRsiView(true);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 상단 헤더 */}
      <header
        style={{
          height: 60,
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            AI
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            TradingView AI Dashboard
          </h1>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 12, gap: 2 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              📅 Project Start: 2025.11.17 ~
            </span>
            <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#94a3b8", alignItems: "center" }}>
              <span>🔗 GitHub:</span>
              <a
                href="https://github.com/FelicityProjects/arbihunter.github.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa", textDecoration: "none" }}
              >
                Frontend
              </a>
              <span style={{ color: "#475569" }}>|</span>
              <a
                href="https://github.com/FelicityProjects/fastapi-azure-rsi"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa", textDecoration: "none" }}
              >
                Backend
              </a>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleRsiAnalysis}
            style={{
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📊</span> RSI 분석
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠: 4분할 차트 + To-Do List */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
        }}
      >
        {/* 좌측: 2분할 차트 영역 */}
        <div
          style={{
            flex: 1,
            padding: 10,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gridTemplateRows: isMobile ? "repeat(2, 400px)" : "1fr",
            gap: 10,
          }}
        >
          {/* Chart 1: Ethereum */}
          <div
            style={{
              background: "#1e293b",
              borderRadius: 12,
              border: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* 차트 상단 툴바 */}
            <div
              style={{
                height: 40,
                background: "#0f172a",
                borderBottom: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#94a3b8",
                    marginRight: 4,
                  }}
                >
                  CHART 1
                </span>
                <select
                  value={chartConfigs[0].symbol}
                  onChange={(e) => handleSymbolChange(0, e.target.value)}
                  style={{
                    background: "#334155",
                    color: "#f1f5f9",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {DEFAULT_SYMBOLS.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym.split(":")[1]}
                    </option>
                  ))}
                </select>
                <select
                  value={chartConfigs[0].timeframe}
                  onChange={(e) => handleTimeframeChange(0, e.target.value)}
                  style={{
                    background: "#334155",
                    color: "#f1f5f9",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf.value} value={tf.value}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* TradingView 위젯 컨테이너 */}
            <div id={CHART_IDS[0]} style={{ flex: 1, width: "100%", height: "100%" }} />
          </div>

          {/* Automatic Trading Results Area */}
          <div
            style={{
              background: "#1e293b",
              borderRadius: 12,
              border: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: 40,
                background: "#0f172a",
                borderBottom: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
                Automatic Trading Results
              </h3>
              <div style={{ display: "flex", gap: 16, height: "100%" }}>
                {[
                  { id: "rsi_bb", label: "RSI/볼벤" },
                  { id: "macd_kdj", label: "MACD/KDJ" },
                  { id: "vol_price", label: "Volume/Price" },
                  { id: "ai_forecast", label: "AI Forecast" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveResultTab(tab.id)}
                    style={{
                      background: "transparent",
                      color: activeResultTab === tab.id ? "#3b82f6" : "#94a3b8",
                      border: "none",
                      borderBottom: activeResultTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
                      padding: "0 4px",
                      fontSize: 12,
                      fontWeight: activeResultTab === tab.id ? 700 : 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              {activeResultTab === "rsi_bb" ? (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Current Balance</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>
                        {tradingHistory ? `$${tradingHistory.balance.toLocaleString()}` : "-"}
                      </span>
                    </div>
                    <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Holding Amount</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#3b82f6" }}>
                        {tradingHistory?.holding ? `${tradingHistory.holding.amount}` : "0"}
                      </span>
                    </div>
                    <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Avg Price</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>
                        {tradingHistory?.holding ? `$${tradingHistory.holding.price.toLocaleString()}` : "-"}
                      </span>
                    </div>
                    <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Total Trades</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
                        {tradingHistory?.history ? tradingHistory.history.length : 0}
                      </span>
                    </div>
                  </div>

                  {/* Recent Trades Table */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0f172a", borderRadius: 8, border: "1px solid #334155", overflow: "hidden" }}>
                    <div style={{ padding: "10px 12px", background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Recent Trades</h4>
                      <span style={{ fontSize: 11, color: "#64748b", cursor: "pointer" }}>View All &gt;</span>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead style={{ background: "#1e293b", position: "sticky", top: 0 }}>
                          <tr>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontWeight: 600 }}>Time</th>
                            <th style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>Action</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8", fontWeight: 600 }}>Price</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8", fontWeight: 600 }}>Amount</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontWeight: 600 }}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tradingHistory?.history && tradingHistory.history.length > 0 ? (
                            tradingHistory.history.slice().reverse().map((trade, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #1e293b", background: idx % 2 === 0 ? "transparent" : "#162032" }}>
                                <td style={{ padding: "8px 12px", color: "#cbd5e1" }}>{new Date(trade.time).toLocaleTimeString()}</td>
                                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                  <span
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: trade.action === "BUY" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                      color: trade.action === "BUY" ? "#34d399" : "#f87171",
                                    }}
                                  >
                                    {trade.action}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: "#cbd5e1" }}>{trade.price.toLocaleString()}</td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: "#f1f5f9" }}>{trade.amount}</td>
                                <td style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 11 }}>{trade.reason}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                                No trading history available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>
                  {activeResultTab === "macd_kdj" && "MACD/KDJ Analysis Coming Soon"}
                  {activeResultTab === "vol_price" && "Volume/Price Analysis Coming Soon"}
                  {activeResultTab === "ai_forecast" && "AI Forecast Coming Soon"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측: Project Roadmap (Compact) */}
        <div
          style={{
            width: isMobile ? "100%" : 280, // Reduced width
            background: "#1e293b",
            borderLeft: isMobile ? "none" : "1px solid #334155", // Changed border to left
            borderTop: isMobile ? "1px solid #334155" : "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
            fontSize: 13, // Reduced base font size
          }}
        >
          {/* Roadmap Header */}
          <div
            style={{
              padding: "8px 12px", // Reduced padding
              borderBottom: "1px solid #334155",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0f172a",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}> {/* Reduced font size */}
                Project Roadmap
              </h2>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleAddTodo("planned")}
                style={{
                  background: "#334155",
                  border: "none",
                  color: "#94a3b8",
                  width: 24, // Reduced size
                  height: 24, // Reduced size
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14, // Reduced font size
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Add Planned Task"
              >
                +
              </button>
            </div>
          </div>

          {/* Vertical Content: Planned -> Completed */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Planned Section */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 12px", background: "#1e293b", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 10 }}>
                <h3
                  style={{
                    fontSize: 11, // Reduced font size
                    fontWeight: 700,
                    color: "#f59e0b",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b" }} />
                  In Progress / Planned
                </h3>
              </div>
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}> {/* Reduced padding/gap */}
                {todos
                  .filter((t) => t.status === "planned")
                  .map((todo) => (
                    <div
                      key={todo.id}
                      style={{
                        background: "#0f172a",
                        padding: 8, // Reduced padding
                        borderRadius: 6,
                        border: "1px solid #334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.3, flex: 1 }}> {/* Reduced font size */}
                        {todo.title}
                      </div>
                      <button
                        onClick={() => setSelectedTodo(todo)}
                        style={{
                          fontSize: 10, // Reduced font size
                          padding: "2px 6px", // Reduced padding
                          background: "#334155",
                          border: "none",
                          borderRadius: 3,
                          color: "#94a3b8",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        상세
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Completed Section */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", borderTop: "1px solid #334155" }}>
              <div style={{ padding: "8px 12px", background: "#1e293b", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 10 }}>
                <h3
                  style={{
                    fontSize: 11, // Reduced font size
                    fontWeight: 700,
                    color: "#10b981",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
                  Completed
                </h3>
              </div>
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}> {/* Reduced padding/gap */}
                {todos
                  .filter((t) => t.status === "done")
                  .map((todo) => (
                    <div
                      key={todo.id}
                      style={{
                        background: "#0f172a",
                        padding: 8, // Reduced padding
                        borderRadius: 6,
                        border: "1px solid #334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.3, flex: 1 }}> {/* Reduced font size */}
                        {todo.title}
                      </div>
                      <button
                        onClick={() => setSelectedTodo(todo)}
                        style={{
                          fontSize: 10, // Reduced font size
                          padding: "2px 6px", // Reduced padding
                          background: "#334155",
                          border: "none",
                          borderRadius: 3,
                          color: "#94a3b8",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        상세
                      </button>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </div>
      </div>



      {/* Detail Modal */}
      {
        selectedTodo && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedTodo(null)}
          >
            <div
              style={{
                width: "90%",
                maxWidth: 500,
                background: "#1e293b",
                borderRadius: 12,
                border: "1px solid #334155",
                overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "16px 20px",
                  background: "#0f172a",
                  borderBottom: "1px solid #334155",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f1f5f9" }}>
                  상세 내용
                </h3>
                <button
                  onClick={() => setSelectedTodo(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 20,
                  }}
                >
                  &times;
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 12, lineHeight: 1.4 }}>
                  {selectedTodo.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#cbd5e1",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    background: "#0f172a",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #334155",
                    maxHeight: "60vh",
                    overflowY: "auto",
                  }}
                >
                  {selectedTodo.desc}
                </div>
                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={() => {
                      handleEditClick(selectedTodo);
                      setSelectedTodo(null); // Close detail modal when opening edit
                    }}
                    style={{
                      fontSize: 13,
                      padding: "8px 16px",
                      background: "#3b82f6",
                      border: "none",
                      borderRadius: 6,
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setSelectedTodo(null)}
                    style={{
                      fontSize: 13,
                      padding: "8px 16px",
                      background: "#64748b",
                      border: "none",
                      borderRadius: 6,
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* RSI 분석 모달 (React Portal or Conditional Rendering) */}
      {
        showRsiView && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.7)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setShowRsiView(false)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 1000,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 16,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 닫기 버튼 */}
              <div style={{ display: "flex", justifyContent: "flex-end", padding: 10 }}>
                <button
                  onClick={() => setShowRsiView(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    color: "#333",
                  }}
                >
                  &times;
                </button>
              </div>
              {/* RSI 컴포넌트 */}
              <RsiGptFrontOnlyDemo
                activeSymbol={chartConfigs[0]?.symbol?.replace("BINANCE:", "") || "BTCUSDT"}
                activeTimeframe={chartConfigs[0]?.timeframe === "D" ? "1d" : "1h"}
              />
            </div>
          </div>
        )
      }

      {/* Edit Modal */}
      {
        isEditModalOpen && editingTodo && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.7)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setIsEditModalOpen(false)}
          >
            <div
              style={{
                background: "#1e293b",
                padding: 24,
                borderRadius: 12,
                width: 400,
                border: "1px solid #334155",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 16px", color: "#f1f5f9" }}>Edit Task</h3>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#94a3b8",
                    marginBottom: 4,
                  }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={editingTodo.title}
                  onChange={(e) =>
                    setEditingTodo({ ...editingTodo, title: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#f1f5f9",
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#94a3b8",
                    marginBottom: 4,
                  }}
                >
                  Description
                </label>
                <textarea
                  rows={6}
                  value={editingTodo.desc}
                  onChange={(e) =>
                    setEditingTodo({ ...editingTodo, desc: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#f1f5f9",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #334155",
                    background: "transparent",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "none",
                    background: "#3b82f6",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default TradingViewAIDashboard;
