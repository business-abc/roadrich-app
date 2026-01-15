/**
 * ROADRICH - Add Expense Screen
 * Smart Stepper with Live Chart Simulator
 */

import { getCategories, getExpenses, createExpense } from '../lib/supabase.js';

// State
let currentStep = 1;
let selectedCategory = null;
let amount = '';
let isRecurring = false;
let expenseDate = new Date().toISOString().split('T')[0];
let expenseDescription = '';
let categoryExpenses = [];
let chartData = [];
let mode = 'expense'; // 'expense' or 'savings'

export async function renderAddExpenseScreen(container, { userId, onBack, onSuccess }) {
  // Reset state
  currentStep = 1;
  selectedCategory = null;
  amount = '';
  isRecurring = false;
  expenseDate = new Date().toISOString().split('T')[0];
  expenseDescription = '';
  categoryExpenses = [];
  mode = 'expense';

  // Show loading
  container.innerHTML = `
    <div class="add-expense-screen">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
        <div class="spinner" style="width: 40px; height: 40px;"></div>
      </div>
    </div>
  `;

  try {
    // Fetch categories
    const { data: categories } = await getCategories(userId);

    // Render step 1
    renderScreen(container, { userId, onBack, onSuccess, categories: categories || [] });

  } catch (error) {
    console.error('Error loading categories:', error);
    container.innerHTML = `
      <div class="add-expense-screen" style="align-items: center; justify-content: center;">
        <p style="color: var(--color-error);">Erreur de chargement</p>
      </div>
    `;
  }
}

function renderScreen(container, { userId, onBack, onSuccess, categories }) {
  const isSavings = mode === 'savings';
  const title = isSavings ? 'Nouvelle épargne' : 'Nouvelle dépense';

  container.innerHTML = `
    <div class="add-expense-screen ${isSavings ? 'savings-mode' : ''}">
      <!-- Header -->
      <header class="add-expense-header">
        <button class="add-expense-back-btn" id="back-btn" aria-label="Retour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="add-expense-title">${title}</h1>
      </header>
      
      <!-- Step Indicator -->
      <div class="step-indicator">
        <div class="step-dot ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}"></div>
        <div class="step-dot ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}"></div>
        <div class="step-dot ${currentStep >= 3 ? 'active' : ''}"></div>
      </div>
      
      <!-- Step Content -->
      <div id="step-content"></div>
    </div>
  `;

  // Render current step
  const stepContent = container.querySelector('#step-content');

  switch (currentStep) {
    case 1:
      renderStep1(stepContent, { userId, onBack, onSuccess, categories });
      break;
    case 2:
      renderStep2(stepContent, { userId, onBack, onSuccess, categories });
      break;
    case 3:
      renderStep3(stepContent, { userId, onBack, onSuccess, categories });
      break;
  }

  // Back button handler
  container.querySelector('#back-btn').addEventListener('click', () => {
    if (currentStep === 1) {
      onBack();
    } else {
      currentStep--;
      if (currentStep === 1) {
        selectedCategory = null;
        amount = '';
        isRecurring = false;
      }
      renderScreen(container, { userId, onBack, onSuccess, categories });
    }
  });
}

