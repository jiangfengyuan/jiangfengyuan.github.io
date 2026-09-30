// ==================== 站长投稿工具 ====================
// 从公众号粘贴文章 -> 清洗 -> 预览 -> 下载 posts/<id>.html 并生成 posts.js 元数据行。
(function () {
    const editor = document.getElementById('admin-editor');
    if (!editor) return;

    const titleInput = document.getElementById('admin-title');
    const dateInput = document.getElementById('admin-date');
    const tagsInput = document.getElementById('admin-tags');
    const summaryInput = document.getElementById('admin-summary');
    const htmlInput = document.getElementById('admin-html');
    const loadHtmlBtn = document.getElementById('admin-load-html');
    const previewBtn = document.getElementById('admin-preview');
    const generateBtn = document.getElementById('admin-generate');
    const previewWrap = document.getElementById('admin-preview-wrap');
    const previewContent = document.getElementById('admin-preview-content');
    const outputWrap = document.getElementById('admin-output-wrap');
    const outputArea = document.getElementById('admin-output');
    const copyBtn = document.getElementById('admin-copy');
    const clearOutputBtn = document.getElementById('admin-clear-output');
    const statChars = document.getElementById('admin-stat-chars');
    const statImages = document.getElementById('admin-stat-images');

    const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD

    // 默认日期：今天
    dateInput.value = today();

    // 与 blog.js 相同的清洗逻辑：去 script、修复 data-src 图片与防盗链
    function normalizeHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '');
        div.querySelectorAll('img').forEach(img => {
            const dataSrc = img.getAttribute('data-src');
            const src = img.getAttribute('src') || '';
            if (dataSrc && (!src || src.indexOf('data:') === 0)) {
                img.setAttribute('src', dataSrc);
            }
            img.removeAttribute('data-src');
            img.setAttribute('referrerpolicy', 'no-referrer');
            img.setAttribute('loading', 'lazy');
            if (img.style.visibility === 'hidden') img.style.visibility = 'visible';
            if (img.style.width && img.style.width.indexOf('%') === -1) img.style.maxWidth = '100%';
        });
        return div.innerHTML.trim();
    }

    function getContentHTML() {
        return normalizeHTML(editor.innerHTML);
    }

    // 正文纯文本（用于字数统计与自动摘要）
    function getContentText() {
        const div = document.createElement('div');
        div.innerHTML = editor.innerHTML;
        return (div.textContent || '').replace(/\s+/g, '');
    }

    // 实时统计：字数与图片数
    function updateStats() {
        statChars.textContent = getContentText().length;
        statImages.textContent = editor.querySelectorAll('img').length;
    }

    // 标题为空时，从正文第一个标题或加粗段落提取标题
    function extractTitle() {
        if (titleInput.value.trim()) return;
        const heading = editor.querySelector('h1, h2, h3');
        let text = heading ? heading.textContent.trim() : '';
        if (!text) {
            const bold = editor.querySelector('p strong, p b, strong, b');
            text = bold ? bold.textContent.trim() : '';
        }
        if (text) {
            titleInput.value = text.slice(0, 60);
        }
    }

    // 粘贴时优先取 HTML（公众号编辑器复制的内容带富文本）
    editor.addEventListener('paste', (e) => {
        const html = e.clipboardData && e.clipboardData.getData('text/html');
        if (!html) return; // 无富文本则走默认纯文本粘贴
        e.preventDefault();
        document.execCommand('insertHTML', false, normalizeHTML(html));
        // 等粘贴内容真正进入 DOM 后再统计与提取标题
        setTimeout(() => {
            updateStats();
            extractTitle();
        }, 0);
    });

    editor.addEventListener('input', updateStats);

    // 生成 JS 字符串字面量（双引号包裹）
    function jsString(str) {
        return '"' + String(str)
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\r?\n/g, '\\n') + '"';
    }

    // 通过 Blob 下载 posts/<id>.html
    function downloadPostFile(id, content) {
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = id + '.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    loadHtmlBtn.addEventListener('click', () => {
        const html = htmlInput.value.trim();
        if (!html) return;
        editor.innerHTML = normalizeHTML(html);
        htmlInput.value = '';
        updateStats();
        extractTitle();
    });

    previewBtn.addEventListener('click', () => {
        const html = getContentHTML();
        if (!html) {
            alert('正文为空，请先粘贴文章内容。');
            return;
        }
        previewContent.innerHTML = html;
        previewWrap.hidden = false;
        previewWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    generateBtn.addEventListener('click', () => {
        extractTitle();
        const title = titleInput.value.trim();
        const content = getContentHTML();
        if (!title) {
            alert('请填写标题。');
            titleInput.focus();
            return;
        }
        if (!content) {
            alert('正文为空，请先粘贴文章内容。');
            return;
        }
        const date = dateInput.value || today();
        const tags = tagsInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
        const id = date.replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 8);
        const summary = summaryInput.value.trim() || getContentText().slice(0, 90);

        // 1) 下载 posts/<id>.html（清洗后的正文 HTML 片段）
        downloadPostFile(id, content);

        // 2) 追加一行元数据到输出区（多篇可累计）
        const line =
            '    { id: ' + jsString(id) +
            ', title: ' + jsString(title) +
            ', date: ' + jsString(date) +
            ', tags: [' + tags.map(jsString).join(', ') + ']' +
            ', summary: ' + jsString(summary) +
            ', file: ' + jsString('posts/' + id + '.html') + ' },\n';
        outputArea.value += line;
        outputWrap.hidden = false;
        outputWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 3) 重置表单，方便连续转载下一篇（输出区保留）
        titleInput.value = '';
        dateInput.value = today();
        tagsInput.value = '';
        summaryInput.value = '';
        editor.innerHTML = '';
        htmlInput.value = '';
        previewWrap.hidden = true;
        previewContent.innerHTML = '';
        updateStats();
    });

    copyBtn.addEventListener('click', async () => {
        outputArea.select();
        try {
            await navigator.clipboard.writeText(outputArea.value);
        } catch (e) {
            document.execCommand('copy');
        }
        copyBtn.textContent = '已复制 ✓';
        setTimeout(() => { copyBtn.textContent = '复制元数据'; }, 2000);
    });

    clearOutputBtn.addEventListener('click', () => {
        outputArea.value = '';
    });
})();
