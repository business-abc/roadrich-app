/**
 * ROADRICH - Expenses List Screen
 * Full list of expenses with filters by category and month
 */

import { getExpenses, getCategories, deleteExpense, updateExpense } from '../lib/supabase.js';

// State
let currentMonth = new Date();
let selectedCategory = null;
let expensesData = null;
let categoriesData = null;
let container = null;
let callbacks = null;

export async function renderExpensesListScreen(containerEl, { userId, onBack, onEditExpense, initialCategoryId }) {
  container = containerEl;
  callbacks = { userId, onBack, onEditExpense };

  // Set initial category filter if provided
  selectedCategory = initialCategoryId || null;

  // Show loading state
  container.innerHTML = `
    <div class="expenses-list-screen">
      <div class="expenses-list-loading">
        <div class="spinner" style="width: 40px; height: 40px;"></div>
      </div>
    </div>
  `;

  try {
    await loadExpensesData(userId);
    renderScreen();
  } catch (error) {
    console.error('Expenses list error:', error);
    container.innerHTML = `
      <div class="expenses-list-screen" style="align-items: center; justify-content: center; text-align: center; padding: var(--space-xl);">
        <p style="color: var(--color-error); margin-bottom: var(--space-md);">Erreur de chargement</p>
        <button class="btn-primary" onclick="location.reload()">Réessayer</button>
      </div>
    `;
  }
}

async function loadExpensesData(userId) {
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  const [{ data: expenses }, { data: categories }] = await Promise.all([
    getExpenses(userId, startOfMonth, endOfMonth),
    getCategories(userId)
  ]);

  expensesData = expenses || [];
  categoriesData = categories || [];
}

function renderScreen() {
  // Filter expenses by category
  const filteredExpenses = selectedCategory
    ? expensesData.filter(e => e.category_id === selectedCategory)
    : expensesData;

  // Group expenses by date
  const groupedExpenses = groupByDate(filteredExpenses);

  // Calculate total
  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Format month name
  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="expenses-list-screen">
      <!-- Header -->
      <header class="expenses-list-header">
        <button class="expenses-list-back-btn" id="back-btn" aria-label="Retour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="expenses-list-title">Dépenses</h1>
        <div style="width: 44px;"></div>
      </header>

      <!-- Month Selector -->
      <div class="month-selector">
        <button class="month-nav-btn" id="prev-month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="month-name">${monthName}</span>
        <button class="month-nav-btn" id="next-month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Category Filter -->
      <div class="filter-bar">
        <select class="category-filter-select" id="category-filter">
          <option value="all" ${selectedCategory === null ? 'selected' : ''}>Toutes catégories</option>
          ${categoriesData.map(cat => `
            <option value="${cat.id}" ${selectedCategory === cat.id ? 'selected' : ''}>
              ${cat.icon} ${cat.name}
            </option>
          `).join('')}
        </select>
        <div class="filter-total">
          <span class="filter-total-label">${filteredExpenses.length} dépense${filteredExpenses.length > 1 ? 's' : ''}</span>
          <span class="filter-total-amount">${formatCurrency(total)}</span>
        </div>
      </div>

      <!-- Expenses List -->
      <div class="expenses-list-content">
        ${filteredExpenses.length > 0 ? `
          ${Object.entries(groupedExpenses).map(([date, expenses]) => `
            <div class="expense-group">
              <div class="expense-group-header">
                <span class="expense-group-date">${formatDateHeader(date)}</span>
                <span class="expense-group-total">${formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
              <div class="expense-group-list">
                ${expenses.map(exp => renderExpenseListItem(exp)).join('')}
              </div>
            </div>
          `).join('')}
        ` : `
          <div class="expenses-list-empty">
            <span class="expenses-list-empty-icon">📭</span>
            <span>Aucune dépense pour ce mois</span>
          </div>
        `}
      </div>
    </div>
  `;

  setupEventListeners();
}

function renderExpenseListItem(expense) {
  const category = expense.categories || {};
  const date = new Date(expense.date);
  const timeStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return `
    <div class="expense-list-item" data-expense-id="${expense.id}">
      <div class="expense-list-icon" style="background: ${category.color || '#9B5DE5'}20;">
        ${category.icon || '💰'}
      </div>
      <div class="expense-list-info">
        <span class="expense-list-category">${category.name || 'Dépense'}</span>
        <span class="expense-list-date">${timeStr}${expense.is_recurring ? ' • 🔄 Fixe' : ''}</span>
      </div>
      <span class="expense-list-amount">-${formatCurrency(expense.amount)}</span>
    </div>
  `;
}

function groupByDate(expenses) {
  const groups = {};
  expenses.forEach(exp => {
    if (!groups[exp.date]) {
      groups[exp.date] = [];
    }
    groups[exp.date].push(exp);
  });
  // Sort by date descending
  return Object.fromEntries(
    Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]))
  );
}

function formatDateHeader(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return "Aujourd'hui";
  } else if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Hier';
  } else {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}

function setupEventListeners() {
  // Back button
  container.querySelector('#back-btn')?.addEventListener('click', () => {
    if (callbacks.onBack) callbacks.onBack();
  });

  // Month navigation
  container.querySelector('#prev-month')?.addEventListener('click', async () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    container.querySelector('.expenses-list-content').style.opacity = '0.5';
    await loadExpensesData(callbacks.userId);
    renderScreen();
  });

  container.querySelector('#next-month')?.addEventListener('click', async () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    container.querySelector('.expenses-list-content').style.opacity = '0.5';
    await loadExpensesData(callbacks.userId);
    renderScreen();
  });

  // Category filter
  container.querySelector('#category-filter')?.addEventListener('change', (e) => {
    selectedCategory = e.target.value === 'all' ? null : e.target.value;
    renderScreen();
  });

  // Expense item click
  container.querySelectorAll('.expense-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const expenseId = item.dataset.expenseId;
      const expense = expensesData.find(e => e.id === expenseId);
      if (expense) {
        showExpenseEditModal(expense);
      }
    });
  });
}

function showExpenseEditModal(expense) {
  const category = expense.categories || {};
  const dateValue = expense.date; // YYYY-MM-DD format

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
            ${categoriesData.map(cat => `
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

      // Refresh list
      await loadExpensesData(callbacks.userId);
      renderScreen();

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

      // Refresh list
      await loadExpensesData(callbacks.userId);
      renderScreen();

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

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

