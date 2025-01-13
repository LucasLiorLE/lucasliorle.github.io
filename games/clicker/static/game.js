let gameState = {
    points: 0,
    totalClicks: 0,
    startTime: Date.now(),
    autoClickers: 0,
    mice: 0,
    keyboards: 0,
    robots: 0,
    superComputers: 0,
    quantumPCs: 0,
    prestigeLevel: 0,
    autoClickerMultiplier: 1,
    mouseMultiplier: 1,
    keyboardMultiplier: 1,
    robotMultiplier: 1,
    clickPower: 1,
    totalPoints: 0,
    prestigePoints: 0,
    totalPrestigePoints: 0, 
    prestigeMultipliers: 0,
    clickBoosters: 0,
    startingPointsLevel: 0,
    totalPrestiges: 0,
    prestigeBoosts: {
        production: 0,
        clicks: 0,
        starter: 0,
        autoPrestige: false,
        pointMultiplier: 0,
        autoPrestigeEnabled: false // New property for toggle state
    },
    upgrades: {
        autoClicker: false,
        click: false,
        mouse: false,
        keyboard: false,
        robot: false,
        clickMilestone1: false, // 10,000 clicks
        clickMilestone2: false, // 50,000 clicks
        clickMilestone3: false  // 100,000 clicks
    },
    costs: {
        autoClicker: 15,
        mouse: 100,
        keyboard: 1500,
        robot: 20000,
        superComputer: 100000,
        quantumPC: 500000
    }
};

function getItemCost(basePrice, owned) {
    return Math.floor(basePrice * Math.pow(1.15, owned));
}

// Rename click function to avoid conflict with built-in click
function clickButton() {
    const earnedPoints = gameState.clickPower * Math.pow(2, gameState.prestigeBoosts.pointMultiplier);
    gameState.points += earnedPoints;
    gameState.totalPoints += earnedPoints;
    gameState.totalClicks++;
    updateDisplay();
}

function buyAutoClicker() {
    const cost = getItemCost(gameState.costs.autoClicker, gameState.autoClickers);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        gameState.autoClickers++;
        updateDisplay();
        checkUpgrades();
    }
}

function buyMouse() {
    const cost = getItemCost(gameState.costs.mouse, gameState.mice);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        gameState.mice++;
        updateDisplay();
    }
}

function buyKeyboard() {
    const cost = getItemCost(gameState.costs.keyboard, gameState.keyboards);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        gameState.keyboards++;
        updateDisplay();
    }
}

function buyRobot() {
    const cost = getItemCost(gameState.costs.robot, gameState.robots);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        gameState.robots++;
        updateDisplay();
    }
}

function buySuperComputer() {
    const cost = getItemCost(gameState.costs.superComputer, gameState.superComputers);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        gameState.superComputers++;
        updateDisplay();
    }
}

function buyQuantumPC() {
    const cost = getItemCost(gameState.costs.quantumPC, gameState.quantumPCs);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        gameState.quantumPCs++;
        updateDisplay();
    }
}

function buyAutoClickerUpgrade() {
    if (!gameState.upgrades.autoClicker && gameState.points >= 500) {
        gameState.points -= 500;
        gameState.autoClickerMultiplier *= 2;
        gameState.upgrades.autoClicker = true;
        updateDisplay();
    }
}

function buyClickUpgrade() {
    if (!gameState.upgrades.click && gameState.points >= 1000) {
        gameState.points -= 1000;
        gameState.clickPower *= 3;
        gameState.upgrades.click = true;
        updateDisplay();
    }
}

function buyMouseUpgrade() {
    if (!gameState.upgrades.mouse && gameState.points >= 2000) {
        gameState.points -= 2000;
        gameState.mouseMultiplier *= 2;
        gameState.upgrades.mouse = true;
        updateDisplay();
    }
}

function buyKeyboardUpgrade() {
    if (!gameState.upgrades.keyboard && gameState.points >= 5000) {
        gameState.points -= 5000;
        gameState.keyboardMultiplier *= 2;
        gameState.upgrades.keyboard = true;
        updateDisplay();
    }
}

function buyRobotUpgrade() {
    if (!gameState.upgrades.robot && gameState.points >= 25000) {
        gameState.points -= 25000;
        gameState.robotMultiplier *= 2;
        gameState.upgrades.robot = true;
        updateDisplay();
    }
}

