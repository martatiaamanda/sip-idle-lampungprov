/**
 * Application Logic
 * Sistem Informasi Pencatatan Aset Daerah Idle (SIP-IDLE PROV)
 * BPKAD Pemerintah Provinsi Sumatera Barat
 */

// State Management
let appState = {
  assets: [],
  currentTab: 'dashboard',
  filters: {
    search: '',
    opd: 'Semua OPD',
    kabKota: 'Semua Wilayah',
    kategori: 'Semua Kategori',
    status: 'Semua Status'
  },
  pagination: {
    page: 1,
    perPage: 6
  },
  mapInstance: null,
  markerClusterGroup: null,
  charts: {
    kabKota: null,
    kategori: null,
    status: null
  }
};

// Formatting Utilities
function formatRupiah(number) {
  if (isNaN(number) || number === null) return "Rp 0";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
}

function formatNumber(number) {
  if (isNaN(number) || number === null) return "0";
  return new Intl.NumberFormat('id-ID').format(number);
}

function getKategoriBadgeClass(kategori) {
  if (kategori.includes("KIB A")) return "badge-kib-a";
  if (kategori.includes("KIB B")) return "badge-kib-b";
  if (kategori.includes("KIB C")) return "badge-kib-c";
  if (kategori.includes("KIB D")) return "badge-kib-d";
  return "bg-gray-100 text-gray-800 border border-gray-300";
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "Siap Kemitraan (KSP/BGS)":
      return "badge-status-siap-ksp";
    case "Siap Sewa UMKM/Swasta":
      return "badge-status-siap-sewa";
    case "Proses Kajian Kelayakan":
      return "badge-status-kajian";
    case "Dalam Pengamanan Fisik & Legalitas":
      return "badge-status-pengamanan";
    case "Usulan Pinjam Pakai Instansi Vertikal":
      return "badge-status-pinjam";
    case "Usulan Pemindahtanganan/Lelang KPKNL":
      return "badge-status-lelang";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-300";
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  populateDropdowns();
  initEventListeners();
  renderAllViews();
});

function initStorage() {
  const stored = localStorage.getItem('sip_idle_assets_v1');
  if (stored) {
    try {
      appState.assets = JSON.parse(stored);
    } catch (e) {
      console.error("Gagal parsing local storage, gunakan default data", e);
      appState.assets = [...DEFAULT_ASSETS];
      saveToStorage();
    }
  } else {
    appState.assets = [...DEFAULT_ASSETS];
    saveToStorage();
  }
}

function saveToStorage() {
  localStorage.setItem('sip_idle_assets_v1', JSON.stringify(appState.assets));
}

function populateDropdowns() {
  // Populate Filter OPD
  const opdSelects = [document.getElementById('filter-opd'), document.getElementById('form-opd')];
  opdSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = '';
    OPD_LIST.forEach(opd => {
      const opt = document.createElement('option');
      opt.value = opd;
      opt.textContent = opd;
      select.appendChild(opt);
    });
  });

  // Populate Filter Kab/Kota
  const kabKotaSelects = [document.getElementById('filter-kabkota'), document.getElementById('form-kabkota')];
  kabKotaSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = '';
    KABKOTA_LIST.forEach(kab => {
      const opt = document.createElement('option');
      opt.value = kab;
      opt.textContent = kab;
      select.appendChild(opt);
    });
  });

  // Populate Filter Kategori
  const katSelects = [document.getElementById('filter-kategori'), document.getElementById('form-kategori')];
  katSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = '';
    KATEGORI_LIST.forEach(kat => {
      const opt = document.createElement('option');
      opt.value = kat;
      opt.textContent = kat;
      select.appendChild(opt);
    });
  });

  // Populate Filter Status
  const statusSelects = [document.getElementById('filter-status'), document.getElementById('form-status')];
  statusSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = '';
    STATUS_LIST.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      select.appendChild(opt);
    });
  });
}

function initEventListeners() {
  // Tab Navigation Buttons
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-tab-target');
      switchTab(target);
    });
  });

  // Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.filters.search = e.target.value.toLowerCase().trim();
      appState.pagination.page = 1;
      renderTable();
      renderMap();
    });
  }

  // Filter Dropdowns
  ['filter-opd', 'filter-kabkota', 'filter-kategori', 'filter-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        const key = id.replace('filter-', '');
        appState.filters[key] = e.target.value;
        appState.pagination.page = 1;
        renderTable();
        renderMap();
      });
    }
  });

  // Reset Filters Button
  const btnResetFilter = document.getElementById('btn-reset-filter');
  if (btnResetFilter) {
    btnResetFilter.addEventListener('click', () => {
      appState.filters = {
        search: '',
        opd: 'Semua OPD',
        kabKota: 'Semua Wilayah',
        kategori: 'Semua Kategori',
        status: 'Semua Status'
      };
      if (searchInput) searchInput.value = '';
      document.getElementById('filter-opd').value = 'Semua OPD';
      document.getElementById('filter-kabkota').value = 'Semua Wilayah';
      document.getElementById('filter-kategori').value = 'Semua Kategori';
      document.getElementById('filter-status').value = 'Semua Status';
      appState.pagination.page = 1;
      renderTable();
      renderMap();
      showToast('Filter berhasil disetel ulang');
    });
  }

  // Form Submission
  const assetForm = document.getElementById('asset-form');
  if (assetForm) {
    assetForm.addEventListener('submit', handleFormSubmit);
  }

  // Interest Form (Kemitraan Modal)
  const interestForm = document.getElementById('interest-form');
  if (interestForm) {
    interestForm.addEventListener('submit', handleInterestSubmit);
  }
}

function switchTab(tabId) {
  appState.currentTab = tabId;

  // Update nav tabs active style
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    const target = btn.getAttribute('data-tab-target');
    if (target === tabId) {
      btn.className = "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-800 bg-white border-b-2 border-emerald-600 shadow-sm rounded-t-lg transition";
    } else {
      btn.className = "flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-emerald-700 hover:bg-gray-50 rounded-t-lg transition";
    }
  });

  // Show corresponding tab content
  document.querySelectorAll('.tab-content-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const activePanel = document.getElementById(`panel-${tabId}`);
  if (activePanel) {
    activePanel.classList.remove('hidden');
  }

  // Specific triggers per tab
  if (tabId === 'map') {
    setTimeout(() => {
      if (appState.mapInstance) {
        appState.mapInstance.invalidateSize();
      } else {
        initLeafletMap();
      }
    }, 200);
  } else if (tabId === 'catalog') {
    renderCatalog();
  } else if (tabId === 'reports') {
    renderReports();
  }
}

