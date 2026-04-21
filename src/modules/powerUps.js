/**
 * ============================================================
 *  Power-Up System
 *  Randomly drops one of three power-ups during gameplay:
 *    ❄️ FREEZE  — stops all enemies for 5s
 *    🛡️ SHIELD  — blocks next castle hit
 *    ⚡ DOUBLE  — doubles points for 10s
 *
 *  Power-ups appear as clickable badges on the game board.
 * ============================================================
 */

import sounds from './soundEngine';
import particles from './particles';

const POWER_UPS = Object.freeze({
    FREEZE: { id: 'freeze', label: '❄️ FREEZE',  color: '#3498db', duration: 5000 },
    SHIELD: { id: 'shield', label: '🛡️ SHIELD',  color: '#2ecc71', duration: 0    },
    DOUBLE: { id: 'double', label: '⚡ DOUBLE', color: '#f39c12', duration: 10000 },
});

let activeEffects  = {};   // id → true while active
let shieldActive   = false;
let onFreeze       = () => {};
let onUnfreeze     = () => {};

function setCallbacks({ freeze, unfreeze }) {
    onFreeze   = freeze   || (() => {});
    onUnfreeze = unfreeze || (() => {});
}

/** Apply a collected power-up */
function activate(puId) {
    sounds.powerUpCollect();
    const pu = Object.values(POWER_UPS).find(p => p.id === puId);
    if (!pu) return;

    activeEffects[puId] = true;
    updateBadges();

    if (puId === 'freeze') {
        onFreeze();
        setTimeout(() => {
            delete activeEffects[puId];
            updateBadges();
            onUnfreeze();
        }, pu.duration);
    } else if (puId === 'shield') {
        shieldActive = true;
    } else if (puId === 'double') {
        setTimeout(() => {
            delete activeEffects[puId];
            updateBadges();
        }, pu.duration);
    }
}

/** Returns score multiplier additions from active effects */
function getScoreBonus() {
    return activeEffects['double'] ? 2 : 1;
}

/** Consume shield (returns true if shield blocked the hit) */
function consumeShield() {
    if (!shieldActive) return false;
    shieldActive = false;
    delete activeEffects['shield'];
    updateBadges();
    particles.explode(900, 170, { type: 'powerup', count: 20 });
    return true;
}

function isActive(puId) { return !!activeEffects[puId]; }

/** Update the HUD power-up status bar */
function updateBadges() {
    Object.values(POWER_UPS).forEach(pu => {
        const el = document.getElementById(`pu-${pu.id}`);
        if (!el) return;
        if (activeEffects[pu.id]) {
            el.classList.add('pu-active');
        } else {
            el.classList.remove('pu-active');
        }
    });
}

/**
 * Spawn a clickable power-up token on the game board.
 * Call this randomly from the game loop (e.g. every 30s avg).
 */
function spawnToken(gameBoard) {
    const types = Object.values(POWER_UPS);
    const pu    = types[Math.floor(Math.random() * types.length)];

    const token = document.createElement('div');
    token.className    = 'powerup-token';
    token.textContent  = pu.label;
    token.style.background = pu.color;
    token.dataset.puId = pu.id;

    // Random position in the upper-half of the board, avoiding the castle
    const bw      = gameBoard.offsetWidth  || 1000;
    const bh      = gameBoard.offsetHeight || 345;
    token.style.left = `${30 + Math.random() * (bw - 200)}px`;
    token.style.top  = `${10 + Math.random() * (bh * 0.7)}px`;

    let collected = false;
    token.addEventListener('click', () => {
        if (collected) return;
        collected = true;
        particles.explode(
            parseInt(token.style.left) + 50,
            parseInt(token.style.top)  + 20,
            { type: 'powerup', count: 18 }
        );
        token.remove();
        activate(pu.id);
    });

    gameBoard.appendChild(token);

    // Auto-remove after 8 seconds if not collected
    setTimeout(() => token.isConnected && token.remove(), 8000);
}

function reset() {
    activeEffects = {};
    shieldActive  = false;
    updateBadges();
}

export default Object.freeze({
    POWER_UPS,
    setCallbacks,
    activate,
    getScoreBonus,
    consumeShield,
    isActive,
    spawnToken,
    reset,
});
