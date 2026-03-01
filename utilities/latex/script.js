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

function loadSettings(){
	try{
		const raw = localStorage.getItem(SETTINGS_KEY);
		if(raw){ const s = JSON.parse(raw); snapToGrid = !!s.snap; gridSize = s.gridSize || 40; showGrid = !!s.showGrid; }
	}catch(e){}
}
function saveSettings(){
	try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify({ snap: !!snapToGrid, gridSize: gridSize, showGrid: !!showGrid })); }catch(e){}
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
	board.querySelectorAll('.latex-item').forEach(el=>el.remove());
	board.querySelectorAll('.win').forEach(w=>w.remove());

	undoStack.length = 0; redoStack.length = 0;
	clearSelection();
}

function loadBoardById(id){
	const b = boards.find(x=>x.id===id);
	if(!b) return;
	clearBoard();

	(b.state.items||[]).forEach(s=> recreateLatexFromState(s) );
	(b.state.wins||[]).forEach(w=> createDesmosWindow(w.x, w.y, w.w, w.h, w.src));
	currentBoardId = id;
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
		currentBoardId = newId;
	}
	saveBoardsToStorage();
	renderBoardsSidebar();
}

function deleteBoardById(id){
	const idx = boards.findIndex(b=>b.id===id);
	if(idx>=0){ boards.splice(idx,1); saveBoardsToStorage(); renderBoardsSidebar(); if(currentBoardId===id){ currentBoardId = null; } }
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
	warning.textContent = 'Note: Desmos graphs do not save.';
	boardsSidebar.appendChild(warning);

	newBtn.addEventListener('click', ()=>{
		const name = prompt('Name for new board?','Untitled Board');
		if(!name) return;
		if(!confirm('Create new board "' + name + '"? This will clear the current board.')) return;
		clearBoard();
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
		if(el) el.remove();
	}else if(t === 'move'){
		const el = findById(action.id);
		if(el){ el.style.left = action.to.x + 'px'; el.style.top = action.to.y + 'px'; }
	}else if(t === 'edit'){
		const el = findById(action.id);
		if(el){

			if(!action.to || String(action.to).trim() === ''){ el.remove(); }
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
		if(el) el.remove();
	}else if(t === 'delete'){

		recreateLatexFromState(action.state);
	}else if(t === 'move'){
		const el = findById(action.id);
		if(el){ el.style.left = action.from.x + 'px'; el.style.top = action.from.y + 'px'; }
	}else if(t === 'edit'){
		const el = findById(action.id);
		if(el){

			if(!action.from || String(action.from).trim() === ''){ el.remove(); }
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
		content.textContent = latex;
	}

	el.dataset.latex = latex || '';
	el.appendChild(content);
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

function openLatexEditorLive(el, initial, clickClientX){
	const current = initial || '';
	const prevLatex = el.dataset.latex || '';

	el.classList.add('editing');
	el.innerHTML = '';
	const preview = document.createElement('div');
	preview.className = 'preview-overlay';
	const ta = document.createElement('textarea');
	ta.className = 'editor-overlay';
	ta.value = current;

	ta.style.fontSize = '16px';
	ta.style.lineHeight = '1.2';
	preview.style.fontSize = '16px';

	el.style.position = 'absolute';
	el.appendChild(preview);
	el.appendChild(ta);

	ta.addEventListener('keydown', (ev)=>{
		if(ev.key === 'Escape'){
			ev.preventDefault(); finish();
			return;
		}
		if(ev.key === 'Enter'){
			if(ev.ctrlKey || ev.metaKey){ ev.preventDefault(); finish(); return; }

			ev.preventDefault();
			const start = ta.selectionStart;
			const end = ta.selectionEnd;
			const insert = '\\' ? ('\\' + 'newline') : ('\\newline');

			const backslash = '\\';
			const literal = backslash + 'newline';
			ta.value = ta.value.slice(0,start) + literal + ta.value.slice(end);
			ta.selectionStart = ta.selectionEnd = start + literal.length;
			update();
			return;
		}
		ev.stopPropagation();
	});

	function update(){
		const val = ta.value;
		try{

			preview.innerHTML = katex.renderToString(val, {throwOnError:true});
		}catch(e){
			preview.textContent = val;
		}
	}

	ta.addEventListener('input', update);
	update();

	const wasDragging = el._draggingDisabled;
	el._draggingDisabled = true;

	function finish(ev){
		if(ev && ev.type === 'pointerdown' && el.contains(ev.target)) return;

		if(ev && ev.type === 'pointerdown' && Date.now() - startTime < 150) return;
		const final = ta.value;
		el._draggingDisabled = wasDragging;
		el.classList.remove('editing');
		el.innerHTML = '';

		if(final.trim() === ''){ 

			const id = el.dataset.id;
			const x = parseInt(el.style.left||0,10);
			const y = parseInt(el.style.top||0,10);
			const z = el.style.zIndex;
			pushAction({ type: 'delete', id: id, state: { id: id, latex: prevLatex, x: x, y: y, z: z } });
			el.remove(); 
		}
		else{
			const content = document.createElement('div');
			content.className = 'latex-content';
			try{ content.innerHTML = katex.renderToString(final, {throwOnError:false}); }
			catch(e){ content.textContent = final; }
			el.appendChild(content);

			el.dataset.latex = final;
			if(final !== prevLatex){
				pushAction({ type: 'edit', id: el.dataset.id, from: prevLatex, to: final });
			}
		}
		document.removeEventListener('pointerdown', finish);
		window.removeEventListener('keydown', onKey);
	}

	function onKey(e){
		if(e.key === 'Escape') finish();
		if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) finish();
	}

	const startTime = Date.now();
	setTimeout(()=> document.addEventListener('pointerdown', finish), 120);
	window.addEventListener('keydown', onKey);

	function placeCaretFromClick(){
		if(typeof clickClientX === 'undefined'){
			ta.selectionStart = ta.selectionEnd = ta.value.length;
			return;
		}

		const rect = el.getBoundingClientRect();
		const relX = clickClientX - rect.left - 6; 

		const mirror = document.createElement('div');
		const taStyle = window.getComputedStyle(ta);
		mirror.style.position = 'absolute';
		mirror.style.left = '-9999px';
		mirror.style.top = '0';
		mirror.style.visibility = 'hidden';
		mirror.style.whiteSpace = 'pre';
		mirror.style.font = taStyle.font;
		mirror.style.fontSize = taStyle.fontSize;
		mirror.style.lineHeight = taStyle.lineHeight;
		mirror.style.padding = taStyle.padding;
		document.body.appendChild(mirror);

		const text = ta.value || '';
		let idx = text.length;

		for(let i=0;i<=text.length;i++){
			mirror.textContent = text.slice(0,i) || '\u200B';
			const w = mirror.getBoundingClientRect().width;
			if(w >= relX){ idx = i; break; }
		}
		document.body.removeChild(mirror);
		ta.selectionStart = ta.selectionEnd = idx;
	}

	setTimeout(()=>{ ta.focus(); placeCaretFromClick(); }, 0);
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