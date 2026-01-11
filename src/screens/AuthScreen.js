/**
 * ROADRICH - Auth Screen
 * Sign In / Sign Up form with email and password
 */

import { signIn, signUp } from '../lib/supabase.js';

export function renderAuthScreen(container, { mode = 'signin', onBack, onSuccess }) {
    const isSignUp = mode === 'signup';

    container.innerHTML = `
    <div class="auth-screen">
      <!-- Header with back button -->
      <header class="auth-header">
        <button class="auth-back-btn" id="auth-back-btn" aria-label="Retour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </header>
      
      <!-- Title -->
      <div class="auth-title-section">
        <h1 class="auth-title">${isSignUp ? 'Créer un compte' : 'Bon retour !'}</h1>
        <p class="auth-subtitle">${isSignUp ? 'Commencez à gérer vos finances' : 'Connectez-vous pour continuer'}</p>
      </div>
      
      <!-- Form -->
      <form class="auth-form" id="auth-form">
        <div class="auth-input-group">
          <label class="auth-label" for="auth-email">Email</label>
          <input 
            type="email" 
            id="auth-email" 
            class="auth-input" 
            placeholder="votre@email.com"
            autocomplete="email"
            required
          />
        </div>
        
        <div class="auth-input-group">
          <label class="auth-label" for="auth-password">Mot de passe</label>
          <div class="auth-input-wrapper">
            <input 
              type="password" 
              id="auth-password" 
              class="auth-input" 
              placeholder="${isSignUp ? 'Minimum 6 caractères' : '••••••••'}"
              autocomplete="${isSignUp ? 'new-password' : 'current-password'}"
              minlength="6"
              required
            />
            <button type="button" class="auth-password-toggle" id="auth-password-toggle" aria-label="Afficher le mot de passe">
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
        </div>
        
        <div id="auth-error" class="auth-error" style="display: none;"></div>
        
        <button type="submit" class="auth-submit-btn" id="auth-submit-btn">
          ${isSignUp ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>
      
      <!-- Toggle link -->
      <p class="auth-toggle">
        ${isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
        <span class="auth-toggle-link" id="auth-toggle-link">
          ${isSignUp ? 'Se connecter' : 'Créer un compte'}
        </span>
      </p>
    </div>
  `;

    // Elements
    const form = container.querySelector('#auth-form');
    const emailInput = container.querySelector('#auth-email');
    const passwordInput = container.querySelector('#auth-password');
    const passwordToggle = container.querySelector('#auth-password-toggle');
    const submitBtn = container.querySelector('#auth-submit-btn');
    const errorDiv = container.querySelector('#auth-error');
    const toggleLink = container.querySelector('#auth-toggle-link');
    const backBtn = container.querySelector('#auth-back-btn');

    // Password visibility toggle
    passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passwordToggle.querySelector('.eye-open').style.display = isPassword ? 'none' : 'block';
        passwordToggle.querySelector('.eye-closed').style.display = isPassword ? 'block' : 'none';
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validate
        if (!email || !password) {
            showError('Veuillez remplir tous les champs');
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        // Show loading state
        setLoading(true);
        hideError();

        try {
            const { data, error } = isSignUp
                ? await signUp(email, password)
                : await signIn(email, password);

            if (error) {
                throw error;
            }

            // Success
            onSuccess(data, isSignUp);

        } catch (error) {
            console.error('Auth error:', error);
            showError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    });

    // Toggle between sign in/up
    toggleLink.addEventListener('click', () => {
        renderAuthScreen(container, {
            mode: isSignUp ? 'signin' : 'signup',
            onBack,
            onSuccess,
        });
    });

    // Back button
    backBtn.addEventListener('click', onBack);

    // Helper functions
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'flex';
    }

    function hideError() {
        errorDiv.style.display = 'none';
    }

    function setLoading(loading) {
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading
            ? '<div class="spinner"></div>'
            : (isSignUp ? 'Créer mon compte' : 'Se connecter');
    }

    function getErrorMessage(error) {
        const message = error.message?.toLowerCase() || '';

        if (message.includes('invalid login credentials')) {
            return 'Email ou mot de passe incorrect';
        }
        if (message.includes('user already registered')) {
            return 'Cet email est déjà utilisé';
        }
        if (message.includes('invalid email')) {
            return 'Adresse email invalide';
        }
        if (message.includes('weak password')) {
            return 'Le mot de passe est trop faible';
        }
        if (message.includes('network')) {
            return 'Erreur de connexion. Vérifiez votre internet.';
        }

        return 'Une erreur est survenue. Réessayez.';
    }
}