function renderAllViews() {
  renderKPIs();
  renderCharts();
  renderTable();
  initLeafletMap();
  renderCatalog();
  renderReports();
}

// KPI Renderers
function renderKPIs() {
  const totalAssets = appState.assets.length;
  const totalNilaiWajar = appState.assets.reduce((sum, item) => sum + (Number(item.nilaiWajar) || 0), 0);
  const totalLuasTanah = appState.assets
    .filter(item => item.kategori.includes("KIB A"))
    .reduce((sum, item) => sum + (Number(item.luas) || 0), 0);
  const totalPotensiPAD = appState.assets.reduce((sum, item) => sum + (Number(item.potensiPAD) || 0), 0);
  
  const certifiedCount = appState.assets.filter(item => item.statusSertifikat === "Bersertifikat Resmi").length;
  const certifiedPercent = totalAssets > 0 ? Math.round((certifiedCount / totalAssets) * 100) : 0;

  // Update elements
  document.getElementById('kpi-total-aset').textContent = `${totalAssets} Objek`;
  document.getElementById('kpi-nilai-wajar').textContent = `Rp ${(totalNilaiWajar / 1000000000).toFixed(2)} M`;
  document.getElementById('kpi-luas-lahan').textContent = `${formatNumber(totalLuasTanah)} m² (${(totalLuasTanah / 10000).toFixed(1)} Ha)`;
  document.getElementById('kpi-potensi-pad').textContent = `Rp ${(totalPotensiPAD / 1000000000).toFixed(2)} M/th`;
  document.getElementById('kpi-sertifikat-percent').textContent = `${certifiedPercent}% Bersertifikat`;

  // Quick stats badge count in header
  const readyPartnership = appState.assets.filter(a => a.status.includes("Siap")).length;
  const headerBadge = document.getElementById('header-ready-badge');
  if (headerBadge) {
    headerBadge.textContent = `${readyPartnership} Aset Siap Kemitraan/Sewa`;
  }
}

// Chart.js Visualizations
function renderCharts() {
  renderKabKotaChart();
  renderCategoryChart();
  renderStatusChart();
}

function renderKabKotaChart() {
  const ctx = document.getElementById('chart-kabkota');
  if (!ctx) return;

  // Aggregate by Kab/Kota
  const counts = {};
  const values = {};
  appState.assets.forEach(a => {
    counts[a.kabKota] = (counts[a.kabKota] || 0) + 1;
    values[a.kabKota] = (values[a.kabKota] || 0) + (a.nilaiWajar / 1000000000); // in Milyar
  });

  const labels = Object.keys(counts);
  const dataCounts = labels.map(l => counts[l]);
  const dataValues = labels.map(l => values[l].toFixed(2));

  if (appState.charts.kabKota) {
    appState.charts.kabKota.destroy();
  }

  appState.charts.kabKota = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Jumlah Objek Aset Idle',
          data: dataCounts,
          backgroundColor: '#0a4d34',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Estimasi Nilai Wajar (Milyar Rp)',
          data: dataValues,
          backgroundColor: '#c48a19',
          borderRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.datasetIndex === 1) {
                return ` Nilai: Rp ${context.raw} Milyar`;
              }
              return ` Jumlah: ${context.raw} Objek Aset`;
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Jumlah Objek' },
          ticks: { stepSize: 1 }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'Nilai (Milyar Rp)' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function renderCategoryChart() {
  const ctx = document.getElementById('chart-kategori');
  if (!ctx) return;

  const counts = {
    'KIB A (Tanah)': 0,
    'KIB B (Peralatan & Mesin)': 0,
    'KIB C (Gedung & Bangunan)': 0,
    'KIB D (Jalan & Jaringan)': 0
  };

  appState.assets.forEach(a => {
    if (a.kategori.includes("KIB A")) counts['KIB A (Tanah)']++;
    else if (a.kategori.includes("KIB B")) counts['KIB B (Peralatan & Mesin)']++;
    else if (a.kategori.includes("KIB C")) counts['KIB C (Gedung & Bangunan)']++;
    else if (a.kategori.includes("KIB D")) counts['KIB D (Jalan & Jaringan)']++;
  });

  if (appState.charts.kategori) {
    appState.charts.kategori.destroy();
  }

  appState.charts.kategori = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 12 }
        }
      },
      cutout: '65%'
    }
  });
}

function renderStatusChart() {
  const ctx = document.getElementById('chart-status');
  if (!ctx) return;

  const counts = {};
  appState.assets.forEach(a => {
    counts[a.status] = (counts[a.status] || 0) + 1;
  });

  if (appState.charts.status) {
    appState.charts.status.destroy();
  }

  appState.charts.status = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: [
          '#10b981', // KSP
          '#0284c7', // Sewa
          '#f59e0b', // Kajian
          '#ef4444', // Pengamanan
          '#8b5cf6', // Pinjam
          '#a855f7'  // Lelang
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 12 }
        }
      }
    }
  });
}

// Leaflet GIS Map Implementation
function initLeafletMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // If already initialized
  if (appState.mapInstance) {
    renderMap();
    return;
  }

  // Centered on Sumatera Barat
  appState.mapInstance = L.map('map', {
    center: [-0.65, 100.45],
    zoom: 8,
    zoomControl: true
  });

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor | BPKAD Sumbar',
    maxZoom: 18
  }).addTo(appState.mapInstance);

  // Group for markers
  appState.markerClusterGroup = L.layerGroup().addTo(appState.mapInstance);

  renderMap();
}