// Add new upgrade functions
function buyClickMilestone1() {
    if (!gameState.upgrades.clickMilestone1 && gameState.points >= 5000) {
        gameState.points -= 5000;
        gameState.clickPower *= 2;
        gameState.upgrades.clickMilestone1 = true;
        updateDisplay();
    }
}

function buyClickMilestone2() {
    if (!gameState.upgrades.clickMilestone2 && gameState.points >= 25000) {
        gameState.points -= 25000;
        gameState.clickPower *= 2;
        gameState.upgrades.clickMilestone2 = true;
        updateDisplay();
    }
}

function buyClickMilestone3() {
    if (!gameState.upgrades.clickMilestone3 && gameState.points >= 100000) {
        gameState.points -= 100000;
        gameState.clickPower *= 2;
        gameState.upgrades.clickMilestone3 = true;
        updateDisplay();
    }
}

function getPrestigeMultiplier() {
    return 1 + (gameState.prestigeLevel * 0.1) + (gameState.prestigeBoosts.production * 0.05);
}

function getClickMultiplier() {
    return 1 + (gameState.prestigeBoosts.clicks * 0.25);
}

function calculatePrestigePointsGain() {
    // Formula: ln(points/1000000) * 10, minimum 1 point if over 1M
    if (gameState.totalPoints < 1000000) return 0;
    return Math.max(1, Math.floor(Math.log(gameState.totalPoints/1000000) * 10));
}

function prestige() {
    if (gameState.totalPoints >= 1000000) {
        const prestigePointsGain = calculatePrestigePointsGain();
        const prestigeLevel = gameState.prestigeLevel + 1;
        const prestigePoints = gameState.prestigePoints + prestigePointsGain;
        const totalPrestigePoints = gameState.totalPrestigePoints + prestigePointsGain;
        const totalPrestiges = gameState.totalPrestiges + 1;
        const startingPoints = gameState.prestigeBoosts.starter * 10000;

        // Create a new gameState while preserving prestige data
        gameState = {
            points: startingPoints,
            totalPoints: 0,
            totalClicks: 0,
            startTime: Date.now(),
            autoClickers: 0,
            mice: 0,
            keyboards: 0,
            robots: 0,
            superComputers: 0,
            quantumPCs: 0,
            prestigeLevel: prestigeLevel,
            prestigePoints: prestigePoints,
            totalPrestigePoints: totalPrestigePoints,
            totalPrestiges: totalPrestiges,
            autoClickerMultiplier: 1,
            mouseMultiplier: 1,
            keyboardMultiplier: 1,
            robotMultiplier: 1,
            clickPower: 1,
            prestigeBoosts: gameState.prestigeBoosts, // Preserve prestige boosts
            upgrades: {
                autoClicker: false,
                click: false,
                mouse: false,
                keyboard: false,
                robot: false,
                clickMilestone1: false,
                clickMilestone2: false,
                clickMilestone3: false
            },
            costs: {
                autoClicker: 15,
                mouse: 100,
                keyboard: 1500,
                robot: 20000,
                superComputer: 100000,
                quantumPC: 500000
            }
        };
        
        // Show prestige shop tab if first prestige
        const prestigeShopTab = document.getElementById('prestigeShopTab');
        if (prestigeShopTab) {
            prestigeShopTab.style.display = 'block';
        }
        
        updateDisplay();
        saveGame(); // Save immediately after prestiging
    }
}

// Update prestige shop cost calculations
function getPrestigeUpgradeCost(type) {
    switch(type) {
        case 'production':
            return Math.floor(3 * Math.pow(2, gameState.prestigeBoosts.production));
        case 'clicks':
            return Math.floor(5 * Math.pow(2.5, gameState.prestigeBoosts.clicks));
        case 'starter':
            return Math.floor(8 * Math.pow(3, gameState.prestigeBoosts.starter));
        case 'pointMulti':
            return Math.floor(15 * Math.pow(4, gameState.prestigeBoosts.pointMultiplier));
        default:
            return 0;
    }
}

function buyPrestigeMultiplier() {
    const cost = getPrestigeUpgradeCost('production');
    if (gameState.prestigePoints >= cost) {
        gameState.prestigePoints -= cost;
        gameState.prestigeBoosts.production++;
        updateDisplay();
        saveGame();
    }
}

function buyClickBooster() {
    const cost = getPrestigeUpgradeCost('clicks');
    if (gameState.prestigePoints >= cost) {
        gameState.prestigePoints -= cost;
        gameState.prestigeBoosts.clicks++;
        updateDisplay();
        saveGame();
    }
}

