import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase config
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

// UI element references
const calendarContainer = document.getElementById("calendar-container");
const listContainer    = document.getElementById("list-container");
const popup     = document.getElementById("popup");
const popupBody = document.getElementById("popup-body");
const popupClose = document.getElementById("popup-close");
const commentsList = document.getElementById("comments-list");
const commentForm  = document.getElementById("comment-form");
const commentNick  = document.getElementById("comment-nick");
const commentText  = document.getElementById("comment-text");

// global state
let albumsData = []; // raw data from Firebase
const filters = {
  startDate: null,
  endDate: null,
  sortKey: "release_date",
  sortOrder: "asc",
  year: null,
  month: null
};

/** Set up filter and sort controls dynamically */
function createControls() {
  const controls = document.createElement("div");
  controls.id = "controls";
  controls.style.margin = "20px 0";
  controls.innerHTML = `
    <label>시작일: <input type="date" id="filter-start" /></label>
    <label>종료일: <input type="date" id="filter-end" /></label>
    <select id="sort-select">
      <option value="release_date:asc">발매일 오름차순</option>
      <option value="release_date:desc">발매일 내림차순</option>
      <option value="artist_name:asc">아티스트명 A→Z</option>
      <option value="artist_name:desc">아티스트명 Z→A</option>
    </select>
    <select id="year-select"></select>
    <select id="month-select"></select>
  `;
  document.body.insertBefore(controls, calendarContainer);

  // Populate year/month selects based on existing data when loaded
  populateYearMonthSelects();

  document.getElementById("filter-start").addEventListener("change", handleDateChange);
  document.getElementById("filter-end").addEventListener("change", handleDateChange);
  document.getElementById("sort-select").addEventListener("change", handleSortChange);
  document.getElementById("year-select").addEventListener("change", handleYearMonthChange);
  document.getElementById("month-select").addEventListener("change", handleYearMonthChange);
}

/** Populate year and month dropdowns from album data */
function populateYearMonthSelects() {
  const years = new Set();
  const months = new Set();
  albumsData.forEach((a) => {
    const d = new Date(a.release_date);
    if (!isNaN(d)) {
      years.add(d.getFullYear());
      months.add(d.getMonth());
    }
  });
  const yearSelect = document.getElementById("year-select");
  const monthSelect = document.getElementById("month-select");
  if (!yearSelect || !monthSelect) return;
  // clear previous
  yearSelect.innerHTML = "<option value=\"\">연도 선택</option>";
  monthSelect.innerHTML = "<option value=\"\">월 선택</option>";
  [...years].sort().forEach((yr) => {
    const opt = document.createElement("option");
    opt.value = yr;
    opt.textContent = `${yr}년`;
    yearSelect.appendChild(opt);
  });
  [...Array(12).keys()].forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = `${m + 1}월`;
    monthSelect.appendChild(opt);
  });
}

/** Handler for start/end date filters */
function handleDateChange() {
  const startInput = document.getElementById("filter-start");
  const endInput   = document.getElementById("filter-end");
  filters.startDate = startInput.value ? new Date(startInput.value) : null;
  filters.endDate   = endInput.value   ? new Date(endInput.value)   : null;
  updateView();
}

/** Handler for sort select */
function handleSortChange(e) {
  const value = e.target.value;
  const [key, order] = value.split(":");
  filters.sortKey = key;
  filters.sortOrder = order;
  updateView();
}

/** Handler for year/month select */
function handleYearMonthChange() {
  const yearSel  = document.getElementById("year-select").value;
  const monthSel = document.getElementById("month-select").value;
  filters.year  = yearSel ? parseInt(yearSel, 10) : null;
  filters.month = monthSel ? parseInt(monthSel, 10) : null;
  updateView();
}