function renderMap() {
  if (!appState.mapInstance || !appState.markerClusterGroup) return;

  appState.markerClusterGroup.clearLayers();

  const filtered = getFilteredAssets();

  filtered.forEach(asset => {
    if (!asset.koordinat || asset.koordinat.length < 2) return;

    // Pin color logic
    let markerColor = '#10b981';
    if (asset.kategori.includes("KIB B")) markerColor = '#3b82f6';
    if (asset.kategori.includes("KIB C")) markerColor = '#f59e0b';
    if (asset.kategori.includes("KIB D")) markerColor = '#8b5cf6';

    const customIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div style="background-color: ${markerColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <i class="fa fa-map-pin" style="font-size: 13px;"></i>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });

    const popupContent = `
      <div class="custom-map-popup">
        <img src="${asset.foto}" alt="${asset.namaBarang}" class="w-full h-32 object-cover">
        <div class="p-3">
          <span class="inline-block px-2 py-0.5 text-xs font-semibold rounded ${getKategoriBadgeClass(asset.kategori)} mb-1">
            ${asset.kategori.split(' - ')[0]}
          </span>
          <h4 class="font-bold text-gray-800 text-sm leading-snug line-clamp-2">${asset.namaBarang}</h4>
          <p class="text-xs text-gray-500 mt-1"><i class="fa fa-map-marker-alt text-red-500 mr-1"></i> ${asset.kabKota}</p>
          <p class="text-xs text-gray-700 font-semibold mt-1">Nilai: <span class="text-emerald-700">${formatRupiah(asset.nilaiWajar)}</span></p>
          <div class="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span class="text-[11px] font-medium text-gray-500">${asset.luas} ${asset.satuanLuas}</span>
            <button onclick="openDetailModal('${asset.id}')" class="px-2.5 py-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium transition">
              Detail Aset
            </button>
          </div>
        </div>
      </div>
    `;

    const marker = L.marker(asset.koordinat, { icon: customIcon })
      .bindPopup(popupContent, { maxWidth: 300 });

    appState.markerClusterGroup.addLayer(marker);
  });
}

// Table & Filtering Logic
function getFilteredAssets() {
  return appState.assets.filter(item => {
    // Search
    const searchMatch = !appState.filters.search || 
      item.namaBarang.toLowerCase().includes(appState.filters.search) ||
      item.kodeBarang.toLowerCase().includes(appState.filters.search) ||
      item.kabKota.toLowerCase().includes(appState.filters.search) ||
      item.namaOpd.toLowerCase().includes(appState.filters.search) ||
      item.alamat.toLowerCase().includes(appState.filters.search);

    // OPD
    const opdMatch = appState.filters.opd === 'Semua OPD' || item.namaOpd === appState.filters.opd;

    // Kab/Kota
    const kabKotaMatch = appState.filters.kabKota === 'Semua Wilayah' || item.kabKota === appState.filters.kabKota;

    // Kategori
    const katMatch = appState.filters.kategori === 'Semua Kategori' || item.kategori === appState.filters.kategori;

    // Status
    const statusMatch = appState.filters.status === 'Semua Status' || item.status === appState.filters.status;

    return searchMatch && opdMatch && kabKotaMatch && katMatch && statusMatch;
  });
}

function renderTable() {
  const tableBody = document.getElementById('asset-table-body');
  if (!tableBody) return;

  const filtered = getFilteredAssets();
  const totalItems = filtered.length;
  const { page, perPage } = appState.pagination;
  const totalPages = Math.ceil(totalItems / perPage) || 1;

  // Bounds check
  if (page > totalPages) appState.pagination.page = totalPages;

  const startIndex = (appState.pagination.page - 1) * perPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + perPage);

  tableBody.innerHTML = '';

  if (paginatedItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-gray-500">
          <i class="fa fa-folder-open text-4xl mb-3 text-gray-300"></i>
          <p class="font-medium">Tidak ada data aset idle yang cocok dengan filter pencarian.</p>
          <button onclick="document.getElementById('btn-reset-filter').click()" class="mt-2 text-sm text-emerald-700 underline font-semibold">
            Reset Filter
          </button>
        </td>
      </tr>
    `;
  } else {
    paginatedItems.forEach((asset, idx) => {
      const row = document.createElement('tr');
      row.className = "hover:bg-gray-50 transition border-b border-gray-100 text-sm";
      row.innerHTML = `
        <td class="py-3 px-4 text-center font-medium text-gray-500">${startIndex + idx + 1}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${asset.foto}" alt="" class="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm flex-shrink-0">
            <div>
              <div class="font-semibold text-gray-900 hover:text-emerald-800 cursor-pointer line-clamp-1" onclick="openDetailModal('${asset.id}')">
                ${asset.namaBarang}
              </div>
              <div class="text-xs text-gray-500 font-mono mt-0.5">Kode: ${asset.kodeBarang}</div>
              <span class="inline-block mt-1 px-2 py-0.5 text-[11px] font-semibold rounded ${getKategoriBadgeClass(asset.kategori)}">
                ${asset.kategori}
              </span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="text-gray-900 font-medium text-xs">${asset.namaOpd}</div>
          <div class="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <i class="fa fa-map-marker-alt text-red-500 text-[10px]"></i> ${asset.kabKota}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="font-medium text-gray-900 text-xs">${formatNumber(asset.luas)} ${asset.satuanLuas}</div>
          <div class="text-[11px] text-gray-500 mt-0.5">Kondisi: <span class="font-medium text-gray-700">${asset.kondisiFisik}</span></div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-emerald-800 text-xs">${formatRupiah(asset.nilaiWajar)}</div>
          <div class="text-[11px] text-gray-500 mt-0.5">Potensi PAD: <span class="text-emerald-600 font-medium">${formatRupiah(asset.potensiPAD)}/th</span></div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(asset.status)}">
            ${asset.status}
          </span>
          <div class="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <i class="fa ${asset.statusSertifikat === 'Bersertifikat Resmi' ? 'fa-check-circle text-emerald-500' : 'fa-clock text-amber-500'}"></i>
            ${asset.statusSertifikat}
          </div>
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openDetailModal('${asset.id}')" title="Lihat Dossier Aset" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition">
              <i class="fa fa-eye"></i>
            </button>
            <button onclick="openFormModal('${asset.id}')" title="Edit Aset" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition">
              <i class="fa fa-pencil-alt"></i>
            </button>
            <button onclick="confirmDeleteAsset('${asset.id}')" title="Hapus Aset" class="p-1.5 text-red-600 hover:bg-red-50 rounded transition">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Update table pagination footer
  const infoEl = document.getElementById('table-info');
  if (infoEl) {
    const from = totalItems > 0 ? startIndex + 1 : 0;
    const to = Math.min(startIndex + perPage, totalItems);
    infoEl.textContent = `Menampilkan ${from} - ${to} dari ${totalItems} data aset`;
  }

  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById('pagination-controls');
  if (!container) return;

  container.innerHTML = '';
  if (totalPages <= 1) return;

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = `px-3 py-1 text-xs rounded border ${appState.pagination.page === 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`;
  prevBtn.innerHTML = `<i class="fa fa-chevron-left mr-1"></i> Prev`;
  prevBtn.disabled = appState.pagination.page === 1;
  prevBtn.onclick = () => {
    if (appState.pagination.page > 1) {
      appState.pagination.page--;
      renderTable();
    }
  };
  container.appendChild(prevBtn);

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `px-3 py-1 text-xs rounded font-medium border ${appState.pagination.page === i ? 'bg-emerald-700 text-white border-emerald-700' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => {
      appState.pagination.page = i;
      renderTable();
    };
    container.appendChild(pageBtn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = `px-3 py-1 text-xs rounded border ${appState.pagination.page === totalPages ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`;
  nextBtn.innerHTML = `Next <i class="fa fa-chevron-right ml-1"></i>`;
  nextBtn.disabled = appState.pagination.page === totalPages;
  nextBtn.onclick = () => {
    if (appState.pagination.page < totalPages) {
      appState.pagination.page++;
      renderTable();
    }
  };
  container.appendChild(nextBtn);
}

// Detail Dossier Modal
function openDetailModal(assetId) {
  const asset = appState.assets.find(a => a.id === assetId);
  if (!asset) return;

  const modal = document.getElementById('modal-detail');
  if (!modal) return;

  // Fill in data
  document.getElementById('modal-detail-title').textContent = asset.namaBarang;
  document.getElementById('modal-detail-kode').textContent = `Kode Barang: ${asset.kodeBarang} | ID: ${asset.id}`;
  document.getElementById('modal-detail-opd').textContent = asset.namaOpd;
  document.getElementById('modal-detail-alamat').textContent = `${asset.alamat}, Kec. ${asset.kecamatan}, ${asset.kabKota}`;
  document.getElementById('modal-detail-luas').textContent = `${formatNumber(asset.luas)} ${asset.satuanLuas}`;
  document.getElementById('modal-detail-kondisi').textContent = asset.kondisiFisik;
  document.getElementById('modal-detail-tahun').textContent = asset.tahunPerolehan;
  document.getElementById('modal-detail-nilai-perolehan').textContent = formatRupiah(asset.nilaiPerolehan);
  document.getElementById('modal-detail-nilai-wajar').textContent = formatRupiah(asset.nilaiWajar);
  document.getElementById('modal-detail-potensi-pad').textContent = `${formatRupiah(asset.potensiPAD)} / tahun`;
  document.getElementById('modal-detail-legalitas').textContent = asset.legalitas;
  document.getElementById('modal-detail-sertifikat-status').textContent = asset.statusSertifikat;
  document.getElementById('modal-detail-alasan').textContent = asset.alasanIdle;
  document.getElementById('modal-detail-rencana').textContent = asset.rencanaAksi;
  document.getElementById('modal-detail-pj').textContent = asset.pjPenatausahaan;
  document.getElementById('modal-detail-kontak').textContent = asset.kontakPJ;
  
  // Status badge
  const statusBadge = document.getElementById('modal-detail-status-badge');
  if (statusBadge) {
    statusBadge.textContent = asset.status;
    statusBadge.className = `inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(asset.status)}`;
  }

  // Kategori badge
  const katBadge = document.getElementById('modal-detail-kategori-badge');
  if (katBadge) {
    katBadge.textContent = asset.kategori;
    katBadge.className = `inline-block px-3 py-1 text-xs font-semibold rounded-full ${getKategoriBadgeClass(asset.kategori)}`;
  }

  // Image
  const imgEl = document.getElementById('modal-detail-img');
  if (imgEl) {
    imgEl.src = asset.foto;
    imgEl.alt = asset.namaBarang;
  }

  // Google Maps coordinate link
  const gmapsBtn = document.getElementById('modal-detail-gmaps-link');
  if (gmapsBtn && asset.koordinat) {
    gmapsBtn.href = `https://www.google.com/maps?q=${asset.koordinat[0]},${asset.koordinat[1]}`;
    gmapsBtn.target = "_blank";
  }

  // Edit quick link
  const editBtn = document.getElementById('modal-detail-edit-btn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeDetailModal();
      openFormModal(asset.id);
    };
  }

  modal.classList.remove('hidden');
}