function buyStartingPoints() {
    const cost = getPrestigeUpgradeCost('starter');
    if (gameState.prestigePoints >= cost) {
        gameState.prestigePoints -= cost;
        gameState.prestigeBoosts.starter++;
        updateDisplay();
        saveGame();
    }
}

function buyAutoPrestige() {
    if (!gameState.prestigeBoosts.autoPrestige && gameState.prestigePoints >= 50) { // Increased cost
        gameState.prestigePoints -= 50;
        gameState.prestigeBoosts.autoPrestige = true;
        gameState.prestigeBoosts.autoPrestigeEnabled = true; // Enable by default when purchased
        document.getElementById('autoPrestigeToggle').style.display = 'block';
        updateAutoPrestigeDisplay();
        updateDisplay();
        saveGame();
    }
}

function toggleAutoPrestige() {
    if (gameState.prestigeBoosts.autoPrestige) {
        gameState.prestigeBoosts.autoPrestigeEnabled = !gameState.prestigeBoosts.autoPrestigeEnabled;
        updateAutoPrestigeDisplay();
        saveGame();
    }
}

function updateAutoPrestigeDisplay() {
    const status = document.getElementById('autoPrestigeStatus');
    const button = document.getElementById('autoPrestigeButton');
    if (status && button) {
        status.textContent = gameState.prestigeBoosts.autoPrestigeEnabled ? 'ON' : 'OFF';
        button.style.background = gameState.prestigeBoosts.autoPrestigeEnabled ? '#4CAF50' : '#666';
    }
}

function buyPointMultiplier() {
    const cost = getPrestigeUpgradeCost('pointMulti');
    if (gameState.prestigePoints >= cost) {
        gameState.prestigePoints -= cost;
        gameState.prestigeBoosts.pointMultiplier++;
        updateDisplay();
        saveGame();
    }
}

function formatTime(totalSeconds) {
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    let timeString = '';
    if (days > 0) timeString += `${days} day${days > 1 ? 's' : ''}, `;
    if (hours > 0) timeString += `${hours} hour${hours > 1 ? 's' : ''}, `;
    if (minutes > 0) timeString += `${minutes} minute${minutes > 1 ? 's' : ''}, `;
    timeString += `${seconds} second${seconds !== 1 ? 's' : ''}`;

    return timeString;
}

