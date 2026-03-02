const board = document.getElementById('board');
const boardContainer = document.getElementById('boardContainer');
const openDesmosBtn = document.getElementById('openDesmosBtn');
const openBoardsBtn = document.getElementById('toggleBoardsBtn');
const boardsSidebar = document.getElementById('boardsSidebar');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');

const STORAGE_KEY = 'latexBoards_v1';
let boards = [];
let currentBoardId = null;

let selectedIds = new Set();
let selecting = false;
let selectionRectEl = null;
let selectionStart = {x:0,y:0};

const SETTINGS_KEY = 'latexSettings_v1';
let snapToGrid = false;
let gridSize = 40;
let showGrid = false;
let persistentVars = true;  // Enable by default
let varScope = {}; // Global scope for persistent variables/functions
let boardVarScopes = {}; // In-memory only: per-board scopes for current session

function getCurrentScopeKey(){
	return currentBoardId || '__scratch__';
}

function exportCurrentVarScope(){
	const saved = { vars: {}, funcs: {} };
	for (const key in varScope) {
		if (key.endsWith('_var') || key.endsWith('_expr')) continue;
		const val = varScope[key];
		if (typeof val === 'number') {
			saved.vars[key] = val;
		} else if (val && typeof val.evaluate === 'function') {
			const param = varScope[`${key}_var`];
			const expr = varScope[`${key}_expr`];
			if (param && expr) saved.funcs[key] = { param, expr };
		}
	}
	return saved;
}
function loadSettings(){
	try{
		const raw = localStorage.getItem(SETTINGS_KEY);
		if(raw){ const s = JSON.parse(raw); snapToGrid = !!s.snap; gridSize = s.gridSize || 40; showGrid = !!s.showGrid; persistentVars = s.persistentVars !== undefined ? !!s.persistentVars : true; }
	}catch(e){}
}
function saveSettings(){
	try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify({ snap: !!snapToGrid, gridSize: gridSize, showGrid: !!showGrid, persistentVars: !!persistentVars })); }catch(e){}
}

function loadVarScope(){
	varScope = {};
	if (!persistentVars) return;
	try {
		const saved = boardVarScopes[getCurrentScopeKey()] || { vars: {}, funcs: {} };
		const vars = saved.vars || {};
		const funcs = saved.funcs || {};
		for (const key in vars) {
			if (typeof vars[key] === 'number') varScope[key] = vars[key];
		}
		for (const funcName in funcs) {
			const def = funcs[funcName];
			if (!def || !def.param || !def.expr) continue;
			varScope[funcName] = math.parse(def.expr).compile();
			varScope[`${funcName}_var`] = def.param;
			varScope[`${funcName}_expr`] = def.expr;
		}
	} catch (e) {
		console.error('loadVarScope error:', e);
		varScope = {};
	}
}

function saveVarScope(){
	if (!persistentVars) return;
	try {
		boardVarScopes[getCurrentScopeKey()] = exportCurrentVarScope();
	} catch (e) {
		console.error('saveVarScope error:', e);
	}
}

let gridOverlayEl = null;
function ensureGridOverlay(){
	if(gridOverlayEl) return gridOverlayEl;
	gridOverlayEl = document.createElement('div');
	gridOverlayEl.className = 'grid-overlay';

	board.insertBefore(gridOverlayEl, board.firstChild);
	updateGridOverlay();
	return gridOverlayEl;
}

function updateGridOverlay(){
	if(!gridOverlayEl) return;
	const size = Math.max(4, parseInt(gridSize||40,10));

	gridOverlayEl.style.backgroundImage = `repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent ${size}px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent ${size}px)`;
	gridOverlayEl.style.backgroundSize = `${size}px ${size}px, ${size}px ${size}px`;
}

function setGridVisible(v){
	showGrid = !!v;
	ensureGridOverlay();
	if(showGrid) gridOverlayEl.classList.add('visible'); else gridOverlayEl.classList.remove('visible');
	saveSettings();
}

function clearSelection(){
	selectedIds.forEach(id=>{ const el = findById(id); if(el) el.classList.remove('selected'); });
	selectedIds.clear();
}

function toggleSelection(el){
	const id = el.dataset.id;
	if(selectedIds.has(id)){ selectedIds.delete(id); el.classList.remove('selected'); }
	else{ selectedIds.add(id); el.classList.add('selected'); }
}

function selectElementsInRect(rect){

	const boardRect = board.getBoundingClientRect();
	board.querySelectorAll('.latex-item, .win').forEach(el=>{
		const r = el.getBoundingClientRect();
		const rel = { left: r.left - boardRect.left, top: r.top - boardRect.top, width: r.width, height: r.height };
		const intersects = !(rel.left > rect.left + rect.width || rel.left + rel.width < rect.left || rel.top > rect.top + rect.height || rel.top + rel.height < rect.top);
		if(intersects){ selectedIds.add(el.dataset.id); el.classList.add('selected'); }
		else{ selectedIds.delete(el.dataset.id); el.classList.remove('selected'); }
	});
}

function loadBoardsFromStorage(){
	try{
		const raw = localStorage.getItem(STORAGE_KEY);
		boards = raw ? JSON.parse(raw) : [];
	}catch(e){ boards = []; }
}

function saveBoardsToStorage(){
	localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}

function formatTime(ts){
	const d = new Date(ts);
	return d.toLocaleString();
}

function getBoardState(){
	const items = [];
	board.querySelectorAll('.latex-item').forEach(el=>{
		items.push({ id: el.dataset.id, latex: el.dataset.latex||'', x: parseInt(el.style.left||0,10), y: parseInt(el.style.top||0,10), z: el.style.zIndex });
	});
	const wins = [];
	board.querySelectorAll('.win').forEach(w=>{
		wins.push({ x: parseInt(w.style.left||0,10), y: parseInt(w.style.top||0,10), w: parseInt(w.style.width||0,10), h: parseInt(w.style.height||0,10), z: w.style.zIndex, src: w.querySelector('iframe')?.src||'' });
	});
	return { items, wins };
}

function clearBoard(){
	board.querySelectorAll('.latex-item').forEach(el=>{
		removeAuxiliaryWindows(el);
		el.remove();
	});
	board.querySelectorAll('.win').forEach(w=>w.remove());

	undoStack.length = 0; redoStack.length = 0;
	clearSelection();
}

function loadBoardById(id){
	if (persistentVars) saveVarScope();
	const b = boards.find(x=>x.id===id);
	if(!b) return;
	clearBoard();

	(b.state.items||[]).forEach(s=> recreateLatexFromState(s) );
	(b.state.wins||[]).forEach(w=> createDesmosWindow(w.x, w.y, w.w, w.h, w.src));
	currentBoardId = id;
	loadVarScope();
}

function saveCurrentBoard(name, id){
	const state = getBoardState();
	const ts = Date.now();
	if(id){
		const idx = boards.findIndex(b=>b.id===id);
		if(idx>=0){ boards[idx].name = name; boards[idx].updated = ts; boards[idx].state = state; }
	}else{
		const newId = 'b' + Math.random().toString(36).slice(2,9);
		boards.unshift({ id: newId, name: name||('Board ' + (boards.length+1)), created: ts, updated: ts, state });
		if (persistentVars && boardVarScopes.__scratch__) {
			boardVarScopes[newId] = boardVarScopes.__scratch__;
			delete boardVarScopes.__scratch__;
		}
		currentBoardId = newId;
	}
	saveBoardsToStorage();
	renderBoardsSidebar();
}

function deleteBoardById(id){
	const idx = boards.findIndex(b=>b.id===id);
	if(idx>=0){ boards.splice(idx,1); saveBoardsToStorage(); renderBoardsSidebar(); delete boardVarScopes[id]; if(currentBoardId===id){ currentBoardId = null; loadVarScope(); } }
}

function renderBoardsSidebar(){
	if(!boardsSidebar) return;
	boardsSidebar.innerHTML = '';
	const header = document.createElement('div'); header.className = 'boards-header';
	const h = document.createElement('h3'); h.textContent = 'Boards';
	header.appendChild(h);
	const controls = document.createElement('div'); controls.className = 'boards-controls';
	const newBtn = document.createElement('button'); newBtn.className = 'board-small-btn'; newBtn.textContent = 'New';
	const saveBtn = document.createElement('button'); saveBtn.className = 'board-small-btn'; saveBtn.textContent = 'Save Current';
	controls.appendChild(newBtn); controls.appendChild(saveBtn);
	header.appendChild(controls);
	boardsSidebar.appendChild(header);

	const warning = document.createElement('div');
	warning.className = 'board-warning';
	warning.textContent = 'Note: Desmos graphs do not save. Also for some reason whatever I try, you need to double click on an expression to reload the graph/solver thing.';
	boardsSidebar.appendChild(warning);

	newBtn.addEventListener('click', ()=>{
		const name = prompt('Name for new board?','Untitled Board');
		if(!name) return;
		if(!confirm('Create new board "' + name + '"? This will clear the current board.')) return;
		if (persistentVars) saveVarScope();
		clearBoard();
		varScope = {};
		boardVarScopes.__scratch__ = { vars: {}, funcs: {} };
		saveCurrentBoard(name);
	});
	saveBtn.addEventListener('click', ()=>{
		if(currentBoardId){
			const name = prompt('Save name for board?', boards.find(b=>b.id===currentBoardId)?.name || '');
			if(name) saveCurrentBoard(name, currentBoardId);
		}else{
			const name = prompt('Name for board?','Untitled Board');
			if(name) saveCurrentBoard(name);
		}
	});

	if(!boards.length){
		const empty = document.createElement('div'); empty.className = 'board-empty'; empty.textContent = 'No saved boards.';
		boardsSidebar.appendChild(empty); return;
	}

	const list = document.createElement('div'); list.className = 'board-list';
	boards.forEach(b=>{
		const it = document.createElement('div'); it.className = 'board-item';
		const preview = document.createElement('div'); preview.className = 'preview';
		(b.state.items||[]).slice(0,3).forEach(si=>{
			const p = document.createElement('div'); p.className = 'p';
			try{ p.innerHTML = katex.renderToString(si.latex||'', {throwOnError:false}); }catch(e){ p.textContent = si.latex||''; }
			preview.appendChild(p);
		});
		const meta = document.createElement('div'); meta.className = 'meta';
		const title = document.createElement('div'); title.className = 'title'; title.textContent = b.name || '';
		const time = document.createElement('div'); time.className = 'time'; time.textContent = formatTime(b.updated || b.created);
		meta.appendChild(title); meta.appendChild(time);

		const actions = document.createElement('div'); actions.className = 'actions';
		const loadBtn = document.createElement('button'); loadBtn.className = 'board-small-btn'; loadBtn.textContent = 'Load';
		const saveBtn2 = document.createElement('button'); saveBtn2.className = 'board-small-btn'; saveBtn2.textContent = 'Overwrite';
		const delBtn = document.createElement('button'); delBtn.className = 'board-small-btn'; delBtn.textContent = 'Delete';
		actions.appendChild(loadBtn); actions.appendChild(saveBtn2); actions.appendChild(delBtn);

		loadBtn.addEventListener('click', ()=>{ loadBoardById(b.id); });
		saveBtn2.addEventListener('click', ()=>{ const name = prompt('Save as name?', b.name||''); if(name) saveCurrentBoard(name, b.id); });
		delBtn.addEventListener('click', ()=>{ if(confirm('Delete board "' + (b.name||'') + '"?')) deleteBoardById(b.id); });

		it.appendChild(preview); it.appendChild(meta); it.appendChild(actions);
		list.appendChild(it);
	});
	boardsSidebar.appendChild(list);
}

