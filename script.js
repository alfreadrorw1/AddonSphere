// ===== IMPORTS =====
import {
  db,
  collection, getDocs, doc, updateDoc,
  query, orderBy, limit, startAfter, increment,
  onSnapshot, serverTimestamp
} from './firebase.js';
import CONFIG from './config.js';

// ===== STATE =====
let allAddons = [];
let filteredAddons = [];
let lastDoc = null;
let loading = false;
let noMore = false;
let searchQuery = '';
let activeCategory = 'all';
let likedSet = new Set(JSON.parse(localStorage.getItem(CONFIG.likesStorageKey) || '[]'));
let currentAddon = null;
let descExpanded = false;
let totalDownloads = 0;

// ===== CATEGORIES =====
const CATEGORIES = [
  { id: 'all', label: 'Semua', icon: 'grid' },
  { id: 'addon', label: 'Addons', icon: 'package' },
  { id: 'texture', label: 'Textures', icon: 'image' },
  { id: 'shader', label: 'Shaders', icon: 'sun' },
  { id: 'map', label: 'Maps', icon: 'map' },
  { id: 'tool', label: 'Tools', icon: 'tool' },
  { id: 'skin', label: 'Skins', icon: 'user' },
  { id: 'mod', label: 'Mods', icon: 'cpu' },
  { id: 'other', label: 'Lainnya', icon: 'more' }
];

// ===== SVG ICONS =====
const ICONS = {
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  refresh: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.97"/></svg>',
  chevronUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
};

// ===== DOM ELEMENTS =====
const addonList = document.getElementById('addon-list');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const loadMoreBtn = document.getElementById('load-more-btn');
const modalOverlay = document.getElementById('modal-overlay');
const detailSheet = document.getElementById('detail-sheet');
const themeSheet = document.getElementById('theme-sheet');
const toastContainer = document.getElementById('toast-container');
const scrollTopBtn = document.getElementById('scroll-top');
const offlineBanner = document.getElementById('offline-banner');
const countEl = document.getElementById('addon-count');
const hamburgerMenu = document.getElementById('hamburger-menu');
const hamburgerOverlay = document.getElementById('hamburger-overlay');
const categoryTabs = document.getElementById('category-tabs');

// ===== THEME =====
const COLORS = [
  '#8b5cf6', '#00e5ff', '#00ff9d', '#ff4757', '#ffa502',
  '#a29bfe', '#fd79a8', '#fdcb6e', '#55efc4', '#e17055'
];

function applyAccent(color) {
  const hex = color.startsWith('#') ? color : '#' + color;
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-dim', hexToRgba(hex, 0.15));
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(hex, 0.3));
  document.documentElement.style.setProperty('--border-accent', hexToRgba(hex, 0.25));
  document.documentElement.style.setProperty('--shadow-accent', `0 0 24px ${hexToRgba(hex, 0.3)}`);
  document.documentElement.style.setProperty('--accent-dark', adjustColor(hex, -15));
  localStorage.setItem(CONFIG.accentStorageKey, hex);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function adjustColor(hex, amount) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function initTheme() {
  const saved = localStorage.getItem(CONFIG.accentStorageKey) || CONFIG.defaultAccent;
  applyAccent(saved);
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach((sw, i) => {
    if (i < COLORS.length) {
      const c = COLORS[i];
      sw.style.background = c;
      sw.dataset.color = c;
      if (c === saved || (saved.startsWith('#') && c === saved)) sw.classList.add('active');
      sw.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        applyAccent(c);
      });
    }
  });
  const customColor = document.getElementById('custom-color');
  if (customColor) {
    customColor.value = saved;
    customColor.addEventListener('input', (e) => {
      applyAccent(e.target.value);
      swatches.forEach(s => s.classList.remove('active'));
    });
  }
}

initTheme();

// ===== INIT CATEGORY TABS =====
function initCategoryTabs() {
  if (!categoryTabs) return;
  categoryTabs.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'category-tab';
    tab.dataset.category = cat.id;
    tab.innerHTML = `${ICONS[cat.icon]} ${cat.label}`;
    tab.addEventListener('click', (e) => {
      setActiveCategory(cat.id);
    });
    categoryTabs.appendChild(tab);
  });
  setActiveCategory('all', false);
}

function setActiveCategory(categoryId, scrollToTop = true) {
  activeCategory = categoryId;
  
  // Update category tabs
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === categoryId);
  });
  
  // Update hamburger menu
  document.querySelectorAll('.hamburger-item[data-category]').forEach(item => {
    item.classList.toggle('active', item.dataset.category === categoryId);
  });
  
  if (scrollToTop) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  filterAndRender();
}

