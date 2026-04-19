const API_KEY = 'AIzaSyCb0V550_sQ0-9aGp72PpWjXRV2YiWId9c';
const FOLDER_ID = '1e_F9psfOKS2SnFBSYC6G-ZyufWWOVxyt';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

async function doSearch() {
  const keyword = document.getElementById('search-input').value.trim();
  if (!keyword) return;

  const grid = document.getElementById('results-grid');
  grid.innerHTML = '';
  setStatus('🔍 검색 중...');

  try {
    const searchTag = keyword.startsWith('#') ? keyword : `#${keyword}`;
    const q = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType,description,thumbnailLink,webViewLink)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=1000&key=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const data = await res.json();

    const filtered = (data.files || []).filter(f =>
      f.description && f.description.toLowerCase().includes(searchTag.toLowerCase())
    );

    if (filtered.length === 0) {
      setStatus(`"${keyword}" 관련 파일을 찾지 못했습니다. #${keyword} 태그가 있는지 확인해주세요.`);
      return;
    }

    setStatus(`✅ ${filtered.length}개의 파일을 찾았습니다`);
    renderGrid(filtered);
  } catch (err) {
    setStatus('❌ 오류: ' + err.message);
  }
}

function renderGrid(files) {
  const grid = document.getElementById('results-grid');
  files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'media-card';

    const isImage = file.mimeType?.startsWith('image/');
    const isVideo = file.mimeType?.startsWith('video/');
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    let icon = isImage ? '🖼️' : isVideo ? '🎬' : isFolder ? '📁' : '📄';

    const tags = (file.description?.match(/#\S+/g) || []).join(' ');
    const typeLabel = isImage ? '이미지' : isVideo ? '영상' : isFolder ? '폴더' : '파일';

    card.innerHTML = `
      <div class="media-type-icon">
        ${file.thumbnailLink
          ? `<img src="${file.thumbnailLink}" alt="${file.name}" onerror="this.parentElement.innerHTML='<span style=font-size:52px>${icon}</span>'">`
          : `<span style="font-size:52px">${icon}</span>`}
      </div>
      <div class="media-info">
        <div class="media-name" title="${file.name}">${file.name}</div>
        <div class="media-tags">${tags}</div>
        <span class="media-badge">${typeLabel}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
      const url = isFolder
        ? `https://drive.google.com/drive/folders/${file.id}`
        : `https://drive.google.com/file/d/${file.id}/view`;
      window.open(url, '_blank');
    });
    grid.appendChild(card);
  });
}

function setStatus(msg) {
  document.getElementById('status-msg').textContent = msg;
}
