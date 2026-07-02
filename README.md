# Glassy 🌊

서퍼를 위한 실시간 파도·바람 정보 및 서핑 일지 앱입니다.
"Glassy"는 바람이 없어 파도 표면이 유리처럼 매끄러운, 서퍼들이 가장 선호하는 바다 상태를 뜻하는 서핑 용어에서 이름을 따왔습니다.

## 만든 이유

서핑을 하면서 스팟마다 실제 체감 파도 크기가 기상 API가 알려주는 값과 다르다는 걸 자주 느꼈습니다. 스웰 방향과 지형에 따라 같은 파고 예보라도 스팟별로 체감이 완전히 다르기 때문인데, 이 오차를 보정해서 좀 더 정확한 정보를 제공하는 앱을 직접 만들어보고 싶어서 시작했습니다.

## 주요 기능

- **실시간 파도/바람/수온 정보**: Open-Meteo Marine API를 연동해 스팟별 실시간 해양 데이터 제공
- **파고 보정 알고리즘**: 스웰 방향(swell window)과 스팟별 지형 차폐 효과(shelter factor)를 계산해, 예보상 파고를 스팟 체감 파고에 가깝게 보정하는 로직을 직접 구현
- **서핑 일지**: 날짜, 파고, 바람, 수온, 보드 종류(롱보드/숏보드/패들보드/윈드서핑/포일서핑), 서핑 시간 등을 기록하고 Firestore에 저장·통계로 조회
- **AI 채팅**: Upstage Solar API(solar-mini)를 연동해 서핑 관련 질문에 답변하는 AI 어시스턴트 탭
- **회원 인증**: Firebase Authentication 기반 로그인/회원가입
- **다크모드 지원**: 테마 컨텍스트를 이용한 라이트/다크 모드 전환

## 사용 기술

- **Framework**: Expo (React Native) + TypeScript, Expo Router
- **Backend/Infra**: Firebase (Authentication, Firestore)
- **AI**: Upstage Solar API (solar-mini)
- **외부 API**: Open-Meteo Marine API, Open-Meteo Forecast API
- **기타**: Axios, React Navigation, React Native Reanimated

## 기술적으로 신경 쓴 부분

- 외부 기상 API 호출 실패 시 자동 재시도 및 메모리 캐시(TTL 10분)를 두어 불필요한 API 콜을 줄이고 응답 속도를 개선
- 스웰 방향이 스팟의 유효 파도 수신 각도(swell window) 안에 있는지, 각도 차이에 따라 보정 계수를 다르게 적용하는 방향 기반 보정 함수 구현
- 실시간 데이터가 없는 시간대에는 가장 가까운 유효 시간대 값을 탐색해 대체하는 fallback 로직 적용

## 실행 방법

```bash
npm install
npx expo start
```

Expo Go 앱, Android 에뮬레이터, iOS 시뮬레이터, 웹 중 원하는 환경에서 실행할 수 있습니다.

## 회고

기상 API 데이터를 그대로 보여주는 것과, 실제 사용자가 체감하는 값에 가깝게 보정해서 보여주는 것 사이의 간극을 직접 알고리즘으로 메워보면서, 단순한 CRUD 앱을 넘어 도메인 지식을 코드로 옮기는 경험을 해볼 수 있었습니다.
