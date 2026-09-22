/* Pupilos Barber — interacciones de la landing.
   El número de WhatsApp vive en <body data-whatsapp="...">. */

(function () {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const modal = document.querySelector("[data-modal]");
  const whatsapp = document.body.dataset.whatsapp || "573001234567";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("js");
  const lock = (on) => document.body.classList.toggle("is-locked", on);

  /* Navbar al hacer scroll */
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Menú móvil */
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "Cerrar menú" : "Abrir menú";
    lock(open || !modal.hidden);
  };

  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 960) setMenu(false);
    });
  });

  /* Sección activa */
  const links = [...document.querySelectorAll(".nav-link")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = "#" + entry.target.id;
          links.forEach((link) => {
            if (link.getAttribute("href") === id) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach((section) => spy.observe(section));
  }

  /* Aparición al scroll */
  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.16 }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }

  /* Carrusel de reseñas */
  const carousel = document.querySelector("[data-carousel]");
  const slides = [...carousel.querySelectorAll(".quote")];
  const dotsWrap = carousel.querySelector("[data-dots]");
  let index = 0;
  let timer;

  slides.forEach((slide, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", "Reseña " + (i + 1));
    dot.addEventListener("click", () => show(i, true));
    dotsWrap.appendChild(dot);
  });

  const dots = [...dotsWrap.children];

  function show(next, user) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, i) => dot.setAttribute("aria-selected", String(i === index)));
    if (user) restart();
  }

  function restart() {
    clearInterval(timer);
    if (reduceMotion) return;
    timer = setInterval(() => show(index + 1), 7000);
  }

  carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => show(index - 1, true));
  carousel.querySelector("[data-carousel-next]").addEventListener("click", () => show(index + 1, true));
  carousel.addEventListener("mouseenter", () => clearInterval(timer));
  carousel.addEventListener("mouseleave", restart);
  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1, true);
    if (event.key === "ArrowRight") show(index + 1, true);
  });
  show(0);
  restart();

  /* Reserva → WhatsApp */
  const dateInput = document.querySelector("[data-min-today]");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  if (dateInput) dateInput.min = today;

  let lastTrigger = null;

  const openModal = (trigger) => {
    lastTrigger = trigger;
    setMenu(false);
    modal.hidden = false;
    lock(true);
    const field = modal.querySelector("input, select, textarea");
    if (field) field.focus();
  };

  const closeModal = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    lock(nav.classList.contains("is-open"));
    if (lastTrigger) lastTrigger.focus();
  };

  document.querySelectorAll("[data-open-reserva]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(trigger);
    });
  });

  modal.querySelectorAll("[data-close-reserva]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!modal.hidden) closeModal();
    else if (nav.classList.contains("is-open")) setMenu(false);
  });

  document.querySelector("[data-reserva-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nombre = String(data.get("nombre") || "").trim();
    const servicio = String(data.get("servicio") || "").trim();
    const barbero = String(data.get("barbero") || "").trim();
    const dia = String(data.get("dia") || "").trim();
    const nota = String(data.get("nota") || "").trim();

    const lines = [
      "Hola, soy " + nombre + ". Quiero reservar una cita en Pupilos Barber.",
      "Servicio: " + servicio + ".",
      "Barbero: " + barbero + "."
    ];
    if (dia) lines.push("Día preferido: " + dia + ".");
    if (nota) lines.push("Nota: " + nota);

    window.open("https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
    closeModal();
  });

  /* Abierto / cerrado según la hora en Funza (America/Bogota). */
  const status = document.querySelector("[data-open-status]");
  const label = document.querySelector("[data-open-label]");
  const bogota = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const part = (type) => bogota.find((item) => item.type === type).value;
  const weekday = part("weekday").slice(0, 3);
  const minutes = Number(part("hour")) * 60 + Number(part("minute"));
  const open = weekday === "Sat" ? minutes >= 540 && minutes < 1020
    : weekday === "Sun" ? false
    : minutes >= 540 && minutes < 1140;

  status.classList.add(open ? "is-open" : "is-closed");
  label.textContent = open ? "Abierto ahora" : "Cerrado ahora";

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
