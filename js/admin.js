import { supabase } from "./supabase.js";
import { servicios } from "./servicios.js";

const EMPTY = "Aún no hay datos en este periodo";
const COLS = "id, nombre, telefono, servicio, barbero, fecha, hora, nota, estado";
const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const STATUS = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada"
};

const prices = new Map(servicios.map((item) => [
  item.nombre.trim().toLowerCase(),
  Number(String(item.precio).replace(/\D/g, "")) || 0
]));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const errorBox = document.querySelector("[data-admin-error]");
const dashError = document.querySelector("[data-dash-error]");
const rangeBox = document.querySelector("[data-range]");
const rangeError = document.querySelector("[data-range-error]");
const desdeInput = document.querySelector("[data-desde]");
const hastaInput = document.querySelector("[data-hasta]");
const estadoInput = document.querySelector("[data-res-estado]");
const fechaInput = document.querySelector("[data-res-fecha]");
const searchInput = document.querySelector("[data-res-q]");

const state = {
  period: "hoy",
  actual: null,
  previo: null,
  canCompare: true,
  quiet: false,
  reservas: [],
  reservasReady: false
};

const charts = new Map();
const pendingCharts = new Map();
let dashToken = 0;
let resToken = 0;
let lastFetch = 0;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const bogotaParts = () => new Intl.DateTimeFormat("en-CA", {
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

const addDays = (iso, days) => {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
};

const dayCount = (desde, hasta) => {
  const start = Date.parse(desde + "T00:00:00Z");
  const end = Date.parse(hasta + "T00:00:00Z");
  return Math.round((end - start) / 86400000) + 1;
};

const eachDay = (desde, hasta) => {
  const days = [];
  let cursor = desde;
  const total = dayCount(desde, hasta);
  for (let i = 0; i < total && i < 400; i += 1) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
};

const previousRange = (desde, hasta) => {
  const count = dayCount(desde, hasta);
  return { desde: addDays(desde, -count), hasta: addDays(desde, -1) };
};

const currentRange = () => {
  const today = bogotaToday();
  if (state.period === "hoy") return { desde: today, hasta: today };
  if (state.period === "7") return { desde: addDays(today, -6), hasta: today };
  if (state.period === "30") return { desde: addDays(today, -29), hasta: today };
  return { desde: desdeInput.value, hasta: hastaInput.value };
};

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asList = (value) => Array.isArray(value) ? value : [];

const unwrap = (data) => {
  let value = data;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch (error) { return {}; }
  }
  if (Array.isArray(value)) value = value[0] || {};
  if (!value || typeof value !== "object") return {};
  return value;
};

const priceOf = (name) => prices.get(String(name || "").trim().toLowerCase()) || 0;

const countReservas = (payload) => {
  const estados = asList(payload.reservas_por_estado);
  if (estados.length) return estados.reduce((sum, row) => sum + num(row.total), 0);
  const dias = asList(payload.reservas_por_dia);
  if (dias.length) return dias.reduce((sum, row) => sum + num(row.total), 0);
  const embudo = payload.embudo || {};
  return num(embudo.reservas);
};

const countPendientes = (payload) => {
  const row = asList(payload.reservas_por_estado).find((item) => String(item.estado || "").toLowerCase() === "pendiente");
  return row ? num(row.total) : 0;
};

const revenueOf = (payload) => asList(payload.reservas_por_servicio).reduce((sum, row) => {
  return sum + priceOf(row.servicio) * num(row.completadas);
}, 0);

const rateOf = (payload) => {
  const visitors = num(payload.visitantes_unicos);
  if (!visitors) return 0;
  return countReservas(payload) / visitors;
};

const money = (value) => new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
}).format(value || 0);

const integer = (value) => new Intl.NumberFormat("es-CO").format(num(value));

const percent = (value) => {
  const rounded = Math.round(num(value) * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return text.replace(".", ",") + "%";
};

const shortDay = (iso) => new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "short"
}).format(new Date(iso + "T00:00:00Z"));

const hourKey = (value) => {
  const match = String(value ?? "").match(/\d{1,2}/);
  if (!match) return null;
  const hour = Number(match[0]);
  if (hour < 0 || hour > 23) return null;
  return hour;
};

const hourLabel = (value) => {
  const hour = typeof value === "number" ? value : hourKey(value);
  if (hour == null) return String(value || "");
  const suffix = hour < 12 ? "am" : "pm";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return hour12 + ":00 " + suffix;
};

