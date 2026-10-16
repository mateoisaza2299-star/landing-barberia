import { supabase } from "./supabase.js";
import { initScrollChrome, initCounters } from "./movimiento.js";
import {
  negocio,
  horasDelDia,
  diaSemana,
  celularColombia,
  estadoApertura,
  enlaceWhatsapp,
  minutosDe,
  direccionLinea,
  avisoDuracion
} from "./config.js";

(function () {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const modal = document.querySelector("[data-modal]");
  const whatsapp = negocio.whatsapp || document.body.dataset.whatsapp || "573209604364";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const contactKey = "mc_contacto";
  const fichaKey = "mc_fichas";
  let reagendarToken = "";
  let lastBooking = null;

  document.documentElement.classList.add("js");
  const lock = (on) => document.body.classList.toggle("is-locked", on);

  initScrollChrome(header);
  initCounters(reduceMotion);

  /* Menú móvil */
  const setMenu = (open) => {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    if (header) header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    const menuLabel = toggle.querySelector(".sr-only");
    if (menuLabel) menuLabel.textContent = open ? "Cerrar menú" : "Abrir menú";
    lock(open || (modal ? !modal.hidden : false));
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 960) setMenu(false);
      });
    });
  }

  /* Sección activa */
  const links = [...document.querySelectorAll(".nav-link")];
  const sections = links
    .map((link) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return null;
      return document.querySelector(href);
    })
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

  /* Aparición al scroll, una sola vez */
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
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }
  window.__mcMotion = "ready";

  /* Carrusel de reseñas */
  const carousel = document.querySelector("[data-carousel]");
  if (carousel) {
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
  }

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

  const weekdayOf = (iso) => diaSemana(iso);

  const slotsFor = (iso) => horasDelDia(iso);

  const hourLabel = (hhmm) => {
    const hour = Number(hhmm.slice(0, 2));
    const suffix = hour < 12 ? "am" : "pm";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return hour12 + ":00 " + suffix;
  };

  const showError = (message) => {
    if (!formError) return;
    formError.hidden = !message;
    formError.textContent = message || "";
  };

  const citaTracker = (() => {
      const empty = { track() {}, hush() {}, datos() { return null; }, marcar() {} };
    try {
      const card = document.querySelector("[data-cita]");
      const live = document.querySelector("[data-reserva-estado]");
      const serviceEl = card && card.querySelector("[data-cita-servicio]");
      const whenEl = card && card.querySelector("[data-cita-cuando]");
      const stateEl = card && card.querySelector("[data-cita-estado]");
      const closeBtn = card && card.querySelector("[data-cita-close]");
      if (!card || !live || !serviceEl || !whenEl || !stateEl || !closeBtn) return empty;

      const storageKey = "mc_citas";
      const hideKey = "mc_cita_hide";
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const messages = {
        pendiente: "Esperando confirmación del barbero",
        confirmada: "Cita confirmada. Te esperamos",
        cancelada: "Tu cita fue cancelada. Escríbenos por WhatsApp para reagendar"
      };
      let tokens = [];
      const cache = new Map();
      const seen = new Map();
      let hiddenToken = "";
      let hiddenEstado = "";
      let bookedToken = "";
      let flight = null;
      let again = false;
      let cardMark = "";
      let liveMark = "";

      const readHide = () => {
        try {
          const raw = sessionStorage.getItem(hideKey) || "";
          const cut = raw.indexOf("|");
          if (cut < 1) return;
          hiddenToken = raw.slice(0, cut);
          hiddenEstado = raw.slice(cut + 1);
        } catch (error) {}
      };

      const writeHide = () => {
        try {
          if (!hiddenToken) sessionStorage.removeItem(hideKey);
          else sessionStorage.setItem(hideKey, hiddenToken + "|" + hiddenEstado);
        } catch (error) {}
      };

      const readTokens = () => {
        try {
          const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
          if (!Array.isArray(parsed)) return [];
          const unique = [];
          parsed.forEach((item) => {
            const token = String(item || "").trim().toLowerCase();
            if (!uuidRe.test(token) || unique.includes(token)) return;
            unique.push(token);
          });
          return unique.slice(0, 5);
        } catch (error) {
          return [];
        }
      };

      const writeTokens = () => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(tokens));
        } catch (error) {}
      };

      const remember = (token) => {
        const clean = String(token || "").trim().toLowerCase();
        if (!uuidRe.test(clean)) return;
        tokens = [clean, ...tokens.filter((item) => item !== clean)].slice(0, 5);
        writeTokens();
      };

      const rowOf = (data) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || typeof row !== "object") return null;
        if (!row.estado && !row.fecha && !row.servicio && !row.hora) return null;
        return row;
      };

      const estadoOf = (row) => String((row && row.estado) || "").trim().toLowerCase();

      const fechaOf = (row) => String((row && row.fecha) || "").slice(0, 10);

      const activeOf = (token) => {
        const row = cache.get(token);
        if (!row) return null;
        const estado = estadoOf(row);
        if (!messages[estado]) return null;
        const fecha = fechaOf(row);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < bogotaToday()) return null;
        return { token, row, estado };
      };

      const current = () => {
        for (let i = 0; i < tokens.length; i += 1) {
          const item = activeOf(tokens[i]);
          if (item) return item;
        }
        return null;
      };

      const whenText = (row) => {
        const fecha = fechaOf(row);
        let day = fecha;
        const bits = fecha.split("-").map(Number);
        if (bits.length === 3 && bits[0] && bits[1] && bits[2]) {
          try {
            day = new Intl.DateTimeFormat("es-CO", {
              timeZone: "UTC",
              day: "numeric",
              month: "short"
            }).format(new Date(Date.UTC(bits[0], bits[1] - 1, bits[2])));
          } catch (error) {}
        }
        const hora = row && row.hora ? hourLabel(String(row.hora)) : "";
        return hora ? day + " · " + hora : day;
      };

      const flash = (el) => {
        el.classList.remove("is-highlight");
        void el.offsetWidth;
        el.classList.add("is-highlight");
      };

      const writeState = (el, estado) => {
        const message = messages[estado] || "";
        el.replaceChildren();
        el.classList.toggle("is-confirmada", estado === "confirmada");
        el.classList.toggle("is-cancelada", estado === "cancelada");
        if (!message) {
          el.hidden = true;
          return;
        }
        el.hidden = false;
        if (estado === "confirmada") {
          const badge = document.createElement("span");
          badge.className = "cita-badge";
          badge.textContent = "Confirmada";
          const copy = document.createElement("span");
          copy.textContent = message;
          el.append(badge, copy);
          return;
        }
        el.textContent = message;
      };

      const paint = () => {
        try {
          const item = current();
          let pulseCard = false;
          let pulseLive = false;
          tokens.forEach((token) => {
            const row = cache.get(token);
            if (!row) return;
            const estado = estadoOf(row);
            const prior = seen.get(token);
            if (prior && prior !== estado && estado === "confirmada") {
              if (item && item.token === token) pulseCard = true;
              if (token === bookedToken) pulseLive = true;
            }
            seen.set(token, estado);
          });

          const dismissed = item && item.token === hiddenToken && item.estado === hiddenEstado;
          if (!item || dismissed) {
            card.hidden = true;
          } else {
            const service = item.row.servicio || "Cita";
            const when = whenText(item.row);
            const nextCard = item.estado + "\n" + service + "\n" + when;
            if (cardMark !== nextCard) {
              serviceEl.textContent = service;
              whenEl.textContent = when;
              writeState(stateEl, item.estado);
              cardMark = nextCard;
            }
            card.hidden = false;
            paintActions(item);
            if (item.estado === "cancelada") setNote("");
            if (pulseCard) flash(card);
          }

          const booked = bookedToken ? activeOf(bookedToken) : null;
          if (!booked) {
            live.hidden = true;
            live.classList.remove("is-highlight");
            return;
          }
          const nextLive = booked.estado + "\n" + whenText(booked.row);
          if (liveMark !== nextLive) {
            writeState(live, booked.estado);
            liveMark = nextLive;
          } else if (live.hidden) {
            live.hidden = false;
          }
          if (pulseLive) flash(live);
        } catch (error) {}
      };

      const runRefresh = async () => {
        const snapshot = tokens.slice();
        const kept = [];
        for (let i = 0; i < snapshot.length; i += 1) {
          const token = snapshot[i];
          try {
            const { data, error } = await supabase.rpc("estado_reserva", { p_token: token });
            if (error) throw error;
            const row = rowOf(data);
            if (!row) {
              cache.delete(token);
              seen.delete(token);
              continue;
            }
            cache.set(token, row);
            kept.push(token);
          } catch (error) {
            kept.push(token);
          }
        }
        const added = tokens.filter((token) => !snapshot.includes(token));
        tokens = [...added, ...kept.filter((token) => !added.includes(token))].slice(0, 5);
        writeTokens();
        paint();
      };

      const refresh = () => {
        if (flight) {
          again = true;
          return flight;
        }
        flight = runRefresh().catch(() => {}).finally(() => {
          flight = null;
          if (!again) return;
          again = false;
          refresh();
        });
        return flight;
      };

      const cancelBtn = card.querySelector("[data-cita-cancel]");
      const note = card.querySelector("[data-cita-note]");

      const fichaDe = (token) => {
        try {
          const all = JSON.parse(localStorage.getItem(fichaKey) || "{}");
          return (all && all[token]) || {};
        } catch (error) {
          return {};
        }
      };

      const setNote = (message, link) => {
        if (!note) return;
        note.replaceChildren();
        if (!message) {
          note.hidden = true;
          return;
        }
        note.hidden = false;
        note.appendChild(document.createTextNode(message));
        if (!link) return;
        const anchor = document.createElement("a");
        anchor.href = link;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        anchor.textContent = "Escríbenos por WhatsApp";
        note.appendChild(document.createTextNode(" "));
        note.appendChild(anchor);
        note.appendChild(document.createTextNode("."));
      };

      const paintActions = (item) => {
        if (cancelBtn) {
          const can = !!(item && (item.estado === "pendiente" || item.estado === "confirmada"));
          cancelBtn.hidden = !can;
        }
        const moveBtn = card.querySelector("[data-cita-reagendar]");
        if (moveBtn) moveBtn.hidden = !item;
      };

      closeBtn.addEventListener("click", () => {
        try {
          const item = current();
          if (item) {
            hiddenToken = item.token;
            hiddenEstado = item.estado;
            writeHide();
          }
          card.hidden = true;
        } catch (error) {}
      });

      if (cancelBtn) cancelBtn.addEventListener("click", async () => {
        try {
          const item = current();
          if (!item || cancelBtn.disabled) return;
          if (!window.confirm("¿Seguro que quieres cancelar esta cita?")) return;
          cancelBtn.disabled = true;
          cancelBtn.textContent = "Cancelando…";
          setNote("");
          const result = await supabase.rpc("cancelar_reserva", { p_token: item.token });
          if (result.error) throw result.error;
          const denied = result.data === false || result.data === "false";
          if (denied) {
            setNote("Esta cita ya no se puede cancelar.", enlaceWhatsapp("Hola, quiero cancelar mi cita en " + negocio.nombre + "."));
            return;
          }
          const row = cache.get(item.token) || item.row || {};
          cache.set(item.token, { ...row, estado: "cancelada" });
          seen.set(item.token, "cancelada");
          setNote("");
          paint();
        } catch (error) {
          setNote("No pudimos cancelar la cita. Intenta de nuevo o escríbenos por WhatsApp.", enlaceWhatsapp("Hola, quiero cancelar mi cita en " + negocio.nombre + "."));
        } finally {
          cancelBtn.disabled = false;
          cancelBtn.textContent = "Cancelar cita";
        }
      });

      readHide();
      tokens = readTokens();
      try {
        const cited = String(new URLSearchParams(window.location.search).get("cita") || "").trim().toLowerCase();
        if (uuidRe.test(cited)) {
          if (hiddenToken === cited) {
            hiddenToken = "";
            hiddenEstado = "";
            writeHide();
          }
          remember(cited);
        }
      } catch (error) {}

      document.addEventListener("visibilitychange", () => {
        try {
          if (document.visibilityState === "visible") refresh();
        } catch (error) {}
      });

      window.setInterval(() => {
        try {
          if (document.visibilityState === "visible") refresh();
        } catch (error) {}
      }, 30000);

      refresh();

      return {
        track(token, seed) {
          try {
            remember(token);
            bookedToken = token;
            if (seed) cache.set(token, seed);
            paint();
            refresh();
          } catch (error) {}
        },
        hush() {
          try {
            bookedToken = "";
            liveMark = "";
            live.hidden = true;
            live.classList.remove("is-highlight");
          } catch (error) {}
        },
        datos() {
          try {
            const item = current();
            if (!item) return null;
            const extra = fichaDe(item.token);
            const row = item.row || {};
            return {
              token: item.token,
              servicio: row.servicio || extra.servicio || "",
              nombre: row.nombre || extra.nombre || "",
              telefono: row.telefono || extra.telefono || "",
              barbero: row.barbero || extra.barbero || "",
              nota: row.nota || extra.nota || ""
            };
          } catch (error) {
            return null;
          }
        },
        marcar(token, estado) {
          try {
            const row = cache.get(token) || {};
            cache.set(token, { ...row, estado });
            seen.set(token, estado);
            paint();
          } catch (error) {}
        }
      };
    } catch (error) {
      return empty;
    }
  })();

  const showForm = () => {
    if (!reservaIntro || !reservaDone) return;
    reservaIntro.hidden = false;
    reservaDone.hidden = true;
    chosenHour = "";
    showError("");
    citaTracker.hush();
    const panel = modal && modal.querySelector(".modal-panel");
    if (panel) panel.setAttribute("aria-labelledby", "reserva-title");
  };

  const renderHours = (iso, taken) => {
    if (!hoursBox || !hoursNote) return;
    hoursBox.replaceChildren();
    chosenHour = "";
    if (!iso) {
      hoursNote.hidden = false;
      hoursNote.textContent = "Elige una fecha para ver las horas.";
      return;
    }
    const slots = slotsFor(iso);
    if (!slots.length) {
      const regla = negocio.horario.find((item) => item.dias.includes(weekdayOf(iso)));
      hoursNote.hidden = false;
      hoursNote.textContent = regla && regla.cerrado ? "Ese día no abrimos. Elige otro día." : "Ese día no hay horas. Elige otro día.";
      return;
    }
    const now = bogotaParts();
    const nowHour = Number(now.find((item) => item.type === "hour").value);
    const nowMinute = Number(now.find((item) => item.type === "minute").value);
    const isToday = iso === bogotaToday();
    hoursNote.hidden = true;
    slots.forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = hourLabel(slot);
      const slotHour = Number(slot.slice(0, 2));
      const past = isToday && (slotHour < nowHour || (slotHour === nowHour && nowMinute > 0));
      const busy = taken.has(slot);
      button.disabled = past || busy;
      if (busy) button.title = "Hora ocupada";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        chosenHour = slot;
        hoursBox.querySelectorAll(".slot").forEach((item) => {
          const selected = item === button;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        showError("");
      });
      hoursBox.appendChild(button);
    });
  };

  const loadHours = async (iso) => {
    if (!hoursBox || !hoursNote) return;
    if (!iso || !slotsFor(iso).length) {
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

  if (hoursBox) {
    hoursBox.addEventListener("keydown", (event) => {
      const buttons = [...hoursBox.querySelectorAll(".slot:not(:disabled)")];
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      const cols = 3;
      let next = -1;
      if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
      if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === "ArrowDown") next = Math.min(buttons.length - 1, index + cols);
      if (event.key === "ArrowUp") next = Math.max(0, index - cols);
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      if (next < 0 || next === index) return;
      event.preventDefault();
      buttons[next].focus();
    });
  }

  const readContact = () => {
    try {
      return JSON.parse(localStorage.getItem(contactKey) || "null");
    } catch (error) {
      return null;
    }
  };

  const writeContact = (nombre, telefono, guardar) => {
    try {
      if (!guardar) {
        localStorage.removeItem(contactKey);
        return;
      }
      localStorage.setItem(contactKey, JSON.stringify({ nombre, telefono }));
    } catch (error) {}
  };

  const writeFicha = (token, ficha) => {
    try {
      if (!token) return;
      const all = JSON.parse(localStorage.getItem(fichaKey) || "{}");
      all[token] = ficha;
      const keys = Object.keys(all);
      keys.slice(0, Math.max(0, keys.length - 5)).forEach((key) => delete all[key]);
      localStorage.setItem(fichaKey, JSON.stringify(all));
    } catch (error) {}
  };

  const paintDuracion = () => {
    if (!reservaForm) return;
    const note = reservaForm.querySelector("[data-duracion-note]");
    const select = reservaForm.querySelector("[name='servicio']");
    if (!note || !select) return;
    const text = avisoDuracion(select.value);
    note.hidden = !text;
    note.textContent = text;
    note.classList.toggle("is-warn", /corto/.test(text));
  };

  if (reservaForm) {
    const select = reservaForm.querySelector("[name='servicio']");
    if (select) select.addEventListener("change", paintDuracion);
  }

  let lastTrigger = null;
  let closingModal = false;
  let closeToken = 0;

  const openModal = (trigger, prefill) => {
    if (!modal) return;
    closeToken += 1;
    closingModal = false;
    modal.classList.remove("is-closing");
    lastTrigger = trigger;
    setMenu(false);
    showForm();
    reagendarToken = prefill && prefill.token ? prefill.token : "";
    const title = modal.querySelector("#reserva-title");
    const lead = modal.querySelector("[data-reserva-lead]");
    if (title) title.textContent = reagendarToken ? "Elige la nueva fecha y hora" : "Tu cita en " + negocio.nombre;
    if (lead) {
      lead.textContent = reagendarToken
        ? "Completa día y hora. La cita anterior se cancela cuando guardemos la nueva."
        : "Elige día y hora. La cita queda pendiente hasta que la confirmemos.";
    }
    if (submitBtn) submitBtn.textContent = reagendarToken ? "Reagendar cita" : "Reservar cita";
    if (reservaForm && prefill) {
      const set = (name, value) => {
        const field = reservaForm.querySelector("[name='" + name + "']");
        if (field && value) field.value = value;
      };
      set("nombre", prefill.nombre);
      set("telefono", prefill.telefono);
      set("servicio", prefill.servicio);
      set("barbero", prefill.barbero);
      if (prefill.nota) set("nota", prefill.nota);
      const fecha = reservaForm.querySelector("[name='fecha']");
      if (fecha) fecha.value = "";
      if (hoursBox) hoursBox.replaceChildren();
      if (hoursNote) {
        hoursNote.hidden = false;
        hoursNote.textContent = "Elige una nueva fecha para ver las horas.";
      }
      chosenHour = "";
    } else if (reservaForm) {
      const saved = readContact();
      if (saved) {
        const nombre = reservaForm.querySelector("[name='nombre']");
        const tel = reservaForm.querySelector("[name='telefono']");
        if (nombre && !nombre.value.trim()) nombre.value = saved.nombre || "";
        if (tel && !tel.value.trim()) tel.value = saved.telefono || "";
      }
    }
    paintDuracion();
    modal.hidden = false;
    lock(true);
    const focusTarget = reagendarToken ? modal.querySelector("[name='fecha']") : modal.querySelector("[name='nombre']");
    if (focusTarget) focusTarget.focus();
  };

  const closeModal = () => {
    if (!modal || modal.hidden || closingModal) return;
    const token = ++closeToken;
    const finish = () => {
      if (token !== closeToken || modal.hidden) return;
      closingModal = false;
      modal.classList.remove("is-closing");
      modal.hidden = true;
      lock(nav ? nav.classList.contains("is-open") : false);
      if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
    };
    if (reduceMotion) {
      finish();
      return;
    }
    closingModal = true;
    modal.classList.add("is-closing");
    const panel = modal.querySelector(".modal-panel");
    const onEnd = (event) => {
      if (!panel || event.target !== panel) return;
      panel.removeEventListener("animationend", onEnd);
      finish();
    };
    if (panel) panel.addEventListener("animationend", onEnd);
    window.setTimeout(finish, 460);
  };

  document.querySelectorAll("[data-open-reserva]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      if (!modal) return;
      event.preventDefault();
      openModal(trigger);
    });
  });

  if (modal) {
    modal.querySelectorAll("[data-close-reserva]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const sheet = document.querySelector("[data-service-modal]");
    if (sheet && !sheet.hidden) return;
    if (modal && !modal.hidden) closeModal();
    else if (nav && nav.classList.contains("is-open")) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (!modal || modal.hidden || event.key !== "Tab") return;
    const sheet = document.querySelector("[data-service-modal]");
    if (sheet && !sheet.hidden) return;
    const panel = modal.querySelector(".modal-panel");
    if (!panel) return;
    const nodes = [...panel.querySelectorAll("a[href], button, input, select, textarea")].filter((el) => {
      if (el.disabled || el.closest(".hp") || el.closest("[hidden]")) return false;
      if (el.tabIndex < 0) return false;
      return el.getClientRects().length > 0;
    });
    if (!nodes.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }, true);

  document.querySelectorAll("[data-cita-reagendar]").forEach((button) => {
    button.addEventListener("click", () => {
      const datos = citaTracker.datos();
      if (!datos) return;
      openModal(button, datos);
    });
  });

  document.addEventListener("mc:reservar", (event) => {
    const detail = (event && event.detail) || {};
    const select = reservaForm ? reservaForm.querySelector("[name='servicio']") : null;
    if (select && detail.servicio) {
      const match = [...select.options].some((option) => option.value === detail.servicio);
      if (match) select.value = detail.servicio;
    }
    openModal(detail.trigger || null);
  });

  if (reservaForm) reservaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");
    const data = new FormData(reservaForm);
    if (String(data.get("empresa") || "").trim()) {
      citaTracker.hush();
      reservaIntro.hidden = true;
      reservaDone.hidden = false;
      return;
    }

    const nombre = String(data.get("nombre") || "").trim();
    const telefono = String(data.get("telefono") || "").trim();
    const servicio = String(data.get("servicio") || "").trim();
    const barbero = negocio.barbero;
    const fecha = String(data.get("fecha") || "").trim();
    const nota = String(data.get("nota") || "").trim();
    const cel = celularColombia(telefono);
    const datosOk = reservaForm.querySelector("[name='datos']");
    const focusField = (name) => {
      const field = reservaForm.querySelector("[name='" + name + "']");
      if (field) field.focus();
    };

    if (nombre.length < 2) {
      showError("Escribe tu nombre.");
      focusField("nombre");
      return;
    }
    if (!cel.ok) {
      showError(cel.mensaje);
      focusField("telefono");
      return;
    }
    if (!servicio) {
      showError("Elige un servicio.");
      focusField("servicio");
      return;
    }
    if (!fecha || fecha < bogotaToday()) {
      showError("Elige una fecha de hoy en adelante.");
      focusField("fecha");
      return;
    }
    if (!slotsFor(fecha).length) {
      const regla = negocio.horario.find((item) => item.dias.includes(weekdayOf(fecha)));
      showError(regla && regla.cerrado ? "Ese día no abrimos. Elige otro." : "Ese día no hay horas disponibles. Elige otro.");
      focusField("fecha");
      return;
    }
    if (!chosenHour) {
      showError("Elige una hora libre.");
      const slot = hoursBox && hoursBox.querySelector(".slot:not(:disabled)");
      if (slot) slot.focus();
      return;
    }
    if (datosOk && !datosOk.checked) {
      showError("Acepta la política de datos para reservar.");
      datosOk.focus();
      return;
    }

    const submitLabel = reagendarToken ? "Reagendar cita" : "Reservar cita";
    const telefonoLimpio = cel.digitos.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando…";
    let token = "";
    try {
      token = crypto.randomUUID();
    } catch (error) {}
    let error = null;
    try {
      const payload = {
        nombre,
        telefono: telefonoLimpio,
        servicio,
        barbero,
        fecha,
        hora: chosenHour + ":00",
        nota: nota || null,
        estado: "pendiente"
      };
      if (token) payload.token = token;
      const result = await supabase.from("reservas").insert(payload, { returning: "minimal" });
      error = result.error;
    } catch (err) {
      error = err;
    }
    submitBtn.disabled = false;
    submitBtn.textContent = submitLabel;

    if (error) {
      const duplicate = error.code === "23505" || /duplicate|unique|duplicad/i.test(error.message || "");
      showError(duplicate
        ? "Esa hora ya fue tomada. Elige otra."
        : "No pudimos guardar la cita. Intenta de nuevo.");
      if (duplicate) loadHours(fecha);
      return;
    }

    const previo = reagendarToken;
    reagendarToken = "";
    let seguimiento = "";
    let avisoPrevia = "";
    try {
      if (token) {
        seguimiento = window.location.origin + window.location.pathname + "?cita=" + token;
        writeFicha(token, { nombre, telefono: telefonoLimpio, servicio, barbero, nota });
        citaTracker.track(token, {
          servicio,
          fecha,
          hora: chosenHour + ":00",
          estado: "pendiente",
          nombre,
          telefono: telefonoLimpio,
          barbero,
          nota
        });
      }
    } catch (err) {}
    writeContact(nombre, telefonoLimpio, data.get("recordar") === "on");
    if (previo && previo !== token) {
      try {
        const cancel = await supabase.rpc("cancelar_reserva", { p_token: previo });
        const denied = !cancel || cancel.error || cancel.data === false || cancel.data === "false";
        if (denied) avisoPrevia = " No pudimos cancelar la cita anterior. Escríbenos por WhatsApp.";
        else citaTracker.marcar(previo, "cancelada");
      } catch (err) {
        avisoPrevia = " No pudimos cancelar la cita anterior. Escríbenos por WhatsApp.";
      }
    }

    const lines = [
      "Hola, soy " + nombre + ". Acabo de reservar en " + negocio.nombre + ".",
      "Servicio: " + servicio + ".",
      "Barbero: " + barbero + ".",
      "Fecha: " + fecha + ".",
      "Hora: " + hourLabel(chosenHour) + ".",
      "Teléfono: " + telefonoLimpio + "."
    ];
    if (nota) lines.push("Nota: " + nota + ".");
    if (seguimiento) lines.push("Sigue tu cita: " + seguimiento);
    lastBooking = {
      token,
      servicio,
      fecha,
      hora: chosenHour,
      minutos: minutosDe(servicio)
    };
    reservaSummary.textContent = nombre + " · " + servicio + " · " + fecha + " · " + hourLabel(chosenHour) + avisoPrevia;
    reservaWa.href = enlaceWhatsapp(lines.join("\n"));
    const panel = modal && modal.querySelector(".modal-panel");
    if (panel) panel.setAttribute("aria-labelledby", "reserva-done-title");
    reservaIntro.hidden = true;
    reservaDone.hidden = false;
    const icsBtn = document.querySelector("[data-reserva-ics]");
    if (icsBtn) icsBtn.focus();
    else reservaWa.focus();
  });

  const icsEscape = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

  const icsStamp = (fecha, hora) => {
    const [year, month, day] = fecha.split("-");
    const [hour, minute] = String(hora || "00:00").split(":");
    return year + month + day + "T" + hour + minute + "00";
  };

  const icsEnd = (fecha, hora, minutes) => {
    const [year, month, day] = fecha.split("-").map(Number);
    const [hour, minute] = String(hora || "00:00").split(":").map(Number);
    const end = new Date(Date.UTC(year, month - 1, day, hour, minute) + minutes * 60000);
    const iso = end.toISOString();
    return iso.slice(0, 4) + iso.slice(5, 7) + iso.slice(8, 10) + "T" + iso.slice(11, 13) + iso.slice(14, 16) + "00";
  };

  const downloadIcs = (booking) => {
    const start = icsStamp(booking.fecha, booking.hora);
    const end = icsEnd(booking.fecha, booking.hora, booking.minutos || 60);
    const uid = (booking.token || "cita") + "@miamicuts";
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Miami Cuts//Cita//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE",
      "TZID:America/Bogota",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:-0500",
      "TZOFFSETTO:-0500",
      "TZNAME:COT",
      "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + start,
      "DTSTART;TZID=America/Bogota:" + start,
      "DTEND;TZID=America/Bogota:" + end,
      "SUMMARY:" + icsEscape(booking.servicio + " — " + negocio.nombre),
      "LOCATION:" + icsEscape(direccionLinea()),
      "DESCRIPTION:" + icsEscape(booking.servicio + " en " + negocio.nombre + ". " + direccionLinea()),
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cita-miami-cuts.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const icsButton = document.querySelector("[data-reserva-ics]");
  if (icsButton) icsButton.addEventListener("click", () => {
    if (lastBooking) downloadIcs(lastBooking);
  });

  const apertura = estadoApertura();
  document.querySelectorAll("[data-open-status]").forEach((status) => {
    status.classList.toggle("is-open", !!apertura.abierto);
    status.classList.toggle("is-closed", apertura.abierto === false && !apertura.pendiente);
    const label = status.querySelector("[data-open-label]");
    if (label) label.textContent = apertura.texto;
  });

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reservar") === "1" && modal) {
      params.delete("reservar");
      const next = params.toString();
      const clean = window.location.pathname + (next ? "?" + next : "") + window.location.hash;
      window.history.replaceState(null, "", clean);
      openModal(null);
    }
  } catch (error) {}
})();