function closeDetailModal() {
  const modal = document.getElementById('modal-detail');
  if (modal) modal.classList.add('hidden');
}

// Form Modal (Add / Edit)
function openFormModal(assetId = null) {
  const modal = document.getElementById('modal-form');
  const formTitle = document.getElementById('modal-form-title');
  const form = document.getElementById('asset-form');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('form-asset-id').value = assetId || '';

  if (assetId) {
    const asset = appState.assets.find(a => a.id === assetId);
    if (asset) {
      formTitle.textContent = `Edit Pencatatan Aset Idle (${asset.id})`;
      document.getElementById('form-kode').value = asset.kodeBarang;
      document.getElementById('form-nama').value = asset.namaBarang;
      document.getElementById('form-kategori').value = asset.kategori;
      document.getElementById('form-opd').value = asset.namaOpd;
      document.getElementById('form-kabkota').value = asset.kabKota;
      document.getElementById('form-kecamatan').value = asset.kecamatan || '';
      document.getElementById('form-alamat').value = asset.alamat;
      document.getElementById('form-luas').value = asset.luas;
      document.getElementById('form-nilai-perolehan').value = asset.nilaiPerolehan;
      document.getElementById('form-nilai-wajar').value = asset.nilaiWajar;
      document.getElementById('form-potensi-pad').value = asset.potensiPAD;
      document.getElementById('form-status').value = asset.status;
      document.getElementById('form-legalitas').value = asset.legalitas;
      document.getElementById('form-status-sertifikat').value = asset.statusSertifikat;
      document.getElementById('form-kondisi').value = asset.kondisiFisik;
      document.getElementById('form-tahun').value = asset.tahunPerolehan;
      document.getElementById('form-alasan').value = asset.alasanIdle;
      document.getElementById('form-rencana').value = asset.rencanaAksi;
      document.getElementById('form-pj').value = asset.pjPenatausahaan;
      document.getElementById('form-kontak').value = asset.kontakPJ;
      document.getElementById('form-foto-url').value = asset.foto;
      if (asset.koordinat && asset.koordinat.length === 2) {
        document.getElementById('form-lat').value = asset.koordinat[0];
        document.getElementById('form-lng').value = asset.koordinat[1];
      }
    }
  } else {
    formTitle.textContent = "Catat Objek Aset Daerah Idle Baru";
    // Generate new random code and default coordinates around Padang
    const randomNum = Math.floor(100 + Math.random() * 900);
    document.getElementById('form-kode').value = `01.01.11.08.${randomNum}`;
    document.getElementById('form-lat').value = "-0.9471";
    document.getElementById('form-lng').value = "100.4172";
    document.getElementById('form-tahun').value = "2020";
    document.getElementById('form-foto-url').value = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80";
  }

  modal.classList.remove('hidden');
}

