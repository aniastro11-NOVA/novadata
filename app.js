const API_KEY = 'AIzaSyCb0V550_sQ0-9aGp72PpWjXRV2YiWId9c';
const FOLDER_ID = '1e_F9psfOKS2SnFBSYC6G-ZyufWWOVxyt';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

function getPreferredAccount() {
  return localStorage.getItem('preferred_account') || '';
}

function buildDriveUrl(file) {
  const account = getPreferredAccount();
  const authParam = account ? `?authuser=${encodeURIComponent(account)}` : '';
  return file.mimeType === 'application/vnd.google-apps.folder'
    ? `https://drive.google.com/drive/folders/${file.id}${authParam}`
    : `https://drive.google.com/file/d/${file.id}/view${authParam}`;
}

document.getElementById('account-btn').addEventListener('click', () => {
  const current = getPreferredAccount();
  const input = prompt('구글 드라이브에 사용할 계정 이메일을 입력하세요.\n(비워두면 매번 계정을 물어봅니다)', current);
  if (input === null) return;
  const trimmed = input.trim();
  if (trimmed) {
    localStorage.setItem('preferred_account', trimmed);
    setStatus(`✅ 계정 저장됨: ${trimmed}`);
  } else {
    localStorage.removeItem('preferred_account');
    setStatus('계정 설정이 초기화되었습니다.');
  }
});

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
    card.addEventListener('click', () => openPreview(file));
    grid.appendChild(card);
  });
}

function setStatus(msg) {
  document.getElementById('status-msg').textContent = msg;
}

// 인앱 미리보기 — drive.google.com URL 로드 없음 (계정 선택창 방지)
const previewModal = document.getElementById('preview-modal');
const previewThumb = document.getElementById('preview-thumb');
const previewIframe = document.getElementById('preview-iframe');
const previewTypeIcon = document.getElementById('preview-type-icon');
const previewTitle = document.getElementById('preview-title');
const previewTags = document.getElementById('preview-tags');
let currentFile = null;

function openPreview(file) {
  currentFile = file;
  const isVideo = file.mimeType?.startsWith('video/');
  const isImage = file.mimeType?.startsWith('image/');
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
  const icon = isImage ? '🖼️' : isVideo ? '🎬' : isFolder ? '📁' : '📄';

  previewTitle.textContent = file.name;
  previewTags.textContent = (file.description?.match(/#\S+/g) || []).join(' ');

  previewThumb.style.display = 'none';
  previewIframe.style.display = 'none';
  previewTypeIcon.textContent = '';

  const account = getPreferredAccount();
  const authParam = account ? `&authuser=${encodeURIComponent(account)}` : '&authuser=0';

  if (isVideo || isImage) {
    window.location.href = `./preview.html?id=${file.id}${authParam}`;
    return;
  } else {
    previewTypeIcon.textContent = icon;
  }

  previewModal.classList.remove('hidden');
}

function closePreview() {
  previewModal.classList.add('hidden');
  previewThumb.src = '';
  previewIframe.src = '';
  currentFile = null;
}

document.getElementById('preview-close-btn').addEventListener('click', closePreview);

document.getElementById('preview-share-btn').addEventListener('click', async () => {
  if (!currentFile) return;
  const url = buildDriveUrl(currentFile);
  if (navigator.share) {
    await navigator.share({ title: currentFile.name, url });
  } else {
    window.open(url, '_blank');
  }
});

document.getElementById('preview-copy-btn').addEventListener('click', async () => {
  if (!currentFile) return;
  const url = buildDriveUrl(currentFile);
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById('preview-copy-btn').textContent = '✅ 복사됨';
    setTimeout(() => document.getElementById('preview-copy-btn').textContent = '링크 복사', 2000);
  } catch {
    window.open(url, '_blank');
  }
});