function filterAndRender() {
  let result = [...allAddons];
  
  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  }
  
  // Filter by category
  if (activeCategory !== 'all') {
    result = result.filter(a => (a.category || 'other') === activeCategory);
  }
  
  filteredAddons = result;
  renderAddonList(filteredAddons);
  
  // Update count
  if (countEl) {
    countEl.textContent = filteredAddons.length !== allAddons.length
      ? `${filteredAddons.length} / ${allAddons.length}`
      : `${allAddons.length}`;
  }
  
  // Empty state
  if (filteredAddons.length === 0 && allAddons.length > 0) {
    addonList.innerHTML = `
      <div class="empty-state fade-in">
        <div class="icon-wrap">${ICONS.search}</div>
        <h3>Tidak ditemukan</h3>
        <p>Coba kata kunci atau kategori lain.</p>
      </div>`;
  }
}

// ===== TOAST =====
function showToast(msg, type = 'info', duration = 3200) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===== RIPPLE =====
function addRipple(el, e) {
  const rect = el.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `
    width: ${size}px; height: ${size}px;
    left: ${(e.clientX || e.touches?.[0]?.clientX || rect.left + rect.width/2) - rect.left - size/2}px;
    top: ${(e.clientY || e.touches?.[0]?.clientY || rect.top + rect.height/2) - rect.top - size/2}px;
  `;
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 550);
}

// ===== FORMAT =====
function formatDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatNum(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(Math.floor(n));
}

function getCategoryInfo(catId) {
  return CATEGORIES.find(c => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escAttr(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ===== RENDER ADDON LIST =====
function renderAddonList(addons) {
  addonList.innerHTML = '';
  if (addons.length === 0 && allAddons.length === 0) {
    addonList.innerHTML = `
      <div class="empty-state fade-in">
        <div class="icon-wrap">${ICONS.package}</div>
        <h3>Belum ada addon</h3>
        <p>Admin belum mengupload addon apapun.</p>
      </div>`;
    return;
  }
  addons.forEach((addon, i) => {
    const card = createAddonCard(addon, i);
    addonList.appendChild(card);
  });
}

function createAddonCard(addon, index) {
  const isLiked = likedSet.has(addon.id);
  const catInfo = getCategoryInfo(addon.category || 'other');
  const downloads = addon.downloads || 0;
  
  const card = document.createElement('div');
  card.className = 'addon-card card-appear';
  card.style.animationDelay = `${index * 50}ms`;
  card.dataset.id = addon.id;
  
  card.innerHTML = `
    <div class="addon-card-img-wrap">
      <img src="${escAttr(addon.imageUrl) || 'assets/placeholder.png'}" 
           alt="${escHtml(addon.title || '')}" 
           loading="lazy"
           onerror="this.src='assets/placeholder.png'; this.onerror=null;">
      <div class="addon-card-badges">
        <div class="addon-card-category-tag">${ICONS[catInfo.icon]} ${catInfo.label}</div>
        <div class="addon-card-dl-badge">${ICONS.download} ${formatNum(downloads)}</div>
      </div>
    </div>
    <div class="addon-card-body">
      <div class="addon-card-title">${escHtml(addon.title || 'Untitled')}</div>
      <div class="addon-card-desc">${escHtml(addon.description || 'Tidak ada deskripsi.')}</div>
      <div class="addon-card-meta">
        <div class="meta-item downloads">
          ${ICONS.download}
          <span class="dl-count-${addon.id}">${formatNum(downloads)}</span>
        </div>
        <div class="meta-item">
          ${ICONS.eye}
          <span class="view-count-${addon.id}">${formatNum(addon.views)}</span>
        </div>
        <div class="meta-item">
          <svg viewBox="0 0 24 24" fill="${isLiked ? '#ef4444' : 'none'}" stroke="${isLiked ? '#ef4444' : 'currentColor'}" stroke-width="2" width="14" height="14">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="like-count-${addon.id}">${formatNum(addon.likes)}</span>
        </div>
      </div>
      <div class="addon-card-actions">
        <button class="btn btn-primary download-btn" data-id="${addon.id}" data-url="${escAttr(addon.downloadUrl)}">
          ${ICONS.download} Download
        </button>
        <button class="btn btn-icon like-btn ${isLiked ? 'liked' : ''} like-btn-${addon.id}" data-id="${addon.id}">
          ${ICONS.heart}
        </button>
      </div>
    </div>`;
  
  // Event listeners
  const downloadBtn = card.querySelector('.download-btn');
  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDownload(addon.id, addon.downloadUrl, downloadBtn, card);
  });
  
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLike(addon.id, likeBtn, card);
  });
  
  card.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
      openDetail(addon);
    }
  });
  
  return card;
}