function updateDisplay() {
    // Basic updates that always exist
    document.getElementById('points').textContent = `Points: ${formatNumber(Math.floor(gameState.points))}`;
    document.getElementById('totalClicks').textContent = gameState.totalClicks;
    document.getElementById('totalPoints').textContent = formatNumber(Math.floor(gameState.totalPoints));
    
    // Calculate CPS
    const autoCPS = gameState.autoClickers * 0.1 * gameState.autoClickerMultiplier;
    const mouseCPS = gameState.mice * 1 * gameState.mouseMultiplier;
    const keyboardCPS = gameState.keyboards * 10 * gameState.keyboardMultiplier; // Updated from 4 to 10
    const robotCPS = gameState.robots * 35 * gameState.robotMultiplier; // Updated from 25 to 35
    const superComputerCPS = gameState.superComputers * 150;
    const quantumPCCPS = gameState.quantumPCs * 750;
    const totalCPS = (autoCPS + mouseCPS + keyboardCPS + robotCPS + 
                     superComputerCPS + quantumPCCPS) * getPrestigeMultiplier();
    
    // Update CPS display with formatted number
    document.getElementById('cps').textContent = `CPS: ${formatNumber(totalCPS.toFixed(1))}`;
    
    // Update tooltips
    updateTooltipStats('auto', autoCPS, totalCPS, gameState.autoClickers);
    updateTooltipStats('mouse', mouseCPS, totalCPS, gameState.mice);
    updateTooltipStats('keyboard', keyboardCPS, totalCPS, gameState.keyboards);
    updateTooltipStats('robot', robotCPS, totalCPS, gameState.robots);
    updateTooltipStats('super', superComputerCPS, totalCPS, gameState.superComputers);
    updateTooltipStats('quantum', quantumPCCPS, totalCPS, gameState.quantumPCs);
    
    // Update costs in tooltips
    updateTooltipCost('auto', gameState.costs.autoClicker, gameState.autoClickers);
    updateTooltipCost('mouse', gameState.costs.mouse, gameState.mice);
    updateTooltipCost('keyboard', gameState.costs.keyboard, gameState.keyboards);
    updateTooltipCost('robot', gameState.costs.robot, gameState.robots);
    updateTooltipCost('superComputer', gameState.costs.superComputer, gameState.superComputers);
    updateTooltipCost('quantumPC', gameState.costs.quantumPC, gameState.quantumPCs);
    
    // Update playtime with new format
    const seconds = Math.floor((Date.now() - gameState.startTime) / 1000);
    document.getElementById('playtime').textContent = formatTime(seconds);
    
    // Update prestige info only if elements exist
    const prestigeElements = {
        level: document.getElementById('prestigeLevel'),
        points: document.getElementById('prestigePoints'),
        totalPoints: document.getElementById('totalPrestigePoints'),
        bonus: document.getElementById('prestigeBonus'),
        possible: document.getElementById('possiblePrestigePoints'),
        total: document.getElementById('totalPrestiges'),
        stat: document.getElementById('totalPrestigePointsStat')
    };

    // Prestige display updates with null checks
    if (prestigeElements.level) prestigeElements.level.textContent = gameState.prestigeLevel;
    if (prestigeElements.points) prestigeElements.points.textContent = gameState.prestigePoints;
    if (prestigeElements.totalPoints) prestigeElements.totalPoints.textContent = gameState.totalPrestigePoints;
    if (prestigeElements.bonus) prestigeElements.bonus.textContent = ((gameState.prestigeLevel * 10) + (gameState.prestigeBoosts.production * 5));
    if (prestigeElements.possible) prestigeElements.possible.textContent = calculatePrestigePointsGain();
    if (prestigeElements.total) prestigeElements.total.textContent = gameState.totalPrestiges;
    if (prestigeElements.stat) prestigeElements.stat.textContent = gameState.totalPrestigePoints;

    // Update prestige shop counts silently
    try {
        const prestigeShopElements = {
            production: document.querySelector('.owned-prestigeMulti'),
            clicks: document.querySelector('.owned-clickBoost'),
            starter: document.querySelector('.owned-startBoost'),
            autoPrestige: document.querySelector('.owned-autoPrestige'),
            pointMulti: document.querySelector('.owned-pointMulti')
        };

        if (prestigeShopElements.production) {
            prestigeShopElements.production.textContent = gameState.prestigeBoosts.production;
        }
        if (prestigeShopElements.clicks) {
            prestigeShopElements.clicks.textContent = gameState.prestigeBoosts.clicks;
        }
        if (prestigeShopElements.starter) {
            prestigeShopElements.starter.textContent = gameState.prestigeBoosts.starter;
        }
        if (prestigeShopElements.autoPrestige) {
            prestigeShopElements.autoPrestige.textContent = gameState.prestigeBoosts.autoPrestige ? 'Yes' : 'No';
        }
        if (prestigeShopElements.pointMulti) {
            prestigeShopElements.pointMulti.textContent = gameState.prestigeBoosts.pointMultiplier;
        }
    } catch (error) {
        // Silently fail if elements aren't ready
    }

    // Show/hide prestige shop tab with null check
    const prestigeShopTab = document.getElementById('prestigeShopTab');
    if (prestigeShopTab) {
        prestigeShopTab.style.display = gameState.prestigeLevel > 0 ? 'block' : 'none';
    }

    // Enable/disable prestige button with null check
    const prestigeButton = document.getElementById('prestigeButton');
    if (prestigeButton) {
        prestigeButton.disabled = gameState.totalPoints < 1000000;
    }

    // Update prestige shop costs
    document.getElementById('prestigeMultiCost').textContent = getPrestigeUpgradeCost('production');
    document.getElementById('clickBoostCost').textContent = getPrestigeUpgradeCost('clicks');
    document.getElementById('startBoostCost').textContent = getPrestigeUpgradeCost('starter');
    document.getElementById('pointMultiCost').textContent = getPrestigeUpgradeCost('pointMulti');

    checkUpgrades();
}

function updateTooltipStats(type, typeCPS, totalCPS, owned) {
    document.querySelector(`.owned-${type}`).textContent = owned;
    const contribution = totalCPS > 0 ? ((typeCPS / totalCPS) * 100).toFixed(1) : 0;
    document.querySelector(`.contrib-${type}`).textContent = `${contribution}%`;
}

