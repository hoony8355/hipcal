// Import and configure Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase configuration (provided)
const firebaseConfig = {
  apiKey: "AIzaSyBcVDYroDuZaLkD6huOdNQ-pmOg5XPbOCg",
  authDomain: "hipcal.firebaseapp.com",
  databaseURL: "https://hipcal-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hipcal",
  storageBucket: "hipcal.appspot.com", // 기존 "hipcal.firebasestorage.app" → "hipcal.appspot.com" 로 수정 필요
  messagingSenderId: "952594005777",
  appId: "1:952594005777:web:ef36d84e367401e4e056b0",
  measurementId: "G-3MNPCZEPN9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Form handling
const form = document.getElementById('report-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = {
    artist_name: form.artist_name.value.trim(),
    album_name: form.album_name.value.trim(),
    release_date: form.release_date.value,
    cover_url: form.cover_url.value.trim() || null,
    youtube_url: form.youtube_url.value.trim() || null,
    reporter_nick: form.reporter_nick.value.trim(),
    note: form.note.value.trim() || null,
    submitted_at: serverTimestamp(),
    status: 'pending'
  };

  // Push to Realtime Database under 'reports'
  push(ref(db, 'reports'), data)
    .then(() => {
      alert('제보가 성공적으로 제출되었습니다!');
      form.reset();
    })
    .catch((error) => {
      console.error('제보 제출 오류:', error);
      alert('제보 제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });
});