function closeFormModal() {
  const modal = document.getElementById('modal-form');
  if (modal) modal.classList.add('hidden');
}

function handleFormSubmit(e) {
  e.preventDefault();

  const assetId = document.getElementById('form-asset-id').value;
  const lat = parseFloat(document.getElementById('form-lat').value) || -0.9471;
  const lng = parseFloat(document.getElementById('form-lng').value) || 100.4172;

  const assetData = {
    id: assetId ? assetId : `AST-${String(appState.assets.length + 1).padStart(3, '0')}`,
    kodeBarang: document.getElementById('form-kode').value,
    namaBarang: document.getElementById('form-nama').value,
    kategori: document.getElementById('form-kategori').value,
    namaOpd: document.getElementById('form-opd').value,
    kabKota: document.getElementById('form-kabkota').value,
    kecamatan: document.getElementById('form-kecamatan').value,
    alamat: document.getElementById('form-alamat').value,
    luas: Number(document.getElementById('form-luas').value) || 0,
    satuanLuas: "m²",
    nilaiPerolehan: Number(document.getElementById('form-nilai-perolehan').value) || 0,
    nilaiWajar: Number(document.getElementById('form-nilai-wajar').value) || 0,
    potensiPAD: Number(document.getElementById('form-potensi-pad').value) || 0,
    status: document.getElementById('form-status').value,
    legalitas: document.getElementById('form-legalitas').value,
    statusSertifikat: document.getElementById('form-status-sertifikat').value,
    kondisiFisik: document.getElementById('form-kondisi').value,
    tahunPerolehan: Number(document.getElementById('form-tahun').value) || 2020,
    alasanIdle: document.getElementById('form-alasan').value,
    rencanaAksi: document.getElementById('form-rencana').value,
    koordinat: [lat, lng],
    foto: document.getElementById('form-foto-url').value || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
    pjPenatausahaan: document.getElementById('form-pj').value,
    kontakPJ: document.getElementById('form-kontak').value,
    dokumen: "BAST-Aset-Baru-2026.pdf"
  };

  if (assetId) {
    // Update
    const idx = appState.assets.findIndex(a => a.id === assetId);
    if (idx !== -1) {
      appState.assets[idx] = assetData;
      showToast('Data aset idle berhasil diperbarui!');
    }
  } else {
    // Add new to beginning
    appState.assets.unshift(assetData);
    showToast('Aset idle baru berhasil dicatat dalam SIMADA/SIP-IDLE!');
  }

  saveToStorage();
  closeFormModal();
  renderAllViews();
}

function confirmDeleteAsset(assetId) {
  const asset = appState.assets.find(a => a.id === assetId);
  if (!asset) return;

  if (confirm(`Apakah Anda yakin ingin menghapus pencatatan aset: "${asset.namaBarang}" (${asset.id})?`)) {
    appState.assets = appState.assets.filter(a => a.id !== assetId);
    saveToStorage();
    showToast('Aset telah dihapus dari inventarisasi');
    renderAllViews();
  }
}

function resetDefaultData() {
  if (confirm('Setel ulang seluruh data ke database contoh BPKAD Pemprov Sumbar? Seluruh perubahan lokal akan dikembalikan.')) {
    appState.assets = [...DEFAULT_ASSETS];
    saveToStorage();
    renderAllViews();
    showToast('Data default berhasil dipulihkan');
  }
}