const changeOf = (current, previous) => {
  const now = num(current);
  const prev = num(previous);
  if (prev === 0 && now === 0) return { dir: "flat", text: "0%" };
  if (prev === 0) return { dir: now > 0 ? "up" : "flat", text: now > 0 ? "nuevo" : "0%" };
  const pct = Math.round(((now - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return { dir: "flat", text: "0%" };
  return { dir: pct > 0 ? "up" : "down", text: (pct > 0 ? "+" : "") + pct + "%" };
};

const fail = (message) => {
  errorBox.hidden = !message;
  errorBox.textContent = message || "";
};

const showDashError = (message) => {
  dashError.hidden = false;
  dashError.querySelector("[data-dash-error-text]").textContent = message || "No pudimos cargar el resumen.";
};

const hideDashError = () => {
  dashError.hidden = true;
};

const setLoading = (on) => {
  document.querySelectorAll("[data-card]").forEach((card) => card.classList.toggle("is-loading", on));
  document.querySelectorAll("[data-chart]").forEach((host) => {
    if (on && !host.querySelector("canvas")) host.classList.add("is-loading");
    if (!on) host.classList.remove("is-loading");
  });
  const funnel = document.querySelector("[data-funnel]");
  if (funnel) funnel.classList.toggle("is-loading", on && !funnel.childElementCount);
};

const paintHeader = () => {
  const parts = bogotaParts();
  const hour = Number(parts.find((item) => item.type === "hour").value);
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  document.querySelector("[data-greet]").textContent = greet;
  const label = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
  document.querySelector("[data-today-label]").textContent = label.charAt(0).toUpperCase() + label.slice(1);
  const clock = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
  const time = document.querySelector("[data-updated]");
  time.textContent = clock;
  time.dateTime = new Date().toISOString();
};

const paintCards = () => {
  const actual = state.actual || {};
  const previo = state.previo || {};
  const reservas = countReservas(actual);
  const prevReservas = countReservas(previo);
  const conversion = rateOf(actual);
  const prevConversion = rateOf(previo);
  const deltaFor = (current, previous) => state.canCompare ? changeOf(current, previous) : { dir: "flat", text: "—" };
  const cards = [
    ["visitantes", integer(actual.visitantes_unicos), deltaFor(actual.visitantes_unicos, previo.visitantes_unicos)],
    ["visitas", integer(actual.visitas_totales), deltaFor(actual.visitas_totales, previo.visitas_totales)],
    ["reservas", integer(reservas), deltaFor(reservas, prevReservas)],
    ["conversion", percent(conversion * 100), deltaFor(conversion * 100, prevConversion * 100)],
    ["pendientes", integer(countPendientes(actual)), deltaFor(countPendientes(actual), countPendientes(previo))],
    ["ingresos", money(revenueOf(actual)), deltaFor(revenueOf(actual), revenueOf(previo))]
  ];
  cards.forEach(([key, value, delta]) => {
    const card = document.querySelector(`[data-card="${key}"]`);
    if (!card) return;
    card.classList.remove("is-loading");
    card.querySelector("strong").textContent = value;
    const note = card.querySelector("[data-delta]");
    note.className = "delta delta-" + delta.dir;
    note.replaceChildren();
    if (delta.dir === "up" || delta.dir === "down") {
      const arrow = el("span", "delta-arrow", delta.dir === "up" ? "▲" : "▼");
      arrow.setAttribute("aria-hidden", "true");
      note.append(arrow, document.createTextNode(" " + delta.text));
    } else {
      note.textContent = delta.text;
    }
    const sense = delta.dir === "up" ? "más que el periodo anterior" : delta.dir === "down" ? "menos que el periodo anterior" : "sin cambio respecto al periodo anterior";
    note.setAttribute("aria-label", delta.text + ", " + sense);
  });
};

const dayMap = (rows, field) => {
  const map = new Map();
  asList(rows).forEach((row) => {
    const dia = String(row.dia || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return;
    const amount = field === "visitantes" ? num(row.visitantes != null ? row.visitantes : row.total) : num(row.total);
    map.set(dia, (map.get(dia) || 0) + amount);
  });
  return map;
};

const chartBase = () => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reduceMotion || state.quiet ? false : { duration: 520 },
  plugins: {
    legend: { labels: { color: "#5c5148", font: { family: "Outfit, sans-serif" } } },
    tooltip: { backgroundColor: "#161210", titleFont: { family: "Outfit, sans-serif" }, bodyFont: { family: "Outfit, sans-serif" } }
  }
});

const renderChart = (key) => {
  const host = document.querySelector(`[data-chart="${key}"]`);
  if (!host) return;
  const panel = host.closest(".dash-panel");
  if (panel && panel.hidden) return;
  const config = pendingCharts.get(key);
  const prev = charts.get(key);
  if (prev) {
    prev.destroy();
    charts.delete(key);
  }
  host.classList.remove("is-loading");
  host.replaceChildren();
  if (!config) {
    host.appendChild(el("p", "empty-note", EMPTY));
    return;
  }
  if (!globalThis.Chart) {
    host.appendChild(el("p", "empty-note", "No se pudo cargar el gráfico."));
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", config.ariaLabel || "Gráfico");
  host.appendChild(canvas);
  const options = config.options || {};
  try {
    charts.set(key, new globalThis.Chart(canvas, {
      type: config.type,
      data: config.data,
      options
    }));
  } catch (error) {
    host.replaceChildren(el("p", "empty-note", "No se pudo cargar el gráfico."));
  }
};

const renderVisibleCharts = () => {
  document.querySelectorAll("[data-chart]").forEach((host) => {
    const panel = host.closest(".dash-panel");
    if (panel && panel.hidden) return;
    renderChart(host.getAttribute("data-chart"));
  });
};

const paintTraffic = () => {
  const range = currentRange();
  if (!range.desde || !range.hasta) return;
  const days = eachDay(range.desde, range.hasta);
  const visits = dayMap(state.actual && state.actual.visitas_por_dia, "visitantes");
  const reservas = dayMap(state.actual && state.actual.reservas_por_dia, "total");
  const visitData = days.map((dia) => visits.get(dia) || 0);
  const reservaData = days.map((dia) => reservas.get(dia) || 0);
  const has = visitData.some((value) => value > 0) || reservaData.some((value) => value > 0);
  if (!has) {
    pendingCharts.set("trafico", null);
    renderChart("trafico");
    return;
  }
  const base = chartBase();
  pendingCharts.set("trafico", {
    type: "bar",
    ariaLabel: "Visitantes por día y reservas por día",
    data: {
      labels: days.map(shortDay),
      datasets: [
        {
          type: "line",
          label: "Visitantes",
          data: visitData,
          yAxisID: "y",
          borderColor: "#c9a24b",
          backgroundColor: "rgba(201, 162, 75, 0.18)",
          pointBackgroundColor: "#7a5c22",
          pointRadius: days.length > 20 ? 0 : 3,
          tension: 0.35,
          fill: true
        },
        {
          type: "bar",
          label: "Reservas",
          data: reservaData,
          yAxisID: "y1",
          backgroundColor: "rgba(36, 28, 23, 0.78)",
          borderRadius: 2,
          maxBarThickness: 18
        }
      ]
    },
    options: {
      ...base,
      scales: {
        x: {
          ticks: { color: "#5c5148", maxRotation: 0, autoSkip: true, maxTicksLimit: days.length > 14 ? 8 : 14 },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#7a5c22", precision: 0 },
          grid: { color: "rgba(26, 21, 18, 0.06)" }
        },
        y1: {
          beginAtZero: true,
          position: "right",
          ticks: { color: "#241c17", precision: 0 },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
  renderChart("trafico");
};

const paintFunnel = () => {
  const host = document.querySelector("[data-funnel]");
  if (!host) return;
  host.classList.remove("is-loading");
  host.replaceChildren();
  const embudo = (state.actual && state.actual.embudo) || {};
  const steps = [
    ["Visitantes", num(embudo.visitantes)],
    ["Vieron un servicio", num(embudo.vieron_servicio)],
    ["Iniciaron una reserva", num(embudo.iniciaron_reserva)],
    ["Reservaron", num(embudo.reservas)]
  ];
  if (steps.every((step) => step[1] === 0)) {
    host.appendChild(el("p", "empty-note", EMPTY));
    return;
  }
  const max = Math.max(steps[0][1], 1);
  steps.forEach((step, index) => {
    if (index > 0) {
      const prev = steps[index - 1][1];
      const rate = prev ? Math.round((step[1] / prev) * 100) : null;
      host.appendChild(el("p", "funnel-rate", rate == null ? "—" : rate + "% respecto al paso anterior"));
    }
    const row = el("div", "funnel-step");
    const line = el("div", "funnel-line");
    line.append(el("span", "funnel-name", step[0]), el("strong", null, integer(step[1])));
    const track = el("div", "funnel-track");
    const fill = el("span", "funnel-fill");
    fill.style.width = Math.max(8, Math.round((step[1] / max) * 100)) + "%";
    track.appendChild(fill);
    row.append(line, track);
    host.appendChild(row);
  });
};

const waHref = (telefono) => {
  let digits = String(telefono || "").replace(/\D/g, "");
  if (digits && !digits.startsWith("57")) digits = "57" + digits;
  return "https://wa.me/" + digits;
};

const updateEstado = async (id, estado, control) => {
  if (control) control.disabled = true;
  const { error } = await supabase.from("reservas").update({ estado }).eq("id", id);
  if (control) control.disabled = false;
  if (error) {
    fail("No se pudo actualizar la cita.");
    paintHoy();
    paintReservas();
    return;
  }
  fail("");
  const row = state.reservas.find((item) => item.id === id);
  if (row) row.estado = estado;
  paintHoy();
  paintReservas();
  loadDash({ silent: true });
};

const bookingCard = (row) => {
  const article = el("article", "booking");
  const header = el("header");
  const time = document.createElement("time");
  time.textContent = hourLabel(row.hora);
  time.dateTime = String(row.fecha).slice(0, 10) + "T" + String(row.hora).slice(0, 5);
  header.append(time, el("span", "badge badge-" + row.estado, STATUS[row.estado] || row.estado));
  const title = el("h3", null, row.nombre || "Sin nombre");
  const meta = el("p", "meta", [row.servicio, row.barbero, String(row.fecha).slice(0, 10)].filter(Boolean).join(" · "));
  const phone = el("p");
  const link = document.createElement("a");
  link.href = waHref(row.telefono);
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = row.telefono || "WhatsApp";
  link.setAttribute("aria-label", "WhatsApp de " + (row.nombre || "la cita"));
  phone.appendChild(link);
  article.append(header, title, meta, phone);
  if (row.nota) article.appendChild(el("p", "note", row.nota));
  const actions = el("div", "booking-actions");
  [["confirmada", "Confirmar"], ["completada", "Completar"], ["cancelada", "Cancelar"]].forEach(([next, label]) => {
    const button = el("button", null, label);
    button.type = "button";
    button.disabled = next === row.estado;
    button.addEventListener("click", () => updateEstado(row.id, next, button));
    actions.appendChild(button);
  });
  article.appendChild(actions);
  return article;
};

const paintHoy = () => {
  const host = document.querySelector("[data-hoy]");
  if (!host) return;
  host.replaceChildren();
  const today = bogotaToday();
  const rows = state.reservas
    .filter((row) => String(row.fecha).slice(0, 10) === today)
    .slice()
    .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  if (!rows.length) {
    host.appendChild(el("p", "empty-note", EMPTY));
    return;
  }
  rows.forEach((row) => host.appendChild(bookingCard(row)));
};

const filteredReservas = () => {
  const estado = estadoInput.value;
  const fecha = fechaInput.value;
  const query = searchInput.value.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  return state.reservas.filter((row) => {
    if (estado && row.estado !== estado) return false;
    if (fecha && String(row.fecha).slice(0, 10) !== fecha) return false;
    if (!query) return true;
    const name = String(row.nombre || "").toLowerCase();
    const phone = String(row.telefono || "");
    if (name.includes(query)) return true;
    if (digits && phone.replace(/\D/g, "").includes(digits)) return true;
    return phone.toLowerCase().includes(query);
  });
};

const paintReservas = () => {
  const host = document.querySelector("[data-res-table]");
  const count = document.querySelector("[data-res-count]");
  if (!host) return;
  const rows = filteredReservas();
  if (count) count.textContent = rows.length === 1 ? "1 cita" : integer(rows.length) + " citas";
  host.replaceChildren();
  if (!state.reservas.length) {
    if (state.reservasReady) host.appendChild(el("p", "empty-note", EMPTY));
    return;
  }
  if (!rows.length) {
    host.appendChild(el("p", "empty-note", "No hay citas con ese filtro."));
    return;
  }
  const table = document.createElement("table");
  table.className = "res-table";
  const caption = el("caption", "sr-only", "Reservas");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Hora", "Fecha", "Cliente", "Teléfono", "Servicio", "Barbero", "Estado"].forEach((label) => {
    headRow.appendChild(el("th", null, label));
  });
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = [
      ["Hora", hourLabel(row.hora)],
      ["Fecha", String(row.fecha).slice(0, 10)],
      ["Cliente", row.nombre || ""],
      ["Servicio", row.servicio || ""],
      ["Barbero", row.barbero || ""]
    ];
    const hora = el("td", null, cells[0][1]);
    hora.dataset.label = "Hora";
    const fecha = el("td", null, cells[1][1]);
    fecha.dataset.label = "Fecha";
    const cliente = el("td", null, cells[2][1]);
    cliente.dataset.label = "Cliente";
    const tel = document.createElement("td");
    tel.dataset.label = "Teléfono";
    const link = document.createElement("a");
    link.href = waHref(row.telefono);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = row.telefono || "WhatsApp";
    tel.appendChild(link);
    const servicio = el("td", null, cells[3][1]);
    servicio.dataset.label = "Servicio";
    const barbero = el("td", null, cells[4][1]);
    barbero.dataset.label = "Barbero";
    const estado = document.createElement("td");
    estado.dataset.label = "Estado";
    const select = document.createElement("select");
    select.className = "res-estado";
    select.setAttribute("aria-label", "Estado de " + (row.nombre || "la cita"));
    Object.keys(STATUS).forEach((key) => {
      const option = el("option", null, STATUS[key]);
      option.value = key;
      if (key === row.estado) option.selected = true;
      select.appendChild(option);
    });
    if (!STATUS[row.estado]) {
      const option = el("option", null, row.estado);
      option.value = row.estado;
      option.selected = true;
      select.prepend(option);
    }
    select.addEventListener("change", () => {
      if (select.value === row.estado) return;
      updateEstado(row.id, select.value, select);
    });
    estado.appendChild(select);
    tr.append(hora, fecha, cliente, tel, servicio, barbero, estado);
    tbody.appendChild(tr);
  });
  table.append(caption, thead, tbody);
  host.appendChild(table);
};

const serviceRows = () => {
  const views = new Map();
  asList(state.actual && state.actual.servicios).forEach((row) => {
    const name = String(row.servicio || "").trim();
    if (!name) return;
    views.set(name.toLowerCase(), row);
  });
  const bookings = new Map();
  asList(state.actual && state.actual.reservas_por_servicio).forEach((row) => {
    const name = String(row.servicio || "").trim();
    if (!name) return;
    bookings.set(name.toLowerCase(), row);
  });
  const names = [];
  servicios.forEach((item) => {
    if (!names.some((name) => name.toLowerCase() === item.nombre.toLowerCase())) names.push(item.nombre);
  });
  [...views.keys(), ...bookings.keys()].forEach((key) => {
    if (!names.some((name) => name.toLowerCase() === key)) {
      const source = views.get(key) || bookings.get(key);
      names.push(String(source.servicio).trim());
    }
  });
  return names.map((name) => {
    const view = views.get(name.toLowerCase()) || {};
    const book = bookings.get(name.toLowerCase()) || {};
    const vistas = num(view.vistas);
    const clics = num(view.clics_reservar);
    const total = num(book.total);
    const completadas = num(book.completadas);
    const canceladas = num(book.canceladas);
    const conversion = vistas ? total / vistas : null;
    return { name, vistas, clics, total, completadas, canceladas, conversion };
  });
};

const paintServicios = () => {
  const host = document.querySelector("[data-servicios]");
  if (!host) return;
  host.replaceChildren();
  const rows = serviceRows();
  const active = rows.some((row) => row.vistas || row.clics || row.total || row.completadas || row.canceladas);
  if (!active) {
    host.appendChild(el("p", "empty-note", EMPTY));
    pendingCharts.set("horas", null);
    pendingCharts.set("dias", null);
    renderChart("horas");
    renderChart("dias");
    return;
  }
  const maxViews = Math.max(...rows.map((row) => row.vistas), 1);
  const seen = Math.max(...rows.map((row) => row.vistas));
  const booked = Math.max(...rows.map((row) => row.total));
  const conversions = rows.filter((row) => row.conversion != null && row.vistas > 0);
  const best = conversions.length ? Math.max(...conversions.map((row) => row.conversion)) : 0;
  const table = document.createElement("table");
  table.className = "svc-table";
  const head = document.createElement("tr");
  ["Servicio", "Vistas", "Clics en reservar", "Reservas", "Completadas", "Canceladas", "Conversión"].forEach((label) => {
    head.appendChild(el("th", null, label));
  });
  const thead = document.createElement("thead");
  thead.appendChild(head);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.dataset.label = "Servicio";
    const title = el("span", "svc-name", row.name);
    name.appendChild(title);
    const tags = el("span", "svc-tags");
    if (seen > 0 && row.vistas === seen) tags.appendChild(el("span", "tag", "Más visto"));
    if (booked > 0 && row.total === booked) tags.appendChild(el("span", "tag", "Más reservado"));
    if (best > 0 && row.conversion === best && row.vistas > 0) tags.appendChild(el("span", "tag", "Mejor conversión"));
    if (tags.childElementCount) name.appendChild(tags);
    const meter = el("span", "meter");
    const track = el("span", "meter-track");
    const fill = el("span", "meter-fill");
    fill.style.width = Math.round((row.vistas / maxViews) * 100) + "%";
    track.appendChild(fill);
    meter.appendChild(track);
    name.appendChild(meter);
    const cell = (label, value) => {
      const td = el("td", null, value);
      td.dataset.label = label;
      return td;
    };
    tr.append(
      name,
      cell("Vistas", integer(row.vistas)),
      cell("Clics en reservar", integer(row.clics)),
      cell("Reservas", integer(row.total)),
      cell("Completadas", integer(row.completadas)),
      cell("Canceladas", integer(row.canceladas)),
      cell("Conversión", row.conversion == null ? "—" : percent(row.conversion * 100))
    );
    tbody.appendChild(tr);
  });
  table.append(thead, tbody);
  host.appendChild(table);

  const hours = new Map();
  asList(state.actual.horas_populares).forEach((row) => {
    const hour = hourKey(row.hora);
    if (hour == null) return;
    hours.set(hour, (hours.get(hour) || 0) + num(row.total));
  });
  const hourEntries = [...hours.entries()].sort((a, b) => a[0] - b[0]);
  if (!hourEntries.some((entry) => entry[1] > 0)) pendingCharts.set("horas", null);
  else {
    const base = chartBase();
    pendingCharts.set("horas", {
      type: "bar",
      ariaLabel: "Horas con más reservas",
      data: {
        labels: hourEntries.map((entry) => hourLabel(entry[0])),
        datasets: [{
          label: "Reservas",
          data: hourEntries.map((entry) => entry[1]),
          backgroundColor: "#c9a24b",
          borderRadius: 2,
          maxBarThickness: 28
        }]
      },
      options: {
        ...base,
        plugins: { ...base.plugins, legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#5c5148" } },
          y: { beginAtZero: true, ticks: { precision: 0, color: "#5c5148" }, grid: { color: "rgba(26, 21, 18, 0.06)" } }
        }
      }
    });
  }

  const week = [0, 0, 0, 0, 0, 0, 0];
  asList(state.actual.dias_semana).forEach((row) => {
    const day = Number(row.dia);
    if (day >= 1 && day <= 7) week[day - 1] += num(row.total);
  });
  if (!week.some((value) => value > 0)) pendingCharts.set("dias", null);
  else {
    const base = chartBase();
    pendingCharts.set("dias", {
      type: "bar",
      ariaLabel: "Reservas de lunes a domingo",
      data: {
        labels: WEEKDAYS,
        datasets: [{
          label: "Reservas",
          data: week,
          backgroundColor: "#241c17",
          borderRadius: 2,
          maxBarThickness: 32
        }]
      },
      options: {
        ...base,
        plugins: { ...base.plugins, legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#5c5148", maxRotation: 0, autoSkip: false } },
          y: { beginAtZero: true, ticks: { precision: 0, color: "#5c5148" }, grid: { color: "rgba(26, 21, 18, 0.06)" } }
        }
      }
    });
  }
  renderChart("horas");
  renderChart("dias");
};

const paintAudiencia = () => {
  const origenHost = document.querySelector("[data-origenes]");
  const contactHost = document.querySelector("[data-contacto]");
  const devices = asList(state.actual && state.actual.dispositivos).map((row) => ({
    name: String(row.nombre || "Otro"),
    total: num(row.visitantes)
  })).filter((row) => row.total > 0);
  if (!devices.length) pendingCharts.set("dispositivos", null);
  else {
    const labels = devices.map((row) => {
      const key = row.name.toLowerCase();
      if (key === "móvil" || key === "movil") return "Móvil";
      if (key === "tablet") return "Tablet";
      if (key === "escritorio") return "Escritorio";
      return row.name;
    });
    const base = chartBase();
    pendingCharts.set("dispositivos", {
      type: "doughnut",
      ariaLabel: "Visitantes por dispositivo",
      data: {
        labels,
        datasets: [{
          data: devices.map((row) => row.total),
          backgroundColor: ["#c9a24b", "#241c17", "#7a5c22", "#3a2f27", "#8c7b68"],
          borderColor: "#fbf8f3",
          borderWidth: 2
        }]
      },
      options: {
        ...base,
        cutout: "64%",
        plugins: { ...base.plugins, legend: { position: "bottom", labels: { color: "#5c5148", font: { family: "Outfit, sans-serif" } } } }
      }
    });
  }
  renderChart("dispositivos");

  if (origenHost) {
    origenHost.replaceChildren();
    const origenes = asList(state.actual && state.actual.origenes).map((row) => ({
      name: String(row.nombre || "directo"),
      total: num(row.visitantes)
    })).filter((row) => row.name);
    const positive = origenes.filter((row) => row.total > 0);
    if (!positive.length) origenHost.appendChild(el("p", "empty-note", EMPTY));
    else {
      const max = Math.max(...positive.map((row) => row.total), 1);
      positive.sort((a, b) => b.total - a.total).forEach((row) => {
        const line = el("div", "origen");
        const label = row.name.toLowerCase() === "directo" ? "Directo" : row.name;
        line.appendChild(el("span", "origen-name", label));
        const track = el("span", "meter-track");
        const fill = el("span", "meter-fill");
        fill.style.width = Math.round((row.total / max) * 100) + "%";
        track.appendChild(fill);
        line.appendChild(track);
        line.appendChild(el("strong", "origen-total", integer(row.total)));
        origenHost.appendChild(line);
      });
    }
  }

  if (contactHost) {
    contactHost.replaceChildren();
    const rows = asList(state.actual && state.actual.contacto);
    const keyOf = (tipo) => {
      const value = String(tipo || "").toLowerCase();
      if (value.includes("whatsapp")) return "whatsapp";
      if (value.includes("llamar") || value.includes("llamada") || value === "tel") return "llamar";
      if (value.includes("llegar") || value.includes("mapa") || value.includes("maps")) return "llegar";
      if (value.includes("historia")) return "historia";
      return value;
    };
    const grouped = new Map();
    rows.forEach((row) => {
      const key = keyOf(row.tipo);
      const prev = grouped.get(key) || { total: 0, visitantes: 0 };
      prev.total += num(row.total);
      prev.visitantes += num(row.visitantes);
      grouped.set(key, prev);
    });
    const cards = [
      ["whatsapp", "WhatsApp"],
      ["llamar", "Llamadas"],
      ["llegar", "Cómo llegar"],
      ["historia", "Historia"]
    ];
    const any = cards.some(([key]) => (grouped.get(key) || {}).total);
    if (!any) {
      contactHost.appendChild(el("p", "empty-note", EMPTY));
      return;
    }
    cards.forEach(([key, label]) => {
      const item = grouped.get(key) || { total: 0, visitantes: 0 };
      const card = el("article", "contact-card");
      card.append(
        el("h3", null, label),
        el("strong", null, integer(item.total)),
        el("span", null, "clics · " + integer(item.visitantes) + " visitantes")
      );
      contactHost.appendChild(card);
    });
  }
};

const paintDash = () => {
  const range = currentRange();
  const label = document.querySelector("[data-period-label]");
  if (label && range.desde && range.hasta) {
    const text = range.desde === range.hasta ? shortDay(range.desde) : shortDay(range.desde) + " – " + shortDay(range.hasta);
    label.textContent = "· " + text;
  }
  paintHeader();
  paintCards();
  paintTraffic();
  paintFunnel();
  paintServicios();
  paintAudiencia();
  paintHoy();
};

const validRange = (range) => {
  if (!range.desde || !range.hasta) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.desde) || !/^\d{4}-\d{2}-\d{2}$/.test(range.hasta)) return false;
  if (range.desde > range.hasta) return false;
  if (dayCount(range.desde, range.hasta) > 366) return false;
  return true;
};

