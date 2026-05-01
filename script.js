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

    type() {
        const current = this.text;
        
        if (!this.isDeleting) {
            this.element.textContent = current.substring(0, this.index + 1);
            this.index++;
            
            if (this.index === current.length) {
                // 完成打字，停止光标闪烁一段时间后可能重播
                setTimeout(() => {
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
        setTimeout(() => this.type(), speed);
    }
}

// 启动打字机
const typingElement = document.querySelector('.typing-text');
if (typingElement) {
    const text = typingElement.getAttribute('data-text');
    typingElement.textContent = '';
    setTimeout(() => {
        new TypeWriter(typingElement, text, 150);
    }, 500);
}

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

