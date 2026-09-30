// ==================== Markdown 渲染器与内容净化 ====================
// 暴露 window.BlogContent：
//   mdToHtml(md)      — 纯字符串函数（不依赖 DOM，可用 node 直接测），Markdown 子集 -> HTML
//   sanitizeHtml(html)— 依赖 DOM，将任意 HTML 净化为语义白名单 HTML
// 由 blog.html 在 blog.js 之前引入。
(function () {
    'use strict';

    var STASH_OPEN = '%%MDCODE', STASH_CLOSE = 'MDCODE%%'; // 行内代码占位符包裹字符

    function escapeHTML(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // 内联 Markdown：**粗体** *斜体* ~~删除线~~ `行内代码` [文字](链接) ![图注](图片)
    function inlineMD(text) {
        var s = escapeHTML(text);
        var stash = [];
        // 行内代码先占位，避免内部被继续解析
        s = s.replace(/`([^`]+)`/g, function (m, code) {
            stash.push('<code>' + code + '</code>');
            return STASH_OPEN + (stash.length - 1) + STASH_CLOSE;
        });
        // 图片 ![alt](src)
        s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
            return '<img src="' + src + '" alt="' + alt + '" referrerpolicy="no-referrer" loading="lazy">';
        });
        // 链接 [text](href)
        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, href) {
            return '<a href="' + href + '">' + t + '</a>';
        });
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
        s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        s = s.replace(/%%MDCODE(\d+)MDCODE%%/g, function (m, i) { return stash[+i]; });
        return s;
    }

    // 块级解析：标题 / 代码块 / 列表 / 引用 / 分隔线 / 表格 / 段落
    function mdToHtml(md) {
        var lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
        var html = [];
        var i = 0;

        var isTableRow = function (line) { return /^\s*\|.*\|\s*$/.test(line); };
        var isTableSep = function (line) { return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line); };
        var splitRow = function (line) {
            return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
        };

        while (i < lines.length) {
            var line = lines[i];

            // 围栏代码块
            if (/^\s*```/.test(line)) {
                var lang = line.replace(/^\s*```/, '').trim();
                i++;
                var codeLines = [];
                while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
                    codeLines.push(lines[i]);
                    i++;
                }
                i++; // 跳过结尾 ```
                var cls = lang ? ' class="language-' + escapeHTML(lang) + '"' : '';
                html.push('<pre><code' + cls + '>' + escapeHTML(codeLines.join('\n')) + '</code></pre>');
                continue;
            }

            // 空行
            if (/^\s*$/.test(line)) { i++; continue; }

            // 分隔线
            if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
                html.push('<hr>');
                i++;
                continue;
            }

            // 标题 # ~ ####
            var h = line.match(/^\s*(#{1,4})\s+(.*)$/);
            if (h) {
                var level = h[1].length + 1; // 正文内最高 h2
                html.push('<h' + level + '>' + inlineMD(h[2].trim()) + '</h' + level + '>');
                i++;
                continue;
            }

            // 表格
            if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
                var headers = splitRow(line);
                var aligns = splitRow(lines[i + 1]).map(function (c) {
                    if (/^:-+:$/.test(c)) return 'center';
                    if (/:$/.test(c)) return 'right';
                    return 'left';
                });
                i += 2;
                var rows = [];
                while (i < lines.length && isTableRow(lines[i])) {
                    rows.push(splitRow(lines[i]));
                    i++;
                }
                var alignAttr = function (idx) {
                    return aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : '';
                };
                var t = '<table><thead><tr>' +
                    headers.map(function (c, idx) { return '<th' + alignAttr(idx) + '>' + inlineMD(c) + '</th>'; }).join('') +
                    '</tr></thead><tbody>';
                rows.forEach(function (row) {
                    t += '<tr>' + row.map(function (c, idx) { return '<td' + alignAttr(idx) + '>' + inlineMD(c) + '</td>'; }).join('') + '</tr>';
                });
                t += '</tbody></table>';
                html.push(t);
                continue;
            }

            // 引用块（连续 > 行合并，内部再按块解析，支持嵌套）
            if (/^\s*>/.test(line)) {
                var quoteLines = [];
                while (i < lines.length && /^\s*>/.test(lines[i])) {
                    quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
                    i++;
                }
                html.push('<blockquote>' + mdToHtml(quoteLines.join('\n')) + '</blockquote>');
                continue;
            }

            // 无序列表
            if (/^\s*[-*+]\s+/.test(line)) {
                var uItems = [];
                while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
                    uItems.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
                    i++;
                }
                html.push('<ul>' + uItems.map(function (it) { return '<li>' + inlineMD(it) + '</li>'; }).join('') + '</ul>');
                continue;
            }

            // 有序列表
            if (/^\s*\d+\.\s+/.test(line)) {
                var oItems = [];
                while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                    oItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
                    i++;
                }
                html.push('<ol>' + oItems.map(function (it) { return '<li>' + inlineMD(it) + '</li>'; }).join('') + '</ol>');
                continue;
            }

            // 独立成段的图片 -> figure（alt 作为图注）
            var imgOnly = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
            if (imgOnly) {
                html.push('<figure><img src="' + escapeHTML(imgOnly[2]) + '" alt="' + escapeHTML(imgOnly[1]) +
                    '" referrerpolicy="no-referrer" loading="lazy">' +
                    (imgOnly[1] ? '<figcaption>' + escapeHTML(imgOnly[1]) + '</figcaption>' : '') +
                    '</figure>');
                i++;
                continue;
            }

            // 普通段落：连续非块级行合并为一段，行间用 <br>
            var para = [];
            while (i < lines.length &&
                   !/^\s*$/.test(lines[i]) &&
                   !/^\s*```/.test(lines[i]) &&
                   !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
                   !/^\s*#{1,4}\s+/.test(lines[i]) &&
                   !/^\s*>/.test(lines[i]) &&
                   !/^\s*[-*+]\s+/.test(lines[i]) &&
                   !/^\s*\d+\.\s+/.test(lines[i]) &&
                   !isTableRow(lines[i])) {
                para.push(lines[i]);
                i++;
            }
            html.push('<p>' + para.map(inlineMD).join('<br>') + '</p>');
        }
        return html.join('\n');
    }

    // ---------- sanitizeHtml ----------
    var ALLOWED_TAGS = { p: 1, h2: 1, h3: 1, h4: 1, ul: 1, ol: 1, li: 1, blockquote: 1,
        pre: 1, code: 1, em: 1, strong: 1, del: 1, a: 1, img: 1, figure: 1, figcaption: 1,
        table: 1, thead: 1, tbody: 1, tr: 1, th: 1, td: 1, hr: 1, br: 1, sup: 1, sub: 1 };
    var ALLOWED_ATTRS = {
        img: { src: 1, alt: 1, referrerpolicy: 1, loading: 1 },
        a: { href: 1 },
        td: { colspan: 1, rowspan: 1 },
        th: { colspan: 1, rowspan: 1 }
    };

    function sanitizeHtml(html) {
        var root = document.createElement('div');
        root.innerHTML = String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '');

        // 删除危险/隐藏元素（含公众号 display:none 隐藏节点）
        root.querySelectorAll('script, style, iframe, object, embed').forEach(function (el) { el.remove(); });
        root.querySelectorAll('*').forEach(function (el) {
            if (el.style && el.style.display === 'none') el.remove();
        });

        var walk = function (node) {
            Array.from(node.children).forEach(walk);
            Array.from(node.childNodes).slice().forEach(function (child) {
                if (child.nodeType !== 1) return;
                var tag = child.tagName.toLowerCase();
                // 内容里的 h1 降为 h2（重建元素）
                if (tag === 'h1') {
                    var h2 = document.createElement('h2');
                    while (child.firstChild) h2.appendChild(child.firstChild);
                    child.replaceWith(h2);
                    child = h2;
                    tag = 'h2';
                }
                if (!ALLOWED_TAGS[tag]) {
                    // 不在白名单：解包保留子内容（section/div/span 等）
                    while (child.firstChild) node.insertBefore(child.firstChild, child);
                    child.remove();
                    return;
                }
                // 清除非白名单属性
                var keep = ALLOWED_ATTRS[tag] || {};
                Array.from(child.attributes).forEach(function (attr) {
                    if (!keep[attr.name]) child.removeAttribute(attr.name);
                });
                if (tag === 'img') {
                    var dataSrc = child.getAttribute('data-src');
                    if (dataSrc && !child.getAttribute('src')) child.setAttribute('src', dataSrc);
                    child.setAttribute('referrerpolicy', 'no-referrer');
                    child.setAttribute('loading', 'lazy');
                }
            });
            // 删除空标签（img/br/hr/td/th 除外）
            Array.from(node.children).slice().forEach(function (child) {
                var tag = child.tagName.toLowerCase();
                if (tag === 'img' || tag === 'br' || tag === 'hr' || tag === 'td' || tag === 'th') return;
                if (!child.textContent.trim() && !child.querySelector('img, br, hr')) child.remove();
            });
        };
        walk(root);
        return root.innerHTML;
    }

    var BlogContent = { mdToHtml: mdToHtml, sanitizeHtml: sanitizeHtml };
    if (typeof window !== 'undefined') window.BlogContent = BlogContent;
    if (typeof module !== 'undefined' && module.exports) module.exports = BlogContent;
})();
