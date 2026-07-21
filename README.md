# Meet Git Pages (일정 조율 도구)

GitHub Pages와 Firebase를 활용한 when2meet 스타일의 모임 일정 조율 도구입니다.

## 🚀 프로젝트 소개
* **Meet Git Pages**는 여러 사용자가 모여 가능한 날짜와 시간을 투표하고, 최적의 모임 날짜를 조율할 수 있도록 돕는 웹 서비스입니다.
* **서버리스 아키텍처**: 별도의 백엔드 서버 없이 GitHub Pages(호스팅)와 Firebase Firestore(데이터베이스)만으로 실시간 데이터 동기화를 지원합니다.

## ✨ 주요 기능
1. **모임 생성**: 조율하고자 하는 모임의 이름, 설명, 후보 날짜 범위 등을 설정하여 새로운 일정 조율 페이지를 개설합니다.
2. **날짜별 가능/불가 응답**: 캘린더에서 각 날짜별로 본인이 참석 가능한지 투표할 수 있습니다.
3. **달력 히트맵**: 응답자 수에 따라 날짜별 참여 가능 여부를 히트맵(색상 농도) 형식으로 시각화하여 한눈에 파악할 수 있습니다.
4. **실시간 동기화**: Firebase Firestore를 통해 다른 사람의 투표 현황이 새로고침 없이 실시간으로 반영됩니다.
5. **최적 날짜 추천**: 투표 결과를 바탕으로 가장 많은 인원이 참여할 수 있는 최적의 날짜와 시간을 계산하여 추천합니다.

## 🛠 기술 스택
* **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
* **Database / Backend**: Firebase Firestore (NoSQL 데이터베이스)
* **Deployment**: GitHub Pages (GitHub Actions를 통한 자동 빌드 및 배포)

## 💻 로컬 개발 방법
로컬 환경에서 개발 및 테스트를 하려면 Firebase 구성 설정이 필요합니다.

1. **설정 파일 생성**:
   프로젝트 루트(또는 `js/` 디렉토리) 내의 템플릿 파일인 `firebase-config.template.js`를 복사하여 `firebase-config.js`를 생성합니다.
   ```bash
   cp firebase-config.template.js firebase-config.js
   ```
2. **Firebase API 키 설정**:
   생성한 `firebase-config.js` 파일에 본인의 Firebase Firestore 프로젝트 API 키 및 설정 값을 입력합니다.
3. **실행**:
   Visual Studio Code의 **Live Server** 익스텐션 등을 사용하여 로컬 개발 서버를 띄워 실행합니다.

> [!WARNING]
> Firebase API 키와 설정 정보가 담긴 `firebase-config.js` 파일은 민감한 정보를 포함하고 있으므로 절대 Git 저장소에 커밋 및 푸시하지 마십시오. (`.gitignore`에 추가되어 있는지 확인하세요.)

## 📦 배포 방법
GitHub Actions 워크플로우([deploy.yml](file:///c:/Users/User/Desktop/try/meet-git-pages/.github/workflows/deploy.yml))를 통해 `main` 브랜치로 push할 때 자동으로 GitHub Pages에 배포됩니다.

1. **GitHub Repository Secrets 설정**:
   배포 시 Firebase API 키를 안전하게 주입하기 위해 GitHub 저장소의 `Settings` > `Secrets and variables` > `Actions` 메뉴에 아래의 Repository Secrets를 추가합니다.
   * `FIREBASE_API_KEY`
   * `FIREBASE_AUTH_DOMAIN`
   * `FIREBASE_PROJECT_ID`
   * `FIREBASE_STORAGE_BUCKET`
   * `FIREBASE_MESSAGING_SENDER_ID`
   * `FIREBASE_APP_ID`

2. **자동 배포 실행**:
   * `main` 브랜치에 코드를 `push`하면 워크플로우가 자동으로 실행됩니다.
   * 워크플로우가 실행되면서 GitHub Secrets를 읽어와 배포 빌드 시 `js/firebase-config.js` 파일을 동적으로 생성하고 GitHub Pages에 포함하여 안전하게 배포합니다.

## 🔗 라이브 데모 URL
* [Meet Git Pages 라이브 데모](https://programofktw.github.io/meet-git-pages/)