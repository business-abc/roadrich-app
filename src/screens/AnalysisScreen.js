/**
 * ROADRICH - Analysis Screen
 * Visualisation avancée des dépenses avec donut chart et ghost curve
 */

import { getExpenses, getCategories, getProfile } from '../lib/supabase.js';

// State
let currentPeriod = 'current'; // 'current', 'last', 'year'
let selectedCategory = null; // null = all categories
let analysisData = null;
let container = null;
let callbacks = null;

export async function renderAnalysisScreen(containerEl, { userId, onBack, onCategorySelect, onAddExpense }) {
  container = containerEl;
  callbacks = { userId, onBack, onCategorySelect, onAddExpense };

  // Show loading state
  container.innerHTML = `
    <div class="analysis-screen">
      <div class="analysis-loading">
        <div class="spinner" style="width: 40px; height: 40px;"></div>
      </div>
    </div>
  `;

  try {
    await loadAnalysisData(userId);
    renderScreen();
  } catch (error) {
    console.error('Analysis error:', error);
    container.innerHTML = `
      <div class="analysis-screen" style="align-items: center; justify-content: center; text-align: center; padding: var(--space-xl);">
        <p style="color: var(--color-error); margin-bottom: var(--space-md);">Erreur de chargement</p>
        <button class="btn-primary" onclick="location.reload()">Réessayer</button>
      </div>
    `;
  }
}

async function loadAnalysisData(userId) {
  const now = new Date();
  let startDate, endDate, prevStartDate, prevEndDate;

  if (currentPeriod === 'current') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  } else if (currentPeriod === 'last') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
    prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0];
  } else { // year
    startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    prevStartDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
    prevEndDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
  }

  const [{ data: expenses }, { data: prevExpenses }, { data: categories }, { data: profile }] = await Promise.all([
    getExpenses(userId, startDate, endDate),
    getExpenses(userId, prevStartDate, prevEndDate),
    getCategories(userId),
    getProfile(userId)
  ]);

  analysisData = {
    expenses: expenses || [],
    prevExpenses: prevExpenses || [],
    categories: categories || [],
    profile,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate
  };
}

