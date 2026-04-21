import './styles/styles.css';
import game from './modules/game';
import authModal from './modules/authModal';

// Show auth popup first; start game only after successful login
authModal.init({
    onLogin(user) {
        console.log(`[Auth] Logged in as ${user.username} (${user.role})`);
        // Inject a user-badge into the footer
        const footer = document.querySelector('#start-page-footer');
        if (footer) {
            const badge = document.createElement('span');
            badge.id = 'user-badge';
            badge.style.cssText =
                'position:fixed;top:10px;right:14px;background:rgba(39,121,195,0.85);' +
                'color:#f3f2c9;padding:6px 14px 4px;border-radius:20px;font-size:0.85rem;' +
                'letter-spacing:1px;z-index:99999;backdrop-filter:blur(6px);' +
                'border:2px solid rgba(255,255,255,0.25);cursor:pointer;';
            badge.title = 'Click to logout';
            badge.textContent = `⚔️ ${user.username}`;
            badge.addEventListener('click', () => {
                if (confirm('Log out of Math Castle?')) {
                    authModal.logout().then(() => location.reload());
                }
            });
            document.body.appendChild(badge);
        }
        game.init();
    },
    onLogout() {
        location.reload();
    },
});