// Catalog View (Peluang Kemitraan)
function renderCatalog() {
  const container = document.getElementById('catalog-cards-container');
  if (!container) return;

  // Filter only assets suitable for partnership or lease
  const catalogAssets = appState.assets.filter(a => 
    a.status.includes("Siap") || a.status.includes("Kemitraan") || a.status.includes("Sewa")
  );

  container.innerHTML = '';

  if (catalogAssets.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl p-8 border border-gray-200">
        <i class="fa fa-handshake text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">Saat ini belum ada aset yang berstatus Siap Kemitraan / Siap Sewa.</p>
      </div>
    `;
    return;
  }

  catalogAssets.forEach(asset => {
    const card = document.createElement('div');
    card.className = "bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col";
    card.innerHTML = `
      <div class="relative h-48 w-full overflow-hidden group">
        <img src="${asset.foto}" alt="${asset.namaBarang}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
        <div class="absolute top-3 left-3">
          <span class="px-2.5 py-1 text-xs font-semibold rounded shadow-sm ${getKategoriBadgeClass(asset.kategori)}">
            ${asset.kategori}
          </span>
        </div>
        <div class="absolute bottom-3 right-3">
          <span class="px-2.5 py-1 text-xs font-bold rounded shadow-sm ${getStatusBadgeClass(asset.status)}">
            ${asset.status}
          </span>
        </div>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div class="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
            <i class="fa fa-map-marker-alt text-red-500"></i> ${asset.kabKota}
          </div>
          <h3 class="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-2 hover:text-emerald-800 cursor-pointer" onclick="openDetailModal('${asset.id}')">
            ${asset.namaBarang}
          </h3>
          <p class="text-xs text-gray-600 line-clamp-2 mb-4">${asset.rencanaAksi}</p>
          
          <div class="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg text-xs mb-4">
            <div>
              <span class="text-gray-500 block">Luas Tersedia:</span>
              <span class="font-bold text-gray-800">${formatNumber(asset.luas)} ${asset.satuanLuas}</span>
            </div>
            <div>
              <span class="text-gray-500 block">Estimasi Tarif/PAD:</span>
              <span class="font-bold text-emerald-700">${formatRupiah(asset.potensiPAD)}/th</span>
            </div>
            <div class="col-span-2 pt-1 border-t border-gray-200">
              <span class="text-gray-500">Legalitas:</span>
              <span class="font-medium text-gray-700 truncate block">${asset.legalitas}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button onclick="openDetailModal('${asset.id}')" class="flex-1 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition text-center">
            Lihat Dossier
          </button>
          <button onclick="openInterestModal('${asset.id}')" class="flex-1 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition text-center shadow-sm">
            Ajukan Minat
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function openInterestModal(assetId) {
  const asset = appState.assets.find(a => a.id === assetId);
  if (!asset) return;

  const modal = document.getElementById('modal-interest');
  if (!modal) return;

  document.getElementById('interest-asset-id').value = asset.id;
  document.getElementById('interest-asset-name').textContent = `${asset.namaBarang} (${asset.kabKota})`;
  document.getElementById('interest-asset-luas').textContent = `Luas: ${formatNumber(asset.luas)} ${asset.satuanLuas} | Nilai Wajar: ${formatRupiah(asset.nilaiWajar)}`;
  
  modal.classList.remove('hidden');
}

function closeInterestModal() {
  const modal = document.getElementById('modal-interest');
  if (modal) modal.classList.add('hidden');
}

function handleInterestSubmit(e) {
  e.preventDefault();
  const nama = document.getElementById('interest-nama').value;
  const institusi = document.getElementById('interest-institusi').value;
  
  showToast(`Terima kasih Bapak/Ibu ${nama} (${institusi}). Surat Pernyataan Minat (Letter of Intent) Anda telah terkirim ke Sekretariat Tim Pemanfaatan BMD BPKAD Provinsi Sumatera Barat!`);
  closeInterestModal();
}

// Reports & Rekonsiliasi BMD
function renderReports() {
  const reportTable = document.getElementById('report-summary-table');
  if (!reportTable) return;

  // Group by OPD
  const opdSummary = {};
  appState.assets.forEach(a => {
    if (!opdSummary[a.namaOpd]) {
      opdSummary[a.namaOpd] = {
        totalUnit: 0,
        luas: 0,
        nilaiPerolehan: 0,
        nilaiWajar: 0,
        potensiPAD: 0
      };
    }
    opdSummary[a.namaOpd].totalUnit++;
    opdSummary[a.namaOpd].luas += Number(a.luas) || 0;
    opdSummary[a.namaOpd].nilaiPerolehan += Number(a.nilaiPerolehan) || 0;
    opdSummary[a.namaOpd].nilaiWajar += Number(a.nilaiWajar) || 0;
    opdSummary[a.namaOpd].potensiPAD += Number(a.potensiPAD) || 0;
  });

  reportTable.innerHTML = '';
  let grandTotal = { totalUnit: 0, luas: 0, nilaiPerolehan: 0, nilaiWajar: 0, potensiPAD: 0 };

  Object.keys(opdSummary).forEach((opd, idx) => {
    const data = opdSummary[opd];
    grandTotal.totalUnit += data.totalUnit;
    grandTotal.luas += data.luas;
    grandTotal.nilaiPerolehan += data.nilaiPerolehan;
    grandTotal.nilaiWajar += data.nilaiWajar;
    grandTotal.potensiPAD += data.potensiPAD;

    const tr = document.createElement('tr');
    tr.className = "border-b border-gray-200 text-xs hover:bg-gray-50";
    tr.innerHTML = `
      <td class="py-2.5 px-3 text-center">${idx + 1}</td>
      <td class="py-2.5 px-3 font-medium text-gray-900">${opd}</td>
      <td class="py-2.5 px-3 text-center">${data.totalUnit}</td>
      <td class="py-2.5 px-3 text-right">${formatNumber(data.luas)} m²</td>
      <td class="py-2.5 px-3 text-right">${formatRupiah(data.nilaiPerolehan)}</td>
      <td class="py-2.5 px-3 text-right font-semibold text-emerald-800">${formatRupiah(data.nilaiWajar)}</td>
      <td class="py-2.5 px-3 text-right text-emerald-600">${formatRupiah(data.potensiPAD)}</td>
    `;
    reportTable.appendChild(tr);
  });

  // Footer Grand Total
  const totalRow = document.createElement('tr');
  totalRow.className = "bg-gray-100 font-bold text-xs border-t-2 border-gray-300 text-gray-900";
  totalRow.innerHTML = `
    <td colspan="2" class="py-3 px-3 text-center uppercase">Total Rekapitulasi</td>
    <td class="py-3 px-3 text-center">${grandTotal.totalUnit} Objek</td>
    <td class="py-3 px-3 text-right">${formatNumber(grandTotal.luas)} m²</td>
    <td class="py-3 px-3 text-right">${formatRupiah(grandTotal.nilaiPerolehan)}</td>
    <td class="py-3 px-3 text-right text-emerald-800">${formatRupiah(grandTotal.nilaiWajar)}</td>
    <td class="py-3 px-3 text-right text-emerald-700">${formatRupiah(grandTotal.potensiPAD)}</td>
  `;
  reportTable.appendChild(totalRow);
}

// Export CSV Feature
function exportToCSV() {
  const filtered = getFilteredAssets();
  if (filtered.length === 0) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }

  const headers = [
    "No",
    "ID Aset",
    "Kode Barang",
    "Nama Barang / Objek Aset",
    "Klasifikasi KIB",
    "OPD Pengurus",
    "Kabupaten / Kota",
    "Kecamatan",
    "Alamat",
    "Luas (m2)",
    "Nilai Perolehan (Rp)",
    "Estimasi Nilai Wajar (Rp)",
    "Potensi PAD per Tahun (Rp)",
    "Status Penggunaan / Idle",
    "Legalitas",
    "Status Sertifikat",
    "Kondisi Fisik",
    "Tahun Perolehan",
    "Alasan Idle",
    "Rencana Optimalisasi",
    "Penanggung Jawab",
    "Kontak"
  ];

  const rows = filtered.map((a, idx) => [
    idx + 1,
    `"${a.id}"`,
    `"${a.kodeBarang}"`,
    `"${a.namaBarang.replace(/"/g, '""')}"`,
    `"${a.kategori}"`,
    `"${a.namaOpd.replace(/"/g, '""')}"`,
    `"${a.kabKota}"`,
    `"${a.kecamatan || ''}"`,
    `"${a.alamat.replace(/"/g, '""')}"`,
    a.luas,
    a.nilaiPerolehan,
    a.nilaiWajar,
    a.potensiPAD,
    `"${a.status}"`,
    `"${a.legalitas.replace(/"/g, '""')}"`,
    `"${a.statusSertifikat}"`,
    `"${a.kondisiFisik}"`,
    a.tahunPerolehan,
    `"${a.alasanIdle.replace(/"/g, '""')}"`,
    `"${a.rencanaAksi.replace(/"/g, '""')}"`,
    `"${a.pjPenatausahaan}"`,
    `"${a.kontakPJ}"`
  ]);

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Rekap_Aset_Daerah_Idle_Pemprov_Sumbar_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("File CSV Berhasil Diunduh!");
}

// Print Official Report
function printOfficialReport() {
  const printArea = document.getElementById('print-area');
  if (!printArea) return;

  const filtered = getFilteredAssets();
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  printArea.innerHTML = `
    <div style="font-family: 'Times New Roman', serif; color: black; line-height: 1.3;">
      <!-- KOP RESMI PEMERINTAH PROVINSI -->
      <div style="display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px;">
        <img src="https://ditjenpktn.kemendag.go.id/storage/webconfig/V6QvuT4trifcVUV7Zh7ZTKkezTudgcjGtkKTTbNl.png" style="width: 75px; height: auto; margin-right: 20px;" alt="Logo Prov">
        <div style="text-align: center; flex: 1;">
          <h3 style="margin: 0; font-size: 16pt; font-weight: bold; letter-spacing: 1px;">PEMERINTAH PROVINSI SUMATERA BARAT</h3>
          <h2 style="margin: 3px 0; font-size: 18pt; font-weight: bold;">BADAN PENGELOLAAN KEUANGAN DAN ASET DAERAH</h2>
          <p style="margin: 0; font-size: 10pt; font-style: italic;">Jl. Jenderal Sudirman No. 43, Kota Padang, Sumatera Barat 25129</p>
          <p style="margin: 0; font-size: 10pt;">Telepon: (0751) 31542 | Pos-el: bpkad@sumbarprov.go.id | Laman: sumbarprov.go.id</p>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <h4 style="margin: 0; text-decoration: underline; font-size: 13pt; font-weight: bold;">BERITA ACARA REKAPITULASI INVENTARISASI BARANG MILIK DAERAH (BMD) IDLE</h4>
        <p style="margin: 4px 0 0; font-size: 10pt;">Nomor: 028/BPKAD-ASET/REKAP-IDLE/${new Date().getFullYear()}</p>
      </div>

      <p style="font-size: 10pt; text-align: justify; margin-bottom: 15px;">
        Pada hari ini, tanggal <strong>${currentDate}</strong>, berdasarkan hasil penatausahaan dan rekonsiliasi berkala terhadap Barang Milik Daerah (BMD) di lingkungan Pemerintah Provinsi Sumatera Barat sesuai amanat Permendagri No. 47 Tahun 2021 tentang Tata Cara Pelaksanaan Pembukuan, Inventarisasi, dan Pelaporan BMD, berikut disampaikan rincian objek aset yang berada dalam kondisi tidak digunakan / belum dioptimalkan (<em>Aset Idle</em>):
      </p>

      <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 25px;" border="1">
        <thead>
          <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
            <th style="padding: 6px;">No</th>
            <th style="padding: 6px;">Kode Barang</th>
            <th style="padding: 6px;">Nama Aset / Uraian Objek</th>
            <th style="padding: 6px;">Kategori KIB</th>
            <th style="padding: 6px;">OPD Pengguna</th>
            <th style="padding: 6px;">Lokasi Wilayah</th>
            <th style="padding: 6px;">Luas</th>
            <th style="padding: 6px;">Estimasi Nilai Wajar (Rp)</th>
            <th style="padding: 6px;">Status / Rekomendasi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((a, i) => `
            <tr>
              <td style="padding: 5px; text-align: center;">${i + 1}</td>
              <td style="padding: 5px; font-family: monospace;">${a.kodeBarang}</td>
              <td style="padding: 5px; font-weight: 600;">${a.namaBarang}</td>
              <td style="padding: 5px;">${a.kategori.split(' - ')[0]}</td>
              <td style="padding: 5px;">${a.namaOpd}</td>
              <td style="padding: 5px;">${a.kabKota}</td>
              <td style="padding: 5px; text-align: right;">${formatNumber(a.luas)} ${a.satuanLuas}</td>
              <td style="padding: 5px; text-align: right; font-weight: bold;">${formatRupiah(a.nilaiWajar)}</td>
              <td style="padding: 5px;">${a.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- TANDA TANGAN -->
      <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 10.5pt; page-break-inside: avoid;">
        <div style="text-align: center; width: 45%;">
          <p style="margin: 0;">Mengetahui,</p>
          <p style="margin: 0; font-weight: bold;">Kepala Bidang Pengelolaan Aset Daerah</p>
          <div style="height: 70px;"></div>
          <p style="margin: 0; font-weight: bold; text-decoration: underline;">Drs. H. MULYADI, M.Si</p>
          <p style="margin: 0;">NIP. 19740512 199903 1 004</p>
        </div>
        <div style="text-align: center; width: 45%;">
          <p style="margin: 0;">Padang, ${currentDate}</p>
          <p style="margin: 0; font-weight: bold;">Sekretaris Daerah Selaku Pengelola BMD</p>
          <div style="height: 70px;"></div>
          <p style="margin: 0; font-weight: bold; text-decoration: underline;">Drs. HANSALDI PUTRA, S.E., M.M.</p>
          <p style="margin: 0;">NIP. 19710820 199602 1 002</p>
        </div>
      </div>
    </div>
  `;

  window.print();
}

// Toast Notification
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-5 right-5 z-50 bg-emerald-800 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 text-sm transform transition duration-300 opacity-0 translate-y-3';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa fa-check-circle text-emerald-300 text-lg"></i> <span>${message}</span>`;
  toast.classList.remove('opacity-0', 'translate-y-3');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-3');
  }, 3500);
}

