/**
 * ROADRICH - Dashboard Screen
 * Main screen with Bento Grid layout
 */

import { signOut, getDashboardData, getExpenses, deleteExpense, updateExpense, getCategories } from '../lib/supabase.js';

// State
let privacyMode = false;
let dashboardData = null;
let currentContainer = null;
let currentCallbacks = null;

export async function renderDashboardScreen(container, { userId, onLogout, onAddExpense, onAddCategory, onEditCategory, onAnalysis, onExpensesList }) {
  currentContainer = container;
  currentCallbacks = { userId, onLogout, onAddExpense, onAddCategory, onEditCategory, onAnalysis, onExpensesList };

  // Show loading state
  container.innerHTML = `
    <div class="dashboard-screen">
      <div class="dashboard-loading">
        <div class="spinner" style="width: 40px; height: 40px;"></div>
      </div>
    </div>
  `;

  try {
    // Fetch dashboard data
    dashboardData = await getDashboardData(userId);

    // Get last 7 days expenses for chart
    const weeklyData = await getWeeklyData(userId);
    const todayExpenses = getTodayExpenses(dashboardData.expenses);

    renderDashboard(container, {
      userId,
      onLogout,
      onAddExpense,
      onAddCategory,
      onEditCategory,
      onAnalysis,
      onExpensesList,
      weeklyData,
      todayExpenses
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    container.innerHTML = `
      <div class="dashboard-screen" style="align-items: center; justify-content: center; text-align: center; padding: var(--space-xl);">
        <p style="color: var(--color-error); margin-bottom: var(--space-md);">Erreur de chargement</p>
        <button class="btn-primary" onclick="location.reload()">Réessayer</button>
      </div>
    `;
  }
}

function renderDashboard(container, { userId, onLogout, onAddExpense, onAddCategory, onEditCategory, onAnalysis, onExpensesList, weeklyData, todayExpenses }) {
  const { profile, categories, totalExpenses, remainingBudget, expenses, savingsExpenses } = dashboardData;
  const monthlyIncome = profile?.monthly_income || 0;
  const spentPercent = monthlyIncome > 0 ? Math.min(100, (totalExpenses / monthlyIncome) * 100) : 0;

  // Determine progress bar state
  let progressState = 'safe';
  if (spentPercent >= 90) progressState = 'danger';
  else if (spentPercent >= 70) progressState = 'warning';

  // Get recent expenses (last 5)
  const recentExpenses = expenses.slice(0, 5);

  container.innerHTML = `
    <div class="dashboard-screen">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="dashboard-greeting">
          <span class="dashboard-greeting-text">Bonjour,</span>
          <h1 class="dashboard-username">${profile?.first_name || 'Utilisateur'}</h1>
        </div>
        <div class="dashboard-actions">
          <button class="dashboard-action-btn" id="logout-btn" aria-label="Déconnexion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>
      
      <!-- Scrollable Content -->
      <div class="dashboard-content">
        <div class="bento-grid">
          
          <!-- Hero Card (Credit Card Style) -->
          <div class="hero-card">
            <div class="hero-card-header">
              <span class="hero-card-label">VISA</span>
              <button class="hero-privacy-btn" id="privacy-toggle" aria-label="Mode privé">
                <svg class="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg class="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <div class="hero-card-body">
              <p class="hero-amount ${remainingBudget >= 0 ? 'positive' : 'negative'}" id="hero-amount">
                ${formatCurrency(remainingBudget)}
              </p>
              <p class="hero-subtitle" id="hero-subtitle">
                sur ${formatCurrency(monthlyIncome)} ce mois
              </p>
            </div>
            <div class="hero-card-footer">
              <div class="hero-progress">
                <div class="hero-progress-bar ${progressState}" style="width: ${spentPercent}%"></div>
              </div>
            </div>
          </div>
          
          <!-- Weekly Flow Card -->
          <div class="weekly-flow-card">
            <div class="weekly-flow-header">
              <span class="weekly-flow-title" id="weekly-title">7 derniers jours</span>
              <span class="weekly-flow-total" id="weekly-total">${formatCurrency(weeklyData.total)}</span>
            </div>
            <div class="bar-chart">
              ${weeklyData.days.map((day, index) => `
                <div class="bar-chart-item" data-day-index="${index}" data-day-label="${day.fullLabel || day.label}" data-day-amount="${day.amount}">
                  <div class="bar-chart-bar-wrapper">
                    <div class="bar-chart-bar ${day.isToday ? 'active' : (day.amount > 0 ? 'has-expense' : '')}" 
                         style="height: ${day.heightPercent}%"></div>
                  </div>
                  <span class="bar-chart-label ${day.isToday ? 'active' : ''}">${day.label}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Treemap Heatmap Section -->
          ${renderTreemap(categories, dashboardData.expenses, dashboardData.lastMonthExpenses)}
          
          <!-- Recent Expenses Section -->
          <div class="recent-expenses-section">
            <div class="recent-expenses-header">
              <span class="recent-expenses-title">Dernières dépenses</span>
              <button class="see-all-btn" id="see-all-expenses-btn">
                Voir tout
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            ${expenses.length > 0 ? `
              <div class="recent-expenses-list">
                ${expenses.slice(0, 3).map(exp => renderExpenseItem(exp)).join('')}
              </div>
            ` : `
              <div class="recent-expenses-empty">
                <span class="recent-expenses-empty-icon">💸</span>
                <span>Aucune dépense ce mois</span>
              </div>
            `}
          </div>

          <!-- Savings Section -->
          <div class="savings-section">
            <div class="savings-header">
              <span class="recent-expenses-title">Mon Épargne</span>
              <button class="category-add-btn" id="add-savings-category-btn" style="color: #10B981;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ajouter
              </button>
            </div>
            
            <div class="savings-grid">
              ${renderSavingsCards(categories, savingsExpenses)}
            </div>
          </div>
          
        </div>
      </div>
      
      <!-- Floating Dock -->
      <nav class="floating-dock">
        <button class="dock-item active" aria-label="Accueil">
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
        <button class="dock-item" id="stats-btn" aria-label="Statistiques">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </button>
      </nav>
    </div>
  `;

  // Event Listeners
  setupEventListeners(container, { userId, onLogout, onAddExpense, onAddCategory, onEditCategory, onAnalysis, onExpensesList });
}

function renderExpenseItem(expense) {
  const category = expense.categories || {};
  const date = new Date(expense.date);
  const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return `
    <div class="category-item expense-item" data-expense-id="${expense.id}" style="cursor: pointer;">
      <div class="category-icon" style="background: ${category.color || '#9B5DE5'}20;">
        ${category.icon || '💰'}
      </div>
      <div class="category-info">
        <span class="category-name">${category.name || 'Dépense'}</span>
        <span style="font-size: var(--text-xs); color: var(--color-text-tertiary);">
          ${dateStr}${expense.is_recurring ? ' • 🔄 Fixe' : ''}
        </span>
      </div>
      <span class="category-amount blurrable">
        -${formatCurrency(expense.amount)}
      </span>
    </div>
  `;
}

function renderCategoryItem(category, expenses) {
  // Calculate spent amount for this category this month
  const categoryExpenses = expenses.filter(e => e.category_id === category.id);
  const spent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budget = category.budget_limit || 0;
  const remaining = budget > 0 ? budget - spent : 0;
  const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

  // Determine gauge color
  let gaugeColor = category.color || 'var(--color-accent-violet)';
  if (budget > 0 && percent >= 90) {
    gaugeColor = 'var(--color-error)';
  } else if (budget > 0 && percent >= 70) {
    gaugeColor = 'var(--color-warning)';
  }

  return `
    <div class="category-item" data-category-id="${category.id}">
      <div class="category-icon" style="background: ${category.color}20;">
        ${category.icon}
      </div>
      <div class="category-info">
        <span class="category-name">${category.name}</span>
        ${budget > 0 ? `
          <div class="category-gauge">
            <div class="category-gauge-bar" style="width: ${percent}%; background: ${gaugeColor};"></div>
          </div>
        ` : ''}
      </div>
      <span class="category-amount blurrable">
        ${budget > 0 ? formatCurrency(remaining) + ' restant' : formatCurrency(spent)}
      </span>
    </div>
  `;
}

// Treemap Heatmap Component
function renderTreemap(categories, currentExpenses, lastMonthExpenses) {
  // Filter out savings categories - only show expense categories in treemap
  const expenseCategories = categories.filter(cat => cat.type !== 'savings');

  // If no expense categories, show empty state with create button
  if (expenseCategories.length === 0) {
    return `
      <div class="treemap-section">
        <div class="treemap-header">
          <span class="treemap-title">Treemap</span>
        </div>
        <div class="treemap-container">
          <div class="treemap-empty">
            <div class="treemap-empty-icon">📂</div>
            <span>Aucune catégorie créée</span>
            <button class="category-empty-btn" id="create-first-category-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Créer ma première catégorie
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Calculate spending per category for current and last month
  const categoryData = expenseCategories.map(cat => {
    const currentSpent = currentExpenses
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);

    const lastMonthSpent = lastMonthExpenses
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate variation percentage
    let variation = 0;
    let variationClass = 'neutral';

    if (lastMonthSpent > 0) {
      variation = ((currentSpent - lastMonthSpent) / lastMonthSpent) * 100;

      if (variation <= -30) variationClass = 'saving-high';
      else if (variation <= -15) variationClass = 'saving-medium';
      else if (variation < 0) variationClass = 'saving-low';
      else if (variation >= 30) variationClass = 'spending-high';
      else if (variation >= 15) variationClass = 'spending-medium';
      else if (variation > 0) variationClass = 'spending-low';
    } else if (currentSpent > 0) {
      variationClass = 'neutral'; // New category or no last month data
    }

    return {
      ...cat,
      currentSpent,
      lastMonthSpent,
      variation,
      variationClass
    };
  }).filter(cat => cat.currentSpent > 0); // Only show categories with spending

  if (categoryData.length === 0) {
    return `
      <div class="treemap-section">
        <div class="treemap-header">
          <span class="treemap-title">Répartition du mois</span>
        </div>
        <div class="treemap-container">
          <div class="treemap-empty">
            <div class="treemap-empty-icon">📊</div>
            <span>Aucune dépense ce mois</span>
          </div>
        </div>
      </div>
    `;
  }

  // Calculate total for sizing
  const totalSpent = categoryData.reduce((sum, cat) => sum + cat.currentSpent, 0);

  // Sort by amount (largest first)
  categoryData.sort((a, b) => b.currentSpent - a.currentSpent);

  // Calculate tile sizes using a simple treemap algorithm
  const containerWidth = 100; // percentage
  let tilesHtml = '';

  categoryData.forEach((cat, index) => {
    const percent = (cat.currentSpent / totalSpent) * 100;

    // Calculate tile width based on spending proportion
    // Minimum 30%, maximum 100%
    let tileWidth = Math.max(30, Math.min(100, percent * 2));
    let tileHeight = percent > 40 ? 100 : (percent > 20 ? 70 : 55);

    // For very small amounts, make tiles smaller
    if (percent < 10) {
      tileWidth = 30;
      tileHeight = 55;
    } else if (percent < 20) {
      tileWidth = 45;
      tileHeight = 60;
    } else if (percent < 35) {
      tileWidth = 50;
      tileHeight = 70;
    }

    // Variation indicator
    let variationText = '';
    if (cat.lastMonthSpent > 0) {
      const sign = cat.variation >= 0 ? '+' : '';
      variationText = `${sign}${Math.round(cat.variation)}%`;
    }

    tilesHtml += `
      <div class="treemap-tile ${cat.variationClass}" 
           data-category-id="${cat.id}"
           style="flex: 1 1 calc(${tileWidth}% - 4px); min-height: ${tileHeight}px;">
        <span class="treemap-tile-icon">${cat.icon}</span>
        <div class="treemap-tile-info">
          <span class="treemap-tile-name">${cat.name}</span>
          <span class="treemap-tile-amount">${formatCurrency(cat.currentSpent)}</span>
          ${variationText ? `
            <span class="treemap-tile-variation">
              ${cat.variation >= 0 ? '↑' : '↓'} ${variationText}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  });

  return `
    <div class="treemap-section">
      <div class="treemap-header">
        <span class="treemap-title">Treemap</span>
        <div class="treemap-header-actions">
          <div class="treemap-legend">
            <div class="treemap-legend-item">
              <div class="treemap-legend-dot" style="background: #22c55e;"></div>
              <span>Économie</span>
            </div>
            <div class="treemap-legend-item">
              <div class="treemap-legend-dot" style="background: #ef4444;"></div>
              <span>Hausse</span>
            </div>
          </div>
          <button class="category-add-btn" id="add-category-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        </div>
      </div>
      <div class="treemap-container">
        ${tilesHtml}
      </div>
    </div>
  `;
}

function setupEventListeners(container, { userId, onLogout, onAddExpense, onAddCategory, onEditCategory, onAnalysis, onExpensesList }) {
  // Logout
  container.querySelector('#logout-btn')?.addEventListener('click', async () => {
    await signOut();
    onLogout();
  });

  // Privacy toggle
  container.querySelector('#privacy-toggle')?.addEventListener('click', () => {
    privacyMode = !privacyMode;
    togglePrivacyMode(container);
  });

  // Add expense button
  container.querySelector('#add-expense-btn')?.addEventListener('click', () => {
    if (onAddExpense) onAddExpense();
  });

  // Add Category
  container.querySelector('#add-category-btn')?.addEventListener('click', () => {
    onAddCategory('expense'); // Default to expense from Treemap
  });

  // Add Savings Category Buttons
  container.querySelector('#add-savings-category-btn')?.addEventListener('click', () => {
    onAddCategory('savings');
  });

  container.querySelector('#grid-add-savings-btn')?.addEventListener('click', () => {
    onAddCategory('savings');
  });

  // Edit Category (Delegation for treemap tiles)
  container.querySelector('#create-first-category-btn')?.addEventListener('click', () => {
    if (onAddCategory) onAddCategory();
  });

  // Stats/Analysis button
  container.querySelector('#stats-btn')?.addEventListener('click', () => {
    if (onAnalysis) onAnalysis();
  });

  // See all expenses button
  container.querySelector('#see-all-expenses-btn')?.addEventListener('click', () => {
    if (onExpensesList) onExpensesList();
  });

  // Expense item click handlers (for detail/delete)
  container.querySelectorAll('.expense-item').forEach(item => {
    item.addEventListener('click', () => {
      const expenseId = item.dataset.expenseId;
      const expense = dashboardData.expenses.find(e => e.id === expenseId);
      if (expense) {
        showExpenseDetailModal(expense, userId);
      }
    });
  });

  // Category item click handlers (navigate to filtered expenses list)
  container.querySelectorAll('.category-item:not(.expense-item)').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const categoryId = item.dataset.categoryId;
      if (categoryId && onExpensesList) {
        onExpensesList(categoryId); // Pass category ID to filter
      }
    });
  });

  // Bar chart click handlers (show daily amount)
  let selectedDayIndex = null;
  const weeklyTitle = container.querySelector('#weekly-title');
  const weeklyTotal = container.querySelector('#weekly-total');
  const originalTitle = '7 derniers jours';

  // Store weekly total for reset
  const weeklyTotalAmount = Array.from(container.querySelectorAll('.bar-chart-item'))
    .reduce((sum, item) => sum + parseFloat(item.dataset.dayAmount || 0), 0);

  container.querySelectorAll('.bar-chart-item').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.dayIndex);
      const amount = parseFloat(item.dataset.dayAmount || 0);
      const label = item.dataset.dayLabel;
      const bar = item.querySelector('.bar-chart-bar');
      const barLabel = item.querySelector('.bar-chart-label');

      // If clicking the same day, reset to total
      if (selectedDayIndex === index) {
        selectedDayIndex = null;
        weeklyTitle.textContent = originalTitle;
        weeklyTotal.textContent = formatCurrency(weeklyTotalAmount);

        // Remove selected class from all
        container.querySelectorAll('.bar-chart-bar').forEach(b => b.classList.remove('selected'));
        container.querySelectorAll('.bar-chart-label').forEach(l => l.classList.remove('selected'));
      } else {
        selectedDayIndex = index;
        weeklyTitle.textContent = label;
        weeklyTotal.textContent = formatCurrency(amount);

        // Update selected state
        container.querySelectorAll('.bar-chart-bar').forEach(b => b.classList.remove('selected'));
        container.querySelectorAll('.bar-chart-label').forEach(l => l.classList.remove('selected'));
        bar.classList.add('selected');
        barLabel.classList.add('selected');
      }
    });
  });
}

