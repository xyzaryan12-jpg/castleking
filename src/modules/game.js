import gameBoard from './gameBoard';
import castle from './castle';
import Enemy, { ENEMY_EVENT_TYPES, createEnemyEvent } from './enemy';
import Timer from './timer';
import questionGenerator from './questionGenerator';
import scoreHandler from './scoreHandler';
import DEFAULT_SETTINGS from './defaultSettings';
import { hideElement, showElement } from './domUtils';
import Engine from './engine';
import populateQuestionHistory from './questionHistory';
import sounds from './soundEngine';
import combo from './comboSystem';
import particles from './particles';
import powerUps from './powerUps';

const GAMESTATES = {
    MENU: 0,
    RUNNING: 1,
    GAMEOVER: 2,
    PAUSED: 3,
};

const startPage           = document.querySelector('#start-page');
const gamePage            = document.querySelector('#game-page');
const gameOverPage        = document.querySelector('#game-over-page');
const difficultySelectPage = document.querySelector('#difficulty-select-page');
const answerForm          = document.querySelector('.answer-form');
const answerInput         = document.querySelector('#answer-input');
const gameTimer           = document.querySelector('#game-timer');
const startButton         = document.querySelector('.start-button');
const restartButton       = document.querySelector('#restart-button');
const pauseButton         = document.querySelector('.pause-button');
const difficultyButtons   = document.querySelectorAll('[data-difficulty');
const homeButton          = document.querySelector('#home-button');
const gameOverTitle       = document.querySelector('#game-over-title');

const settings  = { ...DEFAULT_SETTINGS };
const timers    = {};
const fieldWidth = gameBoard.width - (castle.width - 70);
const engine    = new Engine(update, draw);

let gameState     = GAMESTATES.MENU;
let selectedEnemy = null;
let enemies       = [];
let questionHistory = [];
let wave          = 1;
let enemiesKilled = 0;
let frozen        = false; // enemies frozen by power-up

// ── Power-Up callbacks ─────────────────────────────────────
powerUps.setCallbacks({
    freeze:   () => { frozen = true;  showFreezeOverlay(true);  },
    unfreeze: () => { frozen = false; showFreezeOverlay(false); },
});

function showFreezeOverlay(on) {
    const board = document.getElementById('game-board');
    if (on) board.classList.add('frozen');
    else    board.classList.remove('frozen');
}

// ── Power-up spawn timer (every 30±10 s) ──────────────────
let puSpawnTimer = null;
function schedulePowerUpSpawn() {
    const delay = 20000 + Math.random() * 20000;
    puSpawnTimer = setTimeout(() => {
        if (gameState === GAMESTATES.RUNNING) {
            powerUps.spawnToken(gameBoard.element);
        }
        schedulePowerUpSpawn();
    }, delay);
}

// ── PRIVATE FUNCTIONS ──────────────────────────────────────

function getEnemyCenter(enemy) {
    const rect  = enemy.element.getBoundingClientRect();
    const bRect = gameBoard.element.getBoundingClientRect();
    return {
        x: rect.left - bRect.left + rect.width  / 2,
        y: rect.top  - bRect.top  + rect.height / 2,
    };
}

function spawnEnemy() {
    const enemy = Enemy({
        position : getRandomSpawnPoint(),
        speed    : settings.enemySpeed,
        question : questionGenerator(settings.questionDifficulty),
        fieldWidth,
        handleSelectEnemy,
        damageCastle,
        deleteEnemy,
    });
    settings.enemySpeed += settings.enemySpeedIncrement;
    gameBoard.element.appendChild(enemy.element);
    enemies.push(enemy);
}

function getRandomSpawnPoint() {
    const keys = Object.keys(settings.SPAWN_POINTS);
    return settings.SPAWN_POINTS[keys[Math.floor(Math.random() * keys.length)]];
}

function deleteEnemy(element) {
    enemies = enemies.filter((enemy) => {
        if (enemy.element !== element) return true;
        if (selectedEnemy === enemy) selectedEnemy = null;
        questionHistory.push(enemy.getQuestionInfo());
        return false;
    });
}

function handleWin() {
    sounds.win();
    gameOver('🏆 You Win!');
}