function toggleBoardsSidebar(){
	if(!boardsSidebar) return;
	const open = boardsSidebar.classList.toggle('open');
	boardsSidebar.setAttribute('aria-hidden', String(!open));
	if(open){ renderBoardsSidebar(); }
}

openBoardsBtn?.addEventListener('click', ()=> toggleBoardsSidebar());

function renderSettingsPanel(){
	if(!settingsPanel) return;
	settingsPanel.innerHTML = '';
	const h = document.createElement('h4'); h.textContent = 'Settings';
	settingsPanel.appendChild(h);

	const row1 = document.createElement('div'); row1.className = 'settings-row';
	const lbl1 = document.createElement('label'); lbl1.textContent = 'Snap to grid';
	const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = snapToGrid;
	cb.addEventListener('change', ()=>{ snapToGrid = cb.checked; saveSettings(); });
	row1.appendChild(lbl1); row1.appendChild(cb);
	settingsPanel.appendChild(row1);

	const row2 = document.createElement('div'); row2.className = 'settings-row';
	const lbl2 = document.createElement('label'); lbl2.textContent = 'Grid size (px)';
	const num = document.createElement('input'); num.type = 'number'; num.value = gridSize; num.min = 4; num.step = 2;
	num.addEventListener('change', ()=>{ gridSize = Math.max(4, parseInt(num.value||40,10)); updateGridOverlay(); saveSettings(); });
	row2.appendChild(lbl2); row2.appendChild(num);
	settingsPanel.appendChild(row2);

	const rowGrid = document.createElement('div'); rowGrid.className = 'settings-row';
	const lblGrid = document.createElement('label'); lblGrid.textContent = 'Show grid';
	const cbGrid = document.createElement('input'); cbGrid.type = 'checkbox'; cbGrid.checked = showGrid;
	cbGrid.addEventListener('change', ()=>{ setGridVisible(cbGrid.checked); });
	rowGrid.appendChild(lblGrid); rowGrid.appendChild(cbGrid);
	settingsPanel.appendChild(rowGrid);

	const rowPersist = document.createElement('div'); rowPersist.className = 'settings-row';
	const lblPersist = document.createElement('label'); lblPersist.textContent = 'Persistent variables/functions';
	const cbPersist = document.createElement('input'); cbPersist.type = 'checkbox'; cbPersist.checked = persistentVars;
	cbPersist.addEventListener('change', ()=>{
		if (persistentVars) saveVarScope();
		persistentVars = cbPersist.checked;
		if(!persistentVars) {
			varScope = {};
			boardVarScopes = {};
		} else {
			loadVarScope();
		}
		saveSettings();
	});
	rowPersist.appendChild(lblPersist); rowPersist.appendChild(cbPersist);
	settingsPanel.appendChild(rowPersist);
}

settingsBtn?.addEventListener('click', ()=>{
	const open = settingsPanel.classList.toggle('open');
	settingsPanel.setAttribute('aria-hidden', String(!open));
	if(open) renderSettingsPanel();
});

function deleteSelected(){
	if(selectedIds.size === 0) return;

	const ids = Array.from(selectedIds);
	ids.forEach(id=>{
		const el = findById(id);
		if(!el) return;
		const x = parseInt(el.style.left||0,10); const y = parseInt(el.style.top||0,10);
		const z = el.style.zIndex;
		pushAction({ type: 'delete', id: id, state: { id: id, latex: el.dataset.latex||'', x, y, z } });
		removeAuxiliaryWindows(el);
		el.remove();
	});
	clearSelection();
}

window.addEventListener('keydown', (e)=>{

	const ae = document.activeElement;
	if(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
	if((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size>0){
		e.preventDefault(); if(confirm('Delete selected items?')) deleteSelected();
	}
});

loadBoardsFromStorage();
loadSettings();
loadVarScope();

let zCounter = 10;
let spacePressed = false;

let undoStack = [];
let redoStack = [];
let nextElementId = 1;
let performingUndoRedo = false;

function pushAction(action){
	if(performingUndoRedo) return;
	undoStack.push(action);

	redoStack.length = 0;
}

function undo(){
	if(!undoStack.length) return;
	const action = undoStack.pop();
	performingUndoRedo = true;
	applyInverse(action);
	redoStack.push(action);
	performingUndoRedo = false;
}

function redo(){
	if(!redoStack.length) return;
	const action = redoStack.pop();
	performingUndoRedo = true;
	applyAction(action);
	undoStack.push(action);
	performingUndoRedo = false;
}

function findById(id){
	return board.querySelector('[data-id="' + id + '"]');
}

function recreateLatexFromState(state){

	const el = createLatexItem(state.latex, state.x, state.y, {push:false, id: state.id});
	if(state.z) el.style.zIndex = state.z;
	return el;
}

function applyAction(action){
	const t = action.type;
	if(t === 'create'){
		recreateLatexFromState(action.state);
	}else if(t === 'delete'){
		const el = findById(action.id);
		if(el) {
			removeAuxiliaryWindows(el);
			el.remove();
		}
	}else if(t === 'move'){
		const el = findById(action.id);
		if(el){ el.style.left = action.to.x + 'px'; el.style.top = action.to.y + 'px'; }
	}else if(t === 'edit'){
		const el = findById(action.id);
		if(el){

			if(!action.to || String(action.to).trim() === ''){ 
				removeAuxiliaryWindows(el);
				el.remove(); 
			}
			else{
				el.dataset.latex = action.to;
				try{ el.querySelector('.latex-content').innerHTML = katex.renderToString(action.to, {throwOnError:false}); }
				catch(e){ el.querySelector('.latex-content').textContent = action.to; }
			}
		}
	}
}

function applyInverse(action){
	const t = action.type;
	if(t === 'create'){

		const el = findById(action.state.id);
		if(el) {
			removeAuxiliaryWindows(el);
			el.remove();
		}
	}else if(t === 'delete'){

		recreateLatexFromState(action.state);
	}else if(t === 'move'){
		const el = findById(action.id);
		if(el){ el.style.left = action.from.x + 'px'; el.style.top = action.from.y + 'px'; }
	}else if(t === 'edit'){
		const el = findById(action.id);
		if(el){

			if(!action.from || String(action.from).trim() === ''){ 
				removeAuxiliaryWindows(el);
				el.remove(); 
			}
			else{
				el.dataset.latex = action.from;
				try{ el.querySelector('.latex-content').innerHTML = katex.renderToString(action.from, {throwOnError:false}); }
				catch(e){ el.querySelector('.latex-content').textContent = action.from; }
			}
		}
	}
}

function createLatexItem(latex, x, y, opts = {push: true, id: null}){

	if(snapToGrid){ x = Math.round(x / gridSize) * gridSize; y = Math.round(y / gridSize) * gridSize; }
	const el = document.createElement('div');
	el.className = 'latex-item no-select';
	el.style.left = x + 'px';
	el.style.top = y + 'px';
	el.tabIndex = 0;
	const content = document.createElement('div');
	content.className = 'latex-content';
	try{
		content.innerHTML = katex.renderToString(latex, {throwOnError:false});
	}catch(e){
		content.textContent = '';
	}

	el.dataset.latex = latex || '';
	// Only append content if there's actual latex to show
	if (latex && latex.trim()) {
		el.appendChild(content);
	}
	board.appendChild(el);
	el.style.zIndex = ++zCounter;

	if(opts.id){ el.dataset.id = String(opts.id); }
	else{ el.dataset.id = String(nextElementId++); }

	makeDraggable(el);

	el.addEventListener('click', (ev)=>{
		ev.stopPropagation();
		if(ev.shiftKey){
			toggleSelection(el);
		} else {

			clearSelection();
			selectedIds.add(el.dataset.id);
			el.classList.add('selected');
			el.style.zIndex = ++zCounter;
		}
	});
	el.addEventListener('dblclick', (ev)=>{ ev.stopPropagation(); openLatexEditorLive(el, el.dataset.latex, ev.clientX); });

	if(opts.push !== false){
		pushAction({ type: 'create', state: { id: el.dataset.id, latex: el.dataset.latex, x: x, y: y, z: el.style.zIndex } });
	}

	return el;
}

// Parse common math notation into LaTeX
function parseMathNotation(input) {
	let result = input;
	
	// Only parse if it doesn't already contain backslashes (i.e., not already LaTeX)
	if (result.includes('\\')) {
		return result; // Already LaTeX, don't parse
	}
	
	// sqrt(x) -> \sqrt{x}
	result = result.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
	
	// Handle exponents: x^2 -> x^{2}, x^(expr) -> x^{expr}
	result = result.replace(/([a-zA-Z0-9}\)])\^\(([^)]+)\)/g, '$1^{$2}');
	result = result.replace(/([a-zA-Z0-9}\)])\^([a-zA-Z0-9])/g, '$1^{$2}');
	
	// Handle subscripts: x_2 -> x_{2}, x_(expr) -> x_{expr}
	result = result.replace(/([a-zA-Z0-9}\)])_\(([^)]+)\)/g, '$1_{$2}');
	result = result.replace(/([a-zA-Z0-9}\)])_([a-zA-Z0-9])/g, '$1_{$2}');
	
	// Handle common Greek letters spelled out
	const greekMap = {
		'alpha': '\\alpha', 'beta': '\\beta', 'gamma': '\\gamma', 'delta': '\\delta',
		'pi': '\\pi', 'theta': '\\theta', 'phi': '\\phi', 'psi': '\\psi',
		'omega': '\\omega', 'sigma': '\\sigma', 'lambda': '\\lambda', 'mu': '\\mu'
	};
	Object.entries(greekMap).forEach(([key, val]) => {
		result = result.replace(new RegExp('\\b' + key + '\\b', 'g'), val);
	});
	
	return result;
}