function updateTooltipCost(type, basePrice, owned) {
    const cost = getItemCost(basePrice, owned);
    const tooltip = document.querySelector(`#${type}Cost`);
    if (tooltip) {
        tooltip.textContent = formatNumber(cost);
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num/1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num/1000).toFixed(2) + 'K';
    }
    return num.toString();
}

function checkUpgrades() {
    // Show/hide upgrades based on requirements AND upgrade status
    document.getElementById('autoClickerUpgrade').style.display = 
        !gameState.upgrades.autoClicker && gameState.autoClickers >= 10 ? 'block' : 'none';
    
    document.getElementById('mouseUpgrade').style.display = 
        !gameState.upgrades.mouse && gameState.mice >= 5 ? 'block' : 'none';
    
    document.getElementById('keyboardUpgrade').style.display = 
        !gameState.upgrades.keyboard && gameState.keyboards >= 3 ? 'block' : 'none';
    
    document.getElementById('robotUpgrade').style.display = 
        !gameState.upgrades.robot && gameState.robots >= 2 ? 'block' : 'none';
    
    document.getElementById('clickUpgrade').style.display = 
        !gameState.upgrades.click && gameState.totalClicks >= 500 ? 'block' : 'none';
    
    // Check click milestone upgrades
    document.getElementById('clickMilestone1').style.display = 
        !gameState.upgrades.clickMilestone1 && gameState.totalClicks >= 10000 ? 'block' : 'none';
    
    document.getElementById('clickMilestone2').style.display = 
        !gameState.upgrades.clickMilestone2 && gameState.totalClicks >= 50000 ? 'block' : 'none';
    
    document.getElementById('clickMilestone3').style.display = 
        !gameState.upgrades.clickMilestone3 && gameState.totalClicks >= 100000 ? 'block' : 'none';
}

function showTab(tabName) {
    // Allow dev tab only with correct password
    if (tabName === 'dev') {
        if (!localStorage.getItem('devWarningShown')) {
            alert('Warning: Developer options can affect game balance!');
            localStorage.setItem('devWarningShown', 'true');
        }
        const password = prompt('Enter developer password:');
        if (password !== 'noob') {
            alert('Incorrect password');
            return; // Don't switch tabs if password is wrong
        }
    }

    // Hide all content in right panel
    const rightContents = document.querySelectorAll('.right-panel .tab-content');
    rightContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Deactivate all buttons in right panel
    const rightButtons = document.querySelectorAll('.right-panel .tab-button');
    rightButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected content and activate button
    const selectedContent = document.getElementById(tabName);
    const selectedButton = document.querySelector(`.right-panel [onclick="showTab('${tabName}')"]`);
    
    if (selectedContent && selectedButton) {
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
        selectedButton.classList.add('active');
    }
}

function showLeftTab(tabName) {
    // Hide all content in left panel
    const leftContents = document.querySelectorAll('.left-panel .tab-content');
    leftContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Deactivate all buttons in left panel
    const leftButtons = document.querySelectorAll('.left-panel .tab-button');
    leftButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected content and activate button
    const selectedContent = document.getElementById(tabName);
    const selectedButton = document.querySelector(`.left-panel [onclick="showLeftTab('${tabName}')"]`);
    
    if (selectedContent && selectedButton) {
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
        selectedButton.classList.add('active');
    }
}