// ==========================================
// FITUR TAMBAHAN: IMPORT CSV, AKSESIBILITAS, SHORTCUT
// ==========================================

// Trigger file input dialog
function triggerCSVUpload() {
  const fileInput = document.getElementById('csv-file-input');
  if (fileInput) fileInput.click();
}

// Download Standard CSV Template
function downloadTemplateCSV() {
  const templateHeaders = [
    "ID Aset",
    "Kode Barang",
    "Nama Barang / Objek Aset",
    "Klasifikasi KIB",
    "OPD Pengurus",
    "Kabupaten / Kota",
    "Kecamatan",
    "Alamat",
    "Luas (m2)",
    "Nilai Perolehan (Rp)",
    "Estimasi Nilai Wajar (Rp)",
    "Potensi PAD per Tahun (Rp)",
    "Status Penggunaan / Idle",
    "Legalitas",
    "Status Sertifikat",
    "Kondisi Fisik",
    "Tahun Perolehan",
    "Alasan Idle",
    "Rencana Optimalisasi",
    "Latitude",
    "Longitude",
    "URL Foto",
    "Penanggung Jawab",
    "Kontak"
  ];

  const sampleRows = [
    [
      "AST-NEW-01",
      "01.01.11.05.001",
      "Lahan Cadangan UPTD Balai Benih Induk",
      "KIB A - Tanah",
      "Dinas Perkebunan, Tanaman Pangan dan Hortikultura",
      "Kab. Agam",
      "Lubuk Basung",
      "Jl. Pertanian Nagari Manggopoh",
      "7500",
      "3500000000",
      "8500000000",
      "220000000",
      "Siap Kemitraan (KSP/BGS)",
      "SHP Pemprov No. 09/Manggopoh",
      "Bersertifikat Resmi",
      "Lahan Terbuka Terpagar",
      "2015",
      "Pengurangan plot pembibitan tanaman pangan",
      "Rencana KSP sentra pembibitan alpukat & durian unggul",
      "-0.3120",
      "100.0150",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
      "Ir. Rinaldi (Kasie Produksi)",
      "0812-7711-2233"
    ]
  ];

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    + [templateHeaders.join(","), ...sampleRows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "Template_Import_Aset_Idle_BPKAD.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Template CSV Import berhasil diunduh");
}