const loadDash = async ({ silent } = {}) => {
  const range = currentRange();
  if (state.period === "rango" && !validRange(range)) {
    rangeError.hidden = false;
    return;
  }
  rangeError.hidden = true;
  const token = ++dashToken;
  state.quiet = !!silent;
  if (!silent) setLoading(true);
  try {
    const previo = previousRange(range.desde, range.hasta);
    const [actualResult, previoResult] = await Promise.all([
      supabase.rpc("dashboard_resumen", { p_desde: range.desde, p_hasta: range.hasta }),
      supabase.rpc("dashboard_resumen", { p_desde: previo.desde, p_hasta: previo.hasta })
    ]);
    if (token !== dashToken) return;
    if (actualResult.error) throw actualResult.error;
    state.actual = unwrap(actualResult.data);
    state.canCompare = !previoResult.error;
    state.previo = state.canCompare ? unwrap(previoResult.data) : {};
    hideDashError();
    if (!state.canCompare) showDashError("No pudimos comparar con el periodo anterior.");
    setLoading(false);
    paintDash();
    lastFetch = Date.now();
  } catch (error) {
    if (token !== dashToken) return;
    setLoading(false);
    showDashError("No pudimos cargar el resumen.");
    document.querySelectorAll("[data-card]").forEach((card) => card.classList.remove("is-loading"));
  }
};

