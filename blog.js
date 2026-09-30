// ==================== 博客列表与阅读页 ====================
// 依赖 posts.js 提供的 BLOG_POSTS 数组；仅在有 #blog-list-view 的页面运行。
(function () {
    const listView = document.getElementById('blog-list-view');
    const postView = document.getElementById('blog-post-view');
    if (!listView || !postView || typeof BLOG_POSTS === 'undefined') return;

    const postList = document.getElementById('blog-post-list');
    const tagChips = document.getElementById('blog-tag-chips');
    const searchInput = document.getElementById('blog-search-input');
    const emptyHint = document.getElementById('blog-empty');
    const backBtn = document.getElementById('blog-back-btn');

    const posts = [...BLOG_POSTS].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    let activeTag = null;
    let searchText = '';

    function t(zh, en) {
        return document.documentElement.lang === 'zh-CN' ? zh : en;
    }

    function escapeHTML(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(dateStr) {
        const parts = String(dateStr || '').split('-');
        if (parts.length !== 3) return escapeHTML(dateStr || '');
        const [y, m, d] = parts;
        return document.documentElement.lang === 'zh-CN'
            ? `${y} 年 ${parseInt(m, 10)} 月 ${parseInt(d, 10)} 日`
            : `${y}-${m}-${d}`;
    }

    function stripTags(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || '').trim();
    }

    function getSummary(post) {
        if (post.summary) return post.summary;
        const text = stripTags(post.content || '');
        return text.length > 90 ? text.slice(0, 90) + '…' : text;
    }

    // 公众号正文 HTML 清洗：去 script、修复 data-src 图片与防盗链
    function normalizeContentHTML(html) {
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
            // 公众号图片常带 visibility:hidden，等待其 JS 显示，这里直接显示
            if (img.style.visibility === 'hidden') img.style.visibility = 'visible';
            if (img.style.width && img.style.width.indexOf('%') === -1) img.style.maxWidth = '100%';
        });
        return div.innerHTML;
    }

    function filteredPosts() {
        const q = searchText.trim().toLowerCase();
        return posts.filter(post => {
            if (activeTag && !(post.tags || []).includes(activeTag)) return false;
            if (!q) return true;
            const haystack = [post.title, post.summary, (post.tags || []).join(' '), stripTags(post.content || '')]
                .join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }

    function renderTagChips() {
        const allTags = [];
        posts.forEach(post => (post.tags || []).forEach(tag => {
            if (!allTags.includes(tag)) allTags.push(tag);
        }));
        tagChips.innerHTML = '';
        const allChip = document.createElement('button');
        allChip.className = 'blog-tag-chip' + (activeTag === null ? ' active' : '');
        allChip.textContent = t('全部', 'All');
        allChip.addEventListener('click', () => { activeTag = null; renderAll(); });
        tagChips.appendChild(allChip);
        allTags.forEach(tag => {
            const chip = document.createElement('button');
            chip.className = 'blog-tag-chip' + (activeTag === tag ? ' active' : '');
            chip.textContent = tag;
            chip.addEventListener('click', () => { activeTag = tag; renderAll(); });
            tagChips.appendChild(chip);
        });
    }

    function renderList() {
        const visible = filteredPosts();
        postList.innerHTML = '';
        emptyHint.hidden = visible.length > 0;
        visible.forEach(post => {
            const card = document.createElement('a');
            card.className = 'post-card';
            card.href = 'blog.html?p=' + encodeURIComponent(post.id);
            card.innerHTML =
                '<div class="post-card-meta">' +
                    '<time>' + formatDate(post.date) + '</time>' +
                    (post.tags || []).map(tag => '<span class="skill-tag">' + escapeHTML(tag) + '</span>').join('') +
                '</div>' +
                '<h2 class="post-card-title">' + escapeHTML(post.title) + '</h2>' +
                '<p class="post-card-summary">' + escapeHTML(getSummary(post)) + '</p>' +
                '<span class="post-card-more">' + t('阅读全文', 'Read more') + ' &rarr;</span>';
            card.addEventListener('click', (e) => {
                e.preventDefault();
                openPost(post.id, true);
            });
            postList.appendChild(card);
        });
    }

    function renderAll() {
        renderTagChips();
        renderList();
    }

    function openPost(id, push) {
        const post = posts.find(p => p.id === id);
        if (!post) {
            showList(push);
            return;
        }
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-date').textContent = formatDate(post.date);
        document.getElementById('post-date').setAttribute('datetime', post.date || '');
        document.getElementById('post-tags').innerHTML =
            (post.tags || []).map(tag => '<span class="skill-tag">' + escapeHTML(tag) + '</span>').join('');
        document.getElementById('post-content').innerHTML = normalizeContentHTML(post.content);
        listView.hidden = true;
        document.querySelector('.blog-hero').hidden = true;
        postView.hidden = false;
        document.title = post.title + ' — Hayden';
        if (push) {
            history.pushState({ post: id }, '', 'blog.html?p=' + encodeURIComponent(id));
        }
        window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    }

    function showList(push) {
        postView.hidden = true;
        listView.hidden = false;
        document.querySelector('.blog-hero').hidden = false;
        document.title = 'Blog — Hayden';
        if (push) history.pushState({}, '', 'blog.html');
    }

    backBtn.addEventListener('click', () => showList(true));

    searchInput.addEventListener('input', () => {
        searchText = searchInput.value;
        renderList();
    });

    window.addEventListener('popstate', () => {
        const id = new URLSearchParams(location.search).get('p');
        if (id) openPost(id, false); else showList(false);
    });

    // 语言切换时重渲染动态内容（占位符文本走 lang-text 之外的 input）
    function applyLang() {
        searchInput.placeholder = searchInput.getAttribute(
            document.documentElement.lang === 'zh-CN' ? 'data-zh-placeholder' : 'data-en-placeholder'
        );
        const id = new URLSearchParams(location.search).get('p');
        if (!postView.hidden && id) {
            openPost(id, false);
        } else {
            renderAll();
        }
    }
    new MutationObserver(applyLang).observe(document.documentElement, {
        attributes: true, attributeFilter: ['lang']
    });

    // 初始渲染
    const initialId = new URLSearchParams(location.search).get('p');
    renderAll();
    if (initialId) openPost(initialId, false);
})();