function initialiseTimers() {
    timers.spawnTimer = Timer(settings.spawnTimerMs, spawnEnemy);
    timers.gameTimer  = Timer(settings.gameTimerMs,  handleWin, { autoRestart: false });
}

function handleAnswerSubmit(event) {
    event.preventDefault();
    if (!selectedEnemy || answerInput.value.trim() === '') return;

    const correctAnswer = selectedEnemy.question.answer.toString();
    const enemyEvent    = createEnemyEvent(ENEMY_EVENT_TYPES.QUESTION_ANSWERED, answerInput.value);
    selectedEnemy.addEvent(enemyEvent);

    if (enemyEvent.answer.value === correctAnswer) {
        enemyEvent.answer.isCorrect = true;

        // Explosion at enemy position
        const center = getEnemyCenter(selectedEnemy);
        particles.explode(center.x, center.y, { type: 'kill', count: 18 });

        // Combo + score
        const comboMult  = combo.increment();
        const scoreBonusMult = powerUps.getScoreBonus();
        const pts        = settings.POINTS.CORRECT_ANSWER * comboMult * scoreBonusMult;
        scoreHandler.addPoints(pts);

        // Floating label
        particles.floatLabel(center.x, center.y - 20, `+${pts}`, comboMult >= 3 ? '#f39c12' : '#2ecc71');

        // Combo milestone sounds
        if (comboMult >= 2) sounds.comboMilestone(comboMult);
        else                sounds.correctAnswer();

        // Wave tracking
        enemiesKilled++;
        updateWaveDisplay();

        selectedEnemy.handleDelete();
        selectedEnemy = null;
    } else {
        enemyEvent.answer.isCorrect = false;
        combo.reset();
        sounds.wrongAnswer();
        scoreHandler.addPoints(settings.POINTS.WRONG_ANSWER);

        // Shake the input
        answerInput.classList.remove('input-shake');
        void answerInput.offsetWidth;
        answerInput.classList.add('input-shake');
    }

    answerInput.value = '';
}

function handleSelectEnemy(event) {
    answerInput.focus();
    const clickedEnemy = enemies.find(e => e.element === event.currentTarget);
    if (clickedEnemy === selectedEnemy) return;
    if (selectedEnemy) selectedEnemy.toggleSelect();
    clickedEnemy.toggleSelect();
    selectedEnemy = clickedEnemy;
}

function damageCastle(amount) {
    // Shield check
    if (powerUps.consumeShield()) return;

    sounds.castleHit();
    combo.reset();
    scoreHandler.addPoints(settings.POINTS.CASTLE_LIFE_LOST);
    castle.damage(amount, gameOver);

    // Screen flash
    const flash = document.getElementById('damage-flash');
    if (flash) {
        flash.classList.remove('flash-active');
        void flash.offsetWidth;
        flash.classList.add('flash-active');
    }
    // Castle shake
    const castleEl = document.getElementById('castle');
    if (castleEl) {
        castleEl.classList.remove('castle-shake');
        void castleEl.offsetWidth;
        castleEl.classList.add('castle-shake');
    }
}

function gameOver(titleText) {
    if (gameState === GAMESTATES.GAMEOVER) return;
    gameState = GAMESTATES.GAMEOVER;

    sounds.gameOver();
    powerUps.reset();
    combo.reset();
    clearTimeout(puSpawnTimer);

    populateQuestionHistory(questionHistory, settings.lastAnswersToShow);
    hideElement(gamePage);
    gameOverTitle.textContent = titleText || 'Game Over';

    // Populate final stats
    const finalWaveEl = document.getElementById('final-wave');
    const finalKillEl = document.getElementById('final-kills');
    if (finalWaveEl) finalWaveEl.textContent = wave;
    if (finalKillEl) finalKillEl.textContent = enemiesKilled;

    showElement(gameOverPage, 'flex');
}

function updateWaveDisplay() {
    // New wave every 10 kills, speed up spawning slightly
    const newWave = Math.floor(enemiesKilled / 10) + 1;
    if (newWave !== wave) {
        wave = newWave;
        settings.spawnTimerMs = Math.max(1500, DEFAULT_SETTINGS.spawnTimerMs - (wave - 1) * 300);
        showWaveBanner(wave);
    }
    const waveEl = document.getElementById('wave-display');
    if (waveEl) waveEl.textContent = `Wave ${wave}`;
}