// Step 1: Category Selection
function renderStep1(stepContent, { userId, onBack, onSuccess, categories }) {
  const isSavings = mode === 'savings';

  // Filter categories by type
  const expenseCategories = categories.filter(c => c.type !== 'savings');
  const savingsCategories = categories.filter(c => c.type === 'savings');
  const currentCategories = isSavings ? savingsCategories : expenseCategories;

  const emptyMessage = isSavings
    ? "Créez d'abord une catégorie<br/>d'épargne"
    : "Créez d'abord une catégorie<br/>pour ajouter des dépenses";

  stepContent.innerHTML = `
    <div class="step-category">
      <!-- Mode Tabs -->
      <div class="mode-tabs" id="mode-tabs" style="
        display: flex;
        background: var(--color-bg-elevated);
        border-radius: var(--radius-full);
        padding: 4px;
        margin-bottom: var(--space-lg);
        position: relative;
      ">
        <div class="mode-tabs-bg" id="mode-tabs-bg" style="
          position: absolute;
          top: 4px;
          left: ${isSavings ? 'calc(50% + 0px)' : '4px'};
          width: calc(50% - 4px);
          height: calc(100% - 8px);
          background: ${isSavings ? '#10B981' : 'var(--color-accent-cyan)'};
          border-radius: var(--radius-full);
          transition: all 0.3s ease;
        "></div>
        <button type="button" class="mode-tab ${!isSavings ? 'active' : ''}" data-mode="expense" style="
          flex: 1;
          padding: var(--space-sm) var(--space-md);
          border: none;
          background: transparent;
          color: ${!isSavings ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)'};
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: color 0.3s ease;
        ">💸 Dépense</button>
        <button type="button" class="mode-tab ${isSavings ? 'active' : ''}" data-mode="savings" style="
          flex: 1;
          padding: var(--space-sm) var(--space-md);
          border: none;
          background: transparent;
          color: ${isSavings ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)'};
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: color 0.3s ease;
        ">💰 Épargne</button>
      </div>
      
      <h2 class="step-category-title">Choisir une catégorie</h2>
      
      ${currentCategories.length > 0 ? `
        <div class="category-grid">
          ${currentCategories.map(cat => `
            <button class="category-grid-item" data-category-id="${cat.id}">
              <div class="category-grid-icon" style="background: ${cat.color}20;">
                ${cat.icon}
              </div>
              <span class="category-grid-name">${cat.name}</span>
            </button>
          `).join('')}
        </div>
      ` : `
        <div class="category-empty-state">
          <div class="category-empty-state-icon">${isSavings ? '💰' : '📂'}</div>
          <p class="category-empty-state-text">${emptyMessage}</p>
          <button class="btn-primary" id="go-back-btn">Retour au tableau de bord</button>
        </div>
      `}
    </div>
  `;

  // Go back button handler
  const goBackBtn = stepContent.querySelector('#go-back-btn');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', onBack);
  }

  // Mode tabs handler
  const tabsBg = stepContent.querySelector('#mode-tabs-bg');
  stepContent.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const newMode = tab.dataset.mode;
      if (newMode !== mode) {
        mode = newMode;
        // Re-render the entire screen to update mode
        renderScreen(stepContent.closest('.add-expense-screen').parentElement, {
          userId, onBack, onSuccess, categories
        });
      }
    });
  });

  // Swipe gesture handler for mode switching
  const stepCategoryEl = stepContent.querySelector('.step-category');
  if (stepCategoryEl) {
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    stepCategoryEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    stepCategoryEl.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchEndX - touchStartX;

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        const newMode = swipeDistance < 0 ? 'savings' : 'expense'; // Swipe left = savings, right = expense
        if (newMode !== mode) {
          mode = newMode;
          renderScreen(stepContent.closest('.add-expense-screen').parentElement, {
            userId, onBack, onSuccess, categories
          });
        }
      }
    }, { passive: true });
  }

  // Category selection handlers
  stepContent.querySelectorAll('.category-grid-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const categoryId = btn.dataset.categoryId;
      selectedCategory = categories.find(c => c.id === categoryId);

      // Load category expenses for chart
      await loadCategoryExpenses(userId);

      // Go to step 2
      currentStep = 2;
      renderScreen(stepContent.closest('.add-expense-screen').parentElement, {
        userId, onBack, onSuccess, categories
      });
    });
  });
}

