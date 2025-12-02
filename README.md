# 📈 ArbiHunter: Crypto RSI & Arbitrage Dashboard

> **실시간 암호화폐 RSI 지표 모니터링 및 차익거래 기회 탐지 서비스** > Frontend(React)를 활용한 프로젝트이며, Azure 클라우드 환경에 배포되어 있습니다.

---

## 🔗 Live Demo & Resources
- **🌐 Web Service:** [서비스 바로가기 (https://felicityprojects.github.io/arbihunter.github.io)](https://felicityprojects.github.io/arbihunter.github.io)

- **📑 Detailed Docs:**
    - [📊 RSI Trading Strategy (투자 전략 로직)](./rsi_strategy.md)
    - [☁️ Azure Deployment Setup (배포 아키텍처)](./azure_appservice_setup.md)
    - [⚙️ CI/CD Pipeline (GitHub Actions)](./github_actions_setup.md)

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React.js
- **Visualization:** Chart.js / Recharts (사용하신 라이브러리 확인 후 기재)
- **Deployment:** GitHub Pages

### DevOps & Infrastructure
- **Cloud:** Microsoft Azure (App Service)
- **Version Control:** Git

---

## 💡 Key Features (핵심 기능)

### 1. 실시간 RSI 기반 매매 시그널
- 주요 거래소의 실시간 데이터를 수집하여 RSI(상대강도지수)를 계산합니다.
- 과매수/과매도 구간 진입 시 대시보드에 즉시 알림을 표시합니다.
- *자세한 알고리즘은 [RSI Strategy 문서](./rsi_strategy.md)를 참고하세요.*

### 2. 거래소 간 차익거래(Arbitrage) 탐지
- 동일 코인에 대해 거래소(A vs B) 간의 가격 차이를 실시간으로 추적합니다.
- 프리미엄(Kimchi Premium 등) 발생 시 시각화된 데이터를 제공합니다.

### 3. 자동화된 배포 파이프라인 (CI/CD)
- 코드가 메인 브랜치에 푸시되면 GitHub Actions가 자동으로 빌드를 수행하고 Azure 서버에 배포합니다.
- *배포 과정은 [Azure Setup 문서](./azure_appservice_setup.md)에 정리되어 있습니다.*

---

## 📂 Project Structure

```bash
/
├── src/                # React Frontend Source Code
├── etc/                # 기타 설정 파일
├── rsi_strategy.md     # 전략 설명 문서
├── azure_setup.md      # 인프라 구축 문서
└── ...