function showWaveBanner(w) {
    const banner = document.getElementById('wave-banner');
    if (!banner) return;
    banner.textContent = `⚔️ WAVE ${w} ⚔️`;
    banner.classList.remove('wave-show');
    void banner.offsetWidth;
    banner.classList.add('wave-show');
}

function reset() {
    settings.enemySpeed   = DEFAULT_SETTINGS.enemySpeed;
    settings.spawnTimerMs = DEFAULT_SETTINGS.spawnTimerMs;
    wave          = 1;
    enemiesKilled = 0;
    frozen        = false;
    initialiseTimers();
    scoreHandler.reset();
    combo.reset();
    powerUps.reset();
    answerInput.value = '';
    castle.setup(settings.castleStartingLives);
    enemies.forEach((enemy) => enemy.handleDelete());
    enemies       = [];
    questionHistory = [];
    showFreezeOverlay(false);
    updateWaveDisplay();
}

function start(selectedDifficulty) {
    reset();
    settings.questionDifficulty = selectedDifficulty;
    gameState = GAMESTATES.RUNNING;
    engine.start();
    schedulePowerUpSpawn();
}

function restart() {
    reset();
    clearTimeout(puSpawnTimer);
    hideElement(gameOverPage);
    showElement(gamePage, 'flex');
    gameState = GAMESTATES.RUNNING;
    schedulePowerUpSpawn();
}

function pause() {
    gameState = GAMESTATES.PAUSED;
    answerInput.disabled = true;
    enemies.forEach((enemy) => enemy.element.classList.add('not-clickable'));
    clearTimeout(puSpawnTimer);
}

function unPause() {
    gameState = GAMESTATES.RUNNING;
    answerInput.disabled = false;
    enemies.forEach((enemy) => enemy.element.classList.remove('not-clickable'));
    schedulePowerUpSpawn();
}

function update(deltaTime) {
    if (gameState !== GAMESTATES.RUNNING) return;

    Object.keys(timers).forEach((key) => timers[key].tick(deltaTime));

    // Update enemies only if not frozen
    if (!frozen) {
        enemies.forEach((enemy) => enemy.update(deltaTime));
    }
}

function draw() {
    gameTimer.textContent = timers.gameTimer?.getHumanTimeRemaining() || '05:00';
    enemies.forEach((enemy) => enemy.draw());
}

function handlePause() {
    const [first, second] = ['Continue', 'Pause'];
    if (gameState === GAMESTATES.RUNNING) {
        pause();
        engine.stop();
        pauseButton.textContent = first;
    } else if (gameState === GAMESTATES.PAUSED) {
        engine.start();
        unPause();
        pauseButton.textContent = second;
    }
}

function handleStartButtonClick() {
    hideElement(startPage);
    showElement(difficultySelectPage, 'flex');
}

function handleDifficultySelect(event) {
    const selectedDifficulty = event.target.dataset.difficulty;
    hideElement(difficultySelectPage);
    showElement(gamePage, 'flex');
    start(selectedDifficulty);
}

function handleHomeButtonClick() {
    if (gameState === GAMESTATES.PAUSED) handlePause();
    engine.stop();
    clearTimeout(puSpawnTimer);
    gameState = GAMESTATES.MENU;
    hideElement(gamePage);
    showElement(startPage, 'flex');
}

// ── Mute button ────────────────────────────────────────────
function handleMuteToggle() {
    const muted = sounds.toggleMute();
    const btn   = document.getElementById('mute-btn');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
}

// ── PUBLIC INIT ────────────────────────────────────────────
function init() {
    startButton.addEventListener('click', handleStartButtonClick);
    restartButton.addEventListener('click', restart);
    pauseButton.addEventListener('click', handlePause);
    answerForm.addEventListener('submit', handleAnswerSubmit);
    difficultyButtons.forEach((button) =>
        button.addEventListener('click', handleDifficultySelect)
    );
    homeButton.addEventListener('click', handleHomeButtonClick);

    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) muteBtn.addEventListener('click', handleMuteToggle);
}

export default Object.freeze({ init });
