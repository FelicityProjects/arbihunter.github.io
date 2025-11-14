# Pine Script 적용 가이드

## 🚀 빠른 시작

### 1단계: 차트 모드 선택
1. 상단 툴바에서 차트 모드를 선택합니다
   - **TradingView**: TradingView 위젯 사용 (스크립트 자동 적용 불가)
   - **로컬 차트 (Pine Script 적용)**: 로컬 차트 사용 (스크립트 자동 적용 가능)

### 2단계: Pine Script 작성
Pine Script 편집 영역에 스크립트를 작성합니다.

**기본 예시:**
```pine
//@version=5
indicator("My Indicator", overlay=true)
plot(close)
```

### 3단계: 스크립트 적용

#### 로컬 차트 모드인 경우:
- ✅ **자동 적용**: 스크립트를 입력하면 자동으로 차트에 적용됩니다
- "✅ 스크립트 적용 확인" 버튼을 클릭하면 적용된 지표를 확인할 수 있습니다

#### TradingView 모드인 경우:
- "📋 적용 안내" 버튼을 클릭하면 안내 메시지가 표시됩니다
- TradingView 웹 차트에서 직접 적용해야 합니다

## 📝 지원하는 Pine Script 지표

현재 로컬 차트 모드에서 자동으로 파싱 및 적용되는 지표:

### 1. 기본 가격 플롯
```pine
plot(close)   // 종가
plot(open)    // 시가
plot(high)    // 고가
plot(low)     // 저가
```

### 2. 단순 이동평균 (SMA)
```pine
plot(sma(close, 20))  // 20기간 SMA
plot(sma(close, 50))  // 50기간 SMA
```

### 3. 지수 이동평균 (EMA)
```pine
plot(ema(close, 12))  // 12기간 EMA
plot(ema(close, 26))  // 26기간 EMA
```

### 4. RSI (상대강도지수)
```pine
plot(rsi(close, 14))  // 14기간 RSI
plot(rsi(close, 9))   // 9기간 RSI
```

### 5. 복합 지표 예시
```pine
//@version=5
indicator("복합 지표", overlay=true)
plot(close)
plot(sma(close, 20))
plot(ema(close, 12))
plot(rsi(close, 14))
```

## 🎯 사용 예시

### 예시 1: 기본 종가 라인
```pine
//@version=5
indicator("Close Price", overlay=true)
plot(close)
```

### 예시 2: SMA 크로스오버
```pine
//@version=5
indicator("SMA Crossover", overlay=true)
plot(close)
plot(sma(close, 20))
plot(sma(close, 50))
```

### 예시 3: EMA 트렌드
```pine
//@version=5
indicator("EMA Trend", overlay=true)
plot(close)
plot(ema(close, 12))
plot(ema(close, 26))
```

## 💡 팁

1. **예시 스크립트 로드**: "📝 예시 스크립트 로드" 버튼을 클릭하면 랜덤 예시가 로드됩니다
2. **자동 적용**: 로컬 차트 모드에서는 스크립트를 수정하면 즉시 차트에 반영됩니다
3. **모드 전환**: 차트별로 독립적으로 모드를 설정할 수 있습니다
4. **모든 차트에 복사**: 선택한 차트의 스크립트를 다른 모든 차트에 복사할 수 있습니다

## ⚠️ 제한사항

- 현재는 기본 지표만 지원합니다 (plot, sma, ema, rsi)
- 복잡한 Pine Script 문법은 아직 지원하지 않습니다
- 변수 선언, 조건문 등은 파싱되지 않습니다
- 로컬 차트는 샘플 데이터를 사용합니다 (실제 거래소 데이터 연동 필요)

## 🔧 문제 해결

### 스크립트가 적용되지 않는 경우:
1. 로컬 차트 모드로 전환했는지 확인
2. 지원하는 지표 형식인지 확인
3. "✅ 스크립트 적용 확인" 버튼으로 파싱 상태 확인
4. 브라우저 콘솔에서 오류 메시지 확인

### 지표가 보이지 않는 경우:
1. 스크립트에 `plot()` 함수가 포함되어 있는지 확인
2. 올바른 형식인지 확인 (예: `plot(sma(close, 20))`)
3. 차트가 완전히 로드될 때까지 기다리기

