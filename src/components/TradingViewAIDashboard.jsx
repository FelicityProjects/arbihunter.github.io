import React, { useEffect, useState, useRef } from "react";
import RsiGptFrontOnlyDemo from "./RsiGptFrontOnlyDemo";

// 4개의 차트 컨테이너 ID
const CHART_IDS = [
  "tradingview_chart_1",
  "tradingview_chart_2",
  "tradingview_chart_3",
  "tradingview_chart_4",
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
  "BINANCE:BTCUSDT",
  "BINANCE:SOLUSDT",
  "NASDAQ:TSLA",
];

// Refactored To-Do Data
const TODO_DATA = [
  { id: 1, status: 'done', title: '4분할 차트 생성 및 git', desc: '20251117 시작 -> 20251118 완료' },
  { id: 2, status: 'done', title: 'RSI 분석 팝업 화면', desc: '20251119 시작 -> 20251119 완료' },
  { id: 3, status: 'done', title: 'RSI 데이터 조회 API 연동', desc: 'FastAPI, 20251120 시작 -> 20251121 완료' },
  { id: 4, status: 'done', title: 'GitHub Actions 배포 자동화', desc: 'Microsoft Azure Service, 20251124 완료' },
  { id: 5, status: 'done', title: 'Azure AppService 환경 설정', desc: '20251125 완료' },
  { id: 6, status: 'planned', title: 'RSI 지표 매수/매도 알고리즘', desc: '구현 예정...' },
  { id: 7, status: 'planned', title: '생성형 AI 투자 전략 학습', desc: '구현 예정...' },
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

  const [selectedChartIdx, setSelectedChartIdx] = useState(0);

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

  const [customSymbol, setCustomSymbol] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [showRsiView, setShowRsiView] = useState(false);

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
        } catch (_) { }
      });
      widgetRefs.current = [];

      if (scriptAppended) {
        const s = document.getElementById(scriptId);
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
    };
  }, [chartConfigs]);

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

      {/* 3-Column To-Do List Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "#e5e7eb" }}>
          🚀 Project To-Do List
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

          {/* Column 1: Completed */}
          <div style={{ background: "#1f2937", borderRadius: 8, padding: 12, border: "1px solid #374151" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid #374151", paddingBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 14, color: "#34d399" }}>
                ✅ 완료된 작업
              </h4>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => handleAddTodo('done')}
                  style={{ background: "#374151", border: "none", color: "#fff", borderRadius: 4, cursor: "pointer", padding: "2px 6px", fontSize: 12 }}
                  title="추가"
                >
                  +
                </button>
                <button
                  onClick={() => handleDeleteTodo('done')}
                  style={{ background: "#374151", border: "none", color: "#fca5a5", borderRadius: 4, cursor: "pointer", padding: "2px 6px", fontSize: 12 }}
                  title="삭제"
                >
                  -
                </button>
              </div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {todos.filter(item => item.status === 'done').map(item => (
                <li
                  key={item.id}
                  onClick={() => setSelectedTodo(item)}
                  onDoubleClick={() => handleEditClick(item)}
                  style={{
                    padding: "8px",
                    marginBottom: 8,
                    borderRadius: 6,
                    background: selectedTodo?.id === item.id ? "#374151" : "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#d1d5db",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => { if (selectedTodo?.id !== item.id) e.currentTarget.style.background = "#374151" }}
                  onMouseOut={(e) => { if (selectedTodo?.id !== item.id) e.currentTarget.style.background = "transparent" }}
                >
                  {item.title}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Planned */}
          <div style={{ background: "#1f2937", borderRadius: 8, padding: 12, border: "1px solid #374151" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid #374151", paddingBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 14, color: "#60a5fa" }}>
                📅 계획된 작업
              </h4>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => handleAddTodo('planned')}
                  style={{ background: "#374151", border: "none", color: "#fff", borderRadius: 4, cursor: "pointer", padding: "2px 6px", fontSize: 12 }}
                  title="추가"
                >
                  +
                </button>
                <button
                  onClick={() => handleDeleteTodo('planned')}
                  style={{ background: "#374151", border: "none", color: "#fca5a5", borderRadius: 4, cursor: "pointer", padding: "2px 6px", fontSize: 12 }}
                  title="삭제"
                >
                  -
                </button>
              </div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {todos.filter(item => item.status === 'planned').map(item => (
                <li
                  key={item.id}
                  onClick={() => setSelectedTodo(item)}
                  onDoubleClick={() => handleEditClick(item)}
                  style={{
                    padding: "8px",
                    marginBottom: 8,
                    borderRadius: 6,
                    background: selectedTodo?.id === item.id ? "#374151" : "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#d1d5db",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => { if (selectedTodo?.id !== item.id) e.currentTarget.style.background = "#374151" }}
                  onMouseOut={(e) => { if (selectedTodo?.id !== item.id) e.currentTarget.style.background = "transparent" }}
                >
                  {item.title}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Details */}
          <div style={{ background: "#111827", borderRadius: 8, padding: 16, border: "1px solid #374151" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#f3f4f6", borderBottom: "1px solid #374151", paddingBottom: 8 }}>
              📝 상세 내용
            </h4>
            {selectedTodo ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
                  {selectedTodo.title}
                </div>
                <div style={{ fontSize: 12, color: selectedTodo.status === 'done' ? "#34d399" : "#60a5fa", marginBottom: 12 }}>
                  {selectedTodo.status === 'done' ? "완료됨" : "계획됨"}
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
                  {selectedTodo.desc}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 20 }}>
                좌측 리스트에서 항목을 선택하여<br />상세 내용을 확인하세요.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 툴바 */}
      <div style={toolbarStyle}>
        <div style={labelStyle}>선택 차트: #{selectedChartIdx + 1}</div>



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
          style={{ height: 30, borderRadius: 6, fontSize: 13, padding: "0 8px" }}
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
          style={{ height: 30, borderRadius: 6, maxWidth: 180, fontSize: 13, padding: "0 8px" }}
        >
          {DEFAULT_SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={handleRunAnalysis}
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 6,
            border: "none",
            background: "linear-gradient(135deg, #8b5cf6, #ec4899)", // Violet to Pink gradient
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            marginLeft: "16px", // Moved from auto to 16px
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          📊 RSI 분석
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
            <div
              id={CHART_IDS[selectedChartIdx]}
              style={{ width: "100%", height: "100%" }}
            />
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
              title={`차트 선택: ${idx + 1}`}
            >
              <div id={id} style={{ width: "100%", height: "100%" }} />
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
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 100,
                display: "flex",
                justifyContent: "flex-end",
                padding: "12px",
                background: "#fff",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <button
                onClick={() => setShowRsiView(false)}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "#ef4444",
                  color: "#ffffff",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
              >
                닫기
              </button>
            </div>

            <RsiGptFrontOnlyDemo
              activeSymbol={chartConfigs[selectedChartIdx]?.symbol?.replace("BINANCE:", "") || "BTCUSDT"}
              activeTimeframe={(() => {
                const tf = chartConfigs[selectedChartIdx]?.timeframe || "60";
                if (tf === "1") return "1m";
                if (tf === "15") return "15m";
                if (tf === "60") return "1h";
                if (tf === "240") return "4h";
                if (tf === "D") return "1d";
                return "1h"; // Default fallback
              })()}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingTodo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: "#1f2937",
              padding: 24,
              borderRadius: 12,
              width: "100%",
              maxWidth: 400,
              border: "1px solid #374151",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#e5e7eb", fontSize: 18 }}>작업 수정</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>제목</label>
              <input
                type="text"
                value={editingTodo.title}
                onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>상태</label>
              <select
                value={editingTodo.status}
                onChange={(e) => setEditingTodo({ ...editingTodo, status: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              >
                <option value="done">완료됨</option>
                <option value="planned">계획됨</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>상세 내용</label>
              <textarea
                value={editingTodo.desc}
                onChange={(e) => setEditingTodo({ ...editingTodo, desc: e.target.value })}
                rows={5}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "#e5e7eb",
                  fontSize: 14,
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
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#d1d5db",
                  cursor: "pointer",
                }}
              >
                취소
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
                  fontWeight: 600,
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingViewAIDashboard;
