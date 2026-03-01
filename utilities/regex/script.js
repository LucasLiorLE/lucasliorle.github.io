const patternEl = document.getElementById('pattern');
const flavorEl = document.getElementById('flavor');
const flagsEl = document.getElementById('flags');
const inputText = document.getElementById('inputText');
const matchesEl = document.getElementById('matches');
const highlightedEl = document.getElementById('highlighted');
const replaceEl = document.getElementById('replaceWith');
const errorEl = document.getElementById('error');
const flavorNoteEl = document.getElementById('flavorNote');

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function runTest(){
    matchesEl.innerHTML = '';
    highlightedEl.innerHTML = '';
    errorEl.textContent = '';
    const pat = patternEl.value;
    const flags = getFlags();
    const text = inputText.value || '';
    if(!pat){ highlightedEl.textContent = text; return; }
    let re;
    try{

        const useFlags = flags.includes('g') ? flags : flags + 'g';
        re = new RegExp(pat, useFlags);
    }catch(e){ errorEl.textContent = 'Invalid regex: ' + e.message; return; }

    const matches = [];
    let m;
    while((m = re.exec(text)) !== null){
        matches.push({match: m[0], groups: m.slice(1), index: m.index});
        if(!re.global) break;
        if(m.index === re.lastIndex) re.lastIndex++;
    }

    if(matches.length === 0) matchesEl.textContent = 'No matches';
    else matches.forEach((mi,i)=>{
        const div = document.createElement('div'); div.className='match';
        div.textContent = `${i}: "${mi.match}" @ ${mi.index}` + (mi.groups.length?(' groups: '+JSON.stringify(mi.groups)):'');
        matchesEl.appendChild(div);
    });

    if(matches.length === 0){ highlightedEl.textContent = text; }
    else{
        let out = '';
        let last = 0;
        matches.forEach(mi=>{
            out += escapeHtml(text.slice(last, mi.index));
            out += '<span class="hl">' + escapeHtml(mi.match) + '</span>';
            last = mi.index + mi.match.length;
        });
        out += escapeHtml(text.slice(last));
        highlightedEl.innerHTML = out;
    }

    const rep = replaceEl.value;
    if(rep){
        try{
            const r = new RegExp(pat, flags);
            const replaced = text.replace(r, rep);
            const p = document.createElement('pre'); p.style.marginTop='8px'; p.textContent = 'Replaced:\n' + replaced;
            highlightedEl.appendChild(p);
        }catch(e){  }
    }
}

patternEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') runTest(); });

const flagCheckboxes = Array.from(document.querySelectorAll('.flag-checkbox'));
function availableFlagsForFlavor(fl){
    if(!fl) return ['g','i','m','s','u','y'];
    if(fl === 'js') return ['g','i','m','s','u','y'];
    if(fl === 'pcre') return ['g','i','m','s','u'];
    if(fl === 'python') return ['i','m','s','u'];
    if(fl === 'golang') return ['i','m','s','u'];
    return ['g','i','m','s','u','y'];
}

function getFlags(){ return flagCheckboxes.filter(cb=>cb.checked && !cb.disabled).map(cb=>cb.value).join(''); }

function updateFlagsAvailability(){
    const fl = flavorEl?.value || 'js';
    const allowed = availableFlagsForFlavor(fl);
    flagCheckboxes.forEach(cb=>{
        cb.disabled = !allowed.includes(cb.value);
        if(cb.disabled) cb.checked = false;
    });
    if(flavorNoteEl){
        if(fl === 'js') flavorNoteEl.textContent = 'Using native JavaScript RegExp engine.';
        else flavorNoteEl.textContent = 'Note: running on JavaScript engine. "' + fl + '" is approximated.';
    }
}

function debounce(fn, wait){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); }; }
const autoRun = debounce(runTest, 200);

patternEl.addEventListener('input', autoRun);
flagCheckboxes.forEach(cb=> cb.addEventListener('change', autoRun));
flavorEl?.addEventListener('change', ()=>{ updateFlagsAvailability(); autoRun(); });
inputText.addEventListener('input', autoRun);
replaceEl.addEventListener('input', autoRun);

inputText.value = 'This is a test. test TEST Test.';
patternEl.value = 'test';

flagCheckboxes.forEach(cb=>{ if(cb.value==='g' || cb.value==='i') cb.checked = true; });
updateFlagsAvailability();
runTest();