const loadReservas = async () => {
  const token = ++resToken;
  const today = bogotaToday();
  try {
    const [recent, pending, todayRows] = await Promise.all([
      supabase.from("reservas").select(COLS).order("fecha", { ascending: false }).order("hora", { ascending: true }).limit(500),
      supabase.from("reservas").select(COLS).eq("estado", "pendiente").order("fecha").order("hora").limit(200),
      supabase.from("reservas").select(COLS).eq("fecha", today).order("hora")
    ]);
    if (token !== resToken) return;
    if (recent.error) throw recent.error;
    if (pending.error) throw pending.error;
    if (todayRows.error) throw todayRows.error;
    const merged = new Map();
    [...(recent.data || []), ...(pending.data || []), ...(todayRows.data || [])].forEach((row) => {
      merged.set(row.id, row);
    });
    state.reservas = [...merged.values()].sort((a, b) => {
      const byDate = String(b.fecha).localeCompare(String(a.fecha));
      if (byDate) return byDate;
      return String(a.hora).localeCompare(String(b.hora));
    });
    state.reservasReady = true;
    fail("");
    paintHoy();
    paintReservas();
    lastFetch = Date.now();
  } catch (error) {
    if (token !== resToken) return;
    fail("No pudimos cargar las reservas.");
  }
};

