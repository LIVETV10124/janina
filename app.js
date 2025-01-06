// app.js
const m3uUrl = "https://raw.githubusercontent.com/MohammadKobirShah/KobirIPTV/refs/heads/main/KobirIPTV.m3u";

const gridContainer = document.querySelector('.grid-container');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const playerModal = document.getElementById('player-modal');
const shakaPlayerElement = document.getElementById('shaka-player');
const closePlayerBtn = document.getElementById('close-player');

let allChannels = [];
let shakaPlayer = null;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

function initializeShakaPlayer() {
  if (shaka.Player.isBrowserSupported()) {
    shakaPlayer = new shaka.Player(shakaPlayerElement);
    shakaPlayer.addEventListener('error', (event) => {
      displayError('Error with Shaka Player. Try another channel.');
      console.error('Shaka Error:', event.detail);
    });
  } else {
    alert('Shaka Player is not supported in this browser.');
  }
}

function displayError(message) {
  const errorBox = document.createElement('div');
  errorBox.className = 'error-box';
  errorBox.textContent = message;
  document.body.appendChild(errorBox);
  setTimeout(() => errorBox.remove(), 3000);
}

window.onload = async () => {
  initializeShakaPlayer();
  showLoading(true);
  await loadChannels();
  initSearchAndCategory();
  renderFavorites();
  showLoading(false);
};

function showLoading(show) {
  const loading = document.getElementById('loading-indicator');
  if (show) {
    if (!loading) {
      const spinner = document.createElement('div');
      spinner.id = 'loading-indicator';
      spinner.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(spinner);
    }
  } else {
    loading && loading.remove();
  }
}

async function loadChannels() {
  try {
    const response = await fetch(m3uUrl);
    if (!response.ok) throw new Error('Failed to fetch M3U file');
    const text = await response.text();
    allChannels = parseM3U(text);
    renderChannels(allChannels);
    populateCategories(allChannels);
  } catch (error) {
    displayError('Error loading channels.');
    console.error(error);
  }
}

function parseM3U(m3uText) {
  const lines = m3uText.split('\n');
  const channels = [];
  let channel = {};

  lines.forEach(line => {
    if (line.startsWith('#EXTINF')) {
      channel.name = line.match(/#EXTINF:.*?,(.*)/)?.[1] || 'Unknown';
      channel.group = line.match(/group-title="([^"]+)"/)?.[1] || 'Uncategorized';
      channel.logo = line.match(/tvg-logo="([^"]+)"/)?.[1] || null;
    } else if (line.startsWith('http')) {
      channel.url = line;
      channels.push(channel);
      channel = {};
    }
  });

  return channels;
}

function renderChannels(channels) {
  gridContainer.innerHTML = '';
  channels.forEach(channel => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${channel.logo || 'https://via.placeholder.com/150?text=No+Logo'}" alt="${channel.name}" class="channel-logo">
      <p class="card-title">${channel.name}</p>
      <button class="favorite-btn">${favorites.includes(channel.url) ? '★' : '☆'}</button>
    `;
    card.addEventListener('click', () => playChannel(channel.url));
    card.querySelector('.favorite-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(channel);
    });
    gridContainer.appendChild(card);
  });
}

function populateCategories(channels) {
  const categories = new Set(channels.map(channel => channel.group));
  categorySelect.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

function playChannel(url) {
  if (!shakaPlayer) return alert('Shaka Player not initialized.');
  showLoading(true);
  shakaPlayer.load(url).then(() => {
    playerModal.style.display = 'flex';
  }).catch(err => {
    displayError('Error playing channel.');
    console.error(err);
  }).finally(() => showLoading(false));
}

closePlayerBtn.addEventListener('click', () => {
  shakaPlayer.unload().then(() => {
    playerModal.style.display = 'none';
  });
});

function initSearchAndCategory() {
  searchInput.addEventListener('input', () => {
    const searchText = searchInput.value.toLowerCase();
    renderChannels(allChannels.filter(channel => channel.name.toLowerCase().includes(searchText)));
  });

  categorySelect.addEventListener('change', () => {
    const selected = categorySelect.value;
    renderChannels(selected === 'all' ? allChannels : allChannels.filter(c => c.group === selected));
  });
}

function toggleFavorite(channel) {
  if (favorites.includes(channel.url)) {
    favorites = favorites.filter(fav => fav !== channel.url);
  } else {
    favorites.push(channel.url);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderFavorites();
}

function renderFavorites() {
  const favoriteContainer = document.getElementById('favorites');
  if (!favoriteContainer) return;
  favoriteContainer.innerHTML = '';
  allChannels.filter(channel => favorites.includes(channel.url)).forEach(channel => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.textContent = channel.name;
    item.addEventListener('click', () => playChannel(channel.url));
    favoriteContainer.appendChild(item);
  });
}