function renderScreen() {
  const { categories, expenses } = analysisData;

  // Calculate category totals for donut
  const categoryTotals = categories.map(cat => {
    const total = expenses
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return { ...cat, total };
  }).filter(cat => cat.total > 0);

  const grandTotal = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);

  container.innerHTML = `
    <div class="analysis-screen">
      <!-- Header -->
      <header class="analysis-header">
        <button class="analysis-back-btn" id="back-btn" aria-label="Retour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="analysis-title">Analyse</h1>
        <div style="width: 44px;"></div>
      </header>

      <!-- Time Selector -->
      <div class="time-selector">
        <button class="time-btn ${currentPeriod === 'current' ? 'active' : ''}" data-period="current">
          Ce mois
        </button>
        <button class="time-btn ${currentPeriod === 'last' ? 'active' : ''}" data-period="last">
          Mois dernier
        </button>
        <button class="time-btn ${currentPeriod === 'year' ? 'active' : ''}" data-period="year">
          Année
        </button>
      </div>

      <!-- Content -->
      <div class="analysis-content">
        <!-- Category Carousel Section -->
        <div class="analysis-card">
          <h2 class="analysis-card-title">Répartition</h2>
          ${renderCategoryCarousel(categoryTotals, grandTotal)}
        </div>

        <!-- Ghost Curve Section -->
        <div class="analysis-card">
          <div class="ghost-curve-header">
            <h2 class="analysis-card-title">Évolution</h2>
            <div class="category-filter">
              <select id="category-filter" class="category-select">
                <option value="all" ${selectedCategory === null ? 'selected' : ''}>Toutes catégories</option>
                ${categories.map(cat => `
                  <option value="${cat.id}" ${selectedCategory === cat.id ? 'selected' : ''}>
                    ${cat.icon} ${cat.name}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          ${renderGhostCurve()}
        </div>
      </div>

      <!-- Bottom Nav -->
      <nav class="floating-dock">
        <button class="dock-item" id="home-btn" aria-label="Accueil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
        <button class="dock-add-btn" id="add-expense-btn" aria-label="Ajouter une dépense">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="dock-item active" aria-label="Statistiques">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </button>
      </nav>
    </div>
  `;

  setupEventListeners();
}

function renderCategoryCarousel(categoryTotals, grandTotal) {
  const { prevExpenses, categories, expenses } = analysisData;

  if (categoryTotals.length === 0) {
    return `
      <div class="carousel-empty">
        <span class="carousel-empty-icon">📊</span>
        <span>Aucune dépense</span>
      </div>
    `;
  }

  // Calculate stats for each category
  const cardsData = categoryTotals.map(cat => {
    const catExpenses = expenses.filter(e => e.category_id === cat.id);
    const expenseCount = catExpenses.length;
    const percentOfTotal = grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0;

    // Previous month comparison (same day of month)
    const now = new Date();
    const currentDay = now.getDate();

    // Get prev month expenses for this category up to the same day
    const prevCatExpenses = prevExpenses.filter(e => {
      if (e.category_id !== cat.id) return false;
      const expDate = new Date(e.date);
      return expDate.getDate() <= currentDay;
    });
    const prevTotal = prevCatExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate current month up to today only for fair comparison
    const currentCatExpensesToday = catExpenses.filter(e => {
      const expDate = new Date(e.date);
      return expDate.getDate() <= currentDay;
    });
    const currentTotalToday = currentCatExpensesToday.reduce((sum, e) => sum + e.amount, 0);

    const variation = prevTotal > 0
      ? Math.round(((currentTotalToday - prevTotal) / prevTotal) * 100)
      : (currentTotalToday > 0 ? 100 : 0);

    return {
      ...cat,
      expenseCount,
      percentOfTotal,
      variation,
      prevTotal
    };
  });

  return `
    <div class="category-carousel">
      <div class="carousel-track" id="carousel-track">
        ${cardsData.map((cat, index) => `
          <div class="carousel-card" data-index="${index}" data-category-id="${cat.id}" style="--card-accent-color: ${cat.color}; cursor: pointer;">
            <div class="carousel-card-header">
              <div class="carousel-card-icon" style="background: ${cat.color}20; color: ${cat.color};">
                ${cat.icon}
              </div>
              <div class="carousel-card-title">${cat.name}</div>
            </div>
            
            <div class="carousel-amount-row">
              <div class="carousel-card-amount">${formatCurrency(cat.total)}</div>
              <div class="carousel-variation ${cat.variation < 0 ? 'positive' : cat.variation > 0 ? 'negative' : ''}">
                ${cat.variation === 0 ? '=' : cat.variation > 0 ? `+${cat.variation}%` : `${cat.variation}%`}
              </div>
            </div>
            
            <div class="carousel-card-stats">
              <div class="carousel-stat">
                <span class="carousel-stat-label">Dépenses</span>
                <span class="carousel-stat-value">${cat.expenseCount}</span>
              </div>
              <div class="carousel-stat">
                <span class="carousel-stat-label">% du total</span>
                <span class="carousel-stat-value neon-text">${cat.percentOfTotal}%</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="carousel-indicators">
        ${cardsData.map((_, index) => `
          <button class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>
        `).join('')}
      </div>
      
      <div class="carousel-total">
        <span class="carousel-total-label">Total du mois</span>
        <span class="carousel-total-amount">${formatCurrency(grandTotal)}</span>
      </div>
    </div>
  `;
}

function renderGhostCurve() {
  const { expenses, prevExpenses, startDate, endDate } = analysisData;

  // Filter by category if selected
  const filteredExpenses = selectedCategory
    ? expenses.filter(e => e.category_id === selectedCategory)
    : expenses;
  const filteredPrevExpenses = selectedCategory
    ? prevExpenses.filter(e => e.category_id === selectedCategory)
    : prevExpenses;

  // Get number of days in period
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysInPeriod = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const isYear = currentPeriod === 'year';
  const dataPoints = isYear ? 12 : Math.min(daysInPeriod, 31);

  // Build cumulative data
  const currentData = buildCumulativeData(filteredExpenses, startDate, dataPoints, isYear);
  const prevData = buildCumulativeData(filteredPrevExpenses, analysisData.prevStartDate, dataPoints, isYear);

  const maxValue = Math.max(
    ...currentData,
    ...prevData,
    1 // Avoid division by zero
  );

  // SVG dimensions
  const width = 320;
  const height = 150;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate path points
  const currentPath = generatePath(currentData, chartWidth, chartHeight, maxValue, padding);
  const prevPath = generatePath(prevData, chartWidth, chartHeight, maxValue, padding);

  // Current total vs previous
  const currentTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevTotal = filteredPrevExpenses.reduce((sum, e) => sum + e.amount, 0);
  const diff = currentTotal - prevTotal;
  const diffPercent = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0;

  return `
    <div class="ghost-curve-container">
      <svg class="ghost-curve-svg" viewBox="0 0 ${width} ${height}">
        <!-- Grid lines -->
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + chartHeight * (1 - ratio);
    return `<line class="grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`;
  }).join('')}
        
        <!-- Previous month curve (ghost) -->
        <polyline class="curve-ghost" points="${prevPath}" />
        
        <!-- Current month curve (neon) -->
        <polyline class="curve-current" points="${currentPath}" />
        
        <!-- X-axis labels -->
        ${isYear ?
      ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, i) => {
        const x = padding.left + (i / 11) * chartWidth;
        return `<text class="axis-label" x="${x}" y="${height - 5}">${label}</text>`;
      }).join('') :
      [1, Math.floor(dataPoints / 2), dataPoints].map((day, i) => {
        const x = padding.left + ((day - 1) / (dataPoints - 1)) * chartWidth;
        return `<text class="axis-label" x="${x}" y="${height - 5}">${day}</text>`;
      }).join('')
    }
      </svg>
      
      <div class="ghost-curve-legend">
        <div class="legend-item current">
          <span class="legend-line"></span>
          <span>${currentPeriod === 'year' ? 'Cette année' : 'Ce mois'}</span>
          <span class="legend-amount">${formatCurrency(currentTotal)}</span>
        </div>
        <div class="legend-item ghost">
          <span class="legend-line"></span>
          <span>${currentPeriod === 'year' ? 'Année dernière' : 'Mois précédent'}</span>
          <span class="legend-amount">${formatCurrency(prevTotal)}</span>
        </div>
      </div>
      
      <div class="ghost-curve-insight ${diff < 0 ? 'positive' : diff > 0 ? 'negative' : ''}">
        ${diff === 0 ? 'Identique' : diff < 0
      ? `↓ ${formatCurrency(Math.abs(diff))} (${Math.abs(diffPercent)}%) d'économie`
      : `↑ ${formatCurrency(diff)} (+${diffPercent}%) de plus`
    }
      </div>
    </div>
  `;
}

function buildCumulativeData(expenses, startDate, dataPoints, isYear) {
  const data = new Array(dataPoints).fill(0);
  const start = new Date(startDate);

  expenses.forEach(exp => {
    const expDate = new Date(exp.date);
    let index;

    if (isYear) {
      index = expDate.getMonth();
    } else {
      index = Math.floor((expDate - start) / (1000 * 60 * 60 * 24));
    }

    if (index >= 0 && index < dataPoints) {
      data[index] += exp.amount;
    }
  });

  // Make cumulative
  for (let i = 1; i < data.length; i++) {
    data[i] += data[i - 1];
  }

  return data;
}

function generatePath(data, chartWidth, chartHeight, maxValue, padding) {
  return data.map((value, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight * (1 - value / maxValue);
    return `${x},${y}`;
  }).join(' ');
}

function setupEventListeners() {
  // Back button
  container.querySelector('#back-btn')?.addEventListener('click', () => {
    if (callbacks.onBack) callbacks.onBack();
  });

  // Home button
  container.querySelector('#home-btn')?.addEventListener('click', () => {
    if (callbacks.onBack) callbacks.onBack();
  });

  // Add expense button
  container.querySelector('#add-expense-btn')?.addEventListener('click', () => {
    if (callbacks.onAddExpense) callbacks.onAddExpense();
  });

  // Time selector
  container.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const period = btn.dataset.period;
      if (period !== currentPeriod) {
        currentPeriod = period;
        selectedCategory = null; // Reset filter on period change
        container.querySelector('.analysis-content').style.opacity = '0.5';
        await loadAnalysisData(callbacks.userId);
        renderScreen();
      }
    });
  });

  // Category filter for ghost curve
  container.querySelector('#category-filter')?.addEventListener('change', (e) => {
    selectedCategory = e.target.value === 'all' ? null : e.target.value;
    const curveContainer = container.querySelector('.ghost-curve-container');
    if (curveContainer) {
      curveContainer.innerHTML = '';
      curveContainer.outerHTML = renderGhostCurve();
      // Re-attach filter listener
      container.querySelector('#category-filter')?.addEventListener('change', arguments.callee);
    }
  });

  // Carousel scroll tracking
  const carouselTrack = container.querySelector('#carousel-track');
  const carouselDots = container.querySelectorAll('.carousel-dot');

  if (carouselTrack && carouselDots.length > 0) {
    // Scroll event to update active dot
    carouselTrack.addEventListener('scroll', () => {
      const scrollLeft = carouselTrack.scrollLeft;
      const cardWidth = carouselTrack.querySelector('.carousel-card')?.offsetWidth || 1;
      const gap = 16; // var(--space-md)
      const activeIndex = Math.round(scrollLeft / (cardWidth + gap));

      carouselDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
      });
    });

    // Click on dots to scroll
    carouselDots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        const index = parseInt(dot.dataset.index);
        const card = carouselTrack.querySelector(`.carousel-card[data-index="${index}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    });

    // Click on cards to navigate
    container.querySelectorAll('.carousel-card').forEach(card => {
      card.addEventListener('click', () => {
        const categoryId = card.dataset.categoryId;
        if (callbacks.onCategorySelect && categoryId) {
          callbacks.onCategorySelect(categoryId);
        }
      });
    });
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
