(function () {
  const root = document.querySelector("[data-hero]");
  const scroller = document.querySelector("[data-hero-slides]");
  const controls = document.querySelector("[data-hero-controls]");
  const dotsWrap = document.querySelector("[data-hero-dots]");
  const prev = document.querySelector("[data-hero-prev]");
  const next = document.querySelector("[data-hero-next]");
  if (!root || !scroller || !controls || !dotsWrap || !prev || !next) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = root.closest(".hero") || root;
  const catalog = [
    {
      src: "assets/hero/06-local.jpg",
      alt: "Interior de Miami Cuts en Fusagasugá, con espejo, sillón y luz cálida",
      width: 1280,
      height: 1707
    },
    {
      src: "assets/hero-corte.jpg",
      alt: "Barbero cortando el cabello de un cliente bajo luz cálida en Miami Cuts",
      width: 1280,
      height: 720
    },
    {
      src: "assets/hero/02-sillon.jpg",
      alt: "Sillón de barbería en cuero, madera oscura y luz cálida",
      width: 1152,
      height: 864
    },
    {
      src: "assets/hero/01-corte.jpg",
      alt: "Corte en la silla de Miami Cuts",
      width: 1280,
      height: 720
    },
    {
      src: "assets/hero/04-luz.jpg",
      alt: "Interior de la barbería con luz de aplique",
      width: 1152,
      height: 864
    },
    {
      src: "assets/hero/03-detalle.jpg",
      alt: "Detalle del corte bajo la luz de la barbería",
      width: 1280,
      height: 720
    },
    {
      src: "assets/hero/05-interior.jpg",
      alt: "Espacio de la barbería en Fusagasugá",
      width: 1280,
      height: 720
    }
  ];

  const known = new Set([...scroller.querySelectorAll("img")].map((img) => img.getAttribute("src")));
  catalog.forEach((item) => {
    if (known.has(item.src)) return;
    const slide = document.createElement("div");
    slide.className = "hero-slide";
    const picture = document.createElement("picture");
    const source = document.createElement("source");
    const stem = item.src.replace(/\.jpe?g$/, "");
    source.type = "image/webp";
    source.srcset = stem + "-640.webp 640w, " + stem + ".webp " + item.width + "w";
    source.sizes = "100vw";
    const img = document.createElement("img");
    img.src = item.src;
    img.srcset = stem + "-640.jpg 640w, " + item.src + " " + item.width + "w";
    img.sizes = "100vw";
    img.alt = item.alt;
    img.width = item.width;
    img.height = item.height;
    img.loading = "lazy";
    img.decoding = "async";
    picture.append(source, img);
    slide.appendChild(picture);
    scroller.appendChild(slide);
    known.add(item.src);
  });

  let slides = [...scroller.querySelectorAll(".hero-slide")];
  let index = 0;
  let timer = 0;
  let hoverPaused = false;
  let pointerPaused = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;

  function live() {
    slides = [...scroller.querySelectorAll(".hero-slide")];
    return slides;
  }

  function paintDots() {
    dotsWrap.replaceChildren();
    slides.forEach((slide, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hero-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Foto " + (i + 1));
      dot.addEventListener("click", () => show(i, true));
      dotsWrap.appendChild(dot);
    });
  }

  function syncControls() {
    const single = slides.length < 2;
    controls.hidden = single;
    controls.classList.toggle("is-ready", !single);
    prev.disabled = single;
    next.disabled = single;
  }

  function show(nextIndex, user) {
    if (!slides.length) {
      syncControls();
      return;
    }
    index = ((nextIndex % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    [...dotsWrap.children].forEach((dot, i) => {
      const selected = i === index;
      dot.setAttribute("aria-selected", String(selected));
      dot.tabIndex = selected ? 0 : -1;
    });
    if (user) arm();
  }

  function arm() {
    clearInterval(timer);
    timer = 0;
    if (reduce || slides.length < 2 || hoverPaused || pointerPaused || document.hidden) return;
    timer = window.setInterval(() => show(index + 1, false), 5000);
  }

  function drop(slide) {
    if (!slide.isConnected) return;
    const wasActive = slide.classList.contains("is-active");
    const position = slides.indexOf(slide);
    slide.remove();
    live();
    paintDots();
    if (!slides.length) {
      syncControls();
      clearInterval(timer);
      return;
    }
    if (wasActive) show(Math.min(position, slides.length - 1), false);
    else {
      if (position > -1 && position < index) index -= 1;
      show(index, false);
    }
    syncControls();
    arm();
  }

  function watch(slide) {
    const img = slide.querySelector("img");
    if (!img) {
      drop(slide);
      return;
    }
    const failed = () => drop(slide);
    img.addEventListener("error", failed);
    if (img.complete && img.naturalWidth === 0) failed();
  }

  slides.forEach(watch);
  live();
  paintDots();
  if (!slides.length) {
    syncControls();
    return;
  }
  if (!slides.some((slide) => slide.classList.contains("is-active"))) slides[0].classList.add("is-active");
  show(slides.findIndex((slide) => slide.classList.contains("is-active")), false);
  syncControls();
  arm();

  prev.addEventListener("click", () => show(index - 1, true));
  next.addEventListener("click", () => show(index + 1, true));

  hero.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hoverPaused = true;
    arm();
  });
  hero.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    hoverPaused = false;
    arm();
  });

  hero.addEventListener("pointerdown", (event) => {
    if (slides.length < 2) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("a, button")) return;
    pointerPaused = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    if (hero.setPointerCapture) {
      try { hero.setPointerCapture(event.pointerId); } catch (error) {}
    }
    arm();
  });

  function endPointer(event, swipe) {
    if (!pointerPaused || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    pointerPaused = false;
    pointerId = null;
    if (swipe && slides.length > 1 && Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      show(dx < 0 ? index + 1 : index - 1, true);
      return;
    }
    arm();
  }

  hero.addEventListener("pointerup", (event) => endPointer(event, true));
  hero.addEventListener("pointercancel", (event) => endPointer(event, false));
  document.addEventListener("visibilitychange", arm);

  hero.addEventListener("keydown", (event) => {
    if (slides.length < 2) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (!event.target.closest("[data-hero], [data-hero-controls]")) return;
    event.preventDefault();
    show(event.key === "ArrowLeft" ? index - 1 : index + 1, true);
  });
})();