// Helper to remove auxiliary windows for an element
function removeAuxiliaryWindows(el) {
	if (el._solveWindow) {
		el._solveWindow.remove();
		el._solveWindow = null;
	}
	if (el._graphWindow) {
		el._graphWindow.remove();
		el._graphWindow = null;
	}
}

function openLatexEditorLive(el, initial, clickClientX){
	const current = initial || '';
	const prevLatex = el.dataset.latex || '';

	el.classList.add('editing');
	el.innerHTML = '';
	// Clear all inline dimension styles to let CSS handle it
	el.style.width = '';
	el.style.height = '';
	el.style.minWidth = '';
	el.style.minHeight = '';
	
	// Container for equation editor
	const editorContainer = document.createElement('div');
	editorContainer.className = 'equation-editor-container';
	
	// Create MathQuill editable field
	const mathField = document.createElement('span');
	mathField.className = 'mathquill-field';
	editorContainer.appendChild(mathField);
	
	// Create controls container
	const controls = document.createElement('div');
	controls.className = 'equation-controls';
	
	const solveBtn = document.createElement('button');
	solveBtn.textContent = 'Solve';
	solveBtn.className = 'eq-control-btn';
	
	const graphBtn = document.createElement('button');
	graphBtn.textContent = 'Graph';
	graphBtn.className = 'eq-control-btn';
	
	// Check if windows already exist and set button states
	if (el._solveWindow && document.body.contains(el._solveWindow) && el._solveWindow.style.display !== 'none') {
		solveBtn.classList.add('active');
	}
	if (el._graphWindow && document.body.contains(el._graphWindow) && el._graphWindow.style.display !== 'none') {
		graphBtn.classList.add('active');
	}
	
	controls.appendChild(solveBtn);
	controls.appendChild(graphBtn);
	editorContainer.appendChild(controls);
	
	el.appendChild(editorContainer);

	const MQ = MathQuill.getInterface(2);
	const startTime = Date.now();
	let mqField;  // Will be initialized after helper functions

	const wasDragging = el._draggingDisabled;
	el._draggingDisabled = true;
	
	// Helper to convert LaTeX to math.js format
	function latexToMathJS(latex) {
		// Handle fractions in exponents: x^{\frac{a}{b}} -> x^((a)/(b))
		latex = latex.replace(/\^\\left\{\\frac\{([^}]+)\}\{([^}]+)\}\\right\}/g, '^(($1)/($2))')
		            .replace(/\^\{\\frac\{([^}]+)\}\{([^}]+)\}\}/g, '^(($1)/($2))')
		            .replace(/\^\\frac\{([^}]+)\}\{([^}]+)\}/g, '^(($1)/($2))')
		
		// Then handle other fractions
		           .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
		           .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
		           .replace(/\^/g, '^')
		           .replace(/\\cdot/g, '*')
		           .replace(/\\times/g, '*')
		           .replace(/\\left|\\right/g, '')
		           .replace(/[{}]/g, '')
		           .replace(/\\\w+/g, (m) => m.substring(1)); // Remove remaining backslashes
		return latex;
	}

	function hydrateScopeFromCurrentBoard() {
		if (!persistentVars) return;
		const items = Array.from(board.querySelectorAll('.latex-item'));
		if (!items.length) return;

		const scoped = {};
		let changed = true;
		let passes = 0;

		while (changed && passes < 4) {
			changed = false;
			passes++;

			for (const item of items) {
				const itemLatex = item.dataset?.latex || '';
				if (!itemLatex) continue;
				const expr = latexToMathJS(itemLatex);
				if (!expr.includes('=')) continue;

				const parts = expr.split('=');
				if (parts.length < 2) continue;
				const leftSide = parts[0].trim();
				const rightSide = parts.slice(1).join('=').trim();

				const trimmedLeft = leftSide.replace(/\s+/g, '');
				const funcMatch = trimmedLeft.match(/^([a-zA-Z]+)\(([a-zA-Z]+)\)$/);
				if (funcMatch) {
					const funcName = funcMatch[1];
					const funcVar = funcMatch[2];
					if (!scoped[funcName]) {
						try {
							scoped[funcName] = math.parse(rightSide).compile();
							scoped[`${funcName}_var`] = funcVar;
							scoped[`${funcName}_expr`] = rightSide;
							changed = true;
						} catch (_) {}
					}
					continue;
				}

				try {
					const leftVars = extractVariables(math.parse(leftSide));
					if (leftVars.length === 1 && leftSide === leftVars[0]) {
						const varName = leftSide;
						const value = math.evaluate(rightSide, scoped);
						if (typeof value === 'number' && Number.isFinite(value) && scoped[varName] !== value) {
							scoped[varName] = value;
							changed = true;
						}
					}
				} catch (_) {}
			}
		}

		if (Object.keys(scoped).length > 0) {
			varScope = scoped;
			saveVarScope();
		}
	}
	
	// Create or show solve window
	function toggleSolveWindow() {
		if (el._solveWindow && document.body.contains(el._solveWindow)) {
			// Toggle visibility
			if (el._solveWindow.style.display === 'none') {
				el._solveWindow.style.display = '';
				solveBtn.classList.add('active');
				updateSolveWindow();
			} else {
				el._solveWindow.style.display = 'none';
				solveBtn.classList.remove('active');
			}
		} else {
			// Create new window
			const elRect = el.getBoundingClientRect();
			const boardRect = board.getBoundingClientRect();
			const x = elRect.right - boardRect.left + 20;
			const y = elRect.top - boardRect.top;
			
			el._solveWindow = createResultWindow(x, y, 350, 200, 'Solution', el);
			solveBtn.classList.add('active');
			updateSolveWindow();
		}
	}
	
	// Create or show graph window
	function toggleGraphWindow() {
		if (el._graphWindow && document.body.contains(el._graphWindow)) {
			// Toggle visibility
			if (el._graphWindow.style.display === 'none') {
				el._graphWindow.style.display = '';
				graphBtn.classList.add('active');
				updateGraphWindow();
			} else {
				el._graphWindow.style.display = 'none';
				graphBtn.classList.remove('active');
			}
		} else {
			// Create new window
			const elRect = el.getBoundingClientRect();
			const boardRect = board.getBoundingClientRect();
			const x = elRect.right - boardRect.left + 20;
			const y = elRect.top - boardRect.top;
			
			el._graphWindow = createResultWindow(x, y, 450, 350, 'Graph', el);
			graphBtn.classList.add('active');
			updateGraphWindow();
		}
	}
	
	// Helper function to extract all variables from an expression
	function extractVariables(expr) {
		const vars = new Set();
		const exprStr = expr.toString();
		// Match single letters that are variables (not part of function names)
		const matches = exprStr.match(/\b[a-zA-Z]\b/g);
		if (matches) {
			matches.forEach(m => vars.add(m));
		}
		return Array.from(vars).sort();
	}

	function isComplexLike(v) {
		return !!(v && typeof v === 'object' && typeof v.re === 'number' && typeof v.im === 'number');
	}

	function asComplex(v) {
		if (isComplexLike(v)) return { re: v.re, im: v.im };
		return { re: Number(v), im: 0 };
	}

	function dedupeRoots(roots, tol = 1e-6) {
		const out = [];
		for (const r of roots) {
			const c = asComplex(r);
			const exists = out.some(x => {
				const xc = asComplex(x);
				return Math.hypot(c.re - xc.re, c.im - xc.im) < tol;
			});
			if (!exists) out.push(r);
		}
		return out;
	}

	function complex(re, im) { return { re, im }; }
	function cAdd(a, b) { return complex(a.re + b.re, a.im + b.im); }
	function cSub(a, b) { return complex(a.re - b.re, a.im - b.im); }
	function cMul(a, b) { return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
	function cDiv(a, b) {
		const d = b.re * b.re + b.im * b.im;
		if (d < 1e-20) return complex(1e12, 1e12);
		return complex((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
	}
	function cAbs(a) { return Math.hypot(a.re, a.im); }

	function evalPolyComplex(coeffDesc, z) {
		let out = complex(coeffDesc[0], 0);
		for (let i = 1; i < coeffDesc.length; i++) {
			out = cAdd(cMul(out, z), complex(coeffDesc[i], 0));
		}
		return out;
	}

	function durandKerner(coeffDesc) {
		const n = coeffDesc.length - 1;
		if (n < 1) return [];
		const lead = coeffDesc[0];
		if (!Number.isFinite(lead) || Math.abs(lead) < 1e-14) return [];
		const monic = coeffDesc.map(c => c / lead);

		// Better initial radius: estimate from ratio of constant to leading coeff
		// For x^n - c = 0, roots are approximately at |c|^(1/n)
		const constantTerm = Math.abs(monic[monic.length - 1]);
		let radius = 1;
		if (constantTerm > 0 && Number.isFinite(constantTerm)) {
			radius = Math.pow(constantTerm, 1 / n);
			// Ensure radius is reasonable
			radius = Math.max(0.5, Math.min(radius, 1e6));
		}

		const roots = [];
		for (let i = 0; i < n; i++) {
			const ang = (2 * Math.PI * i) / n;
			roots.push(complex(radius * Math.cos(ang), radius * Math.sin(ang)));
		}

		for (let iter = 0; iter < 300; iter++) {
			let maxDelta = 0;
			for (let i = 0; i < n; i++) {
				const zi = roots[i];
				const p = evalPolyComplex(monic, zi);
				let denom = complex(1, 0);
				for (let j = 0; j < n; j++) {
					if (i === j) continue;
					denom = cMul(denom, cSub(zi, roots[j]));
				}
				const denomAbs = cAbs(denom);
				if (denomAbs < 1e-14) {
					// Skip update if denominator is too small
					continue;
				}
				const delta = cDiv(p, denom);
				const deltaAbs = cAbs(delta);
				if (!Number.isFinite(deltaAbs)) {
					// Skip if delta is invalid
					continue;
				}
				roots[i] = cSub(zi, delta);
				maxDelta = Math.max(maxDelta, deltaAbs);
			}
			if (maxDelta < 1e-9) break;
		}
		return roots;
	}

	function polynomialCoefficientsByDerivatives(exprNode, variable, maxDegree = 40) {
		const factorial = (n) => {
			let out = 1;
			for (let i = 2; i <= n; i++) out *= i;
			return out;
		};

		const coeffAsc = [];
		let deriv = exprNode;
		for (let k = 0; k <= maxDegree; k++) {
			let v;
			try {
				v = math.evaluate(deriv.toString(), { [variable]: 0 });
			} catch (_) {
				return null;
			}
			if (typeof v !== 'number' || !Number.isFinite(v)) return null;
			coeffAsc[k] = v / factorial(k);
			try {
				deriv = math.simplify(math.derivative(deriv, variable));
			} catch (_) {
				return null;
			}
		}

		let degree = -1;
		for (let i = coeffAsc.length - 1; i >= 0; i--) {
			if (Math.abs(coeffAsc[i] || 0) > 1e-10) { degree = i; break; }
		}
		if (degree < 0) return null;
		return { degree, coeffDesc: coeffAsc.slice(0, degree + 1).reverse() };
	}

	function findRealRootsByNewton(exprNode, variable) {
		let exprCompiled;
		let derivCompiled;
		try {
			exprCompiled = math.parse(exprNode.toString()).compile();
			derivCompiled = math.parse(math.derivative(exprNode, variable).toString()).compile();
		} catch (_) {
			return [];
		}

		const roots = [];
		for (let seed = -20; seed <= 20; seed += 1) {
			let x = seed;
			for (let i = 0; i < 60; i++) {
				let fx;
				let dfx;
				try {
					fx = exprCompiled.evaluate({ [variable]: x });
					dfx = derivCompiled.evaluate({ [variable]: x });
				} catch (_) {
					break;
				}
				if (!Number.isFinite(fx) || !Number.isFinite(dfx) || Math.abs(dfx) < 1e-12) break;
				const nx = x - fx / dfx;
				if (!Number.isFinite(nx)) break;
				if (Math.abs(nx - x) < 1e-10) { x = nx; break; }
				x = nx;
			}

			try {
				const fcheck = exprCompiled.evaluate({ [variable]: x });
				if (Number.isFinite(x) && Number.isFinite(fcheck) && Math.abs(fcheck) < 1e-6) {
					roots.push(x);
				}
			} catch (_) {}
		}

		return dedupeRoots(roots, 1e-5).sort((a, b) => Number(a) - Number(b));
	}
	
	// Update solve window content
	function updateSolveWindow() {
		if (!el._solveWindow || !document.body.contains(el._solveWindow)) return;
		
		const content = el._solveWindow.querySelector('.content');
		if (!content) return;
		
		content.innerHTML = '';
		const showComplex = el._solveShowComplex !== false;
		const uniqueOnly = !!el._solveUniqueRoots;
		
		const filterRow = document.createElement('div');
		filterRow.className = 'solve-result';
		filterRow.style.marginBottom = '8px';
		filterRow.innerHTML =
			'<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
			'<label style="display:flex;align-items:center;gap:8px;font-weight:600;"><input data-filter="complex" type="checkbox" ' + (showComplex ? 'checked' : '') + '> Show complex roots</label>' +
			'<label style="display:flex;align-items:center;gap:8px;font-weight:600;"><input data-filter="unique" type="checkbox" ' + (uniqueOnly ? 'checked' : '') + '> Unique roots only</label>' +
			'</div>';
		content.appendChild(filterRow);
		const complexToggle = filterRow.querySelector('input[data-filter="complex"]');
		const uniqueToggle = filterRow.querySelector('input[data-filter="unique"]');
		complexToggle.addEventListener('change', () => {
			el._solveShowComplex = complexToggle.checked;
			updateSolveWindow();
		});
		uniqueToggle.addEventListener('change', () => {
			el._solveUniqueRoots = uniqueToggle.checked;
			updateSolveWindow();
		});

		const resultsContainer = document.createElement('div');
		content.appendChild(resultsContainer);
			/*
			// Show stored variables if persistent vars enabled
			if (persistentVars && Object.keys(varScope).length > 0) {
				const varsDiv = document.createElement('div');
				varsDiv.className = 'board-warning';
				varsDiv.style.fontSize = '11px';
				varsDiv.style.marginBottom = '10px';
				varsDiv.style.background = '#e7f4e7';
				varsDiv.innerHTML = '<strong>Stored:</strong> ';
				const stored = [];
				for (const key in varScope) {
					if (key.endsWith('_var')) continue; // Skip parameter name storage
					if (typeof varScope[key] === 'number') {
						stored.push(`${key}=${varScope[key]}`);
					} else if (typeof varScope[key].evaluate === 'function') {
						const paramName = varScope[`${key}_var`];
						stored.push(`${key}(${paramName})`);
					}
				}
				varsDiv.innerHTML += stored.join(', ');
				content.insertBefore(varsDiv, resultsContainer);
			} */
	
		
		const latex = mqField.latex();
		if (!latex || latex.trim() === '') {
			resultsContainer.innerHTML = '<div class="solve-result">Enter an equation...</div>';
			return;
		}

		// Add warning for high-degree polynomials
		const warningDiv = document.createElement('div');
		warningDiv.className = 'board-warning';
		warningDiv.innerHTML = 'Note: For polynomials beyond degree 32, numerical accuracy may degrade and complex roots may not display correctly.';
		content.insertBefore(warningDiv, resultsContainer);
		
		const mathExpr = latexToMathJS(latex);
		if (persistentVars && Object.keys(varScope).length === 0) {
			hydrateScopeFromCurrentBoard();
		}
		
		try {
			// Try to solve if it's an equation
			if (mathExpr.includes('=')) {
				const parts = mathExpr.split('=');
				const leftSide = parts[0].trim();
				const rightSide = parts[1].trim();
				
				// Also split the original LaTeX for display purposes
				const latexParts = latex.split('=');
				const leftLatex = latexParts[0].trim();
				const rightLatex = latexParts[1].trim();
				
				// Check if this is a simple assignment (for persistent vars)
				if (persistentVars) {
					// Check for simple variable assignment: g = 2
					const leftVars = extractVariables(math.parse(leftSide));
					if (leftVars.length === 1 && leftSide === leftVars[0]) {
						// Simple variable on left, evaluate right side
						try {
							const value = math.evaluate(rightSide, varScope);
							varScope[leftSide] = value;
							saveVarScope();
							const solDiv = document.createElement('div');
							solDiv.className = 'solve-result';
							solDiv.innerHTML = `<strong>${leftSide} =</strong> ${formatValue(value)}`;
							solDiv.style.color = '#0a7c0a';
							solDiv.innerHTML += ' <span style="font-size:11px;color:#666;">(stored)</span>';
							resultsContainer.appendChild(solDiv);
							return;
						} catch (e) {
							// Fall through to normal solving
						}
					}
					
					// Check for function definition: f(x) = expression
					const trimmedLeft = leftSide.trim().replace(/\s+/g, '');
					const funcMatch = trimmedLeft.match(/^([a-zA-Z]+)\(([a-zA-Z]+)\)$/);
					if (funcMatch) {
						const funcName = funcMatch[1];
						const funcVar = funcMatch[2];
						try {
							// Store as a function
							varScope[funcName] = math.parse(rightSide).compile();
							varScope[`${funcName}_var`] = funcVar; // Store parameter name
							varScope[`${funcName}_expr`] = rightSide;
							saveVarScope();
							const solDiv = document.createElement('div');
							solDiv.className = 'solve-result';
							solDiv.innerHTML = `<strong>${leftLatex} =</strong> ` + katex.renderToString(rightLatex, {throwOnError: false});
							solDiv.style.color = '#0a7c0a';
							solDiv.innerHTML += ' <span style="font-size:11px;color:#666;">(stored)</span>';
							resultsContainer.appendChild(solDiv);
							return;
						} catch (e) {
							// Fall through
						}
					}
				}
				
				// Move everything to left side: left - right = 0
				const equation = `(${leftSide}) - (${rightSide})`;
				const simplified = math.simplify(equation);
				
				// Extract all variables to solve for
				const variables = extractVariables(simplified);
				
				if (variables.length === 0) {
					// No variables, just evaluate
					const val = math.evaluate(equation, persistentVars ? varScope : {});
					const solDiv = document.createElement('div');
					solDiv.className = 'solve-result';
					solDiv.innerHTML = '<strong>Result:</strong> ' + val;
					resultsContainer.appendChild(solDiv);
				} else {
					// Solve for each variable
					let solvedAny = false;
					variables.forEach(variable => {
						if (solveForVariable(variable, simplified, resultsContainer, { showComplex, uniqueOnly })) solvedAny = true;
					});
					if (!solvedAny) {
						resultsContainer.innerHTML = '<div class="solve-error">Could not isolate variables for this equation.</div>';
					}
				}
			} else {
				// Just an expression, evaluate/simplify it
				let result;
				try {
					// Check for function call pattern like f(5)
					if (persistentVars) {
						// Trim spaces and check for function call
						const trimmedExpr = mathExpr.trim().replace(/\s+/g, '');
						const funcCallMatch = trimmedExpr.match(/^([a-zA-Z]+)\(([^)]+)\)$/);
						if (funcCallMatch) {
							const funcName = funcCallMatch[1];
							const argStr = funcCallMatch[2];
							if (varScope[funcName] && typeof varScope[funcName].evaluate === 'function') {
								// It's a stored function
								const paramName = varScope[`${funcName}_var`];
								try {
									const argValue = math.evaluate(argStr, varScope);
									// Evaluate with both the parameter and the stored variables
									const evalScope = {...varScope, [paramName]: argValue};
									result = varScope[funcName].evaluate(evalScope);
									const solution = document.createElement('div');
									solution.className = 'solve-result';
									solution.innerHTML = `<strong>${funcName}(${formatValue(argValue)}) =</strong> ${formatValue(result)}`;
									resultsContainer.appendChild(solution);
									return;
								} catch (e) {
								}
							}
						}
					}
					
					// Try to evaluate (in case it uses stored variables)
					result = math.evaluate(mathExpr, persistentVars ? varScope : {});
					const solution = document.createElement('div');
					solution.className = 'solve-result';
					if (typeof result === 'number') {
						solution.innerHTML = '<strong>Result:</strong> ' + formatValue(result);
					} else {
						// Simplify if not a number
						result = math.simplify(mathExpr);
						solution.innerHTML = '<strong>Simplified:</strong><br>' + katex.renderToString(result.toTex(), {throwOnError: false});
					}
					resultsContainer.appendChild(solution);
				} catch (e) {
					// Fall back to simplification
					result = math.simplify(mathExpr);
					const solution = document.createElement('div');
					solution.className = 'solve-result';
					solution.innerHTML = '<strong>Simplified:</strong><br>' + katex.renderToString(result.toTex(), {throwOnError: false});
					resultsContainer.appendChild(solution);
				}
				
				const hintDiv = document.createElement('div');
				hintDiv.className = 'board-warning';
				hintDiv.style.fontSize = '12px';
				hintDiv.style.marginTop = '8px';
				hintDiv.innerHTML = 'Not what you were expecting? Try setting it to a function or a number!';
				resultsContainer.appendChild(hintDiv);
			}
		} catch (e) {
			resultsContainer.innerHTML = '<div class="solve-error">Cannot solve: ' + e.message + '</div>';
		}
	}
	
	// Solve for a specific variable
	function solveForVariable(variable, simplified, container, options = {}) {
		const showComplex = options.showComplex !== false;
		const uniqueOnly = !!options.uniqueOnly;
		try {
			// First try symbolic linear isolation: f(v)=0 => v = -b/a
			const aNode = math.simplify(math.derivative(simplified, variable));
			const aStr = aNode.toString();
			if (aStr !== '0') {
				const secondNode = math.simplify(math.derivative(aNode, variable));
				if (secondNode.toString() === '0') {
					const bNode = math.simplify(`(${simplified.toString()}) - ((${aStr}) * ${variable})`);
					const solutionNode = math.simplify(`-(${bNode.toString()}) / (${aStr})`);

					const solDiv = document.createElement('div');
					solDiv.className = 'solve-result';
					solDiv.innerHTML = `<strong>${variable} =</strong> ` + katex.renderToString(solutionNode.toTex(), {throwOnError: false});
					container.appendChild(solDiv);
					return true;
				}
			}

			// Next try symbolic quadratic isolation: av^2 + bv + c = 0
			const secondNode = math.simplify(math.derivative(aNode, variable));
			if (secondNode.toString() !== '0') {
				const thirdNode = math.simplify(math.derivative(secondNode, variable));
				if (thirdNode.toString() === '0') {
					const quadA = math.simplify(`(${secondNode.toString()}) / 2`);
					const quadB = math.simplify(`(${aStr}) - (2 * (${quadA.toString()}) * ${variable})`);
					const quadC = math.simplify(`(${simplified.toString()}) - ((${quadA.toString()}) * (${variable}^2)) - ((${quadB.toString()}) * ${variable})`);

					const bHasVar = math.simplify(math.derivative(quadB, variable)).toString() !== '0';
					const cHasVar = math.simplify(math.derivative(quadC, variable)).toString() !== '0';
					if (!bHasVar && !cHasVar && quadA.toString() !== '0') {
						const disc = math.simplify(`(${quadB.toString()})^2 - 4 * (${quadA.toString()}) * (${quadC.toString()})`);
						let discVal = null;
						try {
							discVal = math.evaluate(disc.toString());
						} catch (_) {}
						if (!showComplex && typeof discVal === 'number' && discVal < -1e-12) {
							const solDiv = document.createElement('div');
							solDiv.className = 'solve-result';
							solDiv.innerHTML = `<strong>${variable}:</strong> no real roots`;
							container.appendChild(solDiv);
							return true;
						}
						const den = math.simplify(`2 * (${quadA.toString()})`);
						const root1 = math.simplify(`(-((${quadB.toString()})) + sqrt(${disc.toString()})) / (${den.toString()})`);
						const root2 = math.simplify(`(-((${quadB.toString()})) - sqrt(${disc.toString()})) / (${den.toString()})`);

						const solDiv = document.createElement('div');
						solDiv.className = 'solve-result';

						if (math.simplify(disc).toString() === '0') {
							solDiv.innerHTML = `<strong>${variable} =</strong> ` + katex.renderToString(root1.toTex(), {throwOnError: false});
						} else {
							solDiv.innerHTML = `<strong>${variable}₁ =</strong> ` + katex.renderToString(root1.toTex(), {throwOnError: false}) +
								'<br><strong>' + variable + '₂ =</strong> ' + katex.renderToString(root2.toTex(), {throwOnError: false});
						}

						container.appendChild(solDiv);
						return true;
					}
				}
			}

			// Higher-degree single-variable polynomial solving (numeric roots)
			const allVars = extractVariables(simplified);
			const otherVars = allVars.filter(v => v !== variable);
			if (otherVars.length === 0) {
				const poly = polynomialCoefficientsByDerivatives(simplified, variable, 40);
				if (poly && poly.degree >= 3) {
					const rootsRaw = durandKerner(poly.coeffDesc);
					if (rootsRaw.length) {
						const normalized = rootsRaw.map(r => {
							if (Math.abs(r.im) < 1e-8) return r.re;
							return r;
						});
						let roots = showComplex ? normalized : normalized.filter(r => !(isComplexLike(r) && Math.abs(r.im) >= 1e-8));
						if (uniqueOnly) roots = dedupeRoots(roots, 1e-5);
						const solDiv = document.createElement('div');
						solDiv.className = 'solve-result';
						if (!roots.length) {
							solDiv.innerHTML = `<strong>${variable}:</strong> no real roots`;
							container.appendChild(solDiv);
							return true;
						}
						roots.sort((ra, rb) => {
							const ar = isComplexLike(ra) ? ra.re : Number(ra);
							const ai = isComplexLike(ra) ? ra.im : 0;
							const br = isComplexLike(rb) ? rb.re : Number(rb);
							const bi = isComplexLike(rb) ? rb.im : 0;
							if (Math.abs(ar - br) > 1e-9) return ar - br;
							return ai - bi;
						});
						solDiv.innerHTML = roots.map((r, idx) => `<strong>${variable}${roots.length > 1 ? (idx + 1) : ''} =</strong> ${formatValue(r)}`).join('<br>');
						container.appendChild(solDiv);
						return true;
					}
				}

				// Numeric iteration fallback for non-polynomial / high-degree hard cases
				const newtonRoots = findRealRootsByNewton(simplified, variable);
				if (newtonRoots.length) {
					const roots = uniqueOnly ? dedupeRoots(newtonRoots, 1e-5) : newtonRoots;
					const solDiv = document.createElement('div');
					solDiv.className = 'solve-result';
					solDiv.innerHTML = roots.map((r, idx) => `<strong>${variable}${roots.length > 1 ? (idx + 1) : ''} ≈</strong> ${formatValue(r)}`).join('<br>');
					container.appendChild(solDiv);
					return true;
				}
			}

			// Fallback: use math.solve if available
			if (typeof math.solve === 'function') {
				try {
					const solutions = math.solve(simplified, variable);
					if (solutions && solutions.length > 0) {
						const solDiv = document.createElement('div');
						solDiv.className = 'solve-result';
						let vals = solutions.map((sol) => {
							const val = typeof sol.evaluate === 'function' ? sol.evaluate() : sol;
							return val;
						});
						// Verify these are actual solutions
						const verified = vals.filter(v => {
							try {
								const result = math.evaluate(simplified.toString(), {[variable]: v});
								const absResult = isComplexLike(v) ? Math.sqrt(result.re * result.re + result.im * result.im) : Math.abs(result);
								return absResult < 1e-6;
							} catch(_) {
								return false; // verification failed
							}
						});
						
						if (verified.length > 0) {
							vals = verified;
						}
						
						if (!showComplex) vals = vals.filter(val => !(isComplexLike(val) && Math.abs(val.im) >= 1e-8));
						if (uniqueOnly) vals = dedupeRoots(vals, 1e-5);
						const solTexts = vals.map((val, idx) => vals.length === 1
							? `<strong>${variable} =</strong> ${formatValue(val)}`
							: `<strong>${variable}${idx+1} =</strong> ${formatValue(val)}`);
						if (!solTexts.length) {
							solDiv.innerHTML = `<strong>${variable}:</strong> no real roots`;
						} else {
							solDiv.innerHTML = solTexts.join('<br>');
						}
						container.appendChild(solDiv);
						return true;
					}
				} catch (e) {
					// math.solve failed, continue to Newton's method
				}
			}

			return false;
		} catch(e) {
			// Silently fail for this variable
			return false;
		}
	}
	
	// Helper function to format numbers
	function format(num) {
		if (!Number.isFinite(num)) return num.toString();
		// Remove trailing zeros and decimal point if not needed
		return num.toFixed(6).replace(/\.?0+$/, '');
	}

	function formatValue(val) {
		if (typeof val === 'number') return format(val);
		if (val && typeof val === 'object' && typeof val.re === 'number' && typeof val.im === 'number') {
			if (Math.abs(val.im) < 1e-10) return format(val.re);
			const sign = val.im >= 0 ? '+' : '-';
			return `${format(val.re)} ${sign} ${format(Math.abs(val.im))}i`;
		}
		return String(val);
	}
	
	// Update graph window content
	function updateGraphWindow() {
		if (!el._graphWindow || !document.body.contains(el._graphWindow)) return;
		
		const content = el._graphWindow.querySelector('.content');
		if (!content) return;
		
		content.innerHTML = '';
		const showComplex = el._graphShowComplex !== false;
		
		const filterRow = document.createElement('div');
		filterRow.className = 'solve-result';
		filterRow.style.marginBottom = '8px';
		filterRow.innerHTML =
			'<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
			'<label style="display:flex;align-items:center;gap:8px;font-weight:600;"><input data-filter="complex" type="checkbox" ' + (showComplex ? 'checked' : '') + '> Graph complex</label>' +
			'</div>';
		content.appendChild(filterRow);
		const complexToggle = filterRow.querySelector('input[data-filter="complex"]');
		complexToggle.addEventListener('change', () => {
			el._graphShowComplex = complexToggle.checked;
			updateGraphWindow();
		});
		
		const noteDiv = document.createElement('div');
		noteDiv.className = 'board-warning';
		noteDiv.style.fontSize = '12px';
		noteDiv.style.marginBottom = '8px';
		noteDiv.innerHTML = 'Note: For more advanced graphing, use <a href="https://www.desmos.com/calculator" target="_blank" style="color:#0066cc;">Desmos</a>';
		content.appendChild(noteDiv);
		
		const latex = mqField.latex();
		if (!latex || latex.trim() === '') {
			const resultsContainer = document.createElement('div');
			resultsContainer.innerHTML = '<div class="solve-result">Enter an equation...</div>';
			content.appendChild(resultsContainer);
			return;
		}
		
		const graphDiv = document.createElement('div');
		graphDiv.className = 'graph-container';
		graphDiv.style.width = '100%';
		graphDiv.style.height = '100%';
		content.appendChild(graphDiv);
		
		let mathExpr = latexToMathJS(latex);
		
		// Handle equations - try to solve and plot roots
		if (mathExpr.includes('=')) {
			const parts = mathExpr.split('=');
			const leftSide = parts[0].trim();
			const rightSide = parts[1].trim();
			
			// Check if left side is function notation like f(x), g(x), y, etc.
			if (/^[a-zA-Z]\(x\)$/.test(leftSide) || leftSide === 'y') {
				// Function notation: f(x) = x^2 or y = x^2
				// Just graph the right side as a regular function
				mathExpr = rightSide;
			}
			// Check if left side is just 'x' (like x = 5) - show as vertical line
			else if (leftSide === 'x') {
				try {
					const xValue = math.evaluate(rightSide);
					// Graph vertical line at x = xValue
					functionPlot({
						target: graphDiv,
						width: 420,
						height: 290,
						disableZoom: false,
						xAxis: {domain: [xValue - 5, xValue + 5]},
						yAxis: {domain: [-10, 10]},
						data: [{
							points: [[xValue, -1000], [xValue, 1000]],
							fnType: 'points',
							graphType: 'polyline',
							attr: { stroke: 'blue', 'stroke-width': 2 }
						}]
					});
					return;
				} catch(e) {
					content.innerHTML = '<div class="solve-error">Cannot evaluate: ' + e.message + '</div>';
					return;
				}
			}
			// If right side is just 'x', swap them
			else if (rightSide === 'x') {
				mathExpr = leftSide;
			} else {
				// Try to solve the equation and plot roots
				// Determine which side to graph (prefer the non-constant side)
				let equation, displayLeftSide, displayRightSide;
				
				// Check if left side is just a constant
				try {
					const leftValue = math.evaluate(leftSide);
					if (typeof leftValue === 'number') {
						// Left is constant, graph right side
						if (leftValue === 0) {
							equation = rightSide;
							displayLeftSide = rightSide;
							displayRightSide = '0';
						} else {
							equation = `(${rightSide}) - (${leftValue})`;
							displayLeftSide = rightSide;
							displayRightSide = String(leftValue);
						}
					} else {
						// Left is not constant, use normal logic
						equation = `(${leftSide}) - (${rightSide})`;
						displayLeftSide = leftSide;
						displayRightSide = rightSide;
					}
				} catch(e) {
					// Left is not a simple constant, use normal logic
					equation = `(${leftSide}) - (${rightSide})`;
					displayLeftSide = leftSide;
					displayRightSide = rightSide;
				}
				
				try {
					const simplified = math.simplify(equation);
					const variables = extractVariables(simplified);
					
					if (variables.length === 1) {
						const variable = variables[0];
						const allVars = extractVariables(simplified);
						const otherVars = allVars.filter(v => v !== variable);
						
						if (otherVars.length === 0) {
							let roots = [];
							
							// Try polynomial solver first
							const poly = polynomialCoefficientsByDerivatives(simplified, variable, 40);
							
							if (poly && poly.degree >= 1) {
								if (poly.degree === 1) {
									// Linear equation: solve directly
									const a = poly.coeffDesc[0];
									const b = poly.coeffDesc[1];
									if (Math.abs(a) > 1e-10) {
										roots = [{ re: -b / a, im: 0 }];
									}
								} else if (poly.degree === 2) {
									// Quadratic: use quadratic formula
									const a = poly.coeffDesc[0];
									const b = poly.coeffDesc[1];
									const c = poly.coeffDesc[2];
									const disc = b * b - 4 * a * c;
									if (disc >= 0) {
										roots = [
											{ re: (-b + Math.sqrt(disc)) / (2 * a), im: 0 },
											{ re: (-b - Math.sqrt(disc)) / (2 * a), im: 0 }
										];
									} else {
										const realPart = -b / (2 * a);
										const imagPart = Math.sqrt(-disc) / (2 * a);
										roots = [
											{ re: realPart, im: imagPart },
											{ re: realPart, im: -imagPart }
										];
									}
								} else {
									// Higher degree: check for pure power first (like x^3, x^5)
									// Check if constant term is essentially zero (x^n = 0)
									const constantTerm = Math.abs(poly.coeffDesc[poly.coeffDesc.length - 1]);
									
									if (constantTerm < 1e-8) {
										// For x^n = 0, the only root is x = 0 (with multiplicity n)
										roots = [{ re: 0, im: 0 }];
									} else {
										// Use Durand-Kerner
										const rootsRaw = durandKerner(poly.coeffDesc);
										if (rootsRaw && rootsRaw.length > 0) {
											roots = rootsRaw.map(r => {
												if (!r || typeof r !== 'object') return { re: Number(r) || 0, im: 0 };
												if (Math.abs(r.im) < 1e-8) return { re: r.re, im: 0 };
												return r;
											}).filter(r => {
												// Verify the root actually satisfies the polynomial
												const val = evalPolyComplex(poly.coeffDesc.map(c => c / poly.coeffDesc[0]), r);
												const absVal = Math.sqrt(val.re * val.re + val.im * val.im);
												return absVal < 1e-4; // tolerance for validation
											});
										}
									}
								}
							}
							
							// If polynomial method failed, try Newton's method for real roots
							if (roots.length === 0 && !showComplex) {
								const newtonRoots = findRealRootsByNewton(simplified, variable);
								roots = newtonRoots.map(r => ({ re: Number(r), im: 0 }));
							}
							
							// Deduplicate roots
							if (roots.length > 0) {
								roots = dedupeRoots(roots, 1e-5);
								
								if (showComplex) {
									// Complex mode: show all roots in complex plane
									const points = roots.map(r => [r.re, r.im]);
									
									// Calculate appropriate domain based on roots
									const reals = roots.map(r => r.re);
									const imags = roots.map(r => r.im);
									const minRe = Math.min(...reals, -2);
									const maxRe = Math.max(...reals, 2);
									const minIm = Math.min(...imags, -2);
									const maxIm = Math.max(...imags, 2);
									const rangeRe = maxRe - minRe;
									const rangeIm = maxIm - minIm;
									const paddingRe = rangeRe * 0.2 || 1;
									const paddingIm = rangeIm * 0.2 || 1;
									
									functionPlot({
										target: graphDiv,
										width: 420,
										height: 290,
										disableZoom: false,
										xAxis: {domain: [minRe - paddingRe, maxRe + paddingRe], label: 'Real'},
										yAxis: {domain: [minIm - paddingIm, maxIm + paddingIm], label: 'Imaginary'},
										data: [{
											points: points,
											fnType: 'points',
											graphType: 'scatter',
											attr: { stroke: 'blue', fill: 'blue', 'stroke-width': 2, r: 5 }
										}]
									});
									return;
								} else {
									// Real mode: show roots as vertical lines (x = value)
									const realRoots = roots.filter(r => Math.abs(r.im) < 1e-8);
									if (realRoots.length > 0) {
										// Calculate appropriate domain
										const reals = realRoots.map(r => r.re);
										const minRe = Math.min(...reals, -2);
										const maxRe = Math.max(...reals, 2);
										const rangeRe = maxRe - minRe;
										const paddingRe = rangeRe * 0.2 || 1;
										
										// Create vertical lines for each root
										const lineData = realRoots.map(root => ({
											points: [[root.re, -1000], [root.re, 1000]],
											fnType: 'points',
											graphType: 'polyline',
											attr: { stroke: 'blue', 'stroke-width': 2 }
										}));
										
										functionPlot({
											target: graphDiv,
											width: 420,
											height: 290,
											disableZoom: false,
											xAxis: {domain: [minRe - paddingRe, maxRe + paddingRe]},
											yAxis: {domain: [-10, 10]},
											data: lineData
										});
										return;
									}
								}
							}
						}
					}
				} catch (e) {
					console.error('Root solving error:', e);
				}
				
				mathExpr = equation;
			}
		}
		
		try {
			const fn = math.parse(mathExpr).compile();
			
			functionPlot({
				target: graphDiv,
				width: 420,
				height: 290,
				disableZoom: false,
				xAxis: {domain: [-10, 10]},
				yAxis: {domain: [-10, 10]},
				data: [{
					fn: function(scope) {
						try {
							return fn.evaluate({x: scope.x});
						} catch(e) {
							return NaN;
						}
					},
					graphType: 'polyline'
				}]
			});
		} catch (e) {
			content.innerHTML = '<div class="solve-error">Cannot graph: ' + e.message + '</div>';
		}
	}
	
	solveBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleSolveWindow();
	});
	
	graphBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleGraphWindow();
	});

	function finish(ev){
		if(ev && ev.type === 'pointerdown' && el.contains(ev.target)) return;
		if(ev && ev.type === 'pointerdown' && Date.now() - startTime < 150) return;

		const final = mqField.latex();
		el._draggingDisabled = wasDragging;
		el.classList.remove('editing');
		el.classList.remove('selected');
		el.innerHTML = '';

		if(final.trim() === ''){ 
			const id = el.dataset.id;
			selectedIds.delete(id);
			const x = parseInt(el.style.left||0,10);
			const y = parseInt(el.style.top||0,10);
			const z = el.style.zIndex;
			pushAction({ type: 'delete', id: id, state: { id: id, latex: prevLatex, x: x, y: y, z: z } });
			removeAuxiliaryWindows(el);
			el.remove(); 
		}
		else{
			const content = document.createElement('div');
			content.className = 'latex-content';
			try{ content.innerHTML = katex.renderToString(final, {throwOnError:false}); }
			catch(e){ content.textContent = ''; }
			el.appendChild(content);

			el.dataset.latex = final;
			if(final !== prevLatex){
				pushAction({ type: 'edit', id: el.dataset.id, from: prevLatex, to: final });
			}
		}
		document.removeEventListener('pointerdown', finish);
		window.removeEventListener('keydown', onKey);
	}

	function finishAndCreateNew(){
		const final = mqField.latex();
		el._draggingDisabled = wasDragging;
		el.classList.remove('editing');
		el.classList.remove('selected');
		el.innerHTML = '';
		
		if(final.trim() !== ''){
			const content = document.createElement('div');
			content.className = 'latex-content';
			try{ content.innerHTML = katex.renderToString(final, {throwOnError:false}); }
			catch(e){ content.textContent = ''; }
			el.appendChild(content);

			el.dataset.latex = final;
			if(final !== prevLatex){
				pushAction({ type: 'edit', id: el.dataset.id, from: prevLatex, to: final });
			}
		} else {
			// Remove empty items completely
			const id = el.dataset.id;
			selectedIds.delete(id);
			const x = parseInt(el.style.left||0,10);
			const y = parseInt(el.style.top||0,10);
			const z = el.style.zIndex;
			if(prevLatex){
				pushAction({ type: 'delete', id: id, state: { id: id, latex: prevLatex, x: x, y: y, z: z } });
			}
			removeAuxiliaryWindows(el);
			el.remove();
		}

		document.removeEventListener('pointerdown', finish);
		window.removeEventListener('keydown', onKey);

		// Create new expression below
		const currentY = parseInt(el.style.top||0,10);
		const newY = currentY + 60;
		const currentX = parseInt(el.style.left||0,10);
		const newEl = createLatexItem('', currentX, newY);
		openLatexEditorLive(newEl, '');
	}

	function onKey(e){
		if(e.key === 'Escape') finish();
	}

	// Now create and configure the MathQuill field
	mqField = MQ.MathField(mathField, {
		spaceBehavesLikeTab: false,
		leftRightIntoCmdGoes: 'up',
		restrictMismatchedBrackets: true,
		sumStartsWithNEquals: true,
		supSubsRequireOperand: false,
		charsThatBreakOutOfSupSub: '+-=<>',
		autoSubscriptNumerals: false,
		autoCommands: 'pi theta sqrt sum prod int',
		autoOperatorNames: 'sin cos tan',
		handlers: {
			enter: function() {
				finishAndCreateNew();
			},
			escape: function() {
				finish();
			},
			edit: function() {
				// Real-time updates
				if (el._solveWindow && el._solveWindow.style.display !== 'none') {
					updateSolveWindow();
				}
				if (el._graphWindow && el._graphWindow.style.display !== 'none') {
					updateGraphWindow();
				}
			}
		}
	});

	mqField.latex(current);
	mqField.focus();

	setTimeout(()=> document.addEventListener('pointerdown', finish), 120);
	window.addEventListener('keydown', onKey);
}

