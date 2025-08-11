document.addEventListener('DOMContentLoaded', () => {
    // --- Game Settings ---
    const GAME_DURATION = 30;
    const SCORE_TIER_GOLD = 800;
    const SCORE_TIER_SILVER = 500;
    const SCORE_TIER_BRONZE = 300;
    const ITEM_TYPES = {
        coffee: { points: 15, class: 'item-coffee' },
        latte: { points: 25, class: 'item-latte' },
        bad_bean: { points: -30, class: 'item-bad-bean' },
        bad_cup: { points: -25, class: 'item-bad-cup' },
        powerup_time: { points: 3, class: 'item-powerup' }
    };

    // --- DOM Elements ---
    const gameArea = document.getElementById('game-area');
    const playerCup = document.getElementById('player-cup');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const discountContainer = document.getElementById('discount-container');
    const discountTitleElement = document.getElementById('discount-title');
    const discountCodeElement = document.getElementById('discount-code');
    const startBtn = document.getElementById('start-btn');
    const soundGood = document.getElementById('sound-good');
    const soundBad = document.getElementById('sound-bad');
    const soundPowerup = document.getElementById('sound-powerup');

    // --- Game State ---
    let score = 0;
    let timer = GAME_DURATION;
    let gameInterval, itemInterval, animationFrameId;
    let gameActive = false;

    function initializeGame() {
        gameActive = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (gameInterval) clearInterval(gameInterval);
        if (itemInterval) clearInterval(itemInterval);
        
        score = 0;
        timer = GAME_DURATION;
        document.querySelectorAll('.falling-item').forEach(item => item.remove());
        updateUI();
        
        modal.classList.add('visible');
        modalTitle.textContent = "قهوه رو بگیر!";
        modalMessage.textContent = "آماده‌ای؟ با حرکت دادن فنجان، آیتم‌های خوب رو بگیر و از موانع دوری کن!";
        startBtn.textContent = 'شروع بازی';
        discountContainer.classList.add('hidden');
    }

    function startGame() {
        if (gameActive) return;
        gameActive = true;
        
        score = 0;
        timer = GAME_DURATION;
        updateUI();
        modal.classList.remove('visible');

        itemInterval = setInterval(createFallingItem, 420); 
        gameInterval = setInterval(gameLoop, 1000);
        
        animationFrameId = requestAnimationFrame(collisionLoop);
    }

    function gameLoop() {
        if (!gameActive) return;
        timer--;
        updateUI();
        if (timer <= 0) {
            timer = 0;
            endGame();
        }
    }

    function endGame() {
        if (!gameActive) return;
        gameActive = false;
        
        cancelAnimationFrame(animationFrameId);
        clearInterval(gameInterval);
        clearInterval(itemInterval);
        
        setTimeout(() => {
            document.querySelectorAll('.falling-item').forEach(item => item.remove());
            showEndGameModal();
        }, 500);
    }

    function createFallingItem() {
        if (!gameActive) return;
        const item = document.createElement('div');
        item.classList.add('falling-item');

        const rand = Math.random();
        let type;
        if (rand > 0.96) type = 'powerup_time';  // 4%
        else if (rand > 0.73) type = 'bad_bean'; // 23%
        else if (rand > 0.50) type = 'bad_cup';  // 23%
        else if (rand > 0.20) type = 'latte';    // 30%
        else type = 'coffee';                    // 20%
        
        item.dataset.type = type;
        item.classList.add(ITEM_TYPES[type].class);

        const gameAreaWidth = gameArea.offsetWidth;
        item.style.left = `${Math.random() * (gameAreaWidth - 48)}px`;
        item.style.animationDuration = `${(Math.random() * 1.5) + 2.5}s`;
        item.addEventListener('animationend', () => item.remove());
        gameArea.appendChild(item);
    }

    function collisionLoop() {
        if (!gameActive) return;
        const cupRect = playerCup.getBoundingClientRect();
        document.querySelectorAll('.falling-item').forEach(item => {
            const itemRect = item.getBoundingClientRect();
            if (cupRect.left < itemRect.right && cupRect.right > itemRect.left && cupRect.top < itemRect.bottom && cupRect.bottom > itemRect.top) {
                handleCollision(item, cupRect);
                item.remove();
            }
        });
        animationFrameId = requestAnimationFrame(collisionLoop);
    }
    
    function handleCollision(item, cupRect) {
        const type = item.dataset.type;
        const data = ITEM_TYPES[type];
        
        if (type === 'powerup_time') {
            timer += data.points;
            createFloatingText(`+${data.points}s`, cupRect, 'powerup');
            playSound(soundPowerup);
        } else {
            score = Math.max(0, score + data.points);
            const text = data.points > 0 ? `+${data.points}` : `${data.points}`;
            const className = data.points > 0 ? 'good' : 'bad';
            createFloatingText(text, cupRect, className);
            
            if (data.points < 0) {
                gameArea.classList.add('shake');
                setTimeout(() => gameArea.classList.remove('shake'), 300);
                playSound(soundBad);
            } else {
                playSound(soundGood);
            }
        }
        updateUI();
    }
    
    function createFloatingText(text, position, className) {
        const floatText = document.createElement('div');
        floatText.textContent = text;
        floatText.className = `floating-score score-${className}`;
        floatText.style.left = `${position.left + (position.width / 2) - 20}px`;
        floatText.style.top = `${position.top - 30}px`;
        document.body.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1500);
    }
    
    function showEndGameModal() {
        modal.classList.add('visible');
        startBtn.textContent = 'دوباره بازی کن';
        discountContainer.classList.add('hidden');

        if (score >= SCORE_TIER_GOLD) {
            modalTitle.textContent = 'شاهکار!';
            modalMessage.textContent = `با امتیاز ${score} به بالاترین سطح رسیدی!`;
            showDiscount('یک نوشیدنی دلخواه رایگان', 'GOLD-');
        } else if (score >= SCORE_TIER_SILVER) {
            modalTitle.textContent = 'عالی بود!';
            modalMessage.textContent = `با امتیاز ${score} برنده یک جایزه خوب شدی!`;
            showDiscount('کیک روز رایگان', 'SILVER-');
        } else if (score >= SCORE_TIER_BRONZE) {
            modalTitle.textContent = 'آفرین!';
            modalMessage.textContent = `با امتیاز ${score} یک تخفیف گرفتی!`;
            showDiscount('۱۵٪ تخفیف', 'BRONZE-');
        } else {
            modalTitle.textContent = 'حیف شد!';
            modalMessage.textContent = `امتیاز شما: ${score}. دفعه بعد حتماً بهتر میشه!`;
        }
    }
    
    function showDiscount(title, prefix) {
        discountContainer.classList.remove('hidden');
        discountTitleElement.textContent = `جایزه شما: ${title}`;
        const code = generateDiscountCode(prefix);
        discountCodeElement.textContent = code;
        discountCodeElement.classList.add(`tier-${prefix.replace('-', '').toLowerCase()}`);
    }

    function updateUI() {
        scoreElement.textContent = score;
        timerElement.textContent = timer;
    }

    function generateDiscountCode(prefix) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return prefix + code;
    }

    function playSound(sound) {
        if (sound && sound.readyState >= 3) {
            sound.currentTime = 0;
            sound.play().catch(e => {});
        }
    }

    function movePlayer(x) {
        if (!gameActive) return;
        const gameAreaRect = gameArea.getBoundingClientRect();
        const cupWidth = playerCup.offsetWidth;
        let newLeft = x - gameAreaRect.left - (cupWidth / 2);
        newLeft = Math.max(0, Math.min(newLeft, gameAreaRect.width - cupWidth));
        playerCup.style.left = `${newLeft}px`;
    }

    window.addEventListener('mousemove', (e) => movePlayer(e.clientX));
    window.addEventListener('touchmove', (e) => {
        e.preventDefault();
        movePlayer(e.touches[0].clientX);
    }, { passive: false });
    startBtn.addEventListener('click', startGame);

    initializeGame();
});