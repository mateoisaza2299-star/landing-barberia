import { supabase } from "./supabase.js";

const dayInput = document.querySelector("[data-day]");
const dayList = document.querySelector("[data-day-list]");
const upcomingList = document.querySelector("[data-upcoming]");
const errorBox = document.querySelector("[data-admin-error]");

const bogotaToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const pick = (type) => parts.find((item) => item.type === type).value;
  return pick("year") + "-" + pick("month") + "-" + pick("day");
};

const today = bogotaToday();
dayInput.value = today;

const fail = (message) => {
  errorBox.hidden = !message;
  errorBox.textContent = message || "";
};

const hourLabel = (value) => {
  const hour = Number(String(value).slice(0, 2));
  const suffix = hour < 12 ? "am" : "pm";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return hour12 + ":00 " + suffix;
};

const waHref = (telefono) => {
  let digits = String(telefono || "").replace(/\D/g, "");
  if (digits && !digits.startsWith("57")) digits = "57" + digits;
  return "https://wa.me/" + digits;
};

const badge = (estado) => {
  const names = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    cancelada: "Cancelada",
    completada: "Completada"
  };
  return names[estado] || estado;
};

const card = (row) => {
  const article = document.createElement("article");
  article.className = "booking";
  article.innerHTML = [
    "<header><time>" + hourLabel(row.hora) + "</time>",
    "<span class=\"badge badge-" + row.estado + "\">" + badge(row.estado) + "</span></header>",
    "<h3></h3>",
    "<p class=\"meta\"></p>",
    "<p><a target=\"_blank\" rel=\"noopener\"></a></p>",
    row.nota ? "<p class=\"note\"></p>" : "",
    "<div class=\"booking-actions\">",
    "<button type=\"button\" data-set=\"confirmada\">Confirmar</button>",
    "<button type=\"button\" data-set=\"cancelada\">Cancelar</button>",
    "<button type=\"button\" data-set=\"completada\">Completar</button>",
    "</div>"
  ].join("");
  article.querySelector("h3").textContent = row.nombre;
  article.querySelector(".meta").textContent = row.servicio + " · " + row.barbero + " · " + row.fecha;
  const link = article.querySelector("a");
  link.href = waHref(row.telefono);
  link.textContent = row.telefono;
  if (row.nota) article.querySelector(".note").textContent = row.nota;
  article.querySelector("time").dateTime = row.fecha + "T" + String(row.hora).slice(0, 5);
  article.querySelectorAll("button").forEach((button) => {
    const next = button.dataset.set;
    button.disabled = next === row.estado;
    button.addEventListener("click", () => updateEstado(row.id, next, button));
  });
  return article;
};

const paint = (target, rows, empty) => {
  target.replaceChildren();
  if (!rows.length) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = empty;
    target.appendChild(note);
    return;
  }
  rows.forEach((row) => target.appendChild(card(row)));
};

const countOf = async (filter) => {
  let query = supabase.from("reservas").select("id", { count: "exact", head: true });
  query = filter(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const loadStats = async () => {
  const monthStart = today.slice(0, 8) + "01";
  const [year, month] = today.split("-").map(Number);
  const nextMonth = month === 12
    ? (year + 1) + "-01-01"
    : year + "-" + String(month + 1).padStart(2, "0") + "-01";
  const [yearNum, monthNum, dayNum] = today.split("-").map(Number);
  const weekStart = new Date(Date.UTC(yearNum, monthNum - 1, dayNum - 6)).toISOString().slice(0, 10);

  const [hoy, pendientes, mes, visitas] = await Promise.all([
    countOf((query) => query.eq("fecha", today).neq("estado", "cancelada")),
    countOf((query) => query.eq("estado", "pendiente")),
    countOf((query) => query.gte("fecha", monthStart).lt("fecha", nextMonth).neq("estado", "cancelada")),
    supabase.from("visitas").select("visitor_id, created_at").gte("created_at", weekStart + "T00:00:00-05:00")
  ]);
  if (visitas.error) throw visitas.error;

  const unique = (rows, sameDay) => {
    const ids = new Set();
    rows.forEach((row) => {
      const local = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(row.created_at));
      if (!sameDay || local === today) ids.add(row.visitor_id);
    });
    return ids.size;
  };

  document.querySelector("[data-stat='hoy']").textContent = String(hoy);
  document.querySelector("[data-stat='pendientes']").textContent = String(pendientes);
  document.querySelector("[data-stat='mes']").textContent = String(mes);
  document.querySelector("[data-stat='visitas-hoy']").textContent = String(unique(visitas.data || [], true));
  document.querySelector("[data-stat='visitas-semana']").textContent = String(unique(visitas.data || [], false));
};

const loadLists = async () => {
  const selected = dayInput.value || today;
  const [dayResult, nextResult] = await Promise.all([
    supabase.from("reservas").select("id, nombre, telefono, servicio, barbero, fecha, hora, nota, estado").eq("fecha", selected).order("hora"),
    supabase.from("reservas").select("id, nombre, telefono, servicio, barbero, fecha, hora, nota, estado").gt("fecha", selected).in("estado", ["pendiente", "confirmada"]).order("fecha").order("hora").limit(30)
  ]);
  if (dayResult.error) throw dayResult.error;
  if (nextResult.error) throw nextResult.error;
  paint(dayList, dayResult.data || [], "No hay citas en este día.");
  paint(upcomingList, nextResult.data || [], "No hay citas próximas.");
};

const refresh = async () => {
  fail("");
  try {
    await Promise.all([loadStats(), loadLists()]);
  } catch (error) {
    fail("No pudimos cargar el panel. Recarga la página.");
  }
};

const updateEstado = async (id, estado, button) => {
  button.disabled = true;
  const { error } = await supabase.from("reservas").update({ estado }).eq("id", id);
  if (error) {
    button.disabled = false;
    fail("No se pudo actualizar la cita.");
    return;
  }
  refresh();
};

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
  refresh();
};

dayInput.addEventListener("change", loadLists);
document.querySelector("[data-logout]").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.replace("admin-login.html");
});

guard();
