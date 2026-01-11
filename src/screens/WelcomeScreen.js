/**
 * ROADRICH - Welcome Screen
 * First screen with app branding and auth navigation
 */

export function renderWelcomeScreen(container, { onSignIn, onSignUp }) {
    container.innerHTML = `
    <div class="welcome-screen">
      <!-- Background decorations -->
      <div class="welcome-decoration welcome-decoration-1"></div>
      <div class="welcome-decoration welcome-decoration-2"></div>
      
      <!-- Logo & Title -->
      <div class="welcome-logo-container">
        <h1 class="welcome-title">Roadrich</h1>
        <p class="welcome-tagline">Cockpit Financier</p>
      </div>
      
      <!-- Action Buttons -->
      <div class="welcome-buttons">
        <button class="welcome-btn welcome-btn-primary" id="welcome-signup-btn">
          Créer un compte
        </button>
        <button class="welcome-btn welcome-btn-secondary" id="welcome-signin-btn">
          Se connecter
        </button>
      </div>
    </div>
  `;

    // Event listeners
    container.querySelector('#welcome-signup-btn').addEventListener('click', onSignUp);
    container.querySelector('#welcome-signin-btn').addEventListener('click', onSignIn);
}
