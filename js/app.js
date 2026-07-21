import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const form = document.getElementById('create-form');
const titleInput = document.getElementById('event-title');
const descInput = document.getElementById('event-description');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const memberInput = document.getElementById('member-input');
const addMemberBtn = document.getElementById('add-member-btn');
const memberTagsContainer = document.getElementById('member-tags');
const createBtn = document.getElementById('create-btn');

// 프리셋 관련 DOM
const presetSelect = document.getElementById('preset-select');
const presetLoadBtn = document.getElementById('preset-load-btn');
const presetDeleteBtn = document.getElementById('preset-delete-btn');
const presetSaveBtn = document.getElementById('preset-save-btn');
const presetSaveArea = document.getElementById('preset-save-area');
const presetNameInput = document.getElementById('preset-name-input');
const presetSaveConfirm = document.getElementById('preset-save-confirm');
const presetSaveCancel = document.getElementById('preset-save-cancel');

let members = [];

// === 프리셋 관리 (Firestore 'presets' 컬렉션) ===
let cachedPresets = []; // { id, name, members }

// Firestore에서 프리셋 목록 불러오기
async function loadPresets() {
  try {
    const snapshot = await getDocs(collection(db, 'presets'));
    cachedPresets = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    // 이름순 정렬
    cachedPresets.sort((a, b) => a.name.localeCompare(b.name));
    renderPresetOptions();
  } catch (error) {
    console.error('프리셋 로드 실패:', error);
  }
}

// 드롭다운에 프리셋 옵션 채우기
function renderPresetOptions() {
  while (presetSelect.options.length > 1) {
    presetSelect.remove(1);
  }

  cachedPresets.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${preset.name} (${preset.members.length}명)`;
    presetSelect.appendChild(option);
  });
}

// 프리셋 적용 — 프리셋 멤버로 교체
presetLoadBtn.addEventListener('click', () => {
  const index = parseInt(presetSelect.value, 10);
  if (isNaN(index) || !cachedPresets[index]) return;

  members = [...cachedPresets[index].members];
  renderMembers();
});

// 프리셋 삭제
presetDeleteBtn.addEventListener('click', async () => {
  const index = parseInt(presetSelect.value, 10);
  if (isNaN(index) || !cachedPresets[index]) return;

  const preset = cachedPresets[index];
  if (!confirm(`"${preset.name}" 그룹을 삭제할까요?`)) return;

  try {
    await deleteDoc(doc(db, 'presets', preset.id));
    cachedPresets.splice(index, 1);
    presetSelect.value = '';
    renderPresetOptions();
  } catch (error) {
    console.error('프리셋 삭제 실패:', error);
    alert('삭제 중 오류가 발생했습니다.');
  }
});

// "현재 멤버를 그룹으로 저장" 클릭 → 입력 폼 표시
presetSaveBtn.addEventListener('click', () => {
  presetSaveArea.style.display = 'block';
  presetSaveBtn.style.display = 'none';
  presetNameInput.focus();
});

// 저장 취소
presetSaveCancel.addEventListener('click', () => {
  presetSaveArea.style.display = 'none';
  presetSaveBtn.style.display = '';
  presetNameInput.value = '';
});

// 저장 확인
presetSaveConfirm.addEventListener('click', async () => {
  const name = presetNameInput.value.trim();
  if (!name) {
    alert('그룹 이름을 입력해주세요.');
    return;
  }

  try {
    // 같은 이름이 있으면 덮어쓰기
    const existing = cachedPresets.find(p => p.name === name);
    if (existing) {
      if (!confirm(`"${name}" 그룹이 이미 있습니다. 덮어쓸까요?`)) return;
      await setDoc(doc(db, 'presets', existing.id), {
        name,
        members: [...members],
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'presets'), {
        name,
        members: [...members],
        createdAt: serverTimestamp()
      });
    }

    // 목록 새로고침
    await loadPresets();

    // UI 리셋
    presetNameInput.value = '';
    presetSaveArea.style.display = 'none';
    presetSaveBtn.style.display = '';

    alert(`"${name}" 그룹이 저장되었습니다.`);
  } catch (error) {
    console.error('프리셋 저장 실패:', error);
    alert('저장 중 오류가 발생했습니다.');
  }
});

// Enter 키로도 저장
presetNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    presetSaveConfirm.click();
  }
});

// 초기 프리셋 로드
loadPresets();

// === 기존 로직 ===

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 초기화: 오늘 날짜를 시작일 최소값으로 설정
startDateInput.min = getTodayString();

startDateInput.addEventListener('change', () => {
  endDateInput.min = startDateInput.value;
  if (endDateInput.value && endDateInput.value < startDateInput.value) {
    endDateInput.value = startDateInput.value;
  }
});

// 멤버 태그 렌더링
function renderMembers() {
  memberTagsContainer.innerHTML = '';
  members.forEach((member, index) => {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
      ${member}
      <button type="button" class="tag-remove" data-index="${index}">&times;</button>
    `;
    memberTagsContainer.appendChild(tag);
  });

  // 멤버가 있을 때만 "그룹으로 저장" 버튼 표시
  if (members.length > 0 && presetSaveArea.style.display === 'none') {
    presetSaveBtn.style.display = '';
  } else if (members.length === 0) {
    presetSaveBtn.style.display = 'none';
    presetSaveArea.style.display = 'none';
  }
}

// 멤버 추가 로직
function addMember() {
  const name = memberInput.value.trim();
  // 쉼표로 여러 명 추가 처리
  const names = name.split(',').map(n => n.trim()).filter(n => n !== '');
  
  let added = false;
  names.forEach(n => {
    if (n && !members.includes(n)) {
      members.push(n);
      added = true;
    }
  });

  if (added) {
    renderMembers();
    memberInput.value = '';
  }
}

// 멤버 입력 이벤트 (Enter 키 및 쉼표 입력 처리)
memberInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addMember();
  }
});

addMemberBtn.addEventListener('click', addMember);

// 태그 삭제 처리 (이벤트 위임)
memberTagsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('tag-remove')) {
    const index = parseInt(e.target.getAttribute('data-index'), 10);
    members.splice(index, 1);
    renderMembers();
  }
});

// 폼 제출
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!title) {
    alert('모임 제목을 입력해주세요.');
    return;
  }
  if (!startDate || !endDate) {
    alert('날짜 범위를 선택해주세요.');
    return;
  }
  if (startDate > endDate) {
    alert('종료일은 시작일보다 같거나 늦어야 합니다.');
    return;
  }

  // 로딩 상태 표시
  const originalBtnText = createBtn.textContent;
  createBtn.textContent = '생성 중...';
  createBtn.disabled = true;

  try {
    const eventData = {
      title,
      description,
      startDate,
      endDate,
      members,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'events'), eventData);
    
    // 생성 완료 후 이벤트 페이지로 이동
    window.location.href = `event.html?id=${docRef.id}`;
  } catch (error) {
    console.error('Error adding document: ', error);
    alert('모임 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    createBtn.textContent = originalBtnText;
    createBtn.disabled = false;
  }
});
