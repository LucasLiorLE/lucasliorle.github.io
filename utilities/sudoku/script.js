document.addEventListener('DOMContentLoaded', function() {
    initializeSudoku();
});

let grid = [];
let cells = [];

function clearNumberHighlights() {
    cells.forEach(cell => cell.classList.remove('number-highlight'));
}

function updateNumberHighlights(focusedCell) {
    clearNumberHighlights();

    if (!focusedCell) {
        return;
    }

    const focusedValue = focusedCell.value;
    if (!/^[1-9]$/.test(focusedValue)) {
        return;
    }

    cells.forEach(cell => {
        if (cell.value === focusedValue) {
            cell.classList.add('number-highlight');
        }
    });
}

function showIllegalInputBubble(cell) {
    const existingBubble = cell.querySelector('.illegal-bubble');
    if (existingBubble) {
        existingBubble.remove();
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'illegal-bubble';
    bubble.textContent = 'Illegal';
    
    cell.appendChild(bubble);
    
    setTimeout(() => {
        bubble.style.opacity = '0';
        setTimeout(() => bubble.remove(), 300);
    }, 1000);
}

function initializeSudoku() {
    const gridElement = document.getElementById('sudokuGrid');
    
    // Create 81 cells
    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('input');
        cell.type = 'text';
        cell.maxLength = 1;
        cell.className = 'sudoku-cell';
        cell.dataset.index = i;
        
        cell.addEventListener('input', function(e) {
            const value = e.target.value;
            if (value && (!/^[1-9]$/.test(value))) {
                e.target.value = '';
            } else if (value) {
                // Check if this is a valid sudoku move
                const index = parseInt(e.target.dataset.index);
                const row = Math.floor(index / 9);
                const col = index % 9;
                const num = parseInt(value);
                
                // Check if this number is valid in this position
                if (isSudokuValid(row, col, num)) {
                    e.target.classList.remove('invalid');
                } else {
                    e.target.classList.add('invalid');
                    showIllegalInputBubble(cell);
                }
            } else {
                // Value is empty, remove invalid class
                e.target.classList.remove('invalid');
            }
            e.target.classList.remove('solved', 'given');
            updateNumberHighlights(e.target);
        });

        cell.addEventListener('focus', function(e) {
            updateNumberHighlights(e.target);
        });

        cell.addEventListener('blur', function() {
            setTimeout(() => {
                const activeCell = document.activeElement;
                if (activeCell && activeCell.classList && activeCell.classList.contains('sudoku-cell')) {
                    updateNumberHighlights(activeCell);
                } else {
                    clearNumberHighlights();
                }
            }, 0);
        });
        
        cell.addEventListener('keydown', function(e) {
            handleKeyNavigation(e, i);
        });
        
        gridElement.appendChild(cell);
        cells.push(cell);
    }
    
    document.getElementById('solveBtn').addEventListener('click', solveSudoku);
    document.getElementById('clearBtn').addEventListener('click', clearGrid);
    document.getElementById('exampleBtn').addEventListener('click', loadExample);
    
    // Testing
    // loadExample();
}

function handleKeyNavigation(e, index) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    
    let newIndex = index;
    
    switch(e.key) {
        case 'ArrowUp':
            if (row > 0) newIndex = index - 9;
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (row < 8) newIndex = index + 9;
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (col > 0) newIndex = index - 1;
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (col < 8) newIndex = index + 1;
            e.preventDefault();
            break;
    }
    
    if (newIndex !== index) {
        cells[newIndex].focus();
    }
}

function getGridValues() {
    const grid = [];
    for (let i = 0; i < 9; i++) {
        grid[i] = [];
        for (let j = 0; j < 9; j++) {
            const index = i * 9 + j;
            const value = cells[index].value;
            grid[i][j] = value ? parseInt(value) : 0;
        }
    }
    return grid;
}

function setGridValues(grid) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const index = i * 9 + j;
            const value = grid[i][j];
            cells[index].value = value || '';
            cells[index].classList.remove('invalid');
            
            if (value) {
                cells[index].classList.add('solved');
            }
        }
    }

    const activeCell = document.activeElement;
    if (activeCell && activeCell.classList && activeCell.classList.contains('sudoku-cell')) {
        updateNumberHighlights(activeCell);
    } else {
        clearNumberHighlights();
    }
}

