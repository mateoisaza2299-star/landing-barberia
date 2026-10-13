import { supabase } from "./supabase.js";

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

  const dateInput = document.querySelector("[data-min-today]");
  const hoursBox = document.querySelector("[data-hours]");
  const hoursNote = document.querySelector("[data-hours-note]");
  const formError = document.querySelector("[data-form-error]");
  const reservaForm = document.querySelector("[data-reserva-form]");
  const reservaIntro = document.querySelector("[data-reserva-intro]");
  const reservaDone = document.querySelector("[data-reserva-done]");
  const reservaSummary = document.querySelector("[data-reserva-summary]");
  const reservaWa = document.querySelector("[data-reserva-wa]");
  const submitBtn = document.querySelector("[data-reserva-submit]");
  let chosenHour = "";

  const bogotaParts = () => new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const bogotaToday = () => {
    const parts = bogotaParts();
    const pick = (type) => parts.find((item) => item.type === type).value;
    return pick("year") + "-" + pick("month") + "-" + pick("day");
  };

  const today = bogotaToday();
  if (dateInput) dateInput.min = today;

  const weekdayOf = (iso) => {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  };

  const slotsFor = (iso) => {
    const day = weekdayOf(iso);
    if (day === 0) return [];
    const last = day === 6 ? 15 : 17;
    const slots = [];
    for (let hour = 9; hour <= last; hour += 1) slots.push(String(hour).padStart(2, "0") + ":00");
    return slots;
  };

  const hourLabel = (hhmm) => {
    const hour = Number(hhmm.slice(0, 2));
    const suffix = hour < 12 ? "am" : "pm";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return hour12 + ":00 " + suffix;
  };

  const showError = (message) => {
    formError.hidden = !message;
    formError.textContent = message || "";
  };

  const showForm = () => {
    reservaIntro.hidden = false;
    reservaDone.hidden = true;
    chosenHour = "";
    showError("");
  };

  const renderHours = (iso, taken) => {
    hoursBox.replaceChildren();
    chosenHour = "";
    if (!iso) {
      hoursNote.hidden = false;
      hoursNote.textContent = "Elige una fecha para ver las horas.";
      return;
    }
    if (weekdayOf(iso) === 0) {
      hoursNote.hidden = false;
      hoursNote.textContent = "Los domingos no abrimos. Elige otro día.";
      return;
    }
    const now = bogotaParts();
    const nowHour = Number(now.find((item) => item.type === "hour").value);
    const nowMinute = Number(now.find((item) => item.type === "minute").value);
    const isToday = iso === bogotaToday();
    hoursNote.hidden = true;
    slotsFor(iso).forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = hourLabel(slot);
      const slotHour = Number(slot.slice(0, 2));
      const past = isToday && (slotHour < nowHour || (slotHour === nowHour && nowMinute > 0));
      const busy = taken.has(slot);
      button.disabled = past || busy;
      if (busy) button.title = "Hora ocupada";
      button.addEventListener("click", () => {
        chosenHour = slot;
        hoursBox.querySelectorAll(".slot").forEach((item) => {
          item.classList.toggle("is-selected", item === button);
        });
        showError("");
      });
      hoursBox.appendChild(button);
    });
  };

  const loadHours = async (iso) => {
    if (!iso || weekdayOf(iso) === 0) {
      renderHours(iso, new Set());
      return;
    }
    hoursNote.hidden = false;
    hoursNote.textContent = "Cargando horas…";
    hoursBox.replaceChildren();
    try {
      const { data, error } = await supabase.rpc("horas_ocupadas", { p_fecha: iso });
      if (error) throw error;
      const taken = new Set((data || []).map((row) => String(row.hora || row).slice(0, 5)));
      renderHours(iso, taken);
    } catch (error) {
      hoursNote.hidden = false;
      hoursNote.textContent = "No pudimos cargar las horas. Intenta de nuevo.";
      hoursBox.replaceChildren();
    }
  };

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      showError("");
      loadHours(dateInput.value);
    });
  }

  const trackVisit = async () => {
    try {
      if (sessionStorage.getItem("pb_visit")) return;
      sessionStorage.setItem("pb_visit", "1");
      let visitorId = localStorage.getItem("pb_visitor");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("pb_visitor", visitorId);
      }
      await supabase.from("visitas").insert({ visitor_id: visitorId }, { returning: "minimal" });
    } catch (error) {}
  };
  trackVisit();

  let lastTrigger = null;

  const openModal = (trigger) => {
    lastTrigger = trigger;
    setMenu(false);
    showForm();
    modal.hidden = false;
    lock(true);
    const field = modal.querySelector("[name='nombre']");
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

  reservaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");
    const data = new FormData(reservaForm);
    if (String(data.get("empresa") || "").trim()) {
      reservaIntro.hidden = true;
      reservaDone.hidden = false;
      return;
    }

    const nombre = String(data.get("nombre") || "").trim();
    const telefono = String(data.get("telefono") || "").trim();
    const servicio = String(data.get("servicio") || "").trim();
    const barbero = String(data.get("barbero") || "").trim();
    const fecha = String(data.get("fecha") || "").trim();
    const nota = String(data.get("nota") || "").trim();
    const digits = telefono.replace(/\D/g, "");

    if (nombre.length < 2) {
      showError("Escribe tu nombre.");
      return;
    }
    if (digits.length < 7 || digits.length > 15) {
      showError("Escribe un teléfono válido.");
      return;
    }
    if (!servicio) {
      showError("Elige un servicio.");
      return;
    }
    if (!fecha || fecha < bogotaToday()) {
      showError("Elige una fecha de hoy en adelante.");
      return;
    }
    if (weekdayOf(fecha) === 0) {
      showError("Los domingos no abrimos. Elige otro día.");
      return;
    }
    if (!chosenHour) {
      showError("Elige una hora libre.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando…";
    const { error } = await supabase.from("reservas").insert({
      nombre,
      telefono,
      servicio,
      barbero,
      fecha,
      hora: chosenHour + ":00",
      nota: nota || null,
      estado: "pendiente"
    }, { returning: "minimal" });
    submitBtn.disabled = false;
    submitBtn.textContent = "Reservar cita";

    if (error) {
      const duplicate = error.code === "23505" || /duplicate|unique|duplicad/i.test(error.message || "");
      showError(duplicate
        ? "Esa hora ya fue tomada. Elige otra."
        : "No pudimos guardar la cita. Intenta de nuevo.");
      if (duplicate) loadHours(fecha);
      return;
    }

    const lines = [
      "Hola, soy " + nombre + ". Acabo de reservar en Pupilos Barber.",
      "Servicio: " + servicio + ".",
      "Barbero: " + barbero + ".",
      "Fecha: " + fecha + ".",
      "Hora: " + hourLabel(chosenHour) + ".",
      "Teléfono: " + telefono + "."
    ];
    if (nota) lines.push("Nota: " + nota + ".");
    reservaSummary.textContent = nombre + " · " + servicio + " · " + fecha + " · " + hourLabel(chosenHour);
    reservaWa.href = "https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(lines.join("\n"));
    reservaIntro.hidden = true;
    reservaDone.hidden = false;
    reservaWa.focus();
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
