export class Calendar {
  /**
   * @param {HTMLElement} container - 달력을 렌더링할 DOM 요소
   * @param {Object} options
   * @param {'heatmap'|'input'} options.mode - 히트맵(결과) 또는 입력 모드
   * @param {string} options.startDate - 이벤트 시작일 'YYYY-MM-DD'
   * @param {string} options.endDate - 이벤트 종료일 'YYYY-MM-DD'
   * @param {Function} options.onDateClick - (date, newState) => {} (input 모드 전용)
   */
  constructor(container, options) {
    this.container = container;
    this.mode = options.mode;
    this.startDate = new Date(options.startDate);
    this.endDate = new Date(options.endDate);
    this.onDateClick = options.onDateClick;

    // 시간을 00:00:00으로 초기화
    this.startDate.setHours(0, 0, 0, 0);
    this.endDate.setHours(0, 0, 0, 0);

    // 현재 렌더링 중인 월
    this.currentMonth = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);

    // 상태 저장 객체
    this.heatmapData = {}; // { 'YYYY-MM-DD': { available: [], unavailable: [] } }
    this.inputData = {}; // { 'YYYY-MM-DD': 'available' | 'unavailable' }

    // 입력 모드: 현재 선택 중인 상태 ('available' 또는 'unavailable')
    this.currentMode = 'available';

