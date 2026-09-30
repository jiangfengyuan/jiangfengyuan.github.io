// ==================== 博客列表与阅读页 ====================
// 依赖 posts.js 提供的 BLOG_POSTS 元数据数组；仅在有 #blog-list-view 的页面运行。
// 正文 HTML 存放在 posts/<id>.html，阅读时按需 fetch 并做内存缓存。
(function () {
    const listView = document.getElementById('blog-list-view');
    const postView = document.getElementById('blog-post-view');
    if (!listView || !postView || typeof BLOG_POSTS === 'undefined') return;

    const postList = document.getElementById('blog-post-list');
    const tagChips = document.getElementById('blog-tag-chips');
    const searchInput = document.getElementById('blog-search-input');
    const emptyHint = document.getElementById('blog-empty');
    const noResultHint = document.getElementById('blog-no-result');
    const backBtn = document.getElementById('blog-back-btn');
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postTags = document.getElementById('post-tags');
    const postStats = document.getElementById('post-stats');
    const postContent = document.getElementById('post-content');
    const postError = document.getElementById('post-error');
    const prevLink = document.getElementById('post-prev');
    const nextLink = document.getElementById('post-next');
    const progressBar = document.getElementById('reading-progress-bar');

    // 草稿不公开：列表与阅读页都看不到
    const posts = [...BLOG_POSTS]
        .filter(post => !post.draft)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    let activeTag = null;
    let searchText = '';

    // 正文内存缓存：file -> Promise<string>
    const contentCache = {};

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
        return '';
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

    // 按需加载正文，带内存缓存（失败时不缓存，便于重试）
    function loadContent(post) {
        if (!contentCache[post.file]) {
            contentCache[post.file] = fetch(post.file)
                .then(res => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.text();
                })
                .catch(err => {
                    delete contentCache[post.file];
                    throw err;
                });
        }
        return contentCache[post.file];
    }

    // 字数统计与预计阅读时长（中文约 400 字/分钟，英文约 200 词/分钟）
    function getReadingStats(html) {
        const text = stripTags(html);
        const cjkCount = (text.match(/[一-鿿]/g) || []).length;
        const wordCount = (text.replace(/[一-鿿]/g, ' ').match(/\S+/g) || []).length;
        const totalChars = cjkCount + wordCount;
        const minutes = Math.max(1, Math.ceil(cjkCount / 400 + wordCount / 200));
        return { totalChars, minutes };
    }

    function filteredPosts() {
        const q = searchText.trim().toLowerCase();
        return posts.filter(post => {
            if (activeTag && !(post.tags || []).includes(activeTag)) return false;
            if (!q) return true;
            const haystack = [post.title, post.summary, (post.tags || []).join(' ')]
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
        if (!allTags.length) return;
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
        // 区分两种空状态：博客为空 vs 搜索/筛选无结果
        const isFiltering = activeTag !== null || searchText.trim() !== '';
        emptyHint.hidden = !(posts.length === 0);
        noResultHint.hidden = !(posts.length > 0 && visible.length === 0 && isFiltering);
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

    // 上一篇 / 下一篇（按日期排序后的相邻文章；下一篇 = 更新的文章）
    function renderPostNav(post) {
        const index = posts.findIndex(p => p.id === post.id);
        const next = index > 0 ? posts[index - 1] : null;
        const prev = index < posts.length - 1 ? posts[index + 1] : null;
        prevLink.hidden = !prev;
        nextLink.hidden = !next;
        if (prev) {
            prevLink.href = 'blog.html?p=' + encodeURIComponent(prev.id);
            prevLink.querySelector('.post-nav-title').textContent = prev.title;
        }
        if (next) {
            nextLink.href = 'blog.html?p=' + encodeURIComponent(next.id);
            nextLink.querySelector('.post-nav-title').textContent = next.title;
        }
    }

    function updateReadingProgress() {
        if (!progressBar || postView.hidden) {
            if (progressBar) progressBar.style.width = '0%';
            return;
        }
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        progressBar.style.width = (ratio * 100).toFixed(2) + '%';
    }

    function openPost(id, push) {
        const post = posts.find(p => p.id === id);
        if (!post) {
            showList(push);
            return;
        }
        postTitle.textContent = post.title;
        postDate.textContent = formatDate(post.date);
        postDate.setAttribute('datetime', post.date || '');
        postTags.innerHTML =
            (post.tags || []).map(tag => '<span class="skill-tag">' + escapeHTML(tag) + '</span>').join('');
        postStats.textContent = t('加载中…', 'Loading…');
        postError.hidden = true;
        postContent.innerHTML = '';
        renderPostNav(post);
        listView.hidden = true;
        document.querySelector('.blog-hero').hidden = true;
        postView.hidden = false;
        document.title = post.title + ' — Hayden';
        if (push) {
            history.pushState({ post: id }, '', 'blog.html?p=' + encodeURIComponent(id));
        }
        window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        updateReadingProgress();

        const currentId = id;
        loadContent(post)
            .then(html => {
                // 等待期间用户已切换到别的文章/返回列表则丢弃
                if (postView.hidden || currentId !== new URLSearchParams(location.search).get('p')) return;
                const cleaned = normalizeContentHTML(html);
                postContent.innerHTML = cleaned;
                const stats = getReadingStats(cleaned);
                postStats.textContent = t(
                    `约 ${stats.totalChars} 字 · 阅读约需 ${stats.minutes} 分钟`,
                    `~${stats.totalChars} words · ${stats.minutes} min read`
                );
                updateReadingProgress();
            })
            .catch(() => {
                if (postView.hidden || currentId !== new URLSearchParams(location.search).get('p')) return;
                postStats.textContent = '';
                postError.hidden = false;
            });
    }

    function showList(push) {
        postView.hidden = true;
        listView.hidden = false;
        document.querySelector('.blog-hero').hidden = false;
        document.title = 'Blog — Hayden';
        if (push) history.pushState({}, '', 'blog.html');
        updateReadingProgress();
    }

    backBtn.addEventListener('click', () => showList(true));

    [prevLink, nextLink].forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = new URLSearchParams(new URL(link.href).search).get('p');
            if (id) openPost(id, true);
        });
    });

    searchInput.addEventListener('input', () => {
        searchText = searchInput.value;
        renderList();
    });

    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress);

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