function createResultWindow(x, y, w, h, title, parentEl) {
	const win = document.createElement('div');
	win.className = 'win';
	win.style.left = x + 'px';
	win.style.top = y + 'px';
	win.style.width = w + 'px';
	win.style.height = h + 'px';
	win.style.zIndex = ++zCounter;
	win._parentElement = parentEl; // Store reference to parent element

	const titleBar = document.createElement('div');
	titleBar.className = 'titlebar no-select';
	const titleText = document.createElement('div');
	titleText.className = 'title';
	titleText.textContent = title;
	const closeBtn = document.createElement('button');
	closeBtn.textContent = '✕';
	closeBtn.className = 'control-btn';

	titleBar.appendChild(titleText);
	titleBar.appendChild(closeBtn);

	const content = document.createElement('div');
	content.className = 'content';
	content.style.overflow = 'auto';
	content.style.padding = '8px';

	win.appendChild(titleBar);
	win.appendChild(content);
	board.appendChild(win);

	makeWindowDraggable(win, titleBar);

	closeBtn.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); });
	closeBtn.addEventListener('pointerup', (e)=>{ 
		e.stopPropagation(); 
		win.style.display = 'none';
		// Update parent button state
		if (parentEl._solveWindow === win) {
			const solveBtn = parentEl.querySelector('.eq-control-btn');
			if (solveBtn && solveBtn.textContent === 'Solve') {
				solveBtn.classList.remove('active');
			}
		}
		if (parentEl._graphWindow === win) {
			const buttons = parentEl.querySelectorAll('.eq-control-btn');
			buttons.forEach(btn => {
				if (btn.textContent === 'Graph') {
					btn.classList.remove('active');
				}
			});
		}
	});

	// Prevent scrolling background when scrolling inside window
	content.addEventListener('wheel', (e) => {
		e.stopPropagation();
	}, { passive: false });

	win.addEventListener('mousedown', ()=> win.style.zIndex = ++zCounter);

	return win;
}

