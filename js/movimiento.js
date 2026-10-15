export function initHeader(header, reduceMotion) {
  if (!header) return;
  let lastY = window.scrollY;
  let intent = 0;
  let ticking = false;
  const trail = [];
  const mark = () => { intent = performance.now(); };
  window.addEventListener("wheel", mark, { passive: true });
  window.addEventListener("touchmove", mark, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "PageDown" || event.key === "PageUp" || event.key === " ") mark();
  });

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const dy = y - lastY;
    const now = performance.now();
    const user = now - intent < 260;
    if (user) trail.push({ y, t: now });
    while (trail.length && now - trail[0].t > 280) trail.shift();
    const span = trail.length ? y - trail[0].y : 0;
    const elapsed = trail.length ? Math.max(now - trail[0].t, 16) : 16;
    header.classList.toggle("is-scrolled", y > 24);
    const menuOpen = header.classList.contains("is-open");
    const locked = document.body.classList.contains("is-locked");
    const fastDown = user && span > 110 && span / elapsed > 0.6;
    if (!reduceMotion && fastDown && !menuOpen && !locked && y > 140) {
      header.classList.add("is-hidden");
    } else if (menuOpen || locked || y < 48 || (user && dy < -2)) {
      header.classList.remove("is-hidden");
      if (y < 48 || dy < -2) trail.length = 0;
    }
    lastY = y;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

export function initCounters(reduceMotion) {
  const nodes = [...document.querySelectorAll("[data-count]")];
  if (!nodes.length || reduceMotion || !("IntersectionObserver" in window)) return;
  nodes.forEach((el) => {
    el.textContent = "0";
  });
  const run = (el) => {
    const target = Number(el.getAttribute("data-count"));
    if (!Number.isFinite(target)) return;
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.7 });
  nodes.forEach((el) => observer.observe(el));
}

export function initParallax(reduceMotion) {
  if (reduceMotion) return;
  if (window.__pupilosPremium === "on") return;
  if (window.__pupilosPremium === "pending") {
    document.addEventListener("pupilos:motion-abort", function () {
      initParallax(reduceMotion);
    }, { once: true });
    return;
  }
  const media = window.matchMedia("(min-width: 900px)");
  const nodes = () => [...document.querySelectorAll("[data-parallax]")];
  if (!nodes().length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const items = nodes();
    if (!media.matches) {
      items.forEach((el) => el.style.removeProperty("--py"));
      return;
    }
    const view = window.innerHeight || 1;
    items.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > view + 40) return;
      const progress = (rect.top + rect.height / 2 - view / 2) / view;
      const shift = Math.max(-12, Math.min(12, progress * -14));
      el.style.setProperty("--py", shift.toFixed(2) + "px");
    });
  };
  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  if (media.addEventListener) media.addEventListener("change", request);
  update();
}

export function initPageLeave(reduceMotion) {
  if (window.__pupilosPremium === "on") return;
  if (window.__pupilosPremium === "pending") {
    document.addEventListener("pupilos:motion-abort", function () {
      initPageLeave(reduceMotion);
    }, { once: true });
    return;
  }
  const supportsVT = "startViewTransition" in document;
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a");
    if (!link || link.hasAttribute("data-open-reserva") || link.hasAttribute("download")) return;
    if (link.target && link.target !== "_self") return;
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (error) {
      return;
    }
    if (url.origin !== window.location.origin) return;
    const file = url.pathname.split("/").pop();
    if (file !== "" && file !== "index.html" && file !== "historia.html") return;
    if (url.pathname === window.location.pathname && url.hash) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;
    if (supportsVT) return;
    event.preventDefault();
    try { sessionStorage.setItem("pb-page", "1"); } catch (error) {}
    document.documentElement.classList.add("is-leave");
    requestAnimationFrame(() => {
      document.documentElement.classList.add("is-leave-on");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, reduceMotion ? 180 : 360);
    });
  });
}

export function initHeroEntrance(reduceMotion) {
  const hero = document.querySelector(".hero");
  const h1 = hero && hero.querySelector("h1");
  const lead = hero && hero.querySelector(".hero-lead");
  const actions = hero && hero.querySelector(".hero-actions");
  if (!hero || !h1) return;

  const live = (lines) => {
    hero.classList.add("is-live");
    h1.classList.add("is-split");
    const base = 0.1 + lines * 0.13;
    if (lead) lead.style.animationDelay = (base + 0.2) + "s";
    if (actions) actions.style.animationDelay = (base + 0.36) + "s";
  };

  const split = () => {
    const words = h1.textContent.trim().split(/\s+/);
    h1.textContent = "";
    const nodes = words.map((word, index) => {
      const span = document.createElement("span");
      span.className = "hero-word";
      span.textContent = word;
      h1.appendChild(span);
      if (index < words.length - 1) h1.appendChild(document.createTextNode(" "));
      return span;
    });
    const lines = [];
    let line = [];
    let top = null;
    nodes.forEach((node) => {
      const y = node.offsetTop;
      if (top === null || Math.abs(y - top) <= 3) {
        line.push(node);
        top = y;
      } else {
        lines.push(line);
        line = [node];
        top = y;
      }
    });
    if (line.length) lines.push(line);
    h1.replaceChildren();
    lines.forEach((group, index) => {
      const outer = document.createElement("span");
      outer.className = "hero-line";
      const inner = document.createElement("span");
      inner.style.animationDelay = (0.08 + index * 0.13) + "s";
      group.forEach((node, i) => {
        if (i) inner.appendChild(document.createTextNode(" "));
        inner.appendChild(node);
      });
      inner.addEventListener("animationend", () => {
        inner.style.willChange = "auto";
      });
      outer.appendChild(inner);
      h1.appendChild(outer);
    });
    live(lines.length);
  };

  const start = () => {
    if (h1.dataset.ready === "1") return;
    h1.dataset.ready = "1";
    if (reduceMotion) {
      live(0);
      return;
    }
    split();
  };

  const launch = () => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
      window.setTimeout(start, 1400);
    } else start();
  };

  if (window.__pupilosPremium === "on") return;
  if (window.__pupilosPremium === "pending" || document.documentElement.classList.contains("is-booting")) {
    const css = () => {
      if (window.__pupilosPremium !== "off") return;
      launch();
    };
    document.addEventListener("pupilos:hero-css", css, { once: true });
    window.setTimeout(css, 2400);
    return;
  }
  launch();
}
