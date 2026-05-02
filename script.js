// ==================== 导航栏滚动效果 ====================
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==================== 打字机效果 ====================
class TypeWriter {
    constructor(element, text, speed = 120) {
        this.element = element;
        this.text = text;
        this.speed = speed;
        this.index = 0;
        this.isDeleting = false;
        this.type();
    }

    stop() {
        if (this.timer) clearTimeout(this.timer);
    }

    type() {
        const current = this.text;
        
        if (!this.isDeleting) {
            this.element.textContent = current.substring(0, this.index + 1);
            this.index++;
            
            if (this.index === current.length) {
                // 完成打字，停止光标闪烁一段时间后可能重播
                this.timer = setTimeout(() => {
                    this.isDeleting = true;
                    this.type();
                }, 2500);
                return;
            }
        } else {
            this.element.textContent = current.substring(0, this.index - 1);
            this.index--;
            
            if (this.index === 0) {
                this.isDeleting = false;
            }
        }
        
        const speed = this.isDeleting ? 80 : this.speed;
        this.timer = setTimeout(() => this.type(), speed);
    }
}

// 启动打字机
let currentTypewriter = null;

function initTypewriter() {
    const typingElement = document.querySelector('.typing-text');
    if (!typingElement) return;

    const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
    const text = typingElement.getAttribute(`data-text-${lang}`) || typingElement.getAttribute('data-text');
    if (!text) return;

    if (currentTypewriter) currentTypewriter.stop();
    typingElement.textContent = '';
    currentTypewriter = new TypeWriter(typingElement, text, 150);
}

initTypewriter();

// ==================== 滚动淡入动画 ====================
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // 添加 stagger 延迟效果
            const element = entry.target;
            const delay = element.dataset.delay || 0;
            
            setTimeout(() => {
                element.classList.add('visible');
            }, delay);
            
            fadeObserver.unobserve(element);
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-up').forEach((el, index) => {
    el.dataset.delay = index * 100; // 每个元素间隔 100ms
    fadeObserver.observe(el);
});

// ==================== 数字滚动动画 ====================
function animateNumber(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                animateNumber(stat, target);
            });
            statObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsContainer = document.querySelector('.about-stats');
if (statsContainer) {
    statObserver.observe(statsContainer);
}

// ==================== 粒子背景 ====================
const canvas = document.getElementById('particle-canvas');
if (!canvas) {
    console.warn('Canvas element #particle-canvas not found, skipping particle animation.');
}
const ctx = canvas ? canvas.getContext('2d') : null;

let particles = [];
let animationId;

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

if (canvas) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

if (canvas && ctx) {
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }

        draw() {
            ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const particleCount = Math.min(Math.floor(window.innerWidth / 15), 100);
        
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        const maxDistance = 150;
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    const opacity = (1 - distance / maxDistance) * 0.15;
                    ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        connectParticles();
        animationId = requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();

    // ==================== 性能优化：页面不可见时暂停粒子动画 ====================
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            animateParticles();
        }
    });
}

// ==================== 移动端菜单 ====================
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

function closeMobileMenu() {
    menuToggle.classList.remove('active');
    navLinks.classList.remove('active');
    document.body.style.overflow = '';
}

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });
}

// 点击导航链接后关闭菜单
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (navLinks.classList.contains('active')) {
            closeMobileMenu();
        }
    });
});

// 点击页面其他区域关闭菜单
document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('active') && 
        !navLinks.contains(e.target) && 
        !menuToggle.contains(e.target)) {
        closeMobileMenu();
    }
});

// ==================== 平滑滚动与导航高亮 ====================
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-link');