function createDesmosWindow(x,y,w=800,h=500, src='https://www.desmos.com/calculator'){
	const win = document.createElement('div');
	win.className = 'win';
	win.style.left = x + 'px';
	win.style.top = y + 'px';
	win.style.width = w + 'px';
	win.style.height = h + 'px';
	win.style.zIndex = ++zCounter;

	const title = document.createElement('div');
	title.className = 'titlebar no-select';
	const titleText = document.createElement('div');
	titleText.className = 'title';
	titleText.textContent = 'Desmos';
	const closeBtn = document.createElement('button');
	closeBtn.textContent = '✕';
	closeBtn.className = 'control-btn';

	title.appendChild(titleText);
	title.appendChild(closeBtn);

	const content = document.createElement('div');
	content.className = 'content';
	const iframe = document.createElement('iframe');
	iframe.src = src || 'https://www.desmos.com/calculator';
	iframe.allowFullscreen = true;
	content.appendChild(iframe);

	win.appendChild(title);
	win.appendChild(content);
	board.appendChild(win);

	makeWindowDraggable(win, title);

	closeBtn.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); });
	closeBtn.addEventListener('pointerup', (e)=>{ e.stopPropagation(); win.remove(); });

	win.addEventListener('mousedown', ()=> win.style.zIndex = ++zCounter);

	return win;
}