// Step 2: Amount Input with Simulator
function renderStep2(stepContent, { userId, onBack, onSuccess, categories }) {
  const budgetLimit = selectedCategory.budget_limit || 0;
  const currentSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);

  stepContent.innerHTML = `
    <div class="step-amount">
      <!-- Selected Category -->
      <div class="selected-category-display">
        <div class="selected-category-icon" style="background: ${selectedCategory.color}20;">
          ${selectedCategory.icon}
        </div>
        <div class="selected-category-info">
          <div class="selected-category-name">${selectedCategory.name}</div>
          ${budgetLimit > 0 ? `
            <div class="selected-category-budget">Budget: ${formatCurrency(budgetLimit)}</div>
          ` : ''}
        </div>
      </div>
      
      <!-- Date Picker -->
      <div class="recurring-toggle-section">
        <div class="recurring-toggle-container">
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; color: var(--color-accent-cyan);">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style="color: var(--color-text-primary);">Date</span>
          </div>
          <input 
            type="date" 
            id="expense-date" 
            value="${expenseDate}" 
            max="${new Date().toISOString().split('T')[0]}"
            style="
              background: var(--color-bg-elevated);
              border: 1px solid var(--glass-border);
              border-radius: var(--radius-md);
              padding: var(--space-sm) var(--space-md);
              color: var(--color-text-primary);
              font-family: var(--font-mono);
              font-size: var(--text-sm);
            "
          />
        </div>
      </div>
      
      <!-- Recurring Toggle -->
      <div class="recurring-toggle-section">
        <div class="recurring-toggle-container">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span class="recurring-toggle-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 2.1l4 4-4 4"/>
                <path d="M3 12.2v-2a4 4 0 014-4h12.8M7 21.9l-4-4 4-4"/>
                <path d="M21 11.8v2a4 4 0 01-4 4H4.2"/>
              </svg>
              Dépense fixe
            </span>
            <span id="recurring-info" style="font-size: var(--text-xs); color: var(--color-text-tertiary); display: ${isRecurring ? 'block' : 'none'};">Renouvelée le 1er de chaque mois</span>
          </div>
          <button class="toggle-switch ${isRecurring ? 'active' : ''}" id="recurring-toggle">
            <span class="toggle-switch-knob"></span>
          </button>
        </div>
      </div>
      
      <!-- Description Input -->
      <div class="recurring-toggle-section">
        <input 
          type="text" 
          id="expense-description" 
          placeholder="Description (optionnel)"
          value="${expenseDescription}"
          maxlength="100"
          style="
            width: 100%;
            background: var(--color-bg-surface);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: var(--space-md) var(--space-lg);
            color: var(--color-text-primary);
            font-size: var(--text-sm);
          "
        />
      </div>
      
      <!-- Chart Area -->
      <div class="simulator-chart-area">
        <div class="simulator-chart-container">
          <svg class="simulator-chart" id="expense-chart"></svg>
        </div>
      </div>
      
      <!-- Amount Display -->
      <div class="amount-display">
        <span class="amount-value" id="amount-display">${amount || '0'}</span>
        <span class="amount-currency">€</span>
      </div>
      
      <!-- Numeric Keypad -->
      <div class="numeric-keypad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
          <button class="keypad-btn" data-value="${n}">${n}</button>
        `).join('')}
        <button class="keypad-btn delete" id="keypad-delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
        <button class="keypad-btn" data-value="0">0</button>
        <button class="keypad-btn submit" id="keypad-submit" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  const amountDisplay = stepContent.querySelector('#amount-display');
  const submitBtn = stepContent.querySelector('#keypad-submit');
  const recurringToggle = stepContent.querySelector('#recurring-toggle');
  const recurringInfo = stepContent.querySelector('#recurring-info');
  const dateInput = stepContent.querySelector('#expense-date');
  const descriptionInput = stepContent.querySelector('#expense-description');

  // Initial chart render
  updateChart(stepContent, budgetLimit, currentSpent);

  // Date input handler
  dateInput.addEventListener('change', (e) => {
    expenseDate = e.target.value;
  });

  // Description input handler
  descriptionInput.addEventListener('input', (e) => {
    expenseDescription = e.target.value;
  });

  // Recurring toggle handler
  recurringToggle.addEventListener('click', () => {
    isRecurring = !isRecurring;
    recurringToggle.classList.toggle('active', isRecurring);
    recurringInfo.style.display = isRecurring ? 'block' : 'none';
  });

  // Keypad number buttons
  stepContent.querySelectorAll('.keypad-btn[data-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;

      // Limit to reasonable amount
      if (amount.length >= 7) return;

      // Don't allow leading zeros (except single zero)
      if (amount === '0' && value === '0') return;
      if (amount === '0' && value !== '0') amount = '';

      amount += value;
      updateAmountDisplay(amountDisplay, submitBtn, budgetLimit, currentSpent);
      updateChart(stepContent, budgetLimit, currentSpent);
    });
  });

  // Delete button
  stepContent.querySelector('#keypad-delete').addEventListener('click', () => {
    amount = amount.slice(0, -1);
    updateAmountDisplay(amountDisplay, submitBtn, budgetLimit, currentSpent);
    updateChart(stepContent, budgetLimit, currentSpent);
  });

  // Submit button
  submitBtn.addEventListener('click', async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner" style="width: 24px; height: 24px;"></div>';

    try {
      // Create expense with selected date, recurring info, and description
      await createExpense(
        userId,
        selectedCategory.id,
        parseFloat(amount),
        expenseDate,
        isRecurring,
        isRecurring ? 1 : null, // Always 1st of month for recurring
        expenseDescription || null
      );

      // Go to success step
      currentStep = 3;
      renderScreen(stepContent.closest('.add-expense-screen').parentElement, {
        userId, onBack, onSuccess, categories
      });

    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Erreur lors de l\'enregistrement');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
    }
  });
}