function isValid(grid, row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num) {
            return false;
        }
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
        if (grid[x][col] === num) {
            return false;
        }
    }
    
    // Check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[startRow + i][startCol + j] === num) {
                return false;
            }
        }
    }
    
    return true;
}

function solve(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isValid(grid, row, col, num)) {
                        grid[row][col] = num;
                        
                        if (solve(grid)) {
                            return true;
                        }
                        
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function solveSudoku() {
    const solutionInfo = document.getElementById('solutionInfo');
    const solutionText = document.getElementById('solutionText');
    
    // Mark initial values as given
    cells.forEach(cell => {
        if (cell.value) {
            cell.classList.add('given');
        }
    });
    
    const grid = getGridValues();
    
    const hasValues = grid.some(row => row.some(cell => cell !== 0));
    
    if (!hasValues) {
        solutionInfo.style.display = 'block';
        solutionText.textContent = 'Please enter some numbers first!';
        solutionText.style.color = '#D32F2F';
        return;
    }
    
    const gridCopy = grid.map(row => [...row]);
    
    if (solve(gridCopy)) {
        setGridValues(gridCopy);
        solutionInfo.style.display = 'block';
        solutionText.textContent = 'Solution found! The puzzle has been solved.';
        solutionText.style.color = '#2E7D32';
    } else {
        solutionInfo.style.display = 'block';
        solutionText.textContent = 'No solution exists for this puzzle. Please check your input.';
        solutionText.style.color = '#D32F2F';
    }
}

function clearGrid() {
    cells.forEach(cell => {
        cell.value = '';
        cell.classList.remove('solved', 'given', 'invalid');
    });

    clearNumberHighlights();
    
    const solutionInfo = document.getElementById('solutionInfo');
    solutionInfo.style.display = 'none';
}

function generateSudokuSolution() {
    const grid = Array(9).fill(null).map(() => Array(9).fill(0));
    
    function isValid(grid, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
        }
        
        // Check column
        for (let x = 0; x < 9; x++) {
            if (grid[x][col] === num) return false;
        }
        
        // Check 3x3 box
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[startRow + i][startCol + j] === num) return false;
            }
        }
        
        return true;
    }
    
    function fillGrid(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    // Randomize numbers 1-9
                    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                    
                    for (let num of nums) {
                        if (isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            
                            if (fillGrid(grid)) {
                                return true;
                            }
                            
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    
    fillGrid(grid);
    return grid;
}

function isSudokuValid(row, col, num) {
    const grid = getGridValues();
    
    // Check row
    for (let x = 0; x < 9; x++) {
        if (x !== col && grid[row][x] === num) {
            return false;
        }
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
        if (x !== row && grid[x][col] === num) {
            return false;
        }
    }
    
    // Check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const gridRow = startRow + i;
            const gridCol = startCol + j;
            if ((gridRow !== row || gridCol !== col) && grid[gridRow][gridCol] === num) {
                return false;
            }
        }
    }
    
    return true;
}

function generatePuzzle() {
    const solution = generateSudokuSolution();
    const puzzle = solution.map(row => [...row]);
    
    // Remove approximately 50 numbers to create the puzzle
    let cellsToRemove = 50;
    while (cellsToRemove > 0) {
        const row = Math.floor(Math.random() * 9);
        const col = Math.floor(Math.random() * 9);
        
        if (puzzle[row][col] !== 0) {
            puzzle[row][col] = 0;
            cellsToRemove--;
        }
    }
    
    return puzzle;
}

function loadExample() {
    const puzzle = generatePuzzle();
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const index = i * 9 + j;
            cells[index].value = puzzle[i][j] || '';
            cells[index].classList.remove('solved', 'given', 'invalid');
            if (puzzle[i][j]) {
                cells[index].classList.add('given');
            }
        }
    }

    const activeCell = document.activeElement;
    if (activeCell && activeCell.classList && activeCell.classList.contains('sudoku-cell')) {
        updateNumberHighlights(activeCell);
    } else {
        clearNumberHighlights();
    }
    
    const solutionInfo = document.getElementById('solutionInfo');
    solutionInfo.style.display = 'none';
}