function showShopCategory(category) {
    // Hide all shop categories
    document.querySelectorAll('.shop-category').forEach(shop => {
        shop.classList.remove('active');
    });
    
    // Deactivate all shop tab buttons
    document.querySelectorAll('.shop-tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected category and activate its button
    document.getElementById(category + 'Shop').classList.add('active');
    document.querySelector(`[onclick="showShopCategory('${category}')"]`).classList.add('active');
}

function saveGame() {
    localStorage.setItem('clickerGame', JSON.stringify(gameState));
}

// Update the loadGame function to handle the toggle display
function loadGame() {
    const saved = localStorage.getItem('clickerGame');
    if (saved) {
        gameState = JSON.parse(saved);
        if (gameState.prestigeBoosts.autoPrestige) {
            document.getElementById('autoPrestigeToggle').style.display = 'block';
            updateAutoPrestigeDisplay();
        }
        updateDisplay();
    }
    // Set initial tab states
    showLeftTab('shop');
    showTab('stats'); // Change default tab
}

function wipeSave() {
    if (confirm('Are you sure you want to wipe your save?')) {
        localStorage.removeItem('clickerGame');
        gameState = {
            points: 0,
            totalClicks: 0,
            startTime: Date.now(),
            autoClickers: 0,
            mice: 0,
            keyboards: 0,
            robots: 0,
            superComputers: 0,
            quantumPCs: 0,
            prestigeLevel: 0,
            prestigePoints: 0,
            totalPrestigePoints: 0,
            autoClickerMultiplier: 1,
            mouseMultiplier: 1,
            keyboardMultiplier: 1,
            robotMultiplier: 1,
            clickPower: 1,
            totalPoints: 0,
            prestigeMultipliers: 0,
            clickBoosters: 0,
            startingPointsLevel: 0,
            totalPrestiges: 0,
            prestigeBoosts: {
                production: 0,
                clicks: 0,
                starter: 0,
                autoPrestige: false,
                pointMultiplier: 0,
                autoPrestigeEnabled: false
            },
            upgrades: {
                autoClicker: false,
                click: false,
                mouse: false,
                keyboard: false,
                robot: false,
                clickMilestone1: false,
                clickMilestone2: false,
                clickMilestone3: false
            },
            costs: {
                autoClicker: 15,
                mouse: 100,
                keyboard: 1500,
                robot: 20000,
                superComputer: 100000,
                quantumPC: 500000
            }
        };
        document.getElementById('autoPrestigeToggle').style.display = 'none';
        updateDisplay();
    }
}

// Auto-save every 30 seconds
setInterval(saveGame, 30000);

// Automatic clicks from purchases
clearInterval(window.tickInterval); // Clear any existing interval
window.tickInterval = setInterval(() => {
    const prestigeBonus = getPrestigeMultiplier();
    gameState.points += (
        (gameState.autoClickers * 0.01 * gameState.autoClickerMultiplier +
        gameState.mice * 0.15 * gameState.mouseMultiplier +
        gameState.keyboards * 1.2 * gameState.keyboardMultiplier +
        gameState.robots * 3.8 * gameState.robotMultiplier +
        gameState.superComputers * 15 +
        gameState.quantumPCs * 75) * prestigeBonus
    );
    updateDisplay();
}, 100); // 100ms = 0.1 seconds

// Add auto prestige check to the game loop
setInterval(() => {
    if (gameState.prestigeBoosts.autoPrestige && 
        gameState.prestigeBoosts.autoPrestigeEnabled && 
        gameState.totalPoints >= 1000000) {
        prestige();
    }
}, 1000);

// Add dev options
let autoSaveEnabled = true;

function addPoints(amount) {
    gameState.points += amount;
    gameState.totalPoints += amount;
    updateDisplay();
}

function addPrestigePoints(amount) {
    gameState.prestigePoints += amount;
    gameState.totalPrestigePoints += amount;
    updateDisplay();
}

function multiplyProduction(factor) {
    gameState.autoClickerMultiplier *= factor;
    gameState.mouseMultiplier *= factor;
    gameState.keyboardMultiplier *= factor;
    gameState.robotMultiplier *= factor;
    updateDisplay();
}

function setAutoSave() {
    autoSaveEnabled = !autoSaveEnabled;
    const status = document.getElementById('autoSaveStatus');
    status.textContent = autoSaveEnabled ? 'ON' : 'OFF';
    status.className = autoSaveEnabled ? '' : 'disabled';
}

// Modify auto-save interval to respect toggle
clearInterval(window.autoSaveInterval);
window.autoSaveInterval = setInterval(() => {
    if (autoSaveEnabled) {
        saveGame();
    }
}, 30000);

// Add warning when Dev tab is first clicked
document.getElementById('devTab').addEventListener('click', function() {
    if (!localStorage.getItem('devWarningShown')) {
        alert('Warning: Developer options can affect game balance!');
        localStorage.setItem('devWarningShown', 'true');
    }
});

// Add debug function
function debugPrestigeState() {
    console.log('Current Prestige State:', {
        prestigePoints: gameState.prestigePoints,
        totalPrestigePoints: gameState.totalPrestigePoints,
        prestigeLevel: gameState.prestigeLevel,
        prestigeBoosts: gameState.prestigeBoosts,
        multiplier: getPrestigeMultiplier(),
        clickMultiplier: getClickMultiplier()
    });
}

// Load game on start
loadGame();