    // 툴팁 요소 생성
    if (this.mode === 'heatmap') {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tooltip';
      document.body.appendChild(this.tooltip);

      // 모바일 등을 위한 외부 클릭 시 툴팁 숨김
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.calendar-cell')) {
          this.hideTooltip();
        }
      });
    }

    this.render();
  }

  // YYYY-MM-DD 문자열 생성 유틸
  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 달력 렌더링
  render() {
    this.container.innerHTML = '';

    const nav = document.createElement('div');
    nav.className = 'calendar-nav';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀';
    prevBtn.onclick = () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
      this.render();
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '▶';
    nextBtn.onclick = () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
      this.render();
    };

    const title = document.createElement('h3');
    title.textContent = `${this.currentMonth.getFullYear()}년 ${this.currentMonth.getMonth() + 1}월`;

    nav.appendChild(prevBtn);
    nav.appendChild(title);
    nav.appendChild(nextBtn);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    // 요일 헤더
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      grid.appendChild(dayHeader);
    });

    // 달력 날짜 채우기
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = firstDay.getDay(); // 0(일) ~ 6(토)
    
    // 빈 셀 (이전 달)
    for (let i = 0; i < startOffset; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell outside';
      grid.appendChild(cell);
    }

    // 날짜 셀
    for (let date = 1; date <= lastDay.getDate(); date++) {
      const cellDate = new Date(year, month, date);
      const dateStr = this.formatDate(cellDate);
      
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      
      // 날짜 범위 확인
      if (cellDate < this.startDate || cellDate > this.endDate) {
        cell.classList.add('disabled');
      }

      cell.dataset.date = dateStr;

      const dateEl = document.createElement('div');
      dateEl.className = 'cell-date';
      dateEl.textContent = date;
      cell.appendChild(dateEl);

      const bodyEl = document.createElement('div');
      bodyEl.className = 'cell-body';
      
      if (this.mode === 'heatmap') {
        const availableEl = document.createElement('div');
        availableEl.className = 'cell-available';
        const unavailableEl = document.createElement('div');
        unavailableEl.className = 'cell-unavailable';
        
        bodyEl.appendChild(availableEl);
        bodyEl.appendChild(unavailableEl);

        // 툴팁 이벤트
        cell.addEventListener('mouseenter', (e) => this.showTooltip(e, dateStr));
        cell.addEventListener('mouseleave', () => this.hideTooltip());
        // 모바일 지원 (클릭)
        cell.addEventListener('click', (e) => {
          e.stopPropagation(); // document 클릭 차단
          this.showTooltip(e, dateStr);
        });
      } else { // input 모드
        const statusEl = document.createElement('div');
        statusEl.className = 'cell-status';
        bodyEl.appendChild(statusEl);
        
        cell.classList.add('input-mode');
        cell.addEventListener('click', () => this.handleCellClick(dateStr));
      }

      cell.appendChild(bodyEl);
      grid.appendChild(cell);
    }

    this.container.appendChild(nav);
    this.container.appendChild(grid);

    // 렌더링 후 상태 반영
    if (this.mode === 'heatmap') {
      this.applyHeatmap();
    } else {
      this.applyInputSelections();
    }
  }

  // --- Heatmap 관련 메서드 ---

  updateHeatmap(data) {
    this.heatmapData = data;
    this.applyHeatmap();
  }

  applyHeatmap() {
    if (this.mode !== 'heatmap') return;
    
    const cells = this.container.querySelectorAll('.calendar-cell:not(.outside):not(.disabled)');
    
    // 전체 참가자 수를 계산하여 투명도 기준을 정할 수 있음
    // 여기서는 최대 10명을 1.0으로 가정하거나 상대적으로 계산 가능
    // 단순히 인원수를 렌더링
    
    cells.forEach(cell => {
      const dateStr = cell.dataset.date;
      const data = this.heatmapData[dateStr] || { available: [], unavailable: [] };
      
      const avCount = data.available.length;
      const unCount = data.unavailable.length;
      
      const avEl = cell.querySelector('.cell-available');
      const unEl = cell.querySelector('.cell-unavailable');
      
      avEl.textContent = avCount > 0 ? avCount : '';
      unEl.textContent = unCount > 0 ? unCount : '';
      
      // 투명도/배경 설정 (최대값을 알 수 없으므로 1명 이상이면 진해지도록 단순화)
      if (avCount > 0) {
        // 인원에 따라 투명도 조절 (예: 1명=0.3, 5명이상=1.0)
        const opacity = Math.min(0.2 + (avCount * 0.15), 1.0);
        avEl.style.background = `rgba(46,125,50, ${opacity})`;
        avEl.style.color = 'white';
      } else {
        avEl.style.background = '#f1f8e9';
        avEl.style.color = '#aaa';
      }

      if (unCount > 0) {
        const opacity = Math.min(0.2 + (unCount * 0.15), 1.0);
        unEl.style.background = `rgba(198,40,40, ${opacity})`;
        unEl.style.color = 'white';
      } else {
        unEl.style.background = '#fce4ec';
        unEl.style.color = '#aaa';
      }
    });
  }

  showTooltip(e, dateStr) {
    if (this.mode !== 'heatmap') return;
    if (e.currentTarget.classList.contains('disabled')) return;
    
    const data = this.heatmapData[dateStr] || { available: [], unavailable: [] };
    if (data.available.length === 0 && data.unavailable.length === 0) return;

    let html = '';
    
    if (data.available.length > 0) {
      html += `
        <div class="tooltip-section">
          <div class="tooltip-label available">가능 (${data.available.length}명)</div>
          <div class="tooltip-names">${data.available.join(', ')}</div>
        </div>
      `;
    }
    
    if (data.unavailable.length > 0) {
      html += `
        <div class="tooltip-section">
          <div class="tooltip-label unavailable">불가 (${data.unavailable.length}명)</div>
          <div class="tooltip-names">${data.unavailable.join(', ')}</div>
        </div>
      `;
    }

    this.tooltip.innerHTML = html;
    this.tooltip.classList.add('visible');

    // 툴팁 위치 조정
    const rect = e.currentTarget.getBoundingClientRect();
    let left = rect.left + window.scrollX + (rect.width / 2) - (this.tooltip.offsetWidth / 2);
    let top = rect.top + window.scrollY - this.tooltip.offsetHeight - 10;

    // 화면 밖으로 나가는 것 방지
    if (top < 10) top = rect.bottom + window.scrollY + 10; // 아래로 표시
    if (left < 10) left = 10;

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
  }

  // --- Input 관련 메서드 ---

  /**
   * 현재 입력 모드를 설정 ('available' 또는 'unavailable')
   * — 이후 날짜를 클릭하면 해당 모드로 적용됨
   */
  setMode(mode) {
    this.currentMode = mode;
  }

  handleCellClick(dateStr) {
    if (this.mode !== 'input') return;

    const currentState = this.inputData[dateStr];

    // 같은 모드로 이미 선택되어 있으면 → 해제 (토글)
    // 다른 모드이거나 미선택이면 → 현재 모드로 적용
    if (currentState === this.currentMode) {
      delete this.inputData[dateStr];
    } else {
      this.inputData[dateStr] = this.currentMode;
    }

    this.applyInputSelections();

    if (this.onDateClick) {
      this.onDateClick(dateStr, this.inputData[dateStr] || null);
    }
  }

  /**
   * 이벤트 범위 내 모든 평일(월~금)을 불가로 설정
   * — 직장인을 위한 일괄 선택 기능
   */
  setWeekdaysUnavailable() {
    const current = new Date(this.startDate);
    while (current <= this.endDate) {
      const day = current.getDay(); // 0=일, 6=토
      if (day >= 1 && day <= 5) { // 월~금
        this.inputData[this.formatDate(current)] = 'unavailable';
      }
      current.setDate(current.getDate() + 1);
    }
    this.applyInputSelections();
  }

  /**
   * 모든 선택을 초기화
   */
  clearAll() {
    this.inputData = {};
    this.applyInputSelections();
  }

  setSelections(available, unavailable) {
    this.inputData = {};
    available.forEach(date => this.inputData[date] = 'available');
    unavailable.forEach(date => this.inputData[date] = 'unavailable');
    this.applyInputSelections();
  }

  getSelections() {
    const available = [];
    const unavailable = [];
    
    for (const [date, state] of Object.entries(this.inputData)) {
      if (state === 'available') available.push(date);
      if (state === 'unavailable') unavailable.push(date);
    }
    
    return { available, unavailable };
  }

  applyInputSelections() {
    if (this.mode !== 'input') return;

    const cells = this.container.querySelectorAll('.calendar-cell:not(.outside):not(.disabled)');
    
    cells.forEach(cell => {
      const dateStr = cell.dataset.date;
      const state = this.inputData[dateStr];
      const statusEl = cell.querySelector('.cell-status');
      
      // 클래스 초기화
      cell.classList.remove('selected-available', 'selected-unavailable');
      
      if (state === 'available') {
        cell.classList.add('selected-available');
        statusEl.textContent = '가능';
      } else if (state === 'unavailable') {
        cell.classList.add('selected-unavailable');
        statusEl.textContent = '불가';
      } else {
        statusEl.textContent = '';
      }
    });
  }
}
