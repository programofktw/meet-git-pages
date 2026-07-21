// Firebase 설정 템플릿 파일입니다. (git에 포함됨)
// 로컬에서 개발할 때는 이 파일을 복사하여 firebase-config.js로 이름을 변경하고,
// 실제 Firebase 프로젝트 설정 값을 채워 넣으세요.
// firebase-config.js는 .gitignore에 의해 git에 추적되지 않습니다.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
