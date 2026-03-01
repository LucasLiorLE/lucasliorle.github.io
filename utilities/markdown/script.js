const ta = document.getElementById('mdInput');
const preview = document.getElementById('preview');

function render(){
    const text = ta.value || '';
    try{
        const html = marked.parse(text);
        preview.innerHTML = DOMPurify.sanitize(html);
    }catch(e){ preview.textContent = 'Render error: ' + e.message; }
}

ta.addEventListener('input', render);

ta.value = `# Markdown Preview\n\nType *Markdown* on the left.\n\n- Live preview\n- Sanitized output\n\n[Link example](https://example.com)`;
render();
