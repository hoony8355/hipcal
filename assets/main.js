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

// UI elements
const calendarContainer = document.getElementById('calendar-container');
const listContainer = document.getElementById('list-container');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');
const popupClose = document.getElementById('popup-close');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentNick = document.getElementById('comment-nick');
const commentText = document.getElementById('comment-text');

// Listen to album changes
const albumsRef = ref(db, 'albums');
onValue(albumsRef, (snapshot) => {
  const data = snapshot.val() || {};
  const albums = Object.entries(data).map(([id, info]) => ({ id, ...info }));
  renderCalendar(albums);
  renderList(albums);
});

// Render calendar
function renderCalendar(albums) {
  calendarContainer.innerHTML = '';
  albums.forEach(album => {
    const card = document.createElement('div');
    card.className = 'album-card';
    card.innerHTML = `
      <img src="${album.cover_url}" alt="${album.album_name}" />
      <p>${album.artist_name}</p>
      <p>${album.album_name}</p>
      <p>${album.release_date}</p>
    `;
    card.addEventListener('click', () => openPopup(album));
    calendarContainer.appendChild(card);
  });
}

// Render list
function renderList(albums) {
  listContainer.innerHTML = '';
  const sorted = albums.slice().sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
  sorted.forEach(album => {
    const item = document.createElement('div');
    item.className = 'album-item';
    item.innerHTML = `
      <img src="${album.cover_url}" alt="${album.album_name}" />
      <div class="details">
        <p>${album.artist_name}</p>
        <p>${album.album_name}</p>
        <p>${album.release_date}</p>
      </div>
    `;
    item.addEventListener('click', () => openPopup(album));
    listContainer.appendChild(item);
  });
}

// Open popup
function openPopup(album) {
  popupBody.innerHTML = `
    <img src="${album.cover_url}" alt="${album.album_name}" />
    <h3>${album.artist_name} - ${album.album_name}</h3>
    <p>발매일: ${album.release_date}</p>
    ${album.youtube_url ? `<p><a href="${album.youtube_url}" target="_blank">유튜브 미리보기</a></p>` : ''}
  `;
  commentsList.innerHTML = '';
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
        commentNick.value = '';
        commentText.value = '';
      })
      .catch(err => console.error('댓글 등록 오류:', err));
  };

  popup.classList.remove('hidden');
}

// Load comments
function loadComments(albumId) {
  const commentsRef = ref(db, `comments/${albumId}`);
  onValue(commentsRef, (snap) => {
    commentsList.innerHTML = '';
    snap.forEach(child => {
      const { nickname, content } = child.val();
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.innerHTML = `<p><strong>${nickname}</strong>: ${content}</p>`;
      commentsList.appendChild(div);
    });
  });
}

// Close popup
popupClose.addEventListener('click', () => {
  popup.classList.add('hidden');
});
