document.addEventListener('DOMContentLoaded', function() {
    initializeMinesweeper();
});

let grid = [];
let width = 9;
let height = 9;
let mineCount = 10;
let cells = [];
let timer = 0;
let timerInterval = null;

function initializeMinesweeper() {
    setupEventListeners();
    createBoard();
}

function setupEventListeners() {
    document.getElementById('gridSize').addEventListener('change', function(e) {
        const value = e.target.value;
        const customSize = document.getElementById('customSize');
        
        if (value === 'custom') {
            customSize.style.display = 'flex';
        } else {
            customSize.style.display = 'none';
            
            if (value === '9') {
                width = 9;
                height = 9;
                document.getElementById('mineCount').value = 10;
            } else if (value === '16') {
                width = 16;
                height = 16;
                document.getElementById('mineCount').value = 40;
            } else if (value === '30') {
                width = 30;
                height = 16;
                document.getElementById('mineCount').value = 99;
            }
        }
    });
    
    document.getElementById('newGameBtn').addEventListener('click', function() {
        const gridSize = document.getElementById('gridSize').value;
        
        if (gridSize === 'custom') {
            width = parseInt(document.getElementById('customWidth').value);
            height = parseInt(document.getElementById('customHeight').value);
        }
        
        mineCount = parseInt(document.getElementById('mineCount').value);
        createBoard();
        
        document.getElementById('hintPanel').style.display = 'none';
        document.getElementById('faceBtn').textContent = '🙂';
    });
    
    document.getElementById('solveBtn').addEventListener('click', suggestMove);
    document.getElementById('clearBtn').addEventListener('click', clearBoard);
    
    document.querySelector('.title-btn.close').addEventListener('click', function() {
        window.location.href = '../index.html';
    });
    
    document.querySelector('.title-btn.minimize').addEventListener('click', function() {
        const contents = document.querySelector('.window-contents');
        contents.style.display = contents.style.display === 'none' ? 'block' : 'none';
    });
    
    document.getElementById('mineCounter').textContent = mineCount.toString().padStart(3, '0');
}

function createBoard() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${width}, 24px)`;
    board.style.gridTemplateRows = `repeat(${height}, 24px)`;
    
    grid = [];
    cells = [];
    
    for (let y = 0; y < height; y++) {
        grid[y] = [];
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            cell.addEventListener('click', function() {
                handleCellClick(x, y);
            });
            
            cell.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                handleRightClick(x, y);
            });
            
            board.appendChild(cell);
            cells.push(cell);
            
            grid[y][x] = {
                revealed: false,
                mine: false,
                flagged: false,
                number: 0,
                element: cell
            };
        }
    }
}

function handleCellClick(x, y) {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const cell = grid[y][x];
    
    if (mode === 'reveal') {
        const number = prompt('Enter number (0-8) or leave empty to delete:', '');
        
        // Handle deletion (empty input)
        if (number !== null && number === '') {
            cell.revealed = false;
            cell.number = 0;
            cell.element.classList.remove('revealed');
            // Remove all number color classes
            for (let i = 1; i <= 8; i++) {
                cell.element.classList.remove(`number-${i}`);
            }
            cell.element.textContent = '';
        }
        // Handle number input
        else if (number !== null && number !== '') {
            const num = parseInt(number);
            if (num >= 0 && num <= 8) {
                cell.revealed = true;
                cell.number = num;
                cell.element.classList.add('revealed');
                
                // Remove all old number color classes first
                for (let i = 1; i <= 8; i++) {
                    cell.element.classList.remove(`number-${i}`);
                }
                
                if (num > 0) {
                    cell.element.textContent = num;
                    cell.element.classList.add(`number-${num}`);
                } else {
                    cell.element.textContent = '';
                }
            }
        }
    } else if (mode === 'mine') {
        cell.mine = !cell.mine;
        cell.element.classList.toggle('mine');
        if (cell.mine) {
            cell.element.textContent = '💣';
        } else {
            cell.element.textContent = '';
        }
    } else if (mode === 'safe') {
        cell.element.classList.toggle('safe');
    }
}

function handleRightClick(x, y) {
    const cell = grid[y][x];
    cell.flagged = !cell.flagged;
    cell.element.classList.toggle('flagged');
}

function getNeighbors(x, y) {
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                neighbors.push({x: nx, y: ny, cell: grid[ny][nx]});
            }
        }
    }
    return neighbors;
}

function suggestMove() {
    const hintPanel = document.getElementById('hintPanel');
    const hintText = document.getElementById('hintText');
    
    let foundMines = 0;
    let foundSafe = 0;
    let madeChanges = false;
    
    // Keep finding deductions until no more can be made
    do {
        madeChanges = false;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = grid[y][x];
                if (cell.revealed && cell.number > 0) {
                    const neighbors = getNeighbors(x, y);
                    
                    // Count marked mines and unknown cells (exclude safe cells)
                    const markedMines = neighbors.filter(n => n.cell.mine).length;
                    const unknown = neighbors.filter(n => !n.cell.revealed && !n.cell.mine && !n.cell.element.classList.contains('safe'));
                    
                    // If we've found all the mines, mark remaining as safe
                    if (markedMines === cell.number && unknown.length > 0) {
                        unknown.forEach(n => {
                            n.cell.element.classList.add('safe');
                            foundSafe++;
                            madeChanges = true;
                        });
                    }
                    
                    // If unknown cells + marked mines equals the number, all unknown are mines
                    if (unknown.length + markedMines === cell.number && unknown.length > 0) {
                        unknown.forEach(n => {
                            if (!n.cell.mine) {
                                n.cell.mine = true;
                                n.cell.element.classList.add('mine');
                                n.cell.element.textContent = '💣';
                                foundMines++;
                                madeChanges = true;
                            }
                        });
                    }
                }
            }
        }
    } while (madeChanges);
    
    hintPanel.style.display = 'block';
    
    if (foundMines > 0 || foundSafe > 0) {
        const messages = [];
        if (foundMines > 0) {
            messages.push(`Found ${foundMines} mine${foundMines > 1 ? 's' : ''}! 💣`);
        }
        if (foundSafe > 0) {
            messages.push(`Marked ${foundSafe} safe cell${foundSafe > 1 ? 's' : ''}! ✓`);
        }
        hintText.textContent = messages.join(' ');
        hintText.style.color = '#2E7D32';
        document.getElementById('faceBtn').textContent = '😎';
    } else {
        hintText.textContent = 'No moves found. Reveal more numbers to get more information!';
        hintText.style.color = '#D32F2F';
    }
}



function clearBoard() {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = grid[y][x];
            cell.revealed = false;
            cell.mine = false;
            cell.flagged = false;
            cell.number = 0;
            cell.element.className = 'cell';
            cell.element.textContent = '';
        }
    }
    
    document.getElementById('hintPanel').style.display = 'none';
    document.getElementById('faceBtn').textContent = '🙂';
}
