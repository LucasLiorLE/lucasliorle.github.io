const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav-links');

if (burger) {
    burger.addEventListener('click', () => {
        nav.classList.toggle('nav-active');
        burger.classList.toggle('toggle');
    });
}

const hero = document.querySelector('.hero');
if (hero) {
    let animationId;
    let time = 0;
    
    function animateAurora() {
        time += 0.005; // Slower wave speed
        
        // Blue wave - cosine function: f(x) = cos(x + dt)
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * Math.PI * 2; // 0 to 2π across the width
            const waveValue = Math.cos(x + time) * 8 + 40; // Amplitude 8, center at 40%
            const clampedValue = Math.max(20, Math.min(80, waveValue));
            hero.style.setProperty(`--wave1-${i * 10}`, clampedValue + '%');
        }
        
        // Green wave - sine function: f(x) = sin(x + dt + phase) (also 10% faster)
        const phase = Math.PI / 3;
        const greenSpeed = time * 1.1;
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * Math.PI * 2; // 0 to 2π across the width
            const waveValue = Math.sin(x + greenSpeed + phase) * 6 + 50; // Amplitude 6, center at 50%
            const clampedValue = Math.max(20, Math.min(80, waveValue));
            hero.style.setProperty(`--wave2-${i * 10}`, clampedValue + '%');
        }
        
        animationId = requestAnimationFrame(animateAurora);
    }
    
    animateAurora();
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        nav.classList.remove('nav-active');
        burger.classList.remove('toggle');
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll('.interest-card, .project-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    initializeCountdown();
});

function initializeCountdown() {
    const dateInput = document.getElementById('dateInput');
    const setCountdownBtn = document.getElementById('setCountdown');
    const clearCountdownBtn = document.getElementById('clearCountdown');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    let countdownInterval;
    
    const savedCountdown = localStorage.getItem('countdownDate');
    const savedTitle = localStorage.getItem('countdownTitle');
    if (savedCountdown && savedTitle) {
        startCountdown(new Date(savedCountdown), savedTitle);
    }
    
    const holidays = {
        halloween: { date: '2025-10-31T00:00', title: 'Halloween 🎃', emoji: '🎃' },
        christmas: { date: '2025-12-25T00:00', title: 'Christmas 🎄', emoji: '🎁' },
        newyears: { date: '2026-01-01T00:00', title: 'New Year\'s 🎊', emoji: '🎊' },
        birthday: { date: '2026-01-22T00:00', title: 'My Birthday! 🎂', emoji: '🎂'},
        valentines: { date: '2026-02-14T00:00', title: 'Valentine\'s Day 💖', emoji: '💖' },
        chinesenewyears: { date: '2026-02-17T00:00', title: 'Chinese New Year\'s 🐉', emoji: '🐉'},
        stpatricksday: { date: '2026-03-17T00:00', title: 'St. Patrick\'s Day 🍀', emoji: '🍀'},
        easter: { date: '2026-04-05T00:00', title: 'Easter 🐇', emoji: '🐇'}
    };
    
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
            
            document.getElementById('days').textContent = days;
            document.getElementById('hours').textContent = hours;
            document.getElementById('minutes').textContent = minutes;
            document.getElementById('seconds').textContent = seconds;
        }, 1000);
    }
}

function triggerHolidayAnimation(holiday, emoji) {
    const animations = {
        halloween: () => createFallingItems(['🎃', '👻', '🩻', '💀', '🍬', '🍭', '🍫', '🏚️', '🦇', '🍂'], 3000),
        christmas: () => createFallingItems(['🎄', '🎁', '❄️', '⛄', '🔔', '🌟', '🎅', '🧝', '🍪', '🥛', '🦌'], 3000),
        newyears: () => createConfetti(),
        birthday: () => createFallingItems(['🍰', '🎂', '🎊', '🥳', '🎈', '🎁', '🍷'], 3000),
        valentines: () => createFallingItems(['💖', '💕', '💗', '💓', '💝', '💘', '❤️', '🧡', '💛', '💚', '💙', '💜'], 3000),
        chinesenewyears: () => createFallingItems(['🐉', '🐲', '🏮', '🥳', '🍾', '🎇', '🎆', '🥂'], 3000),
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
        
        setTimeout(() => {
            if (item.parentNode) {
                item.parentNode.removeChild(item);
            }
        }, 5000);
    }
    
    if (!document.getElementById('holiday-styles')) {
        const style = document.createElement('style');
        style.id = 'holiday-styles';
        style.textContent = `
            @keyframes holidayFall {
                to {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
            @keyframes confettiFall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    const interval = setInterval(() => {
        if (Date.now() - startTime > duration) {
            clearInterval(interval);
            return;
        }
        createItem();
    }, 150);
}

function createConfetti() {
    const colors = ['#ff6b35', '#f9ca24', '#6c5ce7', '#fd79a8', '#00b894', '#e17055'];
    const shapes = ['🎊', '🎉', '✨', '⭐'];
    
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            const isEmoji = Math.random() > 0.5;
            
            if (isEmoji) {
                confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
                confetti.style.fontSize = Math.random() * 20 + 15 + 'px';
            } else {
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = Math.random() * 10 + 5 + 'px';
                confetti.style.height = confetti.style.width;
            }
            
            confetti.style.cssText += `
                position: fixed;
                top: -20px;
                left: ${Math.random() * 100}vw;
                z-index: 9999;
                pointer-events: none;
                animation: confettiFall ${Math.random() * 4 + 3}s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 7000);
        }, i * 50);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const emojiElements = document.querySelectorAll('h1, h2, .hero-description');
    emojiElements.forEach(element => {
        const emojis = element.innerHTML.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
        if (emojis) {
            let newHTML = element.innerHTML;
            emojis.forEach(emoji => {
                newHTML = newHTML.replace(emoji, `<span class="emoji-hover" style="display: inline-block; transition: transform 0.3s ease;">${emoji}</span>`);
            });
            element.innerHTML = newHTML;
        }
    });

    document.querySelectorAll('.emoji-hover').forEach(emoji => {
        emoji.addEventListener('mouseenter', () => {
            emoji.style.transform = 'scale(1.2) rotate(10deg)';
        });
        emoji.addEventListener('mouseleave', () => {
            emoji.style.transform = 'scale(1) rotate(0deg)';
        });
    });

    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        heroTitle.textContent = '';
        let i = 0;
        
        const typeWriter = () => {
            if (i < originalText.length) {
                heroTitle.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        setTimeout(typeWriter, 1000);
    }

    const interestCards = document.querySelectorAll('.interest-card');
    const colors = ['#e74c3c', '#9b59b6', '#3498db', '#e67e22', '#1abc9c', '#f39c12', '#34495e', '#e91e63'];
    
    interestCards.forEach(card => {
        const icon = card.querySelector('.icon');
        const originalColor = getComputedStyle(icon).color;
        
        card.addEventListener('mouseenter', () => {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            icon.style.color = randomColor;
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        });
        
        card.addEventListener('mouseleave', () => {
            icon.style.color = originalColor;
            icon.style.transform = 'scale(1) rotate(0deg)';
        });
    });
});

