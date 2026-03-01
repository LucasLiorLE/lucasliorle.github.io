const ta = document.getElementById('jsonInput');
const treeEl = document.getElementById('tree');
const nodePanel = document.getElementById('nodePanel');
const statusEl = document.getElementById('status');
const formatBtn = document.getElementById('formatBtn');
const applyBtn = document.getElementById('applyBtn');

let rootObj = {};
let currentPath = [];

function setStatus(msg, err=false){ statusEl.textContent = msg; statusEl.style.color = err ? '#b00020' : '#666'; }

function parseRaw(){
  try{
    const v = JSON.parse(ta.value);
    rootObj = v;
    setStatus('JSON parsed');
    buildTree();
    renderNode([]);
  }catch(e){
    setStatus('Parse error: ' + e.message, true);
    treeEl.innerHTML = '';
    nodePanel.innerHTML = '';
  }
}

function buildTree(){
  treeEl.innerHTML = '';
  function walk(node, path, container){
    if(node && typeof node === 'object' && !Array.isArray(node)){
      Object.keys(node).forEach(key=>{
        const child = node[key];
        const li = document.createElement('div');
        li.className = 'node ' + (child && typeof child === 'object' ? 'folder' : 'file');
        li.dataset.path = path.concat([key]).join('/');
        const name = document.createElement('span'); name.className='name'; name.textContent = key;
        const meta = document.createElement('span'); meta.className='meta';
        meta.textContent = (child && typeof child === 'object') ? Object.keys(child).length + ' items' : typeof child;
        li.appendChild(name); li.appendChild(meta);
        li.addEventListener('click', ()=>{ renderNode(path.concat([key])); });
        container.appendChild(li);
        if(child && typeof child === 'object' && !Array.isArray(child)){
          const sub = document.createElement('div'); sub.className = 'node-list'; container.appendChild(sub);
          walk(child, path.concat([key]), sub);
        }
      });
    } else if(Array.isArray(node)){

      node.forEach((child, idx)=>{
        const li = document.createElement('div');
        li.className = 'node ' + (child && typeof child === 'object' ? 'folder' : 'file');
        li.dataset.path = path.concat([String(idx)]).join('/');
        const name = document.createElement('span'); name.className='name'; name.textContent = String(idx);
        const meta = document.createElement('span'); meta.className='meta';
        meta.textContent = (child && typeof child === 'object') ? Object.keys(child).length + ' items' : typeof child;
        li.appendChild(name); li.appendChild(meta);
        li.addEventListener('click', ()=>{ renderNode(path.concat([String(idx)])); });
        container.appendChild(li);
        if(child && typeof child === 'object'){
          const sub = document.createElement('div'); sub.className = 'node-list'; container.appendChild(sub);
          walk(child, path.concat([String(idx)]), sub);
        }
      });
    }
  }
  walk(rootObj, [], treeEl);
}

function getAtPath(path){
  let cur = rootObj;
  for(const p of path){
    if(cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setAtPath(path, value){
  if(path.length === 0){ rootObj = value; return; }
  let cur = rootObj;
  for(let i=0;i<path.length-1;i++){
    const k = path[i];
    if(cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[path[path.length-1]] = value;
}

function deleteAtPath(path){
  if(path.length === 0) return;
  let cur = rootObj;
  for(let i=0;i<path.length-1;i++){
    cur = cur[path[i]];
    if(!cur) return;
  }
  delete cur[path[path.length-1]];
}

function renderNode(path){
  currentPath = path.slice();
  const node = getAtPath(path);
  nodePanel.innerHTML = '';
  const title = document.createElement('h4');
  title.textContent = path.length ? path.join('/') : '(root)';
  nodePanel.appendChild(title);

  if(node && typeof node === 'object'){
    const info = document.createElement('div'); info.textContent = Array.isArray(node) ? 'Array — ' + node.length + ' items' : 'Object — ' + Object.keys(node).length + ' keys';
    nodePanel.appendChild(info);

    const addBtn = document.createElement('button'); addBtn.textContent = 'Add child'; addBtn.className='node-action';
    addBtn.addEventListener('click', ()=>{
      const key = prompt('Key name'); if(!key) return;
      const val = prompt('Value (will be parsed as JSON if possible)');
      let parsed = val;
      try{ parsed = JSON.parse(val); }catch(_){ parsed = val; }
      const target = getAtPath(path);
      if(Array.isArray(target)){
        target.push(parsed);
      }else{
        target[key] = parsed;
      }
      ta.value = JSON.stringify(rootObj, null, 2);
      buildTree(); renderNode(path);
    });
    nodePanel.appendChild(addBtn);

    const list = document.createElement('div'); list.className = 'node-list';
    Object.keys(node).forEach(k=>{
      const item = document.createElement('div'); item.className='node file';
      item.textContent = k + ' : ' + (typeof node[k]);
      item.addEventListener('click', ()=> renderNode(path.concat([k])));
      list.appendChild(item);
    });
    nodePanel.appendChild(list);

    const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Delete this (merge up)'; deleteBtn.className='node-action';
    deleteBtn.addEventListener('click', ()=>{
      if(!confirm('Delete this key and its contents?')) return;
      deleteAtPath(path);
      ta.value = JSON.stringify(rootObj, null, 2);
      buildTree(); renderNode([]);
    });
    nodePanel.appendChild(deleteBtn);

  } else {

    const valBox = document.createElement('textarea'); valBox.value = JSON.stringify(node);
    nodePanel.appendChild(valBox);

    const btnWrap = document.createElement('div'); btnWrap.className='node-actions';
    const saveBtn = document.createElement('button'); saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', ()=>{
      const txt = valBox.value;
      let parsed;
      try{ parsed = JSON.parse(txt); }
      catch(e){ parsed = txt; }
      setAtPath(path, parsed);
      ta.value = JSON.stringify(rootObj, null, 2);
      setStatus('Saved');
      buildTree(); renderNode(path.slice(0,-1));
    });
    const delBtn = document.createElement('button'); delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=>{
      if(!confirm('Delete this key?')) return;
      deleteAtPath(path);
      ta.value = JSON.stringify(rootObj, null, 2);
      buildTree(); renderNode([]);
    });
    btnWrap.appendChild(saveBtn); btnWrap.appendChild(delBtn);
    nodePanel.appendChild(btnWrap);
  }
}

function formatAndValidate(){
  try{
    const v = JSON.parse(ta.value);
    ta.value = JSON.stringify(v, null, 2);
    rootObj = v; buildTree(); renderNode([]);
    setStatus('Formatted & valid');
  }catch(e){ setStatus('Invalid JSON: ' + e.message, true); }
}

formatBtn.addEventListener('click', formatAndValidate);
applyBtn.addEventListener('click', ()=>{ try{ rootObj = JSON.parse(ta.value); buildTree(); renderNode([]); setStatus('Applied raw JSON'); }catch(e){ setStatus('Invalid JSON: ' + e.message, true); }});

function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; }
const autoParse = debounce(()=>{ parseRaw(); }, 350);
ta.addEventListener('input', autoParse);

parseRaw();