// ===== LOAD ADDONS =====
async function loadAddons(isLoadMore = false) {
  if (loading) return;
  if (noMore && isLoadMore) return;
  
  loading = true;
  
  if (!isLoadMore) {
    addonList.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      addonList.innerHTML += `
        <div class="skeleton-card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-desc"></div>
            <div class="skeleton skeleton-desc2"></div>
            <div class="skeleton-btns">
              <div class="skeleton skeleton-btn"></div>
              <div class="skeleton skeleton-btn"></div>
            </div>
          </div>
        </div>`;
    }
  }
  
  try {
    let q;
    if (isLoadMore && lastDoc) {
      q = query(
        collection(db, 'addons'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(CONFIG.pageSize)
      );
    } else {
      q = query(
        collection(db, 'addons'),
        orderBy('createdAt', 'desc'),
        limit(CONFIG.pageSize)
      );
    }
    
    const snap = await getDocs(q);
    const docs = snap.docs;
    
    noMore = docs.length < CONFIG.pageSize;
    if (noMore) {
      loadMoreBtn?.classList.add('hidden');
    } else {
      loadMoreBtn?.classList.remove('hidden');
    }
    
    if (docs.length > 0) {
      lastDoc = docs[docs.length - 1];
    }
    
    const newAddons = docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        downloadUrl: data.downloadUrl || '',
        donateUrl: data.donateUrl || '',
        category: data.category || 'other',
        views: data.views || 0,
        likes: data.likes || 0,
        downloads: data.downloads || 0,
        createdAt: data.createdAt
      };
    });
    
    if (isLoadMore) {
      allAddons = [...allAddons, ...newAddons];
    } else {
      allAddons = newAddons;
    }
    
    // Calculate totals
    totalDownloads = allAddons.reduce((sum, a) => sum + (a.downloads || 0), 0);
    const totalViews = allAddons.reduce((sum, a) => sum + (a.views || 0), 0);
    
    // Update stats
    updateStats(totalDownloads, totalViews);
    
    // Filter and render
    filterAndRender();
    
  } catch (err) {
    console.error('Load addons error:', err);
    if (!isLoadMore) {
      addonList.innerHTML = `
        <div class="empty-state fade-in">
          <div class="icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3>Gagal memuat data</h3>
          <p>Periksa koneksi internet Anda.</p>
        </div>`;
    }
    showToast('Gagal memuat addon', 'error');
  }
  
  loading = false;
}

function updateStats(downloads, views) {
  const statTotal = document.getElementById('stat-total');
  const statDownloads = document.getElementById('stat-downloads');
  const statViews = document.getElementById('stat-views');
  
  if (statTotal) statTotal.textContent = allAddons.length;
  if (statDownloads) statDownloads.textContent = formatNum(downloads);
  if (statViews) statViews.textContent = formatNum(views);
}

