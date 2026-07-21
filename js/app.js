import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const form = document.getElementById('create-form');
const titleInput = document.getElementById('event-title');
const descInput = document.getElementById('event-description');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const memberInput = document.getElementById('member-input');
const addMemberBtn = document.getElementById('add-member-btn');
const memberTagsContainer = document.getElementById('member-tags');
const createBtn = document.getElementById('create-btn');

let members = [];

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
