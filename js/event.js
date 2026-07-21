import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp, arrayUnion } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { Calendar } from './calendar.js';

// URL 파라미터에서 이벤트 ID 가져오기
const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');

if (!eventId) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'block';
  throw new Error('이벤트 ID가 없습니다.');
}

// DOM 요소
const titleDisplay = document.getElementById('event-title-display');
const descDisplay = document.getElementById('event-description-display');
const linkDisplay = document.getElementById('link-display');
const copyLinkBtn = document.getElementById('copy-link-btn');
const copyToast = document.getElementById('copy-toast');
const membersList = document.getElementById('members-list');
const addMemberBtn = document.getElementById('add-member-btn');
const participantSelect = document.getElementById('participant-name');
const inputArea = document.getElementById('input-area');
const submitBtn = document.getElementById('submit-btn');
const bestDatesContainer = document.getElementById('best-dates-container');
const bestDatesList = document.getElementById('best-dates-list');

// 진입 오버레이 DOM
const entryOverlay = document.getElementById('entry-overlay');
const entryTitle = document.getElementById('entry-title');
const entrySelect = document.getElementById('entry-select');
const entryConfirm = document.getElementById('entry-confirm');
const entrySkip = document.getElementById('entry-skip');

let eventData = null;
let resultCalendar = null;
let inputCalendar = null;
let allParticipantsData = {};
let currentUser = null; // 진입 시 선택한 사용자 // { '이름': { available: [], unavailable: [] } }

// 1. 이벤트 데이터 로드
async function loadEvent() {
  try {
    const docRef = doc(db, 'events', eventId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      eventData = docSnap.data();
      renderEventInfo();
      initCalendars();
      listenToParticipants();
      showEntryOverlay(); // 데이터 로드 후 진입 오버레이 표시
    } else {
      showError();
    }
  } catch (error) {
    console.error("Error getting document:", error);
    showError();
  }
}

function showError() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'block';
}

// 2. 이벤트 정보 렌더링
function renderEventInfo() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('event-content').style.display = 'block';

  titleDisplay.textContent = eventData.title;
  if (eventData.description) {
    descDisplay.textContent = eventData.description;
  } else {
    descDisplay.style.display = 'none';
  }

  // 링크 표시
  const url = window.location.href;
  linkDisplay.textContent = url;
}

// 링크 복사
copyLinkBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyToast.classList.add('visible');
    setTimeout(() => copyToast.classList.remove('visible'), 2000);
  } catch (err) {
    alert('링크 복사에 실패했습니다.');
  }
});

// 3. 달력 초기화
function initCalendars() {
  const resultContainer = document.getElementById('result-calendar');
  const inputContainer = document.getElementById('input-calendar');

  resultCalendar = new Calendar(resultContainer, {
    mode: 'heatmap',
    startDate: eventData.startDate,
    endDate: eventData.endDate
  });

  inputCalendar = new Calendar(inputContainer, {
    mode: 'input',
    startDate: eventData.startDate,
    endDate: eventData.endDate
  });
}

// 4. 참가자 데이터 실시간 수신
function listenToParticipants() {
  const participantsRef = collection(db, 'events', eventId, 'participants');
  
  onSnapshot(participantsRef, (snapshot) => {
    allParticipantsData = {};
    snapshot.forEach(doc => {
      allParticipantsData[doc.id] = doc.data();
    });

    updateHeatmap();
    updateBestDates();
    renderMembersStatus();
    updateParticipantDropdown();
  });
}

// 히트맵 업데이트용 데이터 변환
function updateHeatmap() {
  const heatmapData = {};

  for (const [name, data] of Object.entries(allParticipantsData)) {
    (data.available || []).forEach(date => {
      if (!heatmapData[date]) heatmapData[date] = { available: [], unavailable: [] };
      heatmapData[date].available.push(name);
    });

    (data.unavailable || []).forEach(date => {
      if (!heatmapData[date]) heatmapData[date] = { available: [], unavailable: [] };
      heatmapData[date].unavailable.push(name);
    });
  }

  resultCalendar.updateHeatmap(heatmapData);
}

