/**
 * ============================================================
 *  Sound Engine — Web Audio API (no external files needed)
 *  Generates synthesized game sounds procedurally.
 * ============================================================
 */

'use strict';

let ctx = null;
let muted = false;

function getCtx() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

function playTone({ freq = 440, type = 'sine', duration = 0.15, gain = 0.3, decay = true, delay = 0 } = {}) {
    if (muted) return;
    try {
        const ac  = getCtx();
        const osc = ac.createOscillator();
        const vol = ac.createGain();

        osc.connect(vol);
        vol.connect(ac.destination);

        osc.type            = type;
        osc.frequency.value = freq;
        vol.gain.value      = gain;

        const start = ac.currentTime + delay;
        osc.start(start);

        if (decay) {
            vol.gain.exponentialRampToValueAtTime(0.001, start + duration);
        }
        osc.stop(start + duration + 0.05);
    } catch (_) { /* AudioContext blocked */ }
}

export const sounds = {
    correctAnswer() {
        // Happy ascending arpeggio
        playTone({ freq: 523, type: 'triangle', duration: 0.12, gain: 0.25 });
        playTone({ freq: 659, type: 'triangle', duration: 0.12, gain: 0.25, delay: 0.11 });
        playTone({ freq: 784, type: 'triangle', duration: 0.18, gain: 0.3,  delay: 0.22 });
    },

    wrongAnswer() {
        playTone({ freq: 200, type: 'sawtooth', duration: 0.2, gain: 0.2 });
        playTone({ freq: 150, type: 'sawtooth', duration: 0.25, gain: 0.15, delay: 0.18 });
    },

    enemyDied() {
        // Explosion-like
        playTone({ freq: 180, type: 'sawtooth', duration: 0.08, gain: 0.4 });
        playTone({ freq: 90,  type: 'square',   duration: 0.15, gain: 0.3, delay: 0.06 });
    },

    castleHit() {
        playTone({ freq: 120, type: 'square', duration: 0.4, gain: 0.5 });
        playTone({ freq: 80,  type: 'square', duration: 0.5, gain: 0.4, delay: 0.1 });
    },

    powerUpCollect() {
        [0, 0.08, 0.16, 0.24].forEach((delay, i) => {
            playTone({ freq: 440 + i * 110, type: 'sine', duration: 0.1, gain: 0.25, delay });
        });
    },

    comboMilestone(level) {
        const freqs = [392, 523, 659, 784, 1047];
        const f = freqs[Math.min(level - 2, freqs.length - 1)];
        playTone({ freq: f,       type: 'triangle', duration: 0.15, gain: 0.35 });
        playTone({ freq: f * 1.5, type: 'triangle', duration: 0.2,  gain: 0.25, delay: 0.13 });
    },

    gameOver() {
        [440, 370, 311, 261].forEach((freq, i) =>
            playTone({ freq, type: 'triangle', duration: 0.35, gain: 0.3, delay: i * 0.28 })
        );
    },

    win() {
        [523, 659, 784, 1047, 1175].forEach((freq, i) =>
            playTone({ freq, type: 'triangle', duration: 0.3, gain: 0.3, delay: i * 0.18 })
        );
    },

    freeze() {
        playTone({ freq: 880, type: 'sine', duration: 0.3, gain: 0.2 });
        playTone({ freq: 1100, type: 'sine', duration: 0.2, gain: 0.15, delay: 0.25 });
    },

    toggleMute() {
        muted = !muted;
        return muted;
    },

    isMuted() { return muted; },
};

export default sounds;
