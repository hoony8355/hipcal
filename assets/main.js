import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBcVDYroDuZaLkD6huOdNQ-pmOg5XPbOCg",
  authDomain: "hipcal.firebaseapp.com",
  databaseURL: "https://hipcal-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hipcal",
  storageBucket: "hipcal.appspot.com",
  messagingSenderId: "952594005777",
  appId: "1:952594005777:web:ef36d84e367401e4e056b0",
  measurementId: "G-3MNPCZEPN9"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 전역 상태
let albumsData = [];
const now = new Date();
const filters = {
  sortKey: 'release_date',
  sortOrder: 'asc',
  year: now.getFullYear(),
  month: now.getMonth()
};

// UI 참조
const calendarContainer = document.getElementById('calendar-container');
const listContainer     = document.getElementById('list-container');
const popup             = document.getElementById('popup');
const popupBody         = document.getElementById('popup-body');
const popupClose        = document.getElementById('popup-close');
const commentsList      = document.getElementById('comments-list');
const commentForm       = document.getElementById('comment-form');
const commentNick       = document.getElementById('comment-nick');
const commentText       = document.getElementById('comment-text');

// 컨트롤 생성
function createControls() {
  const controls = document.getElementById('controls') || document.createElement('div');
  controls.id = 'controls';
  controls.className = 'controls-container';
  controls.innerHTML = `
    <div>
      <button id="prev-month">◀</button>
      <span id="month-label"></span>
      <button id="next-month">▶</button>
    </div>
    <div>
      <select id="sort-select">
        <option value="release_date:asc">발매일 ↑</option>
        <option value="release_date:desc">발매일 ↓</option>
        <option value="artist_name:asc">아티스트 A→Z</option>
        <option value="artist_name:desc">아티스트 Z→A</option>
      </select>
    </div>
  `;
  if (!document.getElementById('controls')) {
    document.body.prepend(controls);
  }

  document.getElementById('prev-month').addEventListener('click', () => {
    filters.month--;
    if (filters.month < 0) {
      filters.month = 11;
      filters.year--;
    }
    updateMonthLabel();
    updateView();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    filters.month++;
    if (filters.month > 11) {
      filters.month = 0;
      filters.year++;
    }
    updateMonthLabel();
    updateView();
  });
  document.getElementById('sort-select').addEventListener('change', handleSortChange);

  updateMonthLabel();
}

// 월 레이블 갱신
function updateMonthLabel() {
  const lbl = document.getElementById('month-label');
  lbl.textContent = `${filters.year}년 ${filters.month + 1}월`;
}

// 정렬 핸들러
function handleSortChange(e) {
  [filters.sortKey, filters.sortOrder] = e.target.value.split(':');
  updateView();
}

// 필터 & 정렬 적용
function filterAndSortAlbums() {
  let items = albumsData.slice();
  // 연월 필터
  items = items.filter(a => {
    const d = new Date(a.release_date);
    return d.getFullYear() === filters.year && d.getMonth() === filters.month;
  });
  // 정렬
  items.sort((a, b) => {
    if (filters.sortKey === 'release_date') {
      return filters.sortOrder === 'asc'
        ? new Date(a.release_date) - new Date(b.release_date)
        : new Date(b.release_date) - new Date(a.release_date);
    } else {
      return filters.sortOrder === 'asc'
        ? a.artist_name.localeCompare(b.artist_name)
        : b.artist_name.localeCompare(a.artist_name);
    }
  });
  return items;
}

// 뷰 업데이트
function updateView() {
  const items = filterAndSortAlbums();
  renderCalendar(items);
  renderList(items);
}

// 달력 렌더링
function renderCalendar(albums) {
  calendarContainer.innerHTML = '';
  const firstDay = new Date(filters.year, filters.month, 1).getDay();
  const daysInMonth = new Date(filters.year, filters.month + 1, 0).getDate();
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  // 빈 칸 채우기
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }
  // 날짜 칸
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const hd = document.createElement('div');
    hd.className = 'day-header';
    hd.textContent = d;
    cell.appendChild(hd);
    // 발매된 앨범
    albums.filter(a => {
      const dt = new Date(a.release_date);
      return dt.getFullYear() === filters.year
          && dt.getMonth() === filters.month
          && dt.getDate() === d;
    }).forEach(album => {
      const c = document.createElement('div');
      c.className = 'calendar-album';
      c.innerHTML = `
        <img src="${album.cover_url}" alt="${album.album_name}" />
        <p>${album.album_name}</p>
      `;
      c.addEventListener('click', () => openPopup(album));
      cell.appendChild(c);
    });
    grid.appendChild(cell);
  }
  calendarContainer.appendChild(grid);
}

// 리스트 렌더링
function renderList(albums) {
  listContainer.innerHTML = '';
  albums.forEach(album => {
    const item = document.createElement('div');
    item.className = 'album-item';
    item.innerHTML = `
      <img src="${album.cover_url}" alt="${album.album_name}" />
      <div class="details">
        <p>${album.artist_name}</p>
        <p>${album.album_name}</p>
        <p class="date">${album.release_date}</p>
      </div>
    `;
    item.addEventListener('click', () => openPopup(album));
    listContainer.appendChild(item);
  });
}

// 팝업 & 댓글 (이전 코드 재사용)
function openPopup(album) {
  popupBody.innerHTML = `
    <img src="${album.cover_url}" alt="${album.album_name}" />
    <h3>${album.artist_name} - ${album.album_name}</h3>
    <p class="date">발매일: ${album.release_date}</p>
    ${album.youtube_url ? `<p><a href="${album.youtube_url}" target="_blank">YouTube 듣기</a></p>` : ''}
  `;
  commentsList.innerHTML = '';
  commentForm.onsubmit = e => {
    e.preventDefault();
    push(ref(db, `comments/${album.id}`), {
      nickname: commentNick.value.trim(),
      content : commentText.value.trim(),
      created_at: serverTimestamp()
    }).then(() => {
      commentNick.value = '';
      commentText.value = '';
    });
  };
  popup.classList.remove('hidden');
  loadComments(album.id);
}
function loadComments(id) {
  onValue(ref(db, `comments/${id}`), snap => {
    commentsList.innerHTML = '';
    snap.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.innerHTML = `<strong>${c.val().nickname}</strong>: ${c.val().content}`;
      commentsList.appendChild(div);
    });
  });
}
popupClose.addEventListener('click', () => popup.classList.add('hidden'));

// 초기화
createControls();
onValue(ref(db, 'albums'), snapshot => {
  albumsData = Object.entries(snapshot.val() || {}).map(([id, info]) => ({ id, ...info }));
  updateView();
});