// 최적의 날짜 계산 (가능 많고, 불가 적은 순)
function updateBestDates() {
  const dateScores = [];
  
  // 모든 날짜 순회
  const start = new Date(eventData.startDate);
  const end = new Date(eventData.endDate);
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);

  let current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    let avCount = 0;
    let unCount = 0;

    for (const [name, data] of Object.entries(allParticipantsData)) {
      if (data.available && data.available.includes(dateStr)) avCount++;
      if (data.unavailable && data.unavailable.includes(dateStr)) unCount++;
    }

    if (avCount > 0) { // 가능한 사람이 최소 1명 이상인 날짜만
      dateScores.push({ date: dateStr, available: avCount, unavailable: unCount });
    }

    current.setDate(current.getDate() + 1);
  }

  // 정렬: 가능 많은 순 -> 불가 적은 순 -> 날짜 빠른 순
  dateScores.sort((a, b) => {
    if (b.available !== a.available) return b.available - a.available;
    if (a.unavailable !== b.unavailable) return a.unavailable - b.unavailable;
    return a.date.localeCompare(b.date);
  });

  const top3 = dateScores.slice(0, 3);
  
  bestDatesList.innerHTML = '';
  if (top3.length > 0) {
    bestDatesContainer.style.display = 'block';
    top3.forEach(item => {
      const div = document.createElement('div');
      div.className = 'best-date-item';
      div.innerHTML = `
        <span class="date">${item.date}</span>
        <span class="count">${item.available}명 가능 / ${item.unavailable}명 불가</span>
      `;
      bestDatesList.appendChild(div);
    });
  } else {
    bestDatesContainer.style.display = 'none';
  }
}

// 멤버 응답 현황 렌더링
function renderMembersStatus() {
  membersList.innerHTML = '';
  
  const expectedMembers = eventData.members || [];
  const respondedMembers = Object.keys(allParticipantsData);
  
  // 합집합
  const allMembers = new Set([...expectedMembers, ...respondedMembers]);
  
  allMembers.forEach(member => {
    const isResponded = respondedMembers.includes(member);
    const span = document.createElement('span');
    span.className = `member-badge ${isResponded ? 'responded' : 'pending'}`;
    span.textContent = member;
    membersList.appendChild(span);
  });
}

// 드롭다운에 멤버 목록 채우기
function updateParticipantDropdown() {
  const currentValue = participantSelect.value;
  const expectedMembers = eventData.members || [];
  const respondedMembers = Object.keys(allParticipantsData);
  const allMembers = [...new Set([...expectedMembers, ...respondedMembers])];

  // 기존 옵션 제거 (첫 번째 placeholder 제외)
  while (participantSelect.options.length > 1) {
    participantSelect.remove(1);
  }

  // 멤버별 옵션 추가
  allMembers.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    const isResponded = respondedMembers.includes(name);
    option.textContent = isResponded ? `${name} (응답 완료)` : name;
    participantSelect.appendChild(option);
  });

  // 이전 선택값 유지
  if (currentValue && allMembers.includes(currentValue)) {
    participantSelect.value = currentValue;
  }
}

// 멤버 추가 기능 — 인라인 입력 UI
const addMemberForm = document.getElementById('add-member-form');
const newMemberNameInput = document.getElementById('new-member-name');
const confirmMemberBtn = document.getElementById('confirm-member-btn');
const cancelMemberBtn = document.getElementById('cancel-member-btn');

// "멤버 추가" 버튼 클릭 → 입력 폼 표시
addMemberBtn.addEventListener('click', () => {
  addMemberForm.style.display = 'flex';
  addMemberBtn.style.display = 'none';
  newMemberNameInput.focus();
});

// "취소" 버튼 → 입력 폼 숨기기
cancelMemberBtn.addEventListener('click', () => {
  addMemberForm.style.display = 'none';
  addMemberBtn.style.display = '';
  newMemberNameInput.value = '';
});

// 실제 멤버 추가 실행
async function addNewMember() {
  const name = newMemberNameInput.value.trim();
  if (!name) return;

  // 이미 등록된 이름인지 확인
  if (eventData.members && eventData.members.includes(name)) {
    alert('이미 등록된 멤버입니다.');
    return;
  }

  try {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      members: arrayUnion(name)
    });

    // 로컬 상태 업데이트
    if (!eventData.members) eventData.members = [];
    eventData.members.push(name);
    renderMembersStatus();
    updateParticipantDropdown();

    // 입력 폼 리셋
    newMemberNameInput.value = '';
    addMemberForm.style.display = 'none';
    addMemberBtn.style.display = '';
  } catch (error) {
    console.error('멤버 추가 실패:', error);
    alert('멤버 추가 중 오류가 발생했습니다.');
  }
}