async function showExpenseDetailModal(expense, userId) {
  const category = expense.categories || {};
  const dateValue = expense.date; // YYYY-MM-DD format

  // Get categories for the select
  const { data: categories } = await getCategories(userId);

  const modal = document.createElement('div');
  modal.className = 'expense-detail-modal';
  modal.innerHTML = `
    <div class="expense-detail-content expense-edit-modal">
      <div class="expense-edit-header">
        <h2 class="expense-edit-title">Modifier la dépense</h2>
        <button class="expense-edit-close" id="close-expense-modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <form id="edit-expense-form" class="expense-edit-form">
        <!-- Amount Input -->
        <div class="expense-edit-amount-container">
          <input 
            type="text" 
            inputmode="decimal"
            id="edit-expense-amount" 
            class="expense-edit-amount-input" 
            value="${expense.amount}"
            placeholder="0"
          />
          <span class="expense-edit-currency">€</span>
        </div>
        
        <!-- Category Select -->
        <div class="expense-edit-field">
          <label class="expense-edit-label">Catégorie</label>
          <select id="edit-expense-category" class="expense-edit-select">
            ${(categories || []).map(cat => `
              <option value="${cat.id}" ${cat.id === expense.category_id ? 'selected' : ''}>
                ${cat.icon} ${cat.name}
              </option>
            `).join('')}
          </select>
        </div>
        
        <!-- Date Input -->
        <div class="expense-edit-field">
          <label class="expense-edit-label">Date</label>
          <input 
            type="date" 
            id="edit-expense-date" 
            class="expense-edit-date"
            value="${dateValue}"
          />
        </div>
        
        <!-- Recurring Toggle -->
        <div class="expense-edit-field expense-edit-toggle">
          <label class="expense-edit-label">Dépense fixe</label>
          <label class="toggle-switch">
            <input type="checkbox" id="edit-expense-recurring" ${expense.is_recurring ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <!-- Actions -->
        <div class="expense-edit-actions">
          <button type="submit" class="btn-primary expense-save-btn" id="save-expense-btn">
            Enregistrer
          </button>
          <button type="button" class="expense-action-btn delete" id="delete-expense-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            Supprimer
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Amount input formatting
  const amountInput = modal.querySelector('#edit-expense-amount');
  amountInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^\d.,]/g, '');
    value = value.replace(',', '.');
    e.target.value = value;
  });
  amountInput.select();

  // Close modal
  modal.querySelector('#close-expense-modal').addEventListener('click', () => {
    modal.remove();
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Save changes
  modal.querySelector('#edit-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newAmount = parseFloat(amountInput.value);
    const newCategoryId = modal.querySelector('#edit-expense-category').value;
    const newDate = modal.querySelector('#edit-expense-date').value;
    const newIsRecurring = modal.querySelector('#edit-expense-recurring').checked;

    if (!newAmount || newAmount <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    const saveBtn = modal.querySelector('#save-expense-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div>';

    try {
      const { error } = await updateExpense(expense.id, {
        amount: newAmount,
        category_id: newCategoryId,
        date: newDate,
        is_recurring: newIsRecurring
      });

      if (error) throw error;

      modal.remove();

      // Refresh dashboard
      if (currentContainer && currentCallbacks) {
        renderDashboardScreen(currentContainer, currentCallbacks);
      }

    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Erreur lors de la modification');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Enregistrer';
    }
  });

  // Delete expense
  modal.querySelector('#delete-expense-btn').addEventListener('click', async () => {
    if (!confirm('Supprimer cette dépense ?')) return;

    const deleteBtn = modal.querySelector('#delete-expense-btn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div>';

    try {
      const { error } = await deleteExpense(expense.id);

      if (error) throw error;

      modal.remove();

      // Refresh dashboard
      if (currentContainer && currentCallbacks) {
        renderDashboardScreen(currentContainer, currentCallbacks);
      }

    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Erreur lors de la suppression');
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        Supprimer
      `;
    }
  });
}