/** Filter and sort albums based on current filters */
function filterAndSortAlbums() {
  let items = albumsData.slice();
  // date range filter
  if (filters.startDate) {
    items = items.filter((a) => new Date(a.release_date) >= filters.startDate);
  }
  if (filters.endDate) {
    items = items.filter((a) => new Date(a.release_date) <= filters.endDate);
  }
  // year/month filter
  if (filters.year !== null) {
    items = items.filter((a) => new Date(a.release_date).getFullYear() === filters.year);
  }
  if (filters.month !== null) {
    items = items.filter((a) => new Date(a.release_date).getMonth() === filters.month);
  }
  // sorting
  const { sortKey, sortOrder } = filters;
  items.sort((a, b) => {
    if (sortKey === "release_date") {
      const da = new Date(a.release_date);
      const db = new Date(b.release_date);
      return sortOrder === "asc" ? da - db : db - da;
    } else if (sortKey === "artist_name") {
      const nameA = a.artist_name.toLowerCase();
      const nameB = b.artist_name.toLowerCase();
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    return 0;
  });
  return items;
}

/** Update both calendar and list views */
function updateView() {
  const filtered = filterAndSortAlbums();
  renderCalendar(filtered);
  renderList(filtered);
}

/** Render calendar as month grid */
function renderCalendar(albums) {
  calendarContainer.innerHTML = "";
  // Determine current year/month: from filter; fallback to earliest album date or current date
  let year = filters.year;
  let month = filters.month;
  if (year === null || month === null) {
    const dates = albums.map((a) => new Date(a.release_date));
    if (dates.length) {
      const earliest = dates.reduce((p, c) => (p < c ? p : c));
      year = earliest.getFullYear();
      month = earliest.getMonth();
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }
  }
  // Month info
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Grid container
  const grid = document.createElement("div");
  grid.className = "calendar-grid"; // CSS: display:grid; grid-template-columns: repeat(7, 1fr); gap:4px;
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    const dayHeader = document.createElement("div");
    dayHeader.className = "day-header";
    dayHeader.textContent = day;
    cell.appendChild(dayHeader);
    const dayAlbums = albums.filter((a) => {
      const d = new Date(a.release_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    dayAlbums.forEach((album) => {
      const card = document.createElement("div");
      card.className = "calendar-album";
      card.innerHTML = `
        <img src="${album.cover_url}" alt="${album.album_name}" />
        <p>${album.artist_name}</p>
        <p>${album.album_name}</p>
      `;
      card.addEventListener("click", () => openPopup(album));
      cell.appendChild(card);
    });
    grid.appendChild(cell);
  }
  calendarContainer.appendChild(grid);
}

/** Render list with current filters applied */
function renderList(albums) {
  listContainer.innerHTML = "";
  albums.forEach((album) => {
    const item = document.createElement("div");
    item.className = "album-item";
    item.innerHTML = `
      <img src="${album.cover_url}" alt="${album.album_name}" />
      <div class="details">
        <p>${album.artist_name}</p>
        <p>${album.album_name}</p>
        <p>${album.release_date}</p>
      </div>
    `;
    item.addEventListener("click", () => openPopup(album));
    listContainer.appendChild(item);
  });
}

/** Popup logic (unchanged) */
function openPopup(album) {
  popupBody.innerHTML = `
    <img src="${album.cover_url}" alt="${album.album_name}" />
    <h3>${album.artist_name} - ${album.album_name}</h3>
    <p>발매일: ${album.release_date}</p>
    ${album.youtube_url ? `<p><a href="${album.youtube_url}" target="_blank">유튜브 미리보기</a></p>` : ""}
  `;
  commentsList.innerHTML = "";
  loadComments(album.id);

  commentForm.onsubmit = (e) => {
    e.preventDefault();
    const newComment = {
      nickname: commentNick.value.trim(),
      content: commentText.value.trim(),
      created_at: serverTimestamp()
    };
    push(ref(db, `comments/${album.id}`), newComment)
      .then(() => {
        commentNick.value = "";
        commentText.value = "";
      })
      .catch((err) => console.error("댓글 등록 오류:", err));
  };

  popup.classList.remove("hidden");
}

function loadComments(albumId) {
  const commentsRef = ref(db, `comments/${albumId}`);
  onValue(commentsRef, (snap) => {
    commentsList.innerHTML = "";
    snap.forEach((child) => {
      const { nickname, content } = child.val();
      const div = document.createElement("div");
      div.className = "comment-item";
      div.innerHTML = `<p><strong>${nickname}</strong>: ${content}</p>`;
      commentsList.appendChild(div);
    });
  });
}

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

// Initialize controls once at startup
createControls();

// Listen to albums in Firebase
const albumsRef = ref(db, "albums");
onValue(albumsRef, (snapshot) => {
  const data = snapshot.val() || {};
  albumsData = Object.entries(data).map(([id, info]) => ({ id, ...info }));
  populateYearMonthSelects(); // refresh options when data changes
  updateView();
});
