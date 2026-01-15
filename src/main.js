/**
 * ROADRICH - Main Application
 * Router and state management
 */

// Styles
import './styles/global.css';
import './styles/welcome.css';
import './styles/auth.css';
import './styles/onboarding.css';
import './styles/dashboard.css';
import './styles/add-expense.css';
import './styles/analysis.css';
import './styles/expenses-list.css';
import './styles/categories.css';

// Supabase
import { supabase, getCurrentUser, getProfile, onAuthStateChange, createCategory, updateCategory, deleteCategory, getCategories } from './lib/supabase.js';

// Screens
import { renderWelcomeScreen } from './screens/WelcomeScreen.js';
import { renderAuthScreen } from './screens/AuthScreen.js';
import { renderOnboardingScreen } from './screens/OnboardingScreen.js';
import { renderDashboardScreen } from './screens/DashboardScreen.js';
import { renderAddExpenseScreen } from './screens/AddExpenseScreen.js';
import { renderAnalysisScreen } from './screens/AnalysisScreen.js';
import { renderExpensesListScreen } from './screens/ExpensesListScreen.js';
import { renderCategoriesScreen } from './screens/CategoriesScreen.js';

// App State
const state = {
  user: null,
  profile: null,
  currentScreen: null,
};

// Main app container
const app = document.querySelector('#app');

// Initialize app
async function init() {
  console.log('🚀 Roadrich initializing...');

  // Check for existing session
  const user = await getCurrentUser();

  if (user) {
    state.user = user;

    // Check if profile exists
    const { data: profile } = await getProfile(user.id);

    if (profile) {
      state.profile = profile;
      navigateTo('dashboard');
    } else {
      navigateTo('onboarding');
    }
  } else {
    navigateTo('welcome');
  }

  // Listen for auth state changes
  onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);

    if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      navigateTo('welcome');
    }
  });
}

// Navigation
function navigateTo(screen, options = {}) {
  state.currentScreen = screen;

  switch (screen) {
    case 'welcome':
      renderWelcomeScreen(app, {
        onSignIn: () => navigateTo('auth', { mode: 'signin' }),
        onSignUp: () => navigateTo('auth', { mode: 'signup' }),
      });
      break;

    case 'auth':
      renderAuthScreen(app, {
        mode: options.mode || 'signin',
        onBack: () => navigateTo('welcome'),
        onSuccess: async (data, isSignUp) => {
          state.user = data.user;

          if (isSignUp) {
            // New user - go to onboarding
            navigateTo('onboarding');
          } else {
            // Existing user - check for profile
            const { data: profile } = await getProfile(data.user.id);

            if (profile) {
              state.profile = profile;
              navigateTo('dashboard');
            } else {
              navigateTo('onboarding');
            }
          }
        },
      });
      break;

    case 'onboarding':
      renderOnboardingScreen(app, {
        userId: state.user.id,
        onComplete: (profile) => {
          state.profile = profile;
          navigateTo('dashboard');
        },
      });
      break;

    case 'dashboard':
      renderDashboardScreen(app, {
        userId: state.user.id,
        onLogout: () => {
          state.user = null;
          state.profile = null;
          navigateTo('welcome');
        },
        onAddExpense: () => {
          navigateTo('add-expense');
        },
        onAddCategory: (mode) => {
          showAddCategoryModal(mode);
        },
        onEditCategory: (category) => {
          showEditCategoryModal(category);
        },
        onAnalysis: () => {
          navigateTo('analysis');
        },
        onExpensesList: (categoryId) => {
          navigateTo('expenses-list', { categoryId });
        },
        onManageCategories: () => {
          navigateTo('categories');
        },
      });
      break;

    case 'analysis':
      renderAnalysisScreen(app, {
        userId: state.user.id,
        onBack: () => navigateTo('dashboard'),
      });
      break;

    case 'add-expense':
      renderAddExpenseScreen(app, {
        userId: state.user.id,
        onBack: () => navigateTo('dashboard'),
        onSuccess: () => navigateTo('dashboard'),
      });
      break;

    case 'expenses-list':
      renderExpensesListScreen(app, {
        userId: state.user.id,
        onBack: () => navigateTo('dashboard'),
        initialCategoryId: options?.categoryId || null,
      });
      break;

    case 'categories':
      renderCategoriesScreen(app, {
        userId: state.user.id,
        onBack: () => navigateTo('dashboard'),
        onEditCategory: (category) => {
          showEditCategoryModal(category);
        },
        onAddCategory: (mode) => {
          showAddCategoryModal(mode);
        },
      });
      break;

    default:
      console.error('Unknown screen:', screen);
      navigateTo('welcome');
  }
}

