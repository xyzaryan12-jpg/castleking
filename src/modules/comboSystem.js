/**
 * ============================================================
 *  Combo System
 *  Tracks consecutive correct answers and applies a score
 *  multiplier (1× → 2× → 3× → 4× → 5× MAX).
 *  Also drives the combo HUD indicator.
 * ============================================================
 */

const MAX_COMBO = 5;

let streak  = 0;
let display = null; // DOM element

function getOrCreateDisplay() {
    if (display) return display;
    display = document.getElementById('combo-display');
    return display;
}

function updateDisplay() {
    const el = getOrCreateDisplay();
    if (!el) return;

    if (streak <= 1) {
        el.style.opacity  = '0';
        el.style.transform = 'scale(0.7)';
        return;
    }

    const multiplier = getMultiplier();
    el.textContent    = `🔥 ${streak}× COMBO  (+${multiplier}×)`;
    el.style.opacity  = '1';
    el.style.transform = 'scale(1)';

    // Color gradient based on streak
    const colors = ['', '', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6'];
    el.style.background = colors[Math.min(streak, colors.length - 1)] || '#f1c40f';

    // Pulse animation
    el.classList.remove('combo-pulse');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('combo-pulse');
}

/** Call on correct answer — returns the active multiplier */
function increment() {
    streak = Math.min(streak + 1, MAX_COMBO);
    updateDisplay();
    return getMultiplier();
}

/** Call on wrong answer or castle hit */
function reset() {
    streak = 0;
    updateDisplay();
}

/** Score multiplier: streak 1→1×, 2→2×, 3→3×, 4→4×, 5→5× */
function getMultiplier() {
    return streak;
}

function getStreak() { return streak; }

export default Object.freeze({ increment, reset, getMultiplier, getStreak });