function highlightNav() {
    const scrollPos = window.scrollY + 150;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinksAll.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

let highlightNavTicking = false;
window.addEventListener('scroll', () => {
    if (!highlightNavTicking) {
        window.requestAnimationFrame(() => {
            highlightNav();
            highlightNavTicking = false;
        });
        highlightNavTicking = true;
    }
});


// ==================== Global Theme & Language Toggle ====================
(function() {
    const htmlEl = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const langToggle = document.getElementById('lang-toggle');
    const pageFlash = document.querySelector('.page-flash');

    // --- Theme Toggle ---
    const savedTheme = localStorage.getItem('site-theme') || 'dark';
    htmlEl.dataset.theme = savedTheme;
    if (pageFlash) {
        pageFlash.classList.remove('theme-dark', 'theme-light');
        pageFlash.classList.add(`theme-${savedTheme}`);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = htmlEl.dataset.theme === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            htmlEl.dataset.theme = newTheme;
            if (pageFlash) {
                pageFlash.classList.remove('theme-dark', 'theme-light');
                pageFlash.classList.add(`theme-${newTheme}`);
            }
            localStorage.setItem('site-theme', newTheme);
        });
    }

    // --- Language Toggle ---
    let currentLang = localStorage.getItem('site-lang') || 'zh';

    function updateLanguage(lang) {
        document.querySelectorAll('.lang-text').forEach(el => {
            const text = el.getAttribute(`data-${lang}`);
            if (text) el.textContent = text;
        });

        if (langToggle) {
            langToggle.textContent = lang === 'zh' ? 'EN' : '中文';
        }

        htmlEl.lang = lang === 'zh' ? 'zh-CN' : 'en';
        localStorage.setItem('site-lang', lang);

        // Re-init typewriter and danmaku for new language
        initTypewriter();
        if (typeof initDanmaku === 'function') initDanmaku();
    }

    updateLanguage(currentLang);

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            updateLanguage(currentLang);
        });
    }
})();


// ==================== Danmaku ====================
const danmakuData = {
    zh: [
        "凌晨三点的灵感 ✨",
        "这个 API 设计得真优雅",
        "明天要交作业了怎么办",
        "如果能自动整理笔记就好了",
        "突然想到一个产品点子",
        "这段代码可以重构一下",
        "咖啡续命中 ☕",
        "这个配色太舒服了",
        "记得回那封邮件",
        "一闪而过的旋律 🎵",
        "为什么 bug 总是深夜出现",
        "这个动画效果很丝滑",
        "想做一个语音日记应用",
        "用户需求到底是什么",
        "这行注释写得太好了",
        "记得备份数据库",
        "灵光乍现 💡",
        "如果加上 AI 会更有趣",
        "这个函数命名好难",
        "明天一定要早起",
        "记录一个闪念...",
        "长按录音，5 秒后保存",
        "走廊里闪过竞赛思路",
        "睡前轻声复盘",
        "三句话记录今日"
    ],
    en: [
        "3 AM inspiration ✨",
        "This API design is elegant",
        "The deadline is tomorrow...",
        "What if notes auto-organized?",
        "Sudden product idea struck",
        "This code could be refactored",
        "Coffee is fuel ☕",
        "This palette feels right",
        "Don't forget that email",
        "A melody flashed by 🎵",
        "Why do bugs appear at midnight",
        "This animation is so smooth",
        "Build a voice diary app",
        "What do users really need",
        "This comment is well written",
        "Remember to backup DB",
        "Lightbulb moment 💡",
        "Adding AI would be cool",
        "Naming functions is hard",
        "Must wake up early tomorrow",
        "Record a fleeting thought...",
        "Long press to record, save in 5s",
        "A contest idea in the hallway",
        "Bedtime whisper review",
        "Three sentences for today"
    ]
};

function initDanmaku() {
    const layer = document.getElementById('danmaku-layer');
    if (!layer) return;

    const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
    const pool = danmakuData[lang];

    // 随机打乱并选取
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 18);

    layer.innerHTML = '';

    const trackCount = 5;

    selected.forEach((text, idx) => {
        const el = document.createElement('div');
        el.className = 'danmaku-track';
        el.textContent = text;

        const trackIdx = idx % trackCount;
        const topBase = (trackIdx / trackCount) * 100;
        const topOffset = Math.random() * 12 - 6;
        const top = Math.max(10, Math.min(90, topBase + topOffset));

        const duration = 14 + Math.random() * 14;
        const delay = -(Math.random() * duration);

        el.style.top = `${top}%`;
        el.style.animationDuration = `${duration}s`;
        el.style.animationDelay = `${delay}s`;
        el.style.fontSize = `${0.95 + Math.random() * 0.4}rem`;
        el.style.opacity = `${0.45 + Math.random() * 0.4}`;

        // 高亮部分弹幕
        if (Math.random() < 0.2) {
            el.style.color = 'var(--accent)';
            el.style.fontWeight = '600';
            el.style.opacity = '0.95';
        }

        layer.appendChild(el);
    });
}

initDanmaku();
