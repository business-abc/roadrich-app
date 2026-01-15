/**
 * ROADRICH - Categories Management Screen
 * List all categories with edit and delete options
 */

import { getCategories, deleteCategory } from '../lib/supabase.js';

// State
let categoriesData = null;
let container = null;
let callbacks = null;

export async function renderCategoriesScreen(containerEl, { userId, onBack, onEditCategory, onAddCategory }) {
    container = containerEl;
    callbacks = { userId, onBack, onEditCategory, onAddCategory };

    // Show loading state
    container.innerHTML = `
    <div class="categories-screen">
      <div class="categories-loading">
        <div class="spinner" style="width: 40px; height: 40px;"></div>
      </div>
    </div>
  `;

    try {
        const { data: categories } = await getCategories(userId);
        categoriesData = categories || [];
        renderScreen();
    } catch (error) {
        console.error('Categories screen error:', error);
        container.innerHTML = `
      <div class="categories-screen" style="align-items: center; justify-content: center; text-align: center; padding: var(--space-xl);">
        <p style="color: var(--color-error); margin-bottom: var(--space-md);">Erreur de chargement</p>
        <button class="btn-primary" onclick="location.reload()">Réessayer</button>
      </div>
    `;
    }
}

function renderScreen() {
    const { userId, onBack, onEditCategory, onAddCategory } = callbacks;

    const expenseCategories = categoriesData.filter(c => c.type !== 'savings');
    const savingsCategories = categoriesData.filter(c => c.type === 'savings');

    container.innerHTML = `
    <div class="categories-screen">
      <!-- Header -->
      <header class="categories-header">
        <button class="categories-back-btn" id="back-btn" aria-label="Retour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="categories-title">Mes catégories</h1>
        <div style="width: 44px;"></div>
      </header>

      <!-- Content -->
      <div class="categories-content">
        <!-- Expense Categories Section -->
        <section class="category-section">
          <div class="category-section-header">
            <h2 class="category-section-title">Dépenses</h2>
            <button class="category-add-btn" id="add-expense-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ajouter
            </button>
          </div>
          
          <div class="category-list">
            ${expenseCategories.length > 0 ? expenseCategories.map(cat => renderCategoryItem(cat)).join('') : `
              <div class="category-empty">
                <span>Aucune catégorie de dépense</span>
              </div>
            `}
          </div>
        </section>

        <!-- Savings Categories Section -->
        <section class="category-section">
          <div class="category-section-header">
            <h2 class="category-section-title">Épargne</h2>
            <button class="category-add-btn savings" id="add-savings-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ajouter
            </button>
          </div>
          
          <div class="category-list">
            ${savingsCategories.length > 0 ? savingsCategories.map(cat => renderCategoryItem(cat, true)).join('') : `
              <div class="category-empty">
                <span>Aucune catégorie d'épargne</span>
              </div>
            `}
          </div>
        </section>
      </div>
    </div>
  `;

    setupEventListeners();
}

function renderCategoryItem(category, isSavings = false) {
    return `
    <div class="category-item ${isSavings ? 'savings' : ''}" data-id="${category.id}">
      <div class="category-item-icon" style="background: ${isSavings ? '#10B98120' : category.color + '20'};">
        ${category.icon}
      </div>
      <div class="category-item-info">
        <div class="category-item-name">${category.name}</div>
        ${category.budget_limit ? `<div class="category-item-budget">Budget: ${category.budget_limit.toLocaleString('fr-FR')} €</div>` : ''}
      </div>
      <div class="category-item-actions">
        <button class="category-edit-btn" data-id="${category.id}" aria-label="Modifier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="category-delete-btn" data-id="${category.id}" aria-label="Supprimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function setupEventListeners() {
    const { userId, onBack, onEditCategory, onAddCategory } = callbacks;

    // Back button
    container.querySelector('#back-btn')?.addEventListener('click', () => {
        if (onBack) onBack();
    });

    // Add expense category
    container.querySelector('#add-expense-btn')?.addEventListener('click', () => {
        if (onAddCategory) onAddCategory('expense');
    });

    // Add savings category
    container.querySelector('#add-savings-btn')?.addEventListener('click', () => {
        if (onAddCategory) onAddCategory('savings');
    });

    // Edit category buttons
    container.querySelectorAll('.category-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const categoryId = btn.dataset.id;
            const category = categoriesData.find(c => c.id === categoryId);
            if (category && onEditCategory) {
                onEditCategory(category);
            }
        });
    });

    // Delete category buttons
    container.querySelectorAll('.category-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const categoryId = btn.dataset.id;
            const category = categoriesData.find(c => c.id === categoryId);

            if (category && confirm(`Supprimer la catégorie "${category.name}" ?\n\nAttention : toutes les dépenses associées seront également supprimées.`)) {
                try {
                    btn.disabled = true;
                    await deleteCategory(categoryId);
                    // Refresh the list
                    const { data: categories } = await getCategories(userId);
                    categoriesData = categories || [];
                    renderScreen();
                } catch (error) {
                    console.error('Error deleting category:', error);
                    alert('Erreur lors de la suppression');
                    btn.disabled = false;
                }
            }
        });
    });

    // Click on category item to edit
    container.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            const categoryId = item.dataset.id;
            const category = categoriesData.find(c => c.id === categoryId);
            if (category && onEditCategory) {
                onEditCategory(category);
            }
        });
    });
}
