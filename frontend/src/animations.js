import { useEffect, useRef, useState } from "react";

let _css = false;
function addCSS() {
  if (_css) return; _css = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes ripple-wave{0%{transform:scale(0);opacity:.65}100%{transform:scale(2.8);opacity:0}}
    @keyframes sparkle-gold{0%{transform:scale(0) rotate(0deg);opacity:1}100%{transform:scale(2.2) rotate(180deg);opacity:0}}
    .reveal-card{opacity:0;transform:translateY(26px);transition:opacity .52s ease,transform .52s ease}
    .reveal-card.revealed{opacity:1;transform:translateY(0)}
  `;
  document.head.appendChild(s);
}

export function useScrollReveal() {
  useEffect(() => {
    addCSS();
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const d = Number(en.target.dataset.delay || 0);
        setTimeout(() => en.target.classList.add("revealed"), d);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.08 });
    const observe = () => document.querySelectorAll(".reveal-card:not(.revealed)").forEach(el => obs.observe(el));
    observe();
    const mut = new MutationObserver(observe);
    mut.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); mut.disconnect(); };
  }, []);
}

export function useRipple() {
  useEffect(() => {
    addCSS();
    const h = e => {
      const btn = e.target.closest(".btn-t");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const d = Math.max(btn.offsetWidth, btn.offsetHeight);
      const el = document.createElement("span");
      el.style.cssText = `position:absolute;width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px;border-radius:50%;background:rgba(255,255,255,.26);transform:scale(0);animation:ripple-wave .65s ease-out forwards;pointer-events:none;z-index:10`;
      btn.appendChild(el);
      setTimeout(() => el.remove(), 700);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);
}

export function confetti(cx, cy) {
  cx = cx ?? window.innerWidth / 2;
  cy = cy ?? window.innerHeight * 0.42;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const clrs = ["#00d4ff", "#7b2ff7", "#ffd700", "#ff6b6b", "#00ff9d", "#ff9f43"];
  const pts = Array.from({ length: 130 }, (_, i) => ({ x: cx, y: cy, vx: (Math.random() - 0.5) * 18, vy: -(Math.random() * 16 + 3), g: 0.44, clr: clrs[i % 6], w: 5 + Math.random() * 8, h: 3 + Math.random() * 5, rot: Math.random() * Math.PI * 2, rs: (Math.random() - 0.5) * 0.18, life: 1 }));
  let frame;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.rs; p.life -= 0.013; if (p.life <= 0) return; alive = true; ctx.save(); ctx.globalAlpha = p.life; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.clr; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
    if (alive) frame = requestAnimationFrame(draw); else document.body.removeChild(canvas);
  })();
}

export function flyToCart(e) {
  const cart = document.querySelector("[data-cart]");
  if (!cart) return;
  const src = e.currentTarget.getBoundingClientRect();
  const dst = cart.getBoundingClientRect();
  const cx = src.left + src.width / 2, cy = src.top + src.height / 2;
  const tx = dst.left + dst.width / 2, ty = dst.top + dst.height / 2;
  const el = document.createElement("div");
  const bg = getComputedStyle(cart).backgroundColor || "#00d4ff";
  el.style.cssText = `position:fixed;width:14px;height:14px;border-radius:50%;background:${bg};left:${cx - 7}px;top:${cy - 7}px;z-index:9998;pointer-events:none;transition:transform .55s cubic-bezier(.4,0,.2,1),opacity .55s ease`;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = `translate(${tx - cx}px,${ty - cy}px) scale(.2)`; el.style.opacity = "0"; }));
  setTimeout(() => { el.remove(); cart.style.transform = "scale(1.35)"; setTimeout(() => (cart.style.transform = ""), 280); }, 580);
}

export function CountUp({ val, pre = "", suf = "", dur = 1200 }) {
  const [n, setN] = useState(0);
  const ref = useRef();
  const done = useRef(false);
  useEffect(() => {
    if (!ref.current || done.current) return;
    const target = typeof val === "number" ? val : 0;
    const obs = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || done.current) return;
      done.current = true;
      let t0;
      const step = ts => { if (!t0) t0 = ts; const p = Math.min((ts - t0) / dur, 1); const ease = 1 - Math.pow(1 - p, 3); setN(Math.round(ease * target)); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [val, dur]);
  return typeof val === "number" ? <span ref={ref}>{pre}{n}{suf}</span> : <span>{val}</span>;
}