function togglePrivacyMode(container) {
  const heroAmount = container.querySelector('#hero-amount');
  const heroSubtitle = container.querySelector('#hero-subtitle');
  const todayAmount = container.querySelector('#today-amount');
  const categoryAmounts = container.querySelectorAll('.category-amount');
  const eyeOpen = container.querySelector('.eye-open');
  const eyeClosed = container.querySelector('.eye-closed');

  if (privacyMode) {
    heroAmount?.classList.add('blurred');
    heroSubtitle?.classList.add('blurred');
    todayAmount?.classList.add('blurred');
    categoryAmounts.forEach(el => el.classList.add('blurred'));
    if (eyeOpen) eyeOpen.style.display = 'none';
    if (eyeClosed) eyeClosed.style.display = 'block';
  } else {
    heroAmount?.classList.remove('blurred');
    heroSubtitle?.classList.remove('blurred');
    todayAmount?.classList.remove('blurred');
    categoryAmounts.forEach(el => el.classList.remove('blurred'));
    if (eyeOpen) eyeOpen.style.display = 'block';
    if (eyeClosed) eyeClosed.style.display = 'none';
  }
}

async function getWeeklyData(userId) {
  const days = [];
  const today = new Date();
  let maxAmount = 0;
  let total = 0;

  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Find expenses for this day
    const dayExpenses = dashboardData.expenses.filter(e => e.date === dateStr);
    const amount = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (amount > maxAmount) maxAmount = amount;
    total += amount;

    days.push({
      date: dateStr,
      amount,
      label: getDayLabel(date, i === 0),
      fullLabel: getFullDayLabel(date, i === 0),
      isToday: i === 0,
    });
  }

  // Calculate height percentages
  days.forEach(day => {
    day.heightPercent = maxAmount > 0 ? Math.max(10, (day.amount / maxAmount) * 100) : 10;
  });

  return { days, total, maxAmount };
}

