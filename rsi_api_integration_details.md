# RSI 데이터 조회 API 연동 (SI Data Retrieval API Integration)

본 문서는 `etc/main.py`에 구현된 RSI 지표 조회 API의 상세 내용을 정리한 것입니다.

## 1. 개요 (Overview)
- **서비스명**: RSI Indicator API (Binance Spot)
- **목적**: 바이낸스 현물(Spot) 시장의 캔들 데이터를 조회하여 RSI(Relative Strength Index) 지표를 계산하고 제공합니다.
- **기술 스택**: Python, FastAPI, Pandas, NumPy

## 2. 서버 설정 (Configuration)
- **실행 커맨드**: `uvicorn main:app --reload --port 8000`
- **기본 포트**: `8000`
- **CORS 설정**:
  - 허용된 Origin:
    - `http://localhost:5173`
    - `http://localhost:3000`
    - `https://arbihunter.github.io`
    - `https://felicityprojects.github.io`

## 3. API 엔드포인트 (Endpoints)

### 3.1 최신 RSI 조회 (Get Latest RSI)
특정 심볼의 가장 최신 RSI 값을 반환합니다.

- **URL**: `/api/indicators/latest-rsi`
- **Method**: `GET`
- **Parameters**:
  - `symbol` (str, required): 조회할 심볼 (예: `BTCUSDT`, `ETHUSDT`)
  - `timeframe` (str, required): 시간 단위 (예: `1m`, `5m`, `1h`, `4h`, `1d`)
- **Response Model**: `LatestRsiResponse`
  ```json
  {
    "symbol": "BTCUSDT",
    "timeframe": "15m",
    "rsi": 45.23,
    "updated_at": "2023-10-27T10:00:00Z"
  }
  ```

### 3.2 최근 캔들 및 RSI 조회 (Get Recent Candles with RSI)
최근 N개의 캔들 데이터와 각 캔들의 RSI 값을 함께 반환합니다.

- **URL**: `/api/indicators/recent-candles`
- **Method**: `GET`
- **Parameters**:
  - `symbol` (str, required): 조회할 심볼
  - `timeframe` (str, required): 시간 단위
  - `limit` (int, optional): 반환할 캔들 개수 (기본값: 10, 최대: 200)
- **Response Model**: `RecentCandlesResponse`
  ```json
  {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "candles": [
      {
        "time": "2023-10-27T09:00:00Z",
        "open": 34000.0,
        "high": 34100.0,
        "low": 33900.0,
        "close": 34050.0,
        "volume": 120.5,
        "rsi": 55.4
      },
      ...
    ]
  }
  ```

### 3.3 헬스 체크 (Health Check)
서버 상태를 확인합니다.

- **URL**: `/`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "RSI Indicator API",
    "server_time": "2023-10-27T10:05:00Z"
  }
  ```

## 4. 내부 로직 (Internal Logic)

### 4.1 타임프레임 매핑
프론트엔드에서 사용하는 타임프레임을 바이낸스 API 규격으로 변환합니다.
- `1m` -> `1m`
- `5m` -> `5m`
- `10m` -> `15m` (10분봉 미지원으로 15분봉 대체)
- `15m` -> `15m`
- `30m` -> `30m`
- `1h` -> `1h`
- `4h` -> `4h`
- `1d` -> `1d`

### 4.2 RSI 계산
- **방식**: EMA (Exponential Moving Average) 방식 사용 (TradingView와 유사)
- **기간 (Period)**: 14
- **계산식**:
  1. 전일 대비 상승분(Gain)과 하락분(Loss) 계산
  2. 14일 EMA로 평균 상승분(Avg Gain)과 평균 하락분(Avg Loss) 계산
  3. RS = Avg Gain / Avg Loss
  4. RSI = 100 - (100 / (1 + RS))

### 4.3 데이터 소스
- **Source**: Binance Spot API (`/api/v3/klines`)
- **Limit**: RSI 계산의 정확도를 위해 요청된 `limit`보다 여유 있게 데이터를 가져와 계산 후 필요한 개수만큼 잘라서 반환합니다.