// Category Modal
function showAddCategoryModal(initialMode = 'expense') {
  // Predefined icons and colors
  const icons = [
    '🏠', '🚗', '🍔', '🎭', '💊', '🛒',  // Home, Car, Food, Entertainment, Health, Shopping
    '💡', '📱', '👕', '✈️', '🎓', '💼',  // Utilities, Phone, Clothes, Travel, Education, Work
    '🎮', '🎥', '🎵', '📚', '☕', '🍽️',  // Gaming, Movies, Music, Books, Coffee, Restaurant
    '💪', '💈', '💅', '🎁', '👶', '🐶',  // Gym, Barber, Beauty, Gifts, Baby, Pets
    '🏖️', '⚽', '🚴', '🏟️', '🏘️', '💰',  // Beach, Sports, Bike, Stadium, Building, Money
    '🍷', '🍰', '🛍️', '🛠️', '🔑', '📦'   // Wine, Cake, Cart, Tools, Keys, Package
  ];
  const colors = ['#00F5D4', '#9B5DE5', '#FF6B6B', '#00BBF9', '#FEE440', '#F15BB5'];

  // State
  let selectedIcon = icons[0];
  let selectedColor = colors[0];
  let selectedType = initialMode;

  // Pre-calculate initial toggle styles based on mode
  const isSavingsInit = initialMode === 'savings';
  const initialBgLeft = isSavingsInit ? 'calc(50% + 0px)' : '4px';
  const initialBgColor = isSavingsInit ? '#10B981' : 'var(--color-accent-cyan)';
  const expenseColor = isSavingsInit ? 'var(--color-text-secondary)' : 'var(--color-bg-primary)';
  const savingsColor = isSavingsInit ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)';
  const expenseActive = isSavingsInit ? '' : 'active';
  const savingsActive = isSavingsInit ? 'active' : '';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content glass-card" style="
      width: 90%;
      max-width: 400px;
      max-height: 90vh;
      padding: var(--space-lg);
      animation: scaleIn 0.3s ease;
      overflow-y: auto;
      overflow-x: hidden;
    ">
      <h2 style="font-size: var(--text-xl); margin-bottom: var(--space-lg);">Nouvelle catégorie</h2>
      
      <form id="category-form" style="display: flex; flex-direction: column; gap: var(--space-lg);">
        <!-- Type Selector (Expense/Savings) -->
        <div>
          <label class="auth-label" style="margin-bottom: var(--space-sm); display: block;">Type</label>
          <div class="type-selector" id="type-selector" style="
            display: flex;
            background: var(--color-bg-elevated);
            border-radius: var(--radius-full);
            padding: 4px;
            position: relative;
          ">
            <div class="type-selector-bg" id="type-bg" style="
              position: absolute;
              top: 4px;
              left: ${initialBgLeft};
              width: calc(50% - 4px);
              height: calc(100% - 8px);
              background: ${initialBgColor};
              border-radius: var(--radius-full);
              transition: all 0.3s ease;
            "></div>
            <button type="button" class="type-option ${expenseActive}" data-type="expense" style="
              flex: 1;
              padding: var(--space-sm) var(--space-md);
              border: none;
              background: transparent;
              color: ${expenseColor};
              font-size: var(--text-sm);
              font-weight: var(--font-semibold);
              cursor: pointer;
              position: relative;
              z-index: 1;
              transition: color 0.3s ease;
            ">💸 Dépense</button>
            <button type="button" class="type-option ${savingsActive}" data-type="savings" style="
              flex: 1;
              padding: var(--space-sm) var(--space-md);
              border: none;
              background: transparent;
              color: ${savingsColor};
              font-size: var(--text-sm);
              font-weight: var(--font-semibold);
              cursor: pointer;
              position: relative;
              z-index: 1;
              transition: color 0.3s ease;
            ">💰 Épargne</button>
          </div>
        </div>

        <!-- Name Input -->
        <div class="auth-input-group">
          <label class="auth-label" for="category-name">Nom</label>
          <input 
            type="text" 
            id="category-name" 
            class="auth-input" 
            placeholder="Ex: Alimentation"
            required
          />
        </div>
        
        <!-- Icon Selection -->
        <div>
          <label class="auth-label" style="margin-bottom: var(--space-sm); display: block;">Icône</label>
          <div style="
            display: grid; 
            grid-template-columns: repeat(6, 1fr); 
            gap: 6px;
            max-height: 180px;
            overflow-y: auto;
            padding: 4px;
            margin: -4px;
          ">
            ${icons.map((icon, i) => `
              <button type="button" class="icon-option ${i === 0 ? 'selected' : ''}" data-icon="${icon}" style="
                width: 100%;
                aspect-ratio: 1;
                max-width: 40px;
                border-radius: var(--radius-md);
                background: var(--color-bg-input);
                border: 2px solid ${i === 0 ? 'var(--color-accent-cyan)' : 'transparent'};
                font-size: 1.1rem;
                cursor: pointer;
                transition: all var(--transition-fast);
                display: flex;
                align-items: center;
                justify-content: center;
              ">${icon}</button>
            `).join('')}
          </div>
        </div>
        
        <!-- Color Selection -->
        <div>
          <label class="auth-label" style="margin-bottom: var(--space-sm); display: block;">Couleur</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${colors.map((color, i) => `
              <button type="button" class="color-option ${i === 0 ? 'selected' : ''}" data-color="${color}" style="
                width: 32px;
                height: 32px;
                border-radius: var(--radius-full);
                background: ${color};
                border: 3px solid ${i === 0 ? 'white' : 'transparent'};
                cursor: pointer;
                transition: all var(--transition-fast);
                flex-shrink: 0;
              "></button>
            `).join('')}
          </div>
        </div>
        
        <!-- Budget Limit (Optional) -->
        <div class="auth-input-group">
          <label class="auth-label" for="category-budget">Budget mensuel (optionnel)</label>
          <div style="position: relative;">
            <input 
              type="text" 
              inputmode="numeric"
              id="category-budget" 
              class="auth-input" 
              placeholder="0"
              style="text-align: right; padding-right: 40px; font-family: var(--font-mono);"
            />
            <span style="
              position: absolute;
              right: var(--space-md);
              top: 50%;
              transform: translateY(-50%);
              color: var(--color-accent-cyan);
              font-family: var(--font-mono);
            ">€</span>
          </div>
        </div>
        
        <!-- Buttons -->
        <div style="display: flex; gap: var(--space-md); margin-top: var(--space-md);">
          <button type="button" class="btn-secondary" id="cancel-category-btn" style="flex: 1;">
            Annuler
          </button>
          <button type="submit" class="btn-primary" id="save-category-btn" style="flex: 1;">
            Créer
          </button>
        </div>
      </form>
    </div>
  `;

  // Add modal styles if not present
  if (!document.getElementById('modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-modal);
        padding: var(--space-lg);
        animation: fadeIn 0.2s ease;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(modal);

  // Type selection (sliding toggle)
  const typeBg = modal.querySelector('#type-bg');
  modal.querySelectorAll('.type-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      selectedType = type;

      // Update button styles
      modal.querySelectorAll('.type-option').forEach(b => {
        b.style.color = 'var(--color-text-secondary)';
        b.classList.remove('active');
      });
      btn.style.color = 'var(--color-bg-primary)';
      btn.classList.add('active');

      // Slide background
      if (type === 'savings') {
        typeBg.style.left = 'calc(50% + 0px)';
        typeBg.style.background = '#10B981'; // Emerald green
      } else {
        typeBg.style.left = '4px';
        typeBg.style.background = 'var(--color-accent-cyan)';
      }
    });
  });

  // Icon selection
  modal.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.icon-option').forEach(b => {
        b.style.borderColor = 'transparent';
        b.classList.remove('selected');
      });
      btn.style.borderColor = 'var(--color-accent-cyan)';
      btn.classList.add('selected');
      selectedIcon = btn.dataset.icon;
    });
  });

  // Color selection
  modal.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.color-option').forEach(b => {
        b.style.borderColor = 'transparent';
        b.classList.remove('selected');
      });
      btn.style.borderColor = 'white';
      btn.classList.add('selected');
      selectedColor = btn.dataset.color;
    });
  });

  // Budget input formatting
  const budgetInput = modal.querySelector('#category-budget');
  budgetInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
      value = parseInt(value, 10).toLocaleString('fr-FR').replace(/,/g, ' ');
    }
    e.target.value = value;
  });

  // Cancel
  modal.querySelector('#cancel-category-btn').addEventListener('click', () => {
    modal.remove();
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Submit
  modal.querySelector('#category-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = modal.querySelector('#category-name').value.trim();
    const budgetValue = budgetInput.value.replace(/\s/g, '');
    const budget = budgetValue ? parseInt(budgetValue, 10) : null;

    if (!name) return;

    const saveBtn = modal.querySelector('#save-category-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div>';

    try {
      await createCategory(state.user.id, name, selectedIcon, selectedColor, budget, selectedType);
      modal.remove();
      // Refresh dashboard
      navigateTo('dashboard');
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Erreur lors de la création de la catégorie');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Créer';
    }
  });

  // Focus on name input
  modal.querySelector('#category-name').focus();
}

// Edit Category Modal
function showEditCategoryModal(category) {
  // Predefined icons and colors
  const icons = [
    '🏠', '🚗', '🍔', '🎭', '💊', '🛒',  // Home, Car, Food, Entertainment, Health, Shopping
    '💡', '📱', '👕', '✈️', '🎓', '💼',  // Utilities, Phone, Clothes, Travel, Education, Work
    '🎮', '🎥', '🎵', '📚', '☕', '🍽️',  // Gaming, Movies, Music, Books, Coffee, Restaurant
    '💪', '💈', '💅', '🎁', '👶', '🐶',  // Gym, Barber, Beauty, Gifts, Baby, Pets
    '🏖️', '⚽', '🚴', '🏟️', '🏘️', '💰',  // Beach, Sports, Bike, Stadium, Building, Money
    '🍷', '🍰', '🛍️', '🛠️', '🔑', '📦'   // Wine, Cake, Cart, Tools, Keys, Package
  ];
  const colors = ['#00F5D4', '#9B5DE5', '#FF6B6B', '#00BBF9', '#FEE440', '#F15BB5'];

  let selectedIcon = category.icon;
  let selectedColor = category.color;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content glass-card" style="
      width: 90%;
      max-width: 400px;
      max-height: 90vh;
      padding: var(--space-lg);
      padding-top: var(--space-xl);
      animation: scaleIn 0.3s ease;
      overflow-y: auto;
      overflow-x: hidden;
    ">
      <button class="modal-close-btn" id="close-edit-modal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <h2 style="font-size: var(--text-xl); margin-bottom: var(--space-lg);">Modifier la catégorie</h2>
      
      <form id="edit-category-form" style="display: flex; flex-direction: column; gap: var(--space-lg);">
        <!-- Name Input -->
        <div class="auth-input-group">
          <label class="auth-label" for="edit-category-name">Nom</label>
          <input 
            type="text" 
            id="edit-category-name" 
            class="auth-input" 
            value="${category.name}"
            required
          />
        </div>
        
        <!-- Icon Selection -->
        <div>
          <label class="auth-label" style="margin-bottom: var(--space-sm); display: block;">Icône</label>
          <div style="
            display: grid; 
            grid-template-columns: repeat(6, 1fr); 
            gap: 6px;
            max-height: 180px;
            overflow-y: auto;
            padding: 4px;
            margin: -4px;
          ">
            ${icons.map((icon) => `
              <button type="button" class="icon-option ${icon === selectedIcon ? 'selected' : ''}" data-icon="${icon}" style="
                width: 100%;
                aspect-ratio: 1;
                max-width: 40px;
                border-radius: var(--radius-md);
                background: var(--color-bg-input);
                border: 2px solid ${icon === selectedIcon ? 'var(--color-accent-cyan)' : 'transparent'};
                font-size: 1.1rem;
                cursor: pointer;
                transition: all var(--transition-fast);
                display: flex;
                align-items: center;
                justify-content: center;
              ">${icon}</button>
            `).join('')}
          </div>
        </div>
        
        <!-- Color Selection -->
        <div>
          <label class="auth-label" style="margin-bottom: var(--space-sm); display: block;">Couleur</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${colors.map((color) => `
              <button type="button" class="color-option ${color === selectedColor ? 'selected' : ''}" data-color="${color}" style="
                width: 32px;
                height: 32px;
                border-radius: var(--radius-full);
                background: ${color};
                border: 3px solid ${color === selectedColor ? 'white' : 'transparent'};
                cursor: pointer;
                transition: all var(--transition-fast);
                flex-shrink: 0;
              "></button>
            `).join('')}
          </div>
        </div>
        
        <!-- Budget Limit -->
        <div class="auth-input-group">
          <label class="auth-label" for="edit-category-budget">Budget mensuel (optionnel)</label>
          <div style="position: relative;">
            <input 
              type="text" 
              inputmode="numeric"
              id="edit-category-budget" 
              class="auth-input" 
              value="${category.budget_limit || ''}"
              style="text-align: right; padding-right: 40px; font-family: var(--font-mono);"
            />
            <span style="
              position: absolute;
              right: var(--space-md);
              top: 50%;
              transform: translateY(-50%);
              color: var(--color-accent-cyan);
              font-family: var(--font-mono);
            ">€</span>
          </div>
        </div>
        
        <!-- Buttons -->
        <div style="display: flex; flex-direction: column; gap: var(--space-md); margin-top: var(--space-md);">
          <button type="submit" class="btn-primary" id="save-edit-category-btn">
            Enregistrer
          </button>
          <button type="button" class="expense-action-btn delete" id="delete-category-btn" style="margin-top: var(--space-sm);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            Supprimer cette catégorie
          </button>
          <button type="button" class="btn-secondary" id="cancel-edit-category-btn">
            Annuler
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Icon selection
  modal.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.icon-option').forEach(b => {
        b.style.borderColor = 'transparent';
        b.classList.remove('selected');
      });
      btn.style.borderColor = 'var(--color-accent-cyan)';
      btn.classList.add('selected');
      selectedIcon = btn.dataset.icon;
    });
  });

  // Color selection
  modal.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.color-option').forEach(b => {
        b.style.borderColor = 'transparent';
        b.classList.remove('selected');
      });
      btn.style.borderColor = 'white';
      btn.classList.add('selected');
      selectedColor = btn.dataset.color;
    });
  });

  // Budget input formatting
  const budgetInput = modal.querySelector('#edit-category-budget');
  budgetInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
      value = parseInt(value, 10).toLocaleString('fr-FR').replace(/,/g, ' ');
    }
    e.target.value = value;
  });

  // Cancel
  modal.querySelector('#cancel-edit-category-btn').addEventListener('click', () => {
    modal.remove();
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close button
  modal.querySelector('#close-edit-modal')?.addEventListener('click', () => {
    modal.remove();
  });

  // Delete category
  modal.querySelector('#delete-category-btn').addEventListener('click', async () => {
    if (!confirm('Supprimer cette catégorie ? Les dépenses associées seront conservées mais non catégorisées.')) return;

    const deleteBtn = modal.querySelector('#delete-category-btn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div> Suppression...';

    try {
      await deleteCategory(category.id);
      modal.remove();
      navigateTo('dashboard');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erreur lors de la suppression');
      deleteBtn.disabled = false;
    }
  });

  // Submit (update)
  modal.querySelector('#edit-category-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = modal.querySelector('#edit-category-name').value.trim();
    const budgetValue = budgetInput.value.replace(/\s/g, '');
    const budget = budgetValue ? parseInt(budgetValue, 10) : null;

    if (!name) return;

    const saveBtn = modal.querySelector('#save-edit-category-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div>';

    try {
      await updateCategory(category.id, {
        name,
        icon: selectedIcon,
        color: selectedColor,
        budget_limit: budget,
      });
      modal.remove();
      navigateTo('dashboard');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Erreur lors de la mise à jour');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Enregistrer';
    }
  });

  // Focus on name input
  modal.querySelector('#edit-category-name').focus();
}

// Categories Management Modal
async function showCategoriesModal() {
  // Fetch categories
  const { data: categories } = await getCategories(state.user.id);

  const expenseCategories = (categories || []).filter(c => c.type !== 'savings');
  const savingsCategories = (categories || []).filter(c => c.type === 'savings');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content glass-card" style="
      width: 90%;
      max-width: 450px;
      max-height: 85vh;
      padding: var(--space-lg);
      animation: scaleIn 0.3s ease;
      overflow-y: auto;
      overflow-x: hidden;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
        <h2 style="font-size: var(--text-xl);">Mes catégories</h2>
        <button class="modal-close-btn" id="close-modal-btn" style="background: transparent; padding: var(--space-sm);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <!-- Expense Categories -->
      <div style="margin-bottom: var(--space-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <h3 style="font-size: var(--text-sm); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.1em;">Dépenses</h3>
          <button class="category-add-btn" id="add-expense-cat-btn" style="font-size: var(--text-xs);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        </div>
        <div class="categories-list" style="display: flex; flex-direction: column; gap: var(--space-sm);">
          ${expenseCategories.length > 0 ? expenseCategories.map(cat => `
            <div class="category-item" data-id="${cat.id}" style="
              display: flex;
              align-items: center;
              gap: var(--space-md);
              padding: var(--space-md);
              background: var(--color-bg-elevated);
              border-radius: var(--radius-lg);
              cursor: pointer;
              transition: all var(--transition-fast);
            ">
              <div style="
                width: 40px;
                height: 40px;
                border-radius: var(--radius-md);
                background: ${cat.color}20;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
              ">${cat.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: var(--font-medium);">${cat.name}</div>
                ${cat.budget_limit ? `<div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">Budget: ${cat.budget_limit.toLocaleString('fr-FR')} €</div>` : ''}
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: var(--color-text-tertiary);">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          `).join('') : '<div style="color: var(--color-text-tertiary); text-align: center; padding: var(--space-md);">Aucune catégorie de dépense</div>'}
        </div>
      </div>
      
      <!-- Savings Categories -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <h3 style="font-size: var(--text-sm); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.1em;">Épargne</h3>
          <button class="category-add-btn" id="add-savings-cat-btn" style="font-size: var(--text-xs); color: #10B981;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        </div>
        <div class="categories-list" style="display: flex; flex-direction: column; gap: var(--space-sm);">
          ${savingsCategories.length > 0 ? savingsCategories.map(cat => `
            <div class="category-item" data-id="${cat.id}" style="
              display: flex;
              align-items: center;
              gap: var(--space-md);
              padding: var(--space-md);
              background: var(--color-bg-elevated);
              border-radius: var(--radius-lg);
              cursor: pointer;
              transition: all var(--transition-fast);
              border-left: 3px solid #10B981;
            ">
              <div style="
                width: 40px;
                height: 40px;
                border-radius: var(--radius-md);
                background: #10B98120;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
              ">${cat.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: var(--font-medium);">${cat.name}</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: var(--color-text-tertiary);">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          `).join('') : '<div style="color: var(--color-text-tertiary); text-align: center; padding: var(--space-md);">Aucune catégorie d\'épargne</div>'}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  modal.querySelector('#close-modal-btn')?.addEventListener('click', () => {
    modal.remove();
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Add expense category
  modal.querySelector('#add-expense-cat-btn')?.addEventListener('click', () => {
    modal.remove();
    showAddCategoryModal('expense');
  });

  // Add savings category
  modal.querySelector('#add-savings-cat-btn')?.addEventListener('click', () => {
    modal.remove();
    showAddCategoryModal('savings');
  });

  // Click on category to edit
  modal.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      const categoryId = item.dataset.id;
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        modal.remove();
        showEditCategoryModal(category);
      }
    });
  });
}

// Start the app
init();
