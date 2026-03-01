document.addEventListener('DOMContentLoaded', function() {
    initializeCountdown();
    setupWindowButtons();
});

function setupWindowButtons() {
    const minimizeBtn = document.querySelector('.title-btn.minimize');
    const maximizeBtn = document.querySelector('.title-btn.maximize');
    const closeBtn = document.querySelector('.title-btn.close');
    
    minimizeBtn.addEventListener('click', () => {
        const contents = document.querySelector('.window-contents');
        contents.style.display = contents.style.display === 'none' ? 'block' : 'none';
    });
    
    closeBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}

function initializeCountdown() {
    const dateInput = document.getElementById('dateInput');
    const setCountdownBtn = document.getElementById('setCountdown');
    const clearCountdownBtn = document.getElementById('clearCountdown');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    let countdownInterval;
    
    const holidays = {
        halloween: { date: '2026-10-31T00:00', title: 'Halloween 🎃', emoji: '🎃' },
        christmas: { date: '2026-12-25T00:00', title: 'Christmas 🎄', emoji: '🎁' },
        newyears: { date: '2027-01-01T00:00', title: 'New Year\'s 🎊', emoji: '🎊' },
        birthday: { date: '2027-01-22T00:00', title: 'My Birthday! 🎂', emoji: '🎂'},
        chinesenewyears: { date: '2027-02-06T00:00', title: 'Chinese New Year\'s 🐉', emoji: '🐉'},
        valentines: { date: '2027-02-14T00:00', title: 'Valentine\'s Day 💖', emoji: '💖' },
        stpatricksday: { date: '2026-03-17T00:00', title: 'St. Patrick\'s Day 🍀', emoji: '🍀'},
        easter: { date: '2026-04-05T00:00', title: 'Easter 🐇', emoji: '🐇'}
    };
    
    const savedCountdown = localStorage.getItem('countdownDate');
    const savedTitle = localStorage.getItem('countdownTitle');
    if (savedCountdown && savedTitle) {
        startCountdown(new Date(savedCountdown), savedTitle);
    } else {
        const now = new Date();
        let nearestHoliday = null;
        let nearestDate = null;
        let closestDifference = Infinity;
        
        for (const [key, holidayData] of Object.entries(holidays)) {
            const holidayDate = new Date(holidayData.date);
            const difference = holidayDate - now;
            
            if (difference > 0 && difference < closestDifference) {
                closestDifference = difference;
                nearestHoliday = key;
                nearestDate = holidayDate;
            }
        }
        
        if (nearestHoliday && nearestDate) {
            const holidayData = holidays[nearestHoliday];
            startCountdown(nearestDate, holidayData.title);
            localStorage.setItem('countdownDate', nearestDate.toISOString());
            localStorage.setItem('countdownTitle', holidayData.title);
        }
    }
    
    setCountdownBtn.addEventListener('click', () => {
        const selectedDate = new Date(dateInput.value);
        if (selectedDate && selectedDate > new Date()) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const title = `Countdown to ${selectedDate.toLocaleDateString(undefined, options)}`;
            startCountdown(selectedDate, title);
            localStorage.setItem('countdownDate', selectedDate.toISOString());
            localStorage.setItem('countdownTitle', title);
        }
    });
    
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const holiday = btn.dataset.holiday;
            const holidayData = holidays[holiday];
            const holidayDate = new Date(holidayData.date);
            
            startCountdown(holidayDate, holidayData.title);
            localStorage.setItem('countdownDate', holidayDate.toISOString());
            localStorage.setItem('countdownTitle', holidayData.title);
            
            triggerHolidayAnimation(holiday, holidayData.emoji);
        });
    });
    
    clearCountdownBtn.addEventListener('click', () => {
        clearInterval(countdownInterval);
        countdownDisplay.style.display = 'none';
        localStorage.removeItem('countdownDate');
        localStorage.removeItem('countdownTitle');
    });
    
    function startCountdown(targetDate, title) {
        countdownDisplay.style.display = 'block';
        document.getElementById('countdownTitle').textContent = title;
        
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            const now = new Date();
            const difference = targetDate - now;
            
            if (difference <= 0) {
                clearInterval(countdownInterval);
                document.getElementById('countdownTitle').textContent = 'Time\'s up! 🎉';
                document.getElementById('days').textContent = '0';
                document.getElementById('hours').textContent = '0';
                document.getElementById('minutes').textContent = '0';
                document.getElementById('seconds').textContent = '0';
                return;
            }
            
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            document.getElementById('days').textContent = String(days).padStart(2, '0');
            document.getElementById('hours').textContent = String(hours).padStart(2, '0');
            document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
            document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
        }, 1000);
    }
}

function triggerHolidayAnimation(holiday, emoji) {
    const animations = {
        halloween: () => createFallingItems(['🎃', '👻', '🩻', '💀', '🍬', '🍭', '🍫', '🏚️', '🦇', '🍂'], 3000),
        christmas: () => createFallingItems(['🎄', '🎁', '❄️', '⛄', '🔔', '🌟', '🎅', '🧝', '🍪', '🥛', '🦌'], 3000),
        newyears: () => createConfetti(),
        birthday: () => createFallingItems(['🍰', '🎂', '🎊', '🥳', '🎈', '🎁', '🍷'], 3000),
        chinesenewyears: () => createFallingItems(['🐉', '🐲', '🏮', '🥳', '🍾', '🎇', '🎆', '🥂'], 3000),
        valentines: () => createFallingItems(['💖', '💕', '💗', '💓', '💝', '💘', '❤️', '🧡', '💛', '💚', '💙', '💜'], 3000),
        stpatricksday: () => createFallingItems(['🍀', '💰', '🌈', '☁️', '☘️'], 3000),
        easter: () => createFallingItems(['🐰', '🐣', '🐥', '💐', '🌸', '🌺', '🍫'], 3000)
    };
    
    if (animations[holiday]) {
        animations[holiday]();
    }
}

function createFallingItems(emojiArray, duration) {
    const startTime = Date.now();
    
    function createItem() {
        const item = document.createElement('div');
        const randomEmoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];
        item.textContent = randomEmoji;
        item.style.cssText = `
            position: fixed;
            top: -50px;
            left: ${Math.random() * 100}vw;
            font-size: ${Math.random() * 25 + 20}px;
            z-index: 9999;
            pointer-events: none;
            animation: holidayFall ${Math.random() * 3 + 2}s linear forwards;
        `;
        
        document.body.appendChild(item);
        
        setTimeout(() => item.remove(), (Math.random() * 3 + 2) * 1000);
    }
    
    const interval = setInterval(createItem, 100);
    
    setTimeout(() => clearInterval(interval), duration);
}

function createConfetti() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const duration = 3000;
    const startTime = Date.now();
    
    function createConfettiPiece() {
        const confetti = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.cssText = `
            position: fixed;
            left: ${Math.random() * 100}vw;
            top: -10px;
            width: 10px;
            height: 10px;
            background: ${color};
            transform: rotate(${Math.random() * 360}deg);
            z-index: 9999;
            pointer-events: none;
            animation: holidayFall ${Math.random() * 3 + 2}s linear forwards;
        `;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), (Math.random() * 3 + 2) * 1000);
    }
    
    const interval = setInterval(createConfettiPiece, 50);
    
    setTimeout(() => clearInterval(interval), duration);
}