function getTodayExpenses(expenses) {
  const today = new Date().toISOString().split('T')[0];
  return expenses
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + e.amount, 0);
}

function getDayLabel(date, isToday) {
  if (isToday) return 'Auj.';
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return days[date.getDay()];
}

function getFullDayLabel(date, isToday) {
  if (isToday) return "Aujourd'hui";
  const options = { weekday: 'long', day: 'numeric', month: 'short' };
  return date.toLocaleDateString('fr-FR', options);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function renderSavingsCards(categories, savingsExpenses) {
  const savingsCats = (categories || []).filter(c => c.type === 'savings');

  // Logic to calculate savings
  const cardsHtml = savingsCats.map(cat => {
    // Calculate total balance for this category
    const catExpenses = (savingsExpenses || []).filter(e => e.category_id === cat.id);
    const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Last added detail
    // savingsExpenses are sorted by date desc
    const lastExpense = catExpenses[0];
    let lastAddedText = 'Aucun ajout';
    if (lastExpense) {
      const date = new Date(lastExpense.date);
      lastAddedText = `+${formatCurrency(lastExpense.amount)} le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }

    return `
      <div class="savings-card">
        <div class="savings-card-header">
           <div class="savings-card-icon" style="background: ${cat.color}20;">
             ${cat.icon}
           </div>
           <span class="savings-card-name">${cat.name}</span>
        </div>
        <div class="savings-card-balance">${formatCurrency(total)}</div>
        <div class="savings-card-footer">
           <span>Dernier ajout</span>
           <span class="last-added-amount">${lastAddedText}</span>
        </div>
      </div>
    `;
  }).join('');

  return cardsHtml;
}
