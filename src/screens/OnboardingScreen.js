/**
 * ROADRICH - Onboarding Screen
 * Profile setup with first name and monthly income
 */

import { createProfile } from '../lib/supabase.js';

export function renderOnboardingScreen(container, { userId, onComplete }) {
    container.innerHTML = `
    <div class="onboarding-screen">
      <!-- Header -->
      <header class="onboarding-header">
        <p class="onboarding-greeting">Bienvenue 👋</p>
        <h1 class="onboarding-title">
          Configurons votre <span class="onboarding-title-highlight">cockpit</span>
        </h1>
      </header>
      
      <!-- Form -->
      <form class="onboarding-form" id="onboarding-form">
        <div class="onboarding-input-group">
          <label class="onboarding-label" for="onboarding-firstname">Votre prénom</label>
          <input 
            type="text" 
            id="onboarding-firstname" 
            class="onboarding-input" 
            placeholder="Thomas"
            autocomplete="given-name"
            required
          />
        </div>
        
        <div class="onboarding-input-group">
          <label class="onboarding-label" for="onboarding-income">Revenu mensuel net</label>
          <div class="onboarding-income-wrapper">
            <input 
              type="text" 
              inputmode="numeric"
              id="onboarding-income" 
              class="onboarding-input onboarding-income-input" 
              placeholder="0"
              required
            />
            <span class="onboarding-currency">€</span>
          </div>
          <p class="onboarding-helper">Ce montant servira à calculer votre reste à vivre</p>
        </div>
        
        <button type="submit" class="onboarding-submit-btn" id="onboarding-submit-btn">
          C'est parti ! 🚀
        </button>
      </form>
    </div>
  `;

    // Elements
    const form = container.querySelector('#onboarding-form');
    const firstNameInput = container.querySelector('#onboarding-firstname');
    const incomeInput = container.querySelector('#onboarding-income');
    const submitBtn = container.querySelector('#onboarding-submit-btn');

    // Format income input with spaces for thousands
    incomeInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
            // Format with spaces as thousand separator
            value = parseInt(value, 10).toLocaleString('fr-FR').replace(/,/g, ' ');
        }
        e.target.value = value;
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = firstNameInput.value.trim();
        const incomeValue = incomeInput.value.replace(/\s/g, '');
        const monthlyIncome = parseInt(incomeValue, 10);

        // Validate
        if (!firstName) {
            firstNameInput.focus();
            return;
        }

        if (!monthlyIncome || monthlyIncome <= 0) {
            incomeInput.focus();
            return;
        }

        // Show loading state
        setLoading(true);

        try {
            const { data, error } = await createProfile(userId, firstName, monthlyIncome);

            if (error) {
                throw error;
            }

            // Show success animation
            showSuccessAnimation(firstName, () => {
                onComplete(data);
            });

        } catch (error) {
            console.error('Profile creation error:', error);
            setLoading(false);
            alert('Erreur lors de la création du profil. Réessayez.');
        }
    });

    // Helper functions
    function setLoading(loading) {
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading
            ? '<div class="spinner"></div>'
            : "C'est parti ! 🚀";
    }

    function showSuccessAnimation(firstName, callback) {
        const successOverlay = document.createElement('div');
        successOverlay.className = 'onboarding-success';
        successOverlay.innerHTML = `
      <div class="onboarding-success-icon">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45"/>
          <path d="M30 50 L45 65 L70 35"/>
        </svg>
      </div>
      <p class="onboarding-success-text">Parfait, ${firstName} !</p>
      <p class="onboarding-success-subtext">Votre cockpit est prêt</p>
    `;

        container.appendChild(successOverlay);

        // Navigate after animation
        setTimeout(callback, 2000);
    }
}
