import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Global state
let albumsData = [];
// Default to current month
const now = new Date();
const filters = {
  startDate: null,
  endDate: null,
  sortKey: 'release_date',
  sortOrder: 'asc',
  // Initialize view to current month
  year: now.getFullYear(),
  month: now.getMonth()
};

// UI element references
const calendarContainer = document.getElementById('calendar-container');
const listContainer = document.getElementById('list-container');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');
const popupClose = document.getElementById('popup-close');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentNick = document.getElementById('comment-nick');
const commentText = document.getElementById('comment-text');

/** Create filter, sort, and date controls */
function createControls() {
  const controls = document.getElementById('controls') || document.createElement('div');
  controls.id = 'controls';
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.justifyContent = 'space-between';
  controls.style.margin = '20px';
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
    filters.month -= 1;
    if (filters.month < 0) { filters.month = 11; filters.year -= 1; }
    updateMonthLabel();
    updateView();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    filters.month += 1;
    if (filters.month > 11) { filters.month = 0; filters.year += 1; }
    updateMonthLabel();
    updateView();
  });
  document.getElementById('sort-select').addEventListener('change', handleSortChange);

  updateMonthLabel();
}

/** Update month label in controls */
function updateMonthLabel() {
  const lbl = document.getElementById('month-label');
  lbl.textContent = `${filters.year}년 ${filters.month+1}월`;
}
  document.getElementById('filter-start').addEventListener('change', handleDateChange);
  document.getElementById('filter-end').addEventListener('change', handleDateChange);
  document.getElementById('sort-select').addEventListener('change', handleSortChange);
  document.getElementById('year-select').addEventListener('change', handleYearMonthChange);
  document.getElementById('month-select').addEventListener('change', handleYearMonthChange);
}

/** Populate year/month selects based on albumsData */
function populateYearMonthSelects() {
  const years = new Set();
  albumsData.forEach(a => {
    const d = new Date(a.release_date);
    if (!isNaN(d)) years.add(d.getFullYear());
  });
  const ys = document.getElementById('year-select');
  ys.innerHTML = '<option value="">연도</option>';
  [...years].sort().forEach(y => {
    ys.appendChild(new Option(`${y}년`, y));
  });
  const ms = document.getElementById('month-select');
  ms.innerHTML = '<option value="">월</option>';
  [...Array(12).keys()].forEach(m => {
    ms.appendChild(new Option(`${m+1}월`, m));
  });
}

// Handlers
function handleDateChange() {
  filters.startDate = document.getElementById('filter-start').valueAsDate;
  filters.endDate = document.getElementById('filter-end').valueAsDate;
  updateView();
}
function handleSortChange(e) {
  [filters.sortKey, filters.sortOrder] = e.target.value.split(':');
  updateView();
}
function handleYearMonthChange() {
  const y = document.getElementById('year-select').value;
  filters.year = y ? +y : null;
  const m = document.getElementById('month-select').value;
  filters.month = m ? +m : null;
  updateView();
}

// Filter & sort logic
function filterAndSortAlbums() {
  let items = albumsData.slice();
  if (filters.startDate) items = items.filter(a => new Date(a.release_date) >= filters.startDate);
  if (filters.endDate)   items = items.filter(a => new Date(a.release_date) <= filters.endDate);
  if (filters.year !== null)  items = items.filter(a => new Date(a.release_date).getFullYear() === filters.year);
  if (filters.month !== null) items = items.filter(a => new Date(a.release_date).getMonth() === filters.month);
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

// Update views
function updateView() {
  const data = filterAndSortAlbums();
  renderCalendar(data);
  renderList(data);
}

// Calendar rendering
function renderCalendar(albums) {
  calendarContainer.innerHTML = '';
  let year = filters.year;
  let month = filters.month;
  if (year === null || month === null) {
    const dates = albums.map(a => new Date(a.release_date)).filter(d => !isNaN(d));
    if (dates.length) {
      const min = dates.reduce((p, c) => p < c ? p : c);
      year = min.getFullYear();
      month = min.getMonth();
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }
  }
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = d;
    cell.appendChild(header);
    albums.filter(a => {
      const dt = new Date(a.release_date);
      return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === d;
    }).forEach(album => {
      const c = document.createElement('div');
      c.className = 'calendar-album';
      c.innerHTML = `<img src="${album.cover_url}" alt="${album.album_name}" /><p>${album.artist_name}</p><p>${album.album_name}</p>`;
      c.addEventListener('click', () => openPopup(album));
      cell.appendChild(c);
    });
    grid.appendChild(cell);
  }
  calendarContainer.appendChild(grid);
}

// List rendering
function renderList(albums) {
  listContainer.innerHTML = '';
  albums.forEach(album => {
    const item = document.createElement('div');
    item.className = 'album-item';
    item.innerHTML = `<img src="${album.cover_url}" alt="${album.album_name}" /><div class="details"><p>${album.artist_name}</p><p>${album.album_name}</p><p>${album.release_date}</p></div>`;
    item.addEventListener('click', () => openPopup(album));
    listContainer.appendChild(item);
  });
}

// Popup & comments unchanged
function openPopup(album) { /* existing code */ }
function loadComments(id) { /* existing code */ }
popupClose.addEventListener('click', () => popup.classList.add('hidden'));

// Bootstrap
createControls();
const albumsRef = ref(db, 'albums');
onValue(albumsRef, snapshot => {
  albumsData = Object.entries(snapshot.val() || {}).map(([id, info]) => ({ id, ...info }));
  populateYearMonthSelects();
  updateView();
});
