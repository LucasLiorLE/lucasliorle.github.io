const WORD_LIST_URL = 'https://raw.githubusercontent.com/tabatkins/wordle-list/refs/heads/main/words';
const STATE_CLASSES = ['state-absent', 'state-present', 'state-correct'];

const startWordInput = document.getElementById('startWord');
const setWordBtn = document.getElementById('setWordBtn');
const clearWordsBtn = document.getElementById('clearWordsBtn');
const tileRow = document.getElementById('tileRow');
const suggestionList = document.getElementById('suggestionList');
const statusText = document.getElementById('statusText');
const resultCount = document.getElementById('resultCount');

let dictionary = [];
let words = [];
let wordStates = [];

function toCleanWord(value) {
    return value.toLowerCase().replace(/[^a-z]/g, '');
}

function parseWords(input) {
    return input
        .split(/\s+/)
        .map(toCleanWord)
        .filter((w) => w.length === 5);
}

function setStatus(message) {
    statusText.textContent = message;
}

function addWord(word) {
    const cleaned = toCleanWord(word);
    
    if (cleaned.length !== 5) {
        setStatus('Please enter exactly 5 letters.');
        return false;
    }
    
    if (words.includes(cleaned)) {
        setStatus(`"${cleaned}" is already added.`);
        return false;
    }
    
    words.push(cleaned);
    wordStates.push([0, 0, 0, 0, 0]);
    renderTiles();
    updateSuggestions();
    updateClearButton();
    setStatus(`Added "${cleaned}". Click tiles to mark colors.`);
    return true;
}

function removeWord(index) {
    words.splice(index, 1);
    wordStates.splice(index, 1);
    
    if (words.length === 0) {
        tileRow.innerHTML = '';
        suggestionList.innerHTML = '';
        resultCount.textContent = '0 matches';
        setStatus('Enter a 5-letter word to begin.');
    } else {
        renderTiles();
        updateSuggestions();
    }
    updateClearButton();
}

function clearAllWords() {
    words = [];
    wordStates = [];
    tileRow.innerHTML = '';
    suggestionList.innerHTML = '';
    resultCount.textContent = '0 matches';
    updateClearButton();
    setStatus('All words cleared. Enter a word to begin.');
}

function updateClearButton() {
    if (words.length > 0) {
        clearWordsBtn.style.display = 'block';
    } else {
        clearWordsBtn.style.display = 'none';
    }
}

function setWords(input) {
    const newWords = parseWords(input);

    if (newWords.length === 0) {
        setStatus('Enter a 5-letter word.');
        return;
    }

    for (const word of newWords) {
        addWord(word);
    }
}

function renderTiles() {
    tileRow.innerHTML = '';

    for (let wordIdx = 0; wordIdx < words.length; wordIdx += 1) {
        const word = words[wordIdx];
        const states = wordStates[wordIdx];
        
        const container = document.createElement('div');
        container.className = 'word-row-container';
        
        const row = document.createElement('div');
        row.className = 'word-row';

        for (let i = 0; i < 5; i += 1) {
            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = `tile ${STATE_CLASSES[states[i]]}`;
            tile.textContent = word[i].toUpperCase();
            tile.setAttribute('aria-label', `Word ${wordIdx + 1}, letter ${word[i]}`);

            tile.addEventListener('click', () => {
                states[i] = (states[i] + 1) % 3;
                renderTiles();
                updateSuggestions();
            });

            row.appendChild(tile);
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-word-btn';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', `Remove word ${word}`);
        removeBtn.addEventListener('click', () => removeWord(wordIdx));
        
        container.appendChild(row);
        container.appendChild(removeBtn);
        tileRow.appendChild(container);
    }
}

function countLetters(word) {
    const map = new Map();
    for (const letter of word) {
        map.set(letter, (map.get(letter) || 0) + 1);
    }
    return map;
}