let konamiCode = [];
const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

function createEmojiSelector() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
    `;

    const container = document.createElement('div');
    container.style.cssText = `
        background: linear-gradient(135deg, #1a202c, #2d3748);
        padding: 2rem;
        border-radius: 20px;
        text-align: center;
        color: white;
        border: 2px solid rgba(96, 165, 250, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    `;

    container.innerHTML = `
        <h2 style="margin-bottom: 1rem; color: #60a5fa;">hi</h2>
        <p style="margin-bottom: 1.5rem;">its raining cats and dogs (except theres no option for dogs)</p>
        <select id="emojiSelect" style="
            padding: 0.5rem;
            margin: 0.5rem;
            border-radius: 10px;
            border: none;
            background: #4a5568;
            color: white;
            font-size: 1rem;
        ">
            <option value="🎉">🎉 Party</option>
            <option value="💖">💖 Hearts</option>
            <option value="🎁">🎁 Presents</option>
            <option value="❄️">❄️ Snowflakes</option>
            <option value="👻">👻 Ghosts</option>
            <option value="🎃">🎃 Pumpkins</option>
            <option value="🌸">🌸 Flowers</option>
            <option value="🐱">🐱 Cats</option>
        </select>
        <br>
        <button id="rainButton" style="
            padding: 0.75rem 1.5rem;
            margin: 1rem 0.5rem;
            border: none;
            border-radius: 25px;
            background: linear-gradient(45deg, #60a5fa, #3b82f6);
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        ">yay emoji rain or whatever</button>
        <button id="closeButton" style="
            padding: 0.75rem 1.5rem;
            margin: 1rem 0.5rem;
            border: none;
            border-radius: 25px;
            background: #6b7280;
            color: white;
            cursor: pointer;
        ">Close</button>
    `;

    modal.appendChild(container);
    document.body.appendChild(modal);

    const rainButton = container.querySelector('#rainButton');
    rainButton.addEventListener('mouseenter', () => {
        rainButton.style.transform = 'scale(1.05)';
        rainButton.style.boxShadow = '0 10px 20px rgba(96, 165, 250, 0.4)';
    });
    rainButton.addEventListener('mouseleave', () => {
        rainButton.style.transform = 'scale(1)';
        rainButton.style.boxShadow = 'none';
    });

    rainButton.addEventListener('click', () => {
        const selectedEmoji = document.getElementById('emojiSelect').value;
        startEmojiRain(selectedEmoji);
        document.body.removeChild(modal);
    });

    container.querySelector('#closeButton').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function startEmojiRain(emoji) {
    const duration = 4000;
    const startTime = Date.now();
    
    function createEmoji() {
        const emojiElement = document.createElement('div');
        emojiElement.textContent = emoji;
        emojiElement.style.cssText = `
            position: fixed;
            top: -50px;
            left: ${Math.random() * 100}vw;
            font-size: ${Math.random() * 20 + 20}px;
            z-index: 9999;
            pointer-events: none;
            animation: fall ${Math.random() * 3 + 2}s linear forwards;
        `;
        
        document.body.appendChild(emojiElement);
        
        setTimeout(() => {
            if (emojiElement.parentNode) {
                emojiElement.parentNode.removeChild(emojiElement);
            }
        }, 5000);
    }
    
    if (!document.getElementById('emoji-rain-styles')) {
        const style = document.createElement('style');
        style.id = 'emoji-rain-styles';
        style.textContent = `
            @keyframes fall {
                to {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    const interval = setInterval(() => {
        if (Date.now() - startTime > duration) {
            clearInterval(interval);
            return;
        }
        createEmoji();
    }, 100); 
}

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.keyCode);
    if (konamiCode.length > konami.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.join(',') === konami.join(',')) {
        createEmojiSelector();
        konamiCode = [];
    }
});
