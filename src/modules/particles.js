/**
 * ============================================================
 *  Particle / Explosion Effect System
 *  Spawns CSS-animated particles on the game board when
 *  an enemy is destroyed or the castle takes damage.
 * ============================================================
 */

const COLORS_KILL  = ['#f39c12', '#e74c3c', '#f1c40f', '#fff', '#e67e22'];
const COLORS_HIT   = ['#e74c3c', '#c0392b', '#ff6b6b', '#fff'];
const COLORS_POWER = ['#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#fff'];

/**
 * Spawn an explosion of particles at (x, y) relative to the game board.
 * @param {number} x
 * @param {number} y
 * @param {{ type?: 'kill'|'hit'|'powerup', count?: number }} options
 */
function explode(x, y, { type = 'kill', count = 16 } = {}) {
    const board = document.getElementById('game-board');
    if (!board) return;

    const palette = type === 'hit' ? COLORS_HIT
                  : type === 'powerup' ? COLORS_POWER
                  : COLORS_KILL;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';

        const angle    = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed    = 40 + Math.random() * 80;
        const size     = 4 + Math.random() * 7;
        const duration = 400 + Math.random() * 400;
        const dx       = Math.cos(angle) * speed;
        const dy       = Math.sin(angle) * speed;
        const color    = palette[Math.floor(Math.random() * palette.length)];

        Object.assign(p.style, {
            left           : `${x}px`,
            top            : `${y}px`,
            width          : `${size}px`,
            height         : `${size}px`,
            background     : color,
            '--dx'         : `${dx}px`,
            '--dy'         : `${dy}px`,
            animationDuration : `${duration}ms`,
        });

        board.appendChild(p);
        setTimeout(() => p.remove(), duration + 50);
    }

    // Floating score text ("+10 ×3" etc.)
    // Caller may provide a label via the type string prefix like "label:+30"
}

/**
 * Show a floating score label that drifts up and fades.
 * @param {number} x  @param {number} y  @param {string} text  @param {string} color
 */
function floatLabel(x, y, text, color = '#f1c40f') {
    const board = document.getElementById('game-board');
    if (!board) return;

    const el = document.createElement('div');
    el.className   = 'float-label';
    el.textContent = text;
    el.style.left  = `${x}px`;
    el.style.top   = `${y}px`;
    el.style.color = color;

    board.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

export default { explode, floatLabel };