// Step 3: Success Animation
function renderStep3(stepContent, { userId, onBack, onSuccess, categories }) {
  const budgetLimit = selectedCategory.budget_limit || 0;
  const currentSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
  const newTotal = currentSpent + parseFloat(amount);
  const remaining = budgetLimit > 0 ? budgetLimit - newTotal : null;

  stepContent.innerHTML = `
    <div class="step-success">
      <div class="success-icon">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="55"/>
          <path d="M35 60 L52 77 L85 44"/>
        </svg>
      </div>
      <p class="success-amount">${formatCurrency(parseFloat(amount))}</p>
      <p class="success-text">Enregistré${isRecurring ? ' (fixe)' : ''} !</p>
      <p class="success-subtext">
        ${isRecurring
      ? `Renouvelée le 1er de chaque mois`
      : (remaining !== null
        ? `Il te reste ${formatCurrency(remaining)} dans ${selectedCategory.name}`
        : `Ajouté à ${selectedCategory.name}`)
    }
      </p>
    </div>
  `;

  // Auto close after 2 seconds
  setTimeout(() => {
    onSuccess();
  }, 2000);

  // Allow tap to close early
  stepContent.addEventListener('click', () => {
    onSuccess();
  });
}

// Helper functions
async function loadCategoryExpenses(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data } = await getExpenses(userId, startOfMonth, endOfMonth);
  categoryExpenses = (data || []).filter(e => e.category_id === selectedCategory.id);

  // Build chart data (cumulative by day)
  buildChartData();
}

function buildChartData() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  chartData = [];
  let cumulative = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    // Sum expenses for this day
    const dayExpenses = categoryExpenses.filter(e => e.date === dateStr);
    const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    cumulative += dayTotal;

    chartData.push({
      day,
      date: dateStr,
      amount: dayTotal,
      cumulative,
      isToday: day === now.getDate(),
      isPast: day < now.getDate(),
    });
  }
}

function updateAmountDisplay(displayEl, submitBtn, budgetLimit, currentSpent) {
  const amountNum = parseFloat(amount) || 0;
  const newTotal = currentSpent + amountNum;
  const isOverBudget = budgetLimit > 0 && newTotal > budgetLimit;

  displayEl.textContent = amount || '0';
  displayEl.classList.toggle('over-budget', isOverBudget);

  submitBtn.disabled = amountNum <= 0;
}