// ===== REALTIME UPDATES =====
function setupRealtime() {
  const q = query(collection(db, 'addons'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    let needsUpdate = false;
    
    snap.docChanges().forEach(change => {
      const data = change.doc.data();
      const addonData = {
        id: change.doc.id,
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        downloadUrl: data.downloadUrl || '',
        donateUrl: data.donateUrl || '',
        category: data.category || 'other',
        views: data.views || 0,
        likes: data.likes || 0,
        downloads: data.downloads || 0,
        createdAt: data.createdAt
      };
      
      if (change.type === 'modified') {
        const idx = allAddons.findIndex(a => a.id === change.doc.id);
        if (idx !== -1) {
          allAddons[idx] = addonData;
          needsUpdate = true;
          
          // Update DOM elements for this addon
          const likesEl = document.querySelector(`.like-count-${change.doc.id}`);
          if (likesEl) likesEl.textContent = formatNum(addonData.likes);
          
          const viewsEl = document.querySelector(`.view-count-${change.doc.id}`);
          if (viewsEl) viewsEl.textContent = formatNum(addonData.views);
          
          const dlEl = document.querySelector(`.dl-count-${change.doc.id}`);
          if (dlEl) dlEl.textContent = formatNum(addonData.downloads);
        }
      } else if (change.type === 'added') {
        const exists = allAddons.find(a => a.id === change.doc.id);
        if (!exists) {
          allAddons.unshift(addonData);
          needsUpdate = true;
        }
      } else if (change.type === 'removed') {
        allAddons = allAddons.filter(a => a.id !== change.doc.id);
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      totalDownloads = allAddons.reduce((sum, a) => sum + (a.downloads || 0), 0);
      const totalViews = allAddons.reduce((sum, a) => sum + (a.views || 0), 0);
      updateStats(totalDownloads, totalViews);
      filterAndRender();
    }
  });
}

// ===== ACTIONS =====
function handleDownload(id, url, btn, card) {
  if (!url || url === 'undefined' || url === 'null') {
    showToast('Link download belum tersedia', 'warning');
    return;
  }
  
  // Update Firestore
  updateDoc(doc(db, 'addons', id), {
    downloads: increment(1),
    views: increment(1)
  }).catch(err => console.error('Download update error:', err));
  
  // Optimistic UI update
  const addon = allAddons.find(a => a.id === id);
  if (addon) {
    addon.downloads = (addon.downloads || 0) + 1;
    addon.views = (addon.views || 0) + 1;
    totalDownloads++;
    updateStats(totalDownloads, allAddons.reduce((sum, a) => sum + (a.views || 0), 0));
    
    const dlEl = card?.querySelector(`.dl-count-${id}`);
    if (dlEl) dlEl.textContent = formatNum(addon.downloads);
    
    const viewsEl = card?.querySelector(`.view-count-${id}`);
    if (viewsEl) viewsEl.textContent = formatNum(addon.views);
  }
  
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast('Membuka link download...', 'success', 2000);
}

function handleLike(id, btn, card) {
  const addon = allAddons.find(a => a.id === id);
  if (!addon) return;
  
  const isLiked = likedSet.has(id);
  
  if (isLiked) {
    // Unlike
    likedSet.delete(id);
    btn.classList.remove('liked');
    btn.querySelector('svg')?.setAttribute('fill', 'none');
    btn.querySelector('svg')?.setAttribute('stroke', 'currentColor');
    
    updateDoc(doc(db, 'addons', id), {
      likes: increment(-1)
    }).catch(() => {});
    
    addon.likes = Math.max(0, (addon.likes || 1) - 1);
  } else {
    // Like
    likedSet.add(id);
    btn.classList.add('liked');
    btn.querySelector('svg')?.setAttribute('fill', '#ef4444');
    btn.querySelector('svg')?.setAttribute('stroke', '#ef4444');
    
    updateDoc(doc(db, 'addons', id), {
      likes: increment(1)
    }).catch(() => {});
    
    addon.likes = (addon.likes || 0) + 1;
    
    // Animation
    btn.style.transform = 'scale(1.25)';
    setTimeout(() => btn.style.transform = '', 200);
  }
  
  // Update DOM
  const likesEl = card?.querySelector(`.like-count-${id}`);
  if (likesEl) likesEl.textContent = formatNum(addon.likes);
  
  // Save to localStorage
  localStorage.setItem(CONFIG.likesStorageKey, JSON.stringify([...likedSet]));
}

// ===== DETAIL SHEET =====
function openDetail(addon) {
  currentAddon = addon;
  descExpanded = false;
  
  // Increment views
  updateDoc(doc(db, 'addons', addon.id), {
    views: increment(1)
  }).catch(() => {});
  
  const catInfo = getCategoryInfo(addon.category || 'other');
  
  // Populate detail sheet
  const sheetImg = document.getElementById('sheet-img');
  if (sheetImg) {
    sheetImg.src = addon.imageUrl || 'assets/placeholder.png';
    sheetImg.onerror = function() { this.src = 'assets/placeholder.png'; this.onerror = null; };
  }
  
  document.getElementById('sheet-title').textContent = addon.title || 'Untitled';
  document.getElementById('sheet-views').textContent = formatNum(addon.views);
  document.getElementById('sheet-likes').textContent = formatNum(addon.likes);
  document.getElementById('sheet-downloads').textContent = formatNum(addon.downloads || 0);
  document.getElementById('sheet-date').textContent = formatDate(addon.createdAt);
  
  // Category tag
  const catTag = document.getElementById('sheet-category-tag');
  if (catTag) {
    catTag.innerHTML = `${ICONS[catInfo.icon]} ${catInfo.label}`;
  }
  
  // Description
  const descEl = document.getElementById('sheet-desc');
  const toggleEl = document.getElementById('toggle-desc');
  descEl.textContent = addon.description || 'Tidak ada deskripsi.';
  descEl.className = 'sheet-desc collapsed';
  
  if (addon.description && addon.description.length > 180) {
    toggleEl.style.display = 'inline-block';
    toggleEl.textContent = 'Baca Selengkapnya';
  } else {
    toggleEl.style.display = 'none';
  }
  
  // Download button
  const dlBtn = document.getElementById('sheet-dl');
  dlBtn.onclick = () => {
    handleDownload(addon.id, addon.downloadUrl, dlBtn);
    closeDetail();
  };
  
  // Share links
  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(`Cek addon Minecraft: ${addon.title}`);
  document.getElementById('share-wa').href = `https://wa.me/?text=${shareText}%20${shareUrl}`;
  document.getElementById('share-tg').href = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
  
  // Show sheet
  modalOverlay?.classList.add('active');
  detailSheet?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  modalOverlay?.classList.remove('active');
  detailSheet?.classList.remove('active');
  document.body.style.overflow = '';
  currentAddon = null;
}

// Toggle description
document.getElementById('toggle-desc')?.addEventListener('click', () => {
  const descEl = document.getElementById('sheet-desc');
  const toggleEl = document.getElementById('toggle-desc');
  descExpanded = !descExpanded;
  descEl.classList.toggle('collapsed', !descExpanded);
  toggleEl.textContent = descExpanded ? 'Tutup' : 'Baca Selengkapnya';
});

// Copy share link
document.getElementById('share-copy')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast('Link berhasil disalin!', 'success');
  } catch {
    showToast('Gagal menyalin link', 'error');
  }
});