// Handle CSV File Upload & Parsing
function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      
      if (lines.length < 2) {
        alert("File CSV tidak memiliki baris data!");
        return;
      }

      let importedCount = 0;
      // Skip header line (index 0)
      for (let i = 1; i < lines.length; i++) {
        // Simple regex to parse CSV taking into account quotes
        const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        const row = lines[i].split(',').map(item => item.replace(/^"|"$/g, '').trim());

        if (row.length >= 6 && row[2]) {
          const newAsset = {
            id: row[0] || `AST-${String(appState.assets.length + 1).padStart(3, '0')}`,
            kodeBarang: row[1] || `01.01.11.08.${Math.floor(100 + Math.random()*900)}`,
            namaBarang: row[2],
            kategori: row[3] || "KIB A - Tanah",
            namaOpd: row[4] || "Badan Pengelolaan Keuangan dan Aset Daerah",
            kabKota: row[5] || "Kota Padang",
            kecamatan: row[6] || "",
            alamat: row[7] || "Lokasi Aset",
            luas: Number(row[8]) || 1000,
            satuanLuas: "m²",
            nilaiPerolehan: Number(row[9]) || 1000000000,
            nilaiWajar: Number(row[10]) || 2000000000,
            potensiPAD: Number(row[11]) || 100000000,
            status: row[12] || "Proses Kajian Kelayakan",
            legalitas: row[13] || "Dalam Proses Sertifikasi",
            statusSertifikat: row[14] || "Bersertifikat Resmi",
            kondisiFisik: row[15] || "Baik",
            tahunPerolehan: Number(row[16]) || 2020,
            alasanIdle: row[17] || "Hasil rekonsiliasi data inventarisasi baru",
            rencanaAksi: row[18] || "Penyusunan kajian pemanfaatan pihak ketiga",
            koordinat: [
              parseFloat(row[19]) || -0.9471 + (Math.random() * 0.1 - 0.05),
              parseFloat(row[20]) || 100.4172 + (Math.random() * 0.1 - 0.05)
            ],
            foto: row[21] || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
            pjPenatausahaan: row[22] || "Bidang Aset BPKAD",
            kontakPJ: row[23] || "0812-3456-7890",
            dokumen: "BAST-Import-2026.pdf"
          };

          appState.assets.unshift(newAsset);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        saveToStorage();
        renderAllViews();
        showToast(`Berhasil mengimpor ${importedCount} data aset idle ke sistem!`);
      } else {
        alert("Gagal membaca baris data CSV. Pastikan format kolom sesuai template.");
      }
    } catch (err) {
      console.error("Error import CSV:", err);
      alert("Terjadi kesalahan saat memproses file CSV: " + err.message);
    }
  };

  reader.readAsText(file);
  event.target.value = ""; // Reset file input
}

// Quick Status Filter Pills
function setQuickStatusFilter(status) {
  appState.filters.status = status;
  const statusSelect = document.getElementById('filter-status');
  if (statusSelect) statusSelect.value = status;
  appState.pagination.page = 1;
  renderTable();
  renderMap();

  // Update quick pills style
  document.querySelectorAll('.quick-status-pill').forEach(pill => {
    if (pill.getAttribute('data-status') === status) {
      pill.className = "quick-status-pill px-3 py-1 text-xs font-bold rounded-full bg-emerald-700 text-white shadow-sm transition";
    } else {
      pill.className = "quick-status-pill px-3 py-1 text-xs font-semibold rounded-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition";
    }
  });
}

// Modal Detail Tab Switcher
function switchDetailModalTab(tabName) {
  document.querySelectorAll('.detail-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-modal-tab') === tabName) {
      btn.className = "detail-tab-btn px-4 py-2 text-xs font-bold text-emerald-800 border-b-2 border-emerald-700 transition";
    } else {
      btn.className = "detail-tab-btn px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition";
    }
  });

  document.querySelectorAll('.detail-tab-pane').forEach(pane => {
    if (pane.id === `detail-pane-${tabName}`) {
      pane.classList.remove('hidden');
    } else {
      pane.classList.add('hidden');
    }
  });
}

// Accessibility Tools: Font Size Adjuster
let currentFontSizeLevel = 0; // -1: small, 0: normal, 1: large
function adjustFontSize(delta) {
  currentFontSizeLevel += delta;
  if (currentFontSizeLevel > 2) currentFontSizeLevel = 2;
  if (currentFontSizeLevel < -1) currentFontSizeLevel = -1;

  const html = document.documentElement;
  if (currentFontSizeLevel === 1) {
    html.style.fontSize = '17px';
    showToast("Ukuran teks: Sedang (+1)");
  } else if (currentFontSizeLevel === 2) {
    html.style.fontSize = '18.5px';
    showToast("Ukuran teks: Besar (+2)");
  } else if (currentFontSizeLevel === -1) {
    html.style.fontSize = '14.5px';
    showToast("Ukuran teks: Kecil (-1)");
  } else {
    html.style.fontSize = '16px';
    showToast("Ukuran teks: Standar");
  }
}

// Accessibility Tools: Dark Mode Toggle
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('sip_idle_dark_mode', isDark ? 'true' : 'false');
  
  const icon = document.getElementById('dark-mode-icon');
  if (icon) {
    icon.className = isDark ? "fa fa-sun text-amber-300" : "fa fa-moon text-slate-300";
  }
  showToast(isDark ? "Mode Gelap Diaktifkan" : "Mode Terang Diaktifkan");
}

// Keyboard Shortcut: Press "/" to focus search
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      switchTab('list');
      searchInput.focus();
      searchInput.select();
    }
  }
});