const showView = (name) => {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    const on = panel.getAttribute("data-panel") === name;
    panel.hidden = !on;
    panel.classList.toggle("is-on", on);
    if (on && !reduceMotion) {
      panel.classList.remove("is-enter");
      void panel.offsetWidth;
      panel.classList.add("is-enter");
    }
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    if (button.getAttribute("data-view") === name) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  renderVisibleCharts();
};

const setPeriod = (period) => {
  state.period = period;
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.getAttribute("data-period") === period));
  });
  rangeBox.hidden = period !== "rango";
  if (period === "rango") {
    const today = bogotaToday();
    if (!desdeInput.value) desdeInput.value = addDays(today, -6);
    if (!hastaInput.value) hastaInput.value = today;
  }
  loadDash();
};

const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
};

const exportCsv = () => {
  const rows = filteredReservas();
  if (!rows.length) {
    fail("No hay citas para exportar.");
    return;
  }
  fail("");
  const header = ["Fecha", "Hora", "Nombre", "Teléfono", "Servicio", "Barbero", "Estado", "Nota"];
  const lines = [header.join(",")];
  rows.forEach((row) => {
    lines.push([
      String(row.fecha).slice(0, 10),
      hourLabel(row.hora),
      row.nombre || "",
      row.telefono || "",
      row.servicio || "",
      row.barbero || "",
      STATUS[row.estado] || row.estado || "",
      row.nota || ""
    ].map(csvCell).join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reservas-" + bogotaToday() + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const tuneCharts = () => {
  if (!globalThis.Chart) return;
  globalThis.Chart.defaults.font.family = '"Outfit", "Avenir Next", sans-serif';
  globalThis.Chart.defaults.color = "#5c5148";
};

const refreshAll = (opts) => Promise.all([loadDash(opts), loadReservas()]);

const guard = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace("admin-login.html");
    return;
  }
  const { data, error } = await supabase.from("admins").select("id").limit(1);
  if (error || !data || !data.length) {
    await supabase.auth.signOut();
    window.location.replace("admin-login.html");
    return;
  }
  document.querySelector("[data-admin-email]").textContent = session.user.email || "";
  tuneCharts();
  paintHeader();
  await refreshAll();
  window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    refreshAll({ silent: true });
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (Date.now() - lastFetch < 15000) return;
    refreshAll({ silent: true });
  });
};

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.getAttribute("data-view")));
});
document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => setPeriod(button.getAttribute("data-period")));
});
desdeInput.addEventListener("change", () => {
  if (state.period === "rango") loadDash();
});
hastaInput.addEventListener("change", () => {
  if (state.period === "rango") loadDash();
});
document.querySelector("[data-refresh]").addEventListener("click", () => refreshAll());
document.querySelector("[data-retry]").addEventListener("click", () => loadDash());
document.querySelector("[data-export]").addEventListener("click", exportCsv);
estadoInput.addEventListener("change", paintReservas);
fechaInput.addEventListener("change", paintReservas);
searchInput.addEventListener("input", paintReservas);
document.querySelector("[data-logout]").addEventListener("click", async () => {
  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => window.setTimeout(resolve, 2500))
    ]);
  } catch (error) {}
  window.location.replace("admin-login.html");
});

guard();
