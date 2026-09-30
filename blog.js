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
    const tocNav = document.getElementById('post-toc');

    // 草稿不公开：列表与阅读页都看不到
    const posts = [...BLOG_POSTS]
        .filter(post => !post.draft)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    let activeTag = null;
    let searchText = '';
    let currentPostId = null; // 当前阅读的文章 id（目录链接与 SEO 用）

    // 正文内存缓存：file -> Promise<string>
    const contentCache = {};

    // 目录滚动高亮条目：{ el: 标题元素, link: 目录链接 }
    let tocHeadings = [];

    // SEO 元素（打开文章时动态改写，返回列表时还原）
    const SITE_URL = 'https://jiangfengyuan.github.io';
    const metaDesc = document.querySelector('meta[name="description"]');
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const ogType = document.querySelector('meta[property="og:type"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const DEFAULT_DESC = metaDesc ? metaDesc.getAttribute('content') : '';
    let jsonLdEl = null;

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

    // 正文统一净化：Markdown 先渲染成 HTML，再与抓取到的 HTML 一起过白名单
    function renderContent(post, raw) {
        const isMarkdown = /\.md($|\?)/i.test(post.file || '');
        const html = isMarkdown && window.BlogContent
            ? window.BlogContent.mdToHtml(raw)
            : String(raw || '');
        return window.BlogContent ? window.BlogContent.sanitizeHtml(html) : html;
    }

    // ---------- 阅读体验增强 ----------

    // 外链新窗口打开；代码块交给 highlight.js 着色（CDN 加载失败时静默跳过）
    function enhancePostContent() {
        postContent.querySelectorAll('a[href^="http"]').forEach(a => {
            if (a.hostname !== location.hostname) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
        });
        if (window.hljs) {
            postContent.querySelectorAll('pre code').forEach(el => {
                try { window.hljs.highlightElement(el); } catch (e) { /* 高亮失败不影响阅读 */ }
            });
        }
    }

    // 文章目录：收集 h2/h3，不少于 2 个标题才显示
    function buildToc() {
        tocHeadings = [];
        tocNav.innerHTML = '';
        const headings = postContent.querySelectorAll('h2, h3');
        if (headings.length < 2) {
            tocNav.hidden = true;
            return;
        }
        const title = document.createElement('p');
        title.className = 'post-toc-title';
        title.textContent = t('目录', 'Contents');
        const list = document.createElement('ul');
        list.className = 'post-toc-list';
        headings.forEach((h, i) => {
            const id = 'post-h-' + i;
            h.id = id;
            const li = document.createElement('li');
            li.className = 'post-toc-item' + (h.tagName === 'H3' ? ' post-toc-sub' : '');
            const a = document.createElement('a');
            a.href = '#' + id;
            a.textContent = h.textContent;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                h.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '',
                    'blog.html?p=' + encodeURIComponent(currentPostId) + '#' + id);
            });
            li.appendChild(a);
            list.appendChild(li);
            tocHeadings.push({ el: h, link: a });
        });
        tocNav.appendChild(title);
        tocNav.appendChild(list);
        tocNav.hidden = false;
    }

    // 滚动高亮当前小节（取顶部偏移以内最后一个标题）
    function updateTocSpy() {
        if (!tocHeadings.length || postView.hidden) return;
        let current = 0;
        tocHeadings.forEach((h, i) => {
            if (h.el.getBoundingClientRect().top <= 120) current = i;
        });
        tocHeadings.forEach((h, i) => h.link.classList.toggle('active', i === current));
    }

    function clearToc() {
        tocHeadings = [];
        tocNav.innerHTML = '';
        tocNav.hidden = true;
    }

    // 图片灯箱：点击正文图片放大查看，Esc / 点击空白处关闭
    const lightbox = document.createElement('div');
    lightbox.className = 'img-lightbox';
    lightbox.hidden = true;
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.innerHTML = '<img alt=""><p class="img-lightbox-caption"></p>';
    document.body.appendChild(lightbox);
    const lightboxImg = lightbox.querySelector('img');
    const lightboxCaption = lightbox.querySelector('.img-lightbox-caption');

    function openLightbox(img) {
        const fig = img.closest('figure');
        const figCaption = fig ? fig.querySelector('figcaption') : null;
        const caption = figCaption ? figCaption.textContent : (img.alt || '');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || '';
        lightboxCaption.textContent = caption;
        lightboxCaption.hidden = !caption;
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.hidden = true;
        lightboxImg.removeAttribute('src');
        document.body.style.overflow = '';
    }

    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
    postContent.addEventListener('click', (e) => {
        const img = e.target.closest('img');
        if (!img || !postContent.contains(img)) return;
        if (img.closest('a')) e.preventDefault(); // 图片被链接包裹时只开灯箱，不跳转
        openLightbox(img);
    });

    // 代码高亮配色跟随站点明暗主题
    function syncHljsTheme() {
        const isLight = document.documentElement.dataset.theme === 'light';
        const light = document.getElementById('hljs-theme-light');
        const dark = document.getElementById('hljs-theme-dark');
        if (light) light.disabled = !isLight;
        if (dark) dark.disabled = isLight;
    }

    // ---------- 动态 SEO：打开文章时改写 meta 并注入 JSON-LD ----------
    function setMeta(el, value) { if (el) el.setAttribute('content', value); }

    function updateSeoForPost(post) {
        const desc = post.summary || DEFAULT_DESC;
        const url = SITE_URL + '/blog?p=' + encodeURIComponent(post.id);
        setMeta(metaDesc, desc);
        setMeta(ogTitle, post.title);
        setMeta(ogDesc, desc);
        setMeta(ogUrl, url);
        setMeta(ogType, 'article');
        if (canonicalLink) canonicalLink.setAttribute('href', url);
        if (jsonLdEl) jsonLdEl.remove();
        jsonLdEl = document.createElement('script');
        jsonLdEl.type = 'application/ld+json';
        // 把 < 替换为 unicode 转义，防止标题中的 </script> 提前闭合标签
        jsonLdEl.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: desc,
            datePublished: post.date,
            author: { '@type': 'Person', name: 'Hayden' },
            keywords: (post.tags || []).join(', '),
            url: url,
            mainEntityOfPage: url
        }).replace(/</g, '\\u003c');
        document.head.appendChild(jsonLdEl);
    }

    function resetSeo() {
        const url = SITE_URL + '/blog';
        setMeta(metaDesc, DEFAULT_DESC);
        setMeta(ogTitle, 'Blog — Hayden');
        setMeta(ogDesc, DEFAULT_DESC);
        setMeta(ogUrl, url);
        setMeta(ogType, 'website');
        if (canonicalLink) canonicalLink.setAttribute('href', url);
        if (jsonLdEl) { jsonLdEl.remove(); jsonLdEl = null; }
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
        updateTocSpy();
    }

    function openPost(id, push) {
        const post = posts.find(p => p.id === id);
        if (!post) {
            showList(push);
            return;
        }
        currentPostId = id;
        postTitle.textContent = post.title;
        postDate.textContent = formatDate(post.date);
        postDate.setAttribute('datetime', post.date || '');
        postTags.innerHTML =
            (post.tags || []).map(tag => '<span class="skill-tag">' + escapeHTML(tag) + '</span>').join('');
        postStats.textContent = t('加载中…', 'Loading…');
        postError.hidden = true;
        postContent.innerHTML = '';
        clearToc();
        renderPostNav(post);
        updateSeoForPost(post);
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
            .then(raw => {
                // 等待期间用户已切换到别的文章/返回列表则丢弃
                if (postView.hidden || currentId !== new URLSearchParams(location.search).get('p')) return;
                const cleaned = renderContent(post, raw);
                postContent.innerHTML = cleaned;
                enhancePostContent();
                buildToc();
                const stats = getReadingStats(cleaned);
                postStats.textContent = t(
                    `约 ${stats.totalChars} 字 · 阅读约需 ${stats.minutes} 分钟`,
                    `~${stats.totalChars} words · ${stats.minutes} min read`
                );
                updateReadingProgress();
                // 支持目录锚点直达（blog.html?p=id#post-h-N）
                if (location.hash) {
                    const anchor = document.getElementById(location.hash.slice(1));
                    if (anchor && postContent.contains(anchor)) {
                        anchor.scrollIntoView({ behavior: 'auto', block: 'start' });
                    }
                }
            })
            .catch(() => {
                if (postView.hidden || currentId !== new URLSearchParams(location.search).get('p')) return;
                postStats.textContent = '';
                postError.hidden = false;
            });
    }

    function showList(push) {
        currentPostId = null;
        postView.hidden = true;
        listView.hidden = false;
        document.querySelector('.blog-hero').hidden = false;
        document.title = 'Blog — Hayden';
        clearToc();
        resetSeo();
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

    // 主题切换时同步代码高亮配色（script.js 初始化主题也会触发一次）
    new MutationObserver(syncHljsTheme).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme']
    });
    syncHljsTheme();

    // 初始渲染
    const initialId = new URLSearchParams(location.search).get('p');
    renderAll();
    if (initialId) openPost(initialId, false);
})();