let panning = false;
let potentialPan = false;
let panStart = {x:0,y:0,scrollLeft:0,scrollTop:0};
let panStartTime = 0;
const PAN_THRESHOLD = 6; 

const PAN_TIME = 120; 

boardContainer.addEventListener('pointerdown', (e)=>{

	if(e.shiftKey && !e.target.closest('.latex-item') && !e.target.closest('.win') && e.button === 0){
		selecting = true;
		const rect = board.getBoundingClientRect();
		selectionStart.x = e.clientX - rect.left;
		selectionStart.y = e.clientY - rect.top;
		selectionRectEl = document.createElement('div');
		selectionRectEl.className = 'selection-rect';
		selectionRectEl.style.left = selectionStart.x + 'px';
		selectionRectEl.style.top = selectionStart.y + 'px';
		selectionRectEl.style.width = '0px';
		selectionRectEl.style.height = '0px';
		board.appendChild(selectionRectEl);
		try{ boardContainer.setPointerCapture(e.pointerId); panStart.pointerId = e.pointerId; }catch(_){ }
		return;
	}

	if(e.target.closest('.latex-item') || e.target.closest('.win')) return;

	if(e.button === 1 || spacePressed){
		panning = true;
	} else if(e.button === 0){
		potentialPan = true;
	} else return;

	panStart.x = e.clientX;
	panStart.y = e.clientY;
	panStart.scrollLeft = boardContainer.scrollLeft;
	panStart.scrollTop = boardContainer.scrollTop;
	panStart.pointerId = e.pointerId;
	panStartTime = Date.now();
	boardContainer.style.cursor = 'grabbing';

	if(panning){
		try{ boardContainer.setPointerCapture(e.pointerId); e.preventDefault(); }catch(_){}}
});

