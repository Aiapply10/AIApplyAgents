// ═══════ Scroll reveal ═══════
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const d = entry.target.dataset.d;
        if (d) entry.target.style.transitionDelay = `${d * 100}ms`;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
);
document.querySelectorAll(".anim").forEach((el) => observer.observe(el));

// ═══════ Nav scroll state ═══════
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

// ═══════ Mobile hamburger ═══════
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobile-menu");
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  mobileMenu.classList.toggle("open");
});
mobileMenu.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    hamburger.classList.remove("open");
    mobileMenu.classList.remove("open");
  });
});

// ═══════ Count-up ═══════
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  if (isNaN(target)) return;
  const duration = 1600;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const countObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        animateCount(e.target);
        countObs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll("[data-count]").forEach((el) => countObs.observe(el));

// ═══════ Smooth scroll ═══════
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const t = document.querySelector(a.getAttribute("href"));
    if (t) {
      e.preventDefault();
      t.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ═══════ Live activity feed — cycling new items ═══════
const feedItems = [
  { type: "applied", role: "Frontend Engineer", company: "Vercel" },
  { type: "tailored", role: "Full Stack Developer", company: "Notion" },
  { type: "matched", role: "Staff Engineer", company: "Databricks", pct: 91 },
  { type: "found", board: "Indeed", count: 8 },
  { type: "applied", role: "Platform Engineer", company: "Cloudflare" },
  { type: "tailored", role: "iOS Developer", company: "Duolingo" },
  { type: "matched", role: "DevOps Engineer", company: "HashiCorp", pct: 88 },
  { type: "found", board: "Glassdoor", count: 15 },
  { type: "applied", role: "Design Engineer", company: "Linear" },
  { type: "tailored", role: "ML Engineer", company: "Anthropic" },
  { type: "applied", role: "SRE", company: "Datadog" },
  { type: "matched", role: "Product Engineer", company: "Figma", pct: 96 },
];

const icons = {
  applied: `<span class="fi-icon fi-icon-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>`,
  tailored: `<span class="fi-icon fi-icon-doc"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg></span>`,
  matched: `<span class="fi-icon fi-icon-star"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/></svg></span>`,
  found: `<span class="fi-icon fi-icon-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>`,
};

function textFor(item) {
  switch (item.type) {
    case "applied": return `Applied to <strong>${item.role}</strong> at ${item.company}`;
    case "tailored": return `Tailored resume for <strong>${item.role}</strong> at ${item.company}`;
    case "matched": return `Matched ${item.pct}% — <strong>${item.role}</strong> at ${item.company}`;
    case "found": return `Found ${item.count} new roles on <strong>${item.board}</strong>`;
  }
}

const feedBody = document.getElementById("activity-feed");
const feedCount = document.getElementById("feed-count");
let feedIdx = 0;
let count = 247;

function addFeedItem() {
  const item = feedItems[feedIdx % feedItems.length];
  feedIdx++;
  count++;
  feedCount.textContent = count;

  const typeClass = `feed-item-${item.type}`;
  const el = document.createElement("div");
  el.className = `feed-item ${typeClass} entering`;
  el.innerHTML = `${icons[item.type]}<span class="fi-text">${textFor(item)}</span><span class="fi-time">just now</span>`;

  feedBody.prepend(el);

  // Keep feed at max 6 items
  while (feedBody.children.length > 6) {
    feedBody.removeChild(feedBody.lastChild);
  }

  // Update times on existing items
  const items = feedBody.querySelectorAll(".feed-item");
  items.forEach((fi, i) => {
    if (i === 0) return;
    const seconds = i * 8 + Math.floor(Math.random() * 5);
    fi.querySelector(".fi-time").textContent = `${seconds}s ago`;
  });
}

// Start cycling after a short delay
setTimeout(() => {
  setInterval(addFeedItem, 3500);
}, 2000);

// ═══════ Quote carousel ═══════
const slides = document.querySelectorAll(".quote-slide");
const dots = document.querySelectorAll(".qd");
let currentSlide = 0;

function goToSlide(i) {
  slides[currentSlide].classList.remove("active");
  dots[currentSlide].classList.remove("active");
  currentSlide = i;
  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
}

dots.forEach((dot) => {
  dot.addEventListener("click", () => {
    goToSlide(parseInt(dot.dataset.i, 10));
  });
});

// Auto-rotate every 6s
setInterval(() => {
  goToSlide((currentSlide + 1) % slides.length);
}, 6000);