// Close detail on overlay click
modalOverlay?.addEventListener('click', () => {
  closeDetail();
  themeSheet?.classList.remove('active');
});

// Swipe down to close detail
let touchStartY = 0;
detailSheet?.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

detailSheet?.addEventListener('touchmove', (e) => {
  const delta = e.touches[0].clientY - touchStartY;
  if (delta > 0 && detailSheet.scrollTop <= 0) {
    detailSheet.style.transform = `translateY(${delta}px)`;
    detailSheet.style.transition = 'none';
  }
}, { passive: true });

detailSheet?.addEventListener('touchend', (e) => {
  const delta = e.changedTouches[0].clientY - touchStartY;
  detailSheet.style.transition = '';
  detailSheet.style.transform = '';
  if (delta > 100) {
    closeDetail();
  }
}, { passive: true });

// ===== HAMBURGER MENU =====
document.getElementById('hamburger-btn')?.addEventListener('click', () => {
  hamburgerMenu?.classList.add('active');
  hamburgerOverlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
});

document.getElementById('hamburger-close')?.addEventListener('click', closeHamburger);
hamburgerOverlay?.addEventListener('click', closeHamburger);

function closeHamburger() {
  hamburgerMenu?.classList.remove('active');
  hamburgerOverlay?.classList.remove('active');
  document.body.style.overflow = '';
}

// Hamburger category items
document.querySelectorAll('.hamburger-item[data-category]').forEach(item => {
  item.addEventListener('click', () => {
    const catId = item.dataset.category;
    setActiveCategory(catId);
    closeHamburger();
  });
});

// ===== SEARCH =====
let searchDebounceTimer;
searchInput?.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  searchClear?.classList.toggle('visible', val.length > 0);
  
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery = val;
    filterAndRender();
  }, 250);
});

searchClear?.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('visible');
  filterAndRender();
  searchInput.focus();
});

// ===== LOAD MORE =====
loadMoreBtn?.addEventListener('click', () => {
  loadAddons(true);
});

// ===== SCROLL TO TOP =====
window.addEventListener('scroll', () => {
  scrollTopBtn?.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

scrollTopBtn?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== THEME SHEET =====
document.getElementById('open-theme')?.addEventListener('click', () => {
  themeSheet?.classList.add('active');
  modalOverlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
});

document.getElementById('close-theme')?.addEventListener('click', () => {
  themeSheet?.classList.remove('active');
  modalOverlay?.classList.remove('active');
  document.body.style.overflow = '';
});

// ===== BOTTOM NAV =====
document.querySelectorAll('.bottom-nav-item').forEach((item, index) => {
  item.addEventListener('click', function(e) {
    document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
  });
});

// ===== OFFLINE =====
window.addEventListener('offline', () => {
  offlineBanner?.classList.add('active');
  showToast('Anda sedang offline', 'warning', 4000);
});

window.addEventListener('online', () => {
  offlineBanner?.classList.remove('active');
  showToast('Koneksi pulih', 'success', 2500);
});

// ===== KEYBOARD =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDetail();
    closeHamburger();
    themeSheet?.classList.remove('active');
    modalOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ===== INIT =====
initCategoryTabs();
loadAddons();
setupRealtime();

// ===== EXPORT FOR GLOBAL ACCESS =====
window.handleDownload = handleDownload;
window.handleLike = handleLike;
window.openDetail = openDetail;
window.closeDetail = closeDetail;