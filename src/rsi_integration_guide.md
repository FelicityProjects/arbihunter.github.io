# RSI 데이터 조회 API 연동

## 1. 개요
본 프로젝트는 **FastAPI** 기반의 백엔드 서버를 통해 **Binance Spot API**와 연동하여 실시간 가상화폐 시세 데이터(OHLC)를 수집합니다. 수집된 데이터를 바탕으로 서버 내부에서 **RSI(Relative Strength Index)** 지표를 계산하여 프론트엔드 클라이언트에 JSON 형태로 제공합니다.

## 2. 백엔드 구현 상세
### 2.1 데이터 소스 및 수집
- **외부 API**: Binance Public API (`https://api.binance.com/api/v3/klines`)
- **수집 데이터**: 시가(Open), 고가(High), 저가(Low), 종가(Close), 거래량(Volume)
- **타임프레임 매핑**: 프론트엔드 요청(1m, 5m, 15m 등)을 바이낸스 규격에 맞춰 변환

### 2.2 RSI 계산 로직 (`compute_rsi`)
- **알고리즘**: TradingView와 유사한 **EMA (Exponential Moving Average)** 방식 적용
- **설정값**: 기간(Period) **14**
- **구현**: `pandas` 라이브러리를 사용하여 데이터프레임 단위로 고속 연산

### 2.3 제공 API 엔드포인트
프론트엔드와의 연동을 위해 다음 두 가지 주요 엔드포인트를 제공합니다.

#### (1) 최신 RSI 단건 조회
- **URL**: `GET /api/indicators/latest-rsi`
- **목적**: 대시보드 카드나 리스트에서 특정 코인의 현재 과매수/과매도 상태를 즉시 확인
- **파라미터**:
  - `symbol`: 종목 코드 (예: `BTCUSDT`)
  - `timeframe`: 시간봉 (예: `15m`)
- **응답 데이터**:
  ```json
  {
    "symbol": "BTCUSDT",
    "timeframe": "15m",
    "rsi": 45.67,
    "updated_at": "2024-01-01T12:00:00Z"
  }
  ```

#### (2) 최근 캔들 및 RSI 이력 조회
- **URL**: `GET /api/indicators/recent-candles`
- **목적**: 미니 차트 또는 상세 분석 화면에서 가격 흐름과 RSI 추이를 시각화
- **파라미터**:
  - `symbol`: 종목 코드
  - `timeframe`: 시간봉
  - `limit`: 조회할 캔들 개수 (기본 10, 최대 200)
- **응답 데이터**:
  ```json
  {
    "symbol": "BTCUSDT",
    "timeframe": "15m",
    "candles": [
      {
        "time": "2024-01-01T11:45:00Z",
        "open": 42000.0,
        "high": 42100.0,
        "low": 41900.0,
        "close": 42050.0,
        "volume": 120.5,
        "rsi": 44.2
      },
      ...
    ]
  }
  ```

## 3. 프론트엔드 연동 (Frontend Integration)

프론트엔드(`RsiGptFrontOnlyDemo.jsx`)에서는 `fetch` API를 사용하여 백엔드와 통신합니다.

### 3.1 API 호출 함수 예시

#### 최신 RSI 조회 (`fetchLatestRsiFromServer`)
```javascript
async function fetchLatestRsiFromServer(symbol, timeframe) {
  const url = `${API_BASE}/api/indicators/latest-rsi?symbol=${symbol}&timeframe=${timeframe}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("RSI API 호출 실패");
  return await res.json();
}
```

#### 최근 캔들 조회 (`fetchRecentCandlesFromServer`)
```javascript
async function fetchRecentCandlesFromServer(symbol, timeframe, limit = 20) {
  const url = `${API_BASE}/api/indicators/recent-candles?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("캔들 API 호출 실패");
  const data = await res.json();
  return data.candles || [];
}
```

### 3.2 상태 관리 및 데이터 흐름
1.  **초기화**: 컴포넌트 마운트 시 또는 `symbol`/`timeframe` 변경 시 데이터 갱신 함수(`refreshAllTimeframesAndCandles`)가 호출됩니다.
2.  **로딩 상태**: `isLoading` 상태를 `true`로 설정하여 UI에 로딩 인디케이터("서비스 호출 중...")를 표시합니다.
3.  **데이터 병렬 요청**:
    *   `Promise.all`을 사용하여 모든 타임프레임(1m, 5m, 1h 등)의 최신 RSI를 병렬로 요청합니다.
    *   동시에 선택된 타임프레임의 최근 캔들 데이터도 요청합니다.
4.  **상태 업데이트**:
    *   `rsiMap`: 각 타임프레임별 RSI 데이터를 객체로 저장하여 그리드 뷰에 바인딩합니다.
    *   `recentCandles`: 캔들 데이터를 시간 역순(최신순)으로 정렬하여 테이블에 바인딩합니다.
5.  **에러 처리**: `try-catch` 블록으로 감싸 네트워크 오류나 API 에러 발생 시 `error` 상태에 메시지를 저장하고 UI에 경고 배지를 표시합니다.

### 3.3 UI 시각화 상세
- **RSI 그리드**:
    - **과매수(Overbought)**: RSI >= 70 인 경우 붉은색 계열 배경/텍스트로 강조
    - **과매도(Oversold)**: RSI <= 30 인 경우 푸른색 계열 배경/텍스트로 강조
    - **선택 효과**: 현재 선택된 타임프레임은 테두리와 그림자 효과로 구분
- **캔들 데이터 테이블**:
    - **등락 표시**: 직전 캔들 종가 대비 현재 캔들 종가의 등락을 계산하여 '상방(▲)', '하방(▼)', '보합(■)'으로 표시하고 색상을 구분합니다.
    - **최신 데이터 강조**: 가장 최신(첫 번째 행) 데이터는 폰트 굵기를 다르게 하여 가독성을 높입니다.

## 4. 프론트엔드 연동 환경
- **CORS 설정**: 다음 오리진에서의 요청을 허용하여 브라우저 연동 지원
  - 로컬 개발: `http://localhost:5173`, `http://localhost:3000`
  - 배포 환경: `https://arbihunter.github.io`, `https://felicityprojects.github.io`
- **에러 처리**:
  - 바이낸스 API 오류 시 `502 Bad Gateway` 반환
  - 데이터 부족 시 `404 Not Found` 반환