window.addEventListener('pointermove', (e)=>{

	if(selecting){
		const rect = board.getBoundingClientRect();
		const cx = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		const cy = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
		const left = Math.min(selectionStart.x, cx);
		const top = Math.min(selectionStart.y, cy);
		const w = Math.abs(cx - selectionStart.x);
		const h = Math.abs(cy - selectionStart.y);
		if(selectionRectEl){ selectionRectEl.style.left = left + 'px'; selectionRectEl.style.top = top + 'px'; selectionRectEl.style.width = w + 'px'; selectionRectEl.style.height = h + 'px'; }
		selectElementsInRect({ left, top, width: w, height: h });
		return;
	}
	if(potentialPan && !panning){
		const dx = e.clientX - panStart.x;
		const dy = e.clientY - panStart.y;
		const held = Date.now() - panStartTime;
		if(Math.hypot(dx,dy) > PAN_THRESHOLD && held > PAN_TIME){
			panning = true; potentialPan = false;

			try{ boardContainer.setPointerCapture(panStart.pointerId); }catch(_){}
		}
	}

	if(!panning) return;
	const dx = e.clientX - panStart.x;
	const dy = e.clientY - panStart.y;
	boardContainer.scrollLeft = panStart.scrollLeft - dx;
	boardContainer.scrollTop = panStart.scrollTop - dy;

	const px = -Math.round(boardContainer.scrollLeft * 0.25);
	const py = -Math.round(boardContainer.scrollTop * 0.25);
	board.style.backgroundPosition = `${px}px ${py}px`;
});