function buildConstraints() {
    const fixed = Array(5).fill(null);
    const bannedAt = Array.from({ length: 5 }, () => new Set());
    const presentLetters = new Set();
    const absentLetters = new Set();

    for (let wordIdx = 0; wordIdx < words.length; wordIdx += 1) {
        const word = words[wordIdx];
        const states = wordStates[wordIdx];

        for (let i = 0; i < 5; i += 1) {
            const letter = word[i];
            const state = states[i];

            if (state === 2) {
                fixed[i] = letter;
                presentLetters.add(letter);
            } else if (state === 1) {
                bannedAt[i].add(letter);
                presentLetters.add(letter);
            } else if (state === 0) {
                if (!presentLetters.has(letter)) {
                    absentLetters.add(letter);
                }
            }
        }
    }

    return {
        fixed,
        bannedAt,
        presentLetters,
        absentLetters,
    };
}

function wordMatches(candidate, constraints) {
    for (let i = 0; i < 5; i += 1) {
        if (constraints.fixed[i] && candidate[i] !== constraints.fixed[i]) {
            return false;
        }

        if (constraints.bannedAt[i].has(candidate[i])) {
            return false;
        }
    }

    for (const letter of constraints.absentLetters) {
        if (candidate.includes(letter)) {
            return false;
        }
    }

    for (const letter of constraints.presentLetters) {
        if (!candidate.includes(letter)) {
            return false;
        }
    }

    return true;
}

function scoreWords(candidateWords) {
    const letterFrequency = new Map();
    const positionFrequency = Array.from({ length: 5 }, () => new Map());

    for (const word of candidateWords) {
        const unique = new Set(word);

        for (const letter of unique) {
            letterFrequency.set(letter, (letterFrequency.get(letter) || 0) + 1);
        }

        for (let i = 0; i < 5; i += 1) {
            const letter = word[i];
            const positionMap = positionFrequency[i];
            positionMap.set(letter, (positionMap.get(letter) || 0) + 1);
        }
    }

    const totalWords = candidateWords.length;

    return candidateWords
        .map((word) => {
            const unique = new Set(word);
            let score = 0;

            for (const letter of unique) {
                const frequency = letterFrequency.get(letter) || 0;
                score += (frequency / totalWords) * 100;
            }

            for (let i = 0; i < 5; i += 1) {
                const posFreq = positionFrequency[i].get(word[i]) || 0;
                score += (posFreq / totalWords) * 50;
            }

            const uniqueLetters = new Set(word).size;
            score += uniqueLetters * 5;

            return { word, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.word);
}

function updateSuggestions() {
    if (words.length === 0 || dictionary.length === 0) {
        suggestionList.innerHTML = '';
        resultCount.textContent = '0 matches';
        return;
    }

    const constraints = buildConstraints();
    const matches = dictionary.filter((word) => wordMatches(word, constraints));
    const ranked = scoreWords(matches).slice(0, 50);

    resultCount.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`;
    suggestionList.innerHTML = '';

    if (matches.length === 0) {
        const noResults = document.createElement('li');
        noResults.textContent = 'No matching words found';
        noResults.style.opacity = '0.5';
        noResults.style.cursor = 'default';
        suggestionList.appendChild(noResults);
        return;
    }

    for (const word of ranked) {
        const item = document.createElement('li');
        item.textContent = word;
        item.addEventListener('click', () => {
            if (!words.includes(word)) {
                addWord(word);
            }
        });
        suggestionList.appendChild(item);
    }
}

async function loadDictionary() {
    try {
        const response = await fetch(WORD_LIST_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch dictionary');
        }

        const rawText = await response.text();

        dictionary = rawText
            .split('\n')
            .map((word) => word.trim().toLowerCase())
            .filter((word) => /^[a-z]{5}$/.test(word));

        setStatus(`Loaded ${dictionary.length} words.`);
        if (words.length > 0) {
            updateSuggestions();
        }
    } catch (error) {
        dictionary = ['crane', 'slate', 'trace', 'stare', 'arise'];
        setStatus('Word list failed to load, using fallback words.');
        if (words.length > 0) {
            updateSuggestions();
        }
    }
}

setWordBtn.addEventListener('click', () => {
    const input = startWordInput.value.trim();
    if (input) {
        setWords(input);
        startWordInput.value = '';
        startWordInput.focus();
    }
});

startWordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const input = startWordInput.value.trim();
        if (input) {
            setWords(input);
            startWordInput.value = '';
        }
    }
});

clearWordsBtn.addEventListener('click', () => {
    clearAllWords();
    startWordInput.focus();
});

loadDictionary();
