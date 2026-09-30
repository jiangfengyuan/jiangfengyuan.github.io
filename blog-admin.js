// ==================== 站长投稿工具 ====================
// 从公众号粘贴文章 -> 清洗 -> 预览 -> 生成可粘贴进 posts.js 的代码。
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

    // 默认日期：今天
    dateInput.value = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD

    // 粘贴时优先取 HTML（公众号编辑器复制的内容带富文本）
    editor.addEventListener('paste', (e) => {
        const html = e.clipboardData && e.clipboardData.getData('text/html');
        if (!html) return; // 无富文本则走默认纯文本粘贴
        e.preventDefault();
        document.execCommand('insertHTML', false, normalizeHTML(html));
    });

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

    function escapeJSString(str) {
        // 生成模板字符串：转义反引号、反斜杠与 ${，并防止 </script> 提前闭合
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${')
            .replace(/<\/script/gi, '<\\/script');
    }

    loadHtmlBtn.addEventListener('click', () => {
        const html = htmlInput.value.trim();
        if (!html) return;
        editor.innerHTML = normalizeHTML(html);
        htmlInput.value = '';
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
        const date = dateInput.value || new Date().toLocaleDateString('sv-SE');
        const tags = tagsInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
        const id = date.replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 8);

        const snippet =
            '    {\n' +
            '        id: "' + id + '",\n' +
            '        title: "' + escapeJSString(title).replace(/"/g, '\\"') + '",\n' +
            '        date: "' + date + '",\n' +
            '        tags: [' + tags.map(t => '"' + escapeJSString(t).replace(/"/g, '\\"') + '"').join(', ') + '],\n' +
            '        summary: "' + escapeJSString(summaryInput.value.trim()).replace(/"/g, '\\"') + '",\n' +
            '        content: `\n' + content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/<\/script/gi, '<\\/script') + '\n`\n' +
            '    },\n';

        outputArea.value = snippet;
        outputWrap.hidden = false;
        outputWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    copyBtn.addEventListener('click', async () => {
        outputArea.select();
        try {
            await navigator.clipboard.writeText(outputArea.value);
        } catch (e) {
            document.execCommand('copy');
        }
        copyBtn.textContent = '已复制 ✓';
        setTimeout(() => { copyBtn.textContent = '复制代码'; }, 2000);
    });
})();