function updateChart(stepContent, budgetLimit, currentSpent) {
  const svg = stepContent.querySelector('#expense-chart');
  if (!svg) return;

  const width = svg.clientWidth || 300;
  const height = svg.clientHeight || 150;
  const padding = { top: 20, right: 20, bottom: 25, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const now = new Date();
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const amountNum = parseFloat(amount) || 0;
  const projectedTotal = currentSpent + amountNum;

  // Calculate Y scale
  const maxY = Math.max(budgetLimit || 0, projectedTotal, currentSpent) * 1.2 || 100;

  // Build path points
  let pathPoints = [];
  let areaPoints = [];

  chartData.forEach((d, i) => {
    if (d.isPast || d.isToday) {
      const x = padding.left + (d.day / daysInMonth) * chartWidth;
      const y = padding.top + chartHeight - (d.cumulative / maxY) * chartHeight;
      pathPoints.push({ x, y, day: d.day, cumulative: d.cumulative });
      areaPoints.push({ x, y });
    }
  });

  // Add projected point for today if amount entered
  let projectedPoint = null;
  if (amountNum > 0) {
    const x = padding.left + (today / daysInMonth) * chartWidth;
    const y = padding.top + chartHeight - (projectedTotal / maxY) * chartHeight;
    projectedPoint = { x, y, cumulative: projectedTotal };
  }

  // Build path string
  let pathD = '';
  if (pathPoints.length > 0) {
    pathD = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      pathD += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }
    if (projectedPoint) {
      pathD += ` L ${projectedPoint.x} ${projectedPoint.y}`;
    }
  }

  // Build area path
  let areaD = '';
  if (areaPoints.length > 0) {
    const allPoints = [...areaPoints];
    if (projectedPoint) allPoints.push(projectedPoint);

    areaD = `M ${allPoints[0].x} ${padding.top + chartHeight}`;
    allPoints.forEach(p => {
      areaD += ` L ${p.x} ${p.y}`;
    });
    areaD += ` L ${allPoints[allPoints.length - 1].x} ${padding.top + chartHeight} Z`;
  }

  // Budget line Y
  const budgetY = budgetLimit > 0
    ? padding.top + chartHeight - (budgetLimit / maxY) * chartHeight
    : null;

  // Check if over budget
  const isOverBudget = budgetLimit > 0 && projectedTotal > budgetLimit;

  svg.innerHTML = `
    <!-- Grid lines -->
    <line class="chart-grid-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}"/>
    <line class="chart-grid-line" x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}"/>
    
    ${budgetLimit > 0 ? `
      <!-- Budget zone (over budget area) -->
      <rect class="chart-budget-zone" x="${padding.left}" y="${padding.top}" width="${chartWidth}" height="${Math.max(0, budgetY - padding.top)}"/>
      
      <!-- Budget line -->
      <line class="chart-budget-line" x1="${padding.left}" y1="${budgetY}" x2="${width - padding.right}" y2="${budgetY}"/>
      <text class="chart-budget-label" x="${width - padding.right - 5}" y="${budgetY - 5}" text-anchor="end">Budget</text>
    ` : ''}
    
    <!-- Area fill -->
    ${areaD ? `<path class="chart-area" d="${areaD}"/>` : ''}
    
    <!-- Line -->
    ${pathD ? `<path class="chart-line ${isOverBudget ? 'over-budget' : ''}" d="${pathD}"/>` : ''}
    
    <!-- Points -->
    ${pathPoints.map(p => `
      <circle class="chart-point" cx="${p.x}" cy="${p.y}" r="4"/>
    `).join('')}
    
    <!-- Projected point -->
    ${projectedPoint ? `
      <circle class="chart-point new ${isOverBudget ? 'over-budget' : ''}" cx="${projectedPoint.x}" cy="${projectedPoint.y}" r="6"/>
    ` : ''}
    
    <!-- X axis labels -->
    <text class="chart-x-label" x="${padding.left}" y="${height - 5}">1</text>
    <text class="chart-x-label" x="${padding.left + chartWidth / 2}" y="${height - 5}">${Math.floor(daysInMonth / 2)}</text>
    <text class="chart-x-label" x="${width - padding.right}" y="${height - 5}">${daysInMonth}</text>
  `;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
