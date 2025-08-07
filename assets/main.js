document.addEventListener('DOMContentLoaded', () => {
  // 앨범 데이터 로드
  const raw = document.getElementById('albums-data').textContent;
  const albums = JSON.parse(raw);
  
  const calendarContainer = document.getElementById('calendar-container');
  const listContainer = document.getElementById('list-container');
  const popup = document.getElementById('popup');
  const popupBody = document.getElementById('popup-body');
  const popupClose = document.getElementById('popup-close');

  // 달력 뷰 렌더링
  function renderCalendar() {
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

  // 리스트 뷰 렌더링
  function renderList() {
    // 발매일 오름차순
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

  // 팝업 열기
  function openPopup(album) {
    popupBody.innerHTML = `
      <img src="${album.cover_url}" alt="${album.album_name}" />
      <h3>${album.artist_name} - ${album.album_name}</h3>
      <p>발매일: ${album.release_date}</p>
      ${album.youtube_url ? `<p><a href="${album.youtube_url}" target="_blank">유튜브 미리보기</a></p>` : ''}
    `;
    popup.classList.remove('hidden');
  }

  // 팝업 닫기
  popupClose.addEventListener('click', () => {
    popup.classList.add('hidden');
  });

  renderCalendar();
  renderList();
});
