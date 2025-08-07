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

// Global state\let albumsData = [];
const filters = { startDate: null, endDate: null, sortKey: 'release_date', sortOrder: 'asc', year: null, month: null };

// UI element refs
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
  const controls = document.createElement('div');
  controls.id = 'controls';
  controls.style.margin = '20px 0';
  controls.innerHTML = `
    <label>시작일:<input type="date" id="filter-start" /></label>
    <label>종료일:<input type="date" id="filter-end" /></label>
    <select id="sort-select">
      <option value="release_date:asc">발매일 ↑</option>
      <option value="release_date:desc">발매일 ↓</option>
      <option value="artist_name:asc">아티스트 A→Z</option>
      <option value="artist_name:desc">아티스트 Z→A</option>
    </select>
    <select id="year-select"></select>
    <select id="month-select"></select>
  `;
  document.body.prepend(controls);

  document.getElementById('filter-start').addEventListener('change', handleDateChange);
  document.getElementById('filter-end').addEventListener('change', handleDateChange);
  document.getElementById('sort-select').addEventListener('change', handleSortChange);
  document.getElementById('year-select').addEventListener('change', handleYearMonthChange);
  document.getElementById('month-select').addEventListener('change', handleYearMonthChange);
}

/** Populate year/month selects */
function populateYearMonthSelects() {
  const years = new Set(), months = new Set();
  albumsData.forEach(a => {
    const d = new Date(a.release_date);
    if (!isNaN(d)) {
      years.add(d.getFullYear());
      months.add(d.getMonth());
    }
  });
  const ys = document.getElementById('year-select');
  const ms = document.getElementById('month-select');
  ys.innerHTML = '<option value="">연도</option>';
  ms.innerHTML = '<option value="">월</option>';
  [...years].sort().forEach(y => {
    ys.appendChild(new Option(`${y}년`, y));
  });
  [...Array(12).keys()].forEach(m => {
    ms.appendChild(new Option(`${m+1}월`, m));
  });
}

// Filter & sort handlers
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
  const m = document.getElementById('month-select').value;
  filters.year = y !== '' ? +y : null;
  filters.month = m !== '' ? +m : null;
  updateView();
}

/** Apply filters & sorting */
function filterAndSortAlbums() {
  let items = albumsData.slice();
  if (filters.startDate) items = items.filter(a => new Date(a.release_date) >= filters.startDate);
  if (filters.endDate)   items = items.filter(a => new Date(a.release_date) <= filters.endDate);
  if (filters.year!==null)  items = items.filter(a => new Date(a.release_date).getFullYear()===filters.year);
  if (filters.month!==null) items = items.filter(a => new Date(a.release_date).getMonth()===filters.month);
  items.sort((a,b)=>{
    if (filters.sortKey==='release_date') {
      return filters.sortOrder==='asc'
        ? new Date(a.release_date)-new Date(b.release_date)
        : new Date(b.release_date)-new Date(a.release_date);
    } else {
      return filters.sortOrder==='asc'
        ? a.artist_name.localeCompare(b.artist_name)
        : b.artist_name.localeCompare(a.artist_name);
    }
  });
  return items;
}

/** Rerender views */
function updateView() {
  const items = filterAndSortAlbums();
  renderCalendar(items);
  renderList(items);
}

/** Render month grid calendar */
function renderCalendar(albums) {
  calendarContainer.innerHTML = '';
  let year=filters.year, month=filters.month;
  if (year===null||month===null) {
    const ds = albums.map(a=>new Date(a.release_date)).filter(d=>!isNaN(d));
    if (ds.length) {
      const e = ds.reduce((p,c)=>p<c?p:c);
      year=e.getFullYear(); month=e.getMonth();
    } else {
      const n=new Date(); year=n.getFullYear(); month=n.getMonth();
    }
  }
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const grid=document.createElement('div'); grid.className='calendar-grid';
  for(let i=0;i<firstDay;i++) grid.appendChild(document.createElement('div'));
  for(let d=1;d<=daysInMonth;d++){const cell=document.createElement('div');cell.className='calendar-cell';
    const hd=document.createElement('div');hd.className='day-header';hd.textContent=d;cell.appendChild(hd);
    albums.filter(a=>{const dd=new Date(a.release_date);return dd.getFullYear()===year&&dd.getMonth()===month&&dd.getDate()===d;})
      .forEach(album=>{
        const c=document.createElement('div');c.className='calendar-album';
        c.innerHTML=`<img src="${album.cover_url}"/><p>${album.artist_name}</p><p>${album.album_name}</p>`;
        c.onclick=()=>openPopup(album);
        cell.appendChild(c);
      });
    grid.appendChild(cell);
  }
  calendarContainer.appendChild(grid);
}

/** Render list view */
function renderList(albums) {
  listContainer.innerHTML='';
  albums.forEach(a=>{
    const it=document.createElement('div');it.className='album-item';
    it.innerHTML=`<img src="${a.cover_url}"/><div class="details"><p>${a.artist_name}</p><p>${a.album_name}</p><p>${a.release_date}</p></div>`;
    it.onclick=()=>openPopup(a);
    listContainer.appendChild(it);
  });
}

/** Popup unchanged */
function openPopup(album){ /* ... existing code ... */ }
function loadComments(id){ /* ... existing code ... */ }
popupClose.onclick=()=>popup.classList.add('hidden');

// Initialize controls & Firebase subscription
createControls();
const albumsRef = ref(db,'albums');
onValue(albumsRef,snap=>{ albumsData=Object.entries(snap.val()||{}).map(([id,info])=>({id,...info})); populateYearMonthSelects(); updateView(); });