// "추가" 버튼 클릭
confirmMemberBtn.addEventListener('click', addNewMember);

// Enter 키로도 추가 가능
newMemberNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addNewMember();
  }
});

// 모드 토글 버튼 — '가능 선택' / '불가 선택' 전환
const modeAvailableBtn = document.getElementById('mode-available');
const modeUnavailableBtn = document.getElementById('mode-unavailable');
const weekdayBtn = document.getElementById('weekday-unavailable');
const clearAllBtn = document.getElementById('clear-all');

modeAvailableBtn?.addEventListener('click', () => {
  if (!inputCalendar) return;
  inputCalendar.setMode('available');
  modeAvailableBtn.className = 'mode-btn active-available';
  modeUnavailableBtn.className = 'mode-btn';
});

modeUnavailableBtn?.addEventListener('click', () => {
  if (!inputCalendar) return;
  inputCalendar.setMode('unavailable');
  modeUnavailableBtn.className = 'mode-btn active-unavailable';
  modeAvailableBtn.className = 'mode-btn';
});

// 평일 전부 불가 — 직장인을 위한 일괄 선택
weekdayBtn?.addEventListener('click', () => {
  if (!inputCalendar) return;
  inputCalendar.setWeekdaysUnavailable();
});

// 전체 초기화
clearAllBtn?.addEventListener('click', () => {
  if (!inputCalendar) return;
  inputCalendar.clearAll();
});

// 드롭다운에서 이름 선택 시 → 자동으로 기존 응답 로드
participantSelect.addEventListener('change', () => {
  const name = participantSelect.value;

  if (!name) {
    // placeholder 선택 시 입력 영역 숨김
    inputArea.style.display = 'none';
    return;
  }

  if (!inputCalendar) return;

  // 기존 응답이 있으면 로드, 없으면 빈 달력
  if (allParticipantsData[name]) {
    const { available = [], unavailable = [] } = allParticipantsData[name];
    inputCalendar.setSelections(available, unavailable);
  } else {
    inputCalendar.setSelections([], []);
  }

  inputArea.style.display = 'block';
});

// 내 일정 저장하기
submitBtn.addEventListener('click', async () => {
  const name = participantSelect.value;
  if (!name) {
    alert('이름을 선택해주세요.');
    return;
  }

  const selections = inputCalendar.getSelections();
  
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '저장 중...';
  submitBtn.disabled = true;

  try {
    const participantRef = doc(db, 'events', eventId, 'participants', name);
    await setDoc(participantRef, {
      available: selections.available,
      unavailable: selections.unavailable,
      updatedAt: serverTimestamp()
    });

    alert('일정이 저장되었습니다!');
    
    // 선택 초기화 → 다른 사람도 입력 가능
    participantSelect.value = '';
    inputArea.style.display = 'none';
    
    // eventData.members에 없으면 추가
    if (!eventData.members || !eventData.members.includes(name)) {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        members: arrayUnion(name)
      });
      if (!eventData.members) eventData.members = [];
      eventData.members.push(name);
    }
  } catch (error) {
    console.error(error);
    alert('저장 중 오류가 발생했습니다.');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});
// === 진입 오버레이 ===

// 오버레이에 멤버 목록 채우고 표시
function showEntryOverlay() {
  if (!entryOverlay) return;

  entryTitle.textContent = eventData.title || '모임';

  // 멤버 옵션 채우기
  const members = eventData.members || [];
  members.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    entrySelect.appendChild(option);
  });

  entryOverlay.style.display = 'flex';
}

// 드롭다운 선택 시 버튼 활성화
entrySelect?.addEventListener('change', () => {
  entryConfirm.disabled = !entrySelect.value;
});

// "선택하기" — 이름 확정 후 일정 입력 영역 자동 오픈
entryConfirm?.addEventListener('click', () => {
  currentUser = entrySelect.value;
  if (!currentUser) return;

  entryOverlay.style.display = 'none';

  // 내 일정 입력 드롭다운을 자동 선택 + change 이벤트 트리거
  participantSelect.value = currentUser;
  participantSelect.dispatchEvent(new Event('change'));
});

// "둘러보기만 할게요" — 오버레이 닫기만
entrySkip?.addEventListener('click', () => {
  entryOverlay.style.display = 'none';
});

// 시작
loadEvent();