window.addEventListener('pointerup', (e)=>{
	if(selecting){

		selecting = false;
		if(selectionRectEl){ selectionRectEl.remove(); selectionRectEl = null; }
		try{ if(panStart && panStart.pointerId) boardContainer.releasePointerCapture(panStart.pointerId); }catch(_){}
		return;
	}
	if(panning || potentialPan){
		panning = false; potentialPan = false; boardContainer.style.cursor = ''; 

		try{ if(panStart && panStart.pointerId) boardContainer.releasePointerCapture(panStart.pointerId); }catch(_){}
	}
});

boardContainer.addEventListener('scroll', ()=>{
	const px = -Math.round(boardContainer.scrollLeft * 0.25);
	const py = -Math.round(boardContainer.scrollTop * 0.25);
	board.style.backgroundPosition = `${px}px ${py}px`;
});

window.addEventListener('keydown', (e)=>{ if(e.code === 'Space') spacePressed = true; });
window.addEventListener('keyup', (e)=>{ if(e.code === 'Space') spacePressed = false; });

window.addEventListener('keydown', (e)=>{
	if((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'z'){
		e.preventDefault(); undo();
	}
	if((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'y'){
		e.preventDefault(); redo();
	}
});

function makeDraggable(el){
	let startX, startY, origX, origY, dragging=false;
	let isGroupDrag = false;
	let groupOrig = null; 

	el.addEventListener('pointerdown', (e)=>{
		if(e.button !== 0) return;
		if(el._draggingDisabled) return;
		dragging = true;
		el.setPointerCapture(e.pointerId);
		startX = e.clientX;
		startY = e.clientY;
		origX = parseInt(el.style.left || 0,10);
		origY = parseInt(el.style.top || 0,10);
		el.style.zIndex = ++zCounter;

		isGroupDrag = selectedIds.has(el.dataset.id);
		if(isGroupDrag){
			groupOrig = {};
			selectedIds.forEach(id=>{
				const node = findById(id);
				if(node){ groupOrig[id] = { x: parseInt(node.style.left||0,10), y: parseInt(node.style.top||0,10) }; }
			});
		}
	});

	window.addEventListener('pointermove', (e)=>{
		if(!dragging) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if(isGroupDrag && groupOrig){

			selectedIds.forEach(id=>{
				const node = findById(id);
				if(!node) return;
				let nx = groupOrig[id].x + dx;
				let ny = groupOrig[id].y + dy;
				if(snapToGrid){ nx = Math.round(nx / gridSize) * gridSize; ny = Math.round(ny / gridSize) * gridSize; }
				node.style.left = nx + 'px';
				node.style.top = ny + 'px';
			});
		} else {
			let nx = origX + dx;
			let ny = origY + dy;
			if(snapToGrid){ nx = Math.round(nx / gridSize) * gridSize; ny = Math.round(ny / gridSize) * gridSize; }
			el.style.left = nx + 'px';
			el.style.top = ny + 'px';
		}
	});

	window.addEventListener('pointerup', (e)=>{
		if(!dragging) return;
		dragging = false;

		if(isGroupDrag && groupOrig){
			selectedIds.forEach(id=>{
				const node = findById(id);
				if(!node) return;
				const newX = parseInt(node.style.left || 0,10);
				const newY = parseInt(node.style.top || 0,10);
				const from = groupOrig[id];
				if(from && (from.x !== newX || from.y !== newY)){
					pushAction({ type: 'move', id: id, from: { x: from.x, y: from.y }, to: { x: newX, y: newY } });
				}
			});
			groupOrig = null; isGroupDrag = false;
		} else {

			const newX = parseInt(el.style.left || 0,10);
			const newY = parseInt(el.style.top || 0,10);
			if(origX !== newX || origY !== newY){
				pushAction({ type: 'move', id: el.dataset.id, from: { x: origX, y: origY }, to: { x: newX, y: newY } });
			}
		}
	});
}

function makeWindowDraggable(win, handle){
	let startX, startY, origX, origY, dragging=false;

	handle.addEventListener('pointerdown', (e)=>{
		if(e.button !== 0) return;
		dragging = true;
		handle.setPointerCapture(e.pointerId);
		startX = e.clientX;
		startY = e.clientY;
		origX = parseInt(win.style.left || 0,10);
		origY = parseInt(win.style.top || 0,10);
		win.style.zIndex = ++zCounter;
	});

	window.addEventListener('pointermove', (e)=>{
		if(!dragging) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		win.style.left = (origX + dx) + 'px';
		win.style.top = (origY + dy) + 'px';
	});

	window.addEventListener('pointerup', ()=> dragging = false);
}

function centerOfView(){

	const cx = boardContainer.scrollLeft + (boardContainer.clientWidth / 2);
	const cy = boardContainer.scrollTop + (boardContainer.clientHeight / 2);

	const x = cx - (board.offsetLeft || 0);
	const y = cy - (board.offsetTop || 0);
	return {x, y};
}

openDesmosBtn.addEventListener('click', ()=>{

	const w = 800, h = 500;
	const cx = boardContainer.scrollLeft + (boardContainer.clientWidth / 2);
	const cy = boardContainer.scrollTop + (boardContainer.clientHeight / 2);
	const left = Math.max(10, cx - (w/2) - (board.offsetLeft || 0));
	const top = Math.max(10, cy - (h/2) - (board.offsetTop || 0));
	createDesmosWindow(left, top, w, h);
});

ensureGridOverlay();
setGridVisible(showGrid);

board.addEventListener('dblclick', (e)=>{
	const rect = board.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	const el = createLatexItem('', x, y);
	openLatexEditorLive(el, '');
});

board.addEventListener('pointerdown', (e)=>{
	if(e.target === board && !e.shiftKey){ clearSelection(); }
});

;(function expandBoard(){
	board.style.width = '20000px';
	board.style.height = '20000px';

	setTimeout(()=>{
		boardContainer.scrollLeft = (board.clientWidth - boardContainer.clientWidth)/2;
		boardContainer.scrollTop = (board.clientHeight - boardContainer.clientHeight)/2;
	},50);
})();

boardContainer.addEventListener('wheel', (e)=>{

	boardContainer.scrollLeft += e.deltaX;
	boardContainer.scrollTop += e.deltaY;
	e.preventDefault();
}, {passive:false});