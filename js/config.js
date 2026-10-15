export const negocio = {
  nombre: "Pupilos Barber",
  sitio: "",
  telefonoVisible: "300 123 4567",
  whatsapp: "573001234567",
  whatsappAviso: "EDITAR: número real",
  email: "EDITAR: correo de la barbería",
  direccion: {
    calle: "Cra 6 #23-70",
    barrio: "Zuame",
    ciudad: "Funza",
    region: "Cundinamarca",
    pais: "CO"
  },
  mapa: "https://maps.google.com/?q=Cra+6+%2323-70,+Zuame,+Funza",
  mapaEmbed: "https://maps.google.com/maps?q=Cra%206%20%2323-70%2C%20Zuame%2C%20Funza&z=16&output=embed",
  zona: "America/Bogota",
  horasAntesDeCerrar: 2,
  bloqueMinutos: 60,
  horario: [
    { etiqueta: "Lunes a viernes", dias: [1, 2, 3, 4, 5], abre: "09:00", cierra: "19:00" },
    { etiqueta: "Sábados", dias: [6], abre: "09:00", cierra: "17:00" },
    { etiqueta: "Domingos", dias: [0], cerrado: true }
  ],
  redes: {
    instagram: "https://instagram.com/pupilosbarber",
    tiktok: "https://www.tiktok.com/@pupilosbarber",
    resenas: ""
  },
  precios: {
    "Corte clásico": 25000,
    "Fade definido": 32000,
    "Barba y perfilado": 18000,
    "Afeitado clásico": 28000,
    "Corte + barba": 38000,
    "Diseño y línea": 15000
  },
  minutos: {
    "Corte clásico": 45,
    "Fade definido": 50,
    "Barba y perfilado": 30,
    "Afeitado clásico": 45,
    "Corte + barba": 75,
    "Diseño y línea": 25
  },
  politicaReserva: "Para cancelar o cambiar la cita, avisa con al menos 2 horas de anticipación por WhatsApp. EDITAR: ajusta este plazo si el local usa otro.",
  avisoDatos: "Guardamos tu nombre, celular, servicio y fecha para agendar la cita. También usamos un identificador anónimo para estadísticas. EDITAR: revisa este aviso antes de publicarlo.",
  privacidad: [
    "EDITAR: este texto es un aviso claro para tus clientes, no un contrato. Revísalo antes de publicarlo.",
    "Cuando reservas guardamos tu nombre, tu celular, el servicio y la fecha. También la hora, el barbero si lo elegiste y la nota que escribas. Los usamos para agendar la cita, confirmarla y avisarte si hay un cambio.",
    "No vendemos esos datos. Los ve el equipo de la barbería para atenderte.",
    "Para las estadísticas del sitio guardamos un identificador anónimo en tu navegador. No es tu nombre ni tu celular. Sirve para contar visitas y reservas sin identificarte.",
    "Si quieres que borremos tu reserva o tus datos, escríbenos por WhatsApp y dinos el nombre y el celular con los que reservaste. EDITAR: indica en cuántos días responden.",
    "EDITAR: añade aquí si guardas la cita en otro lado o si otra persona del equipo ve los datos."
  ],
  mensajeReserva: "Hola, quiero reservar una cita en Pupilos Barber."
};

export function formatoPrecio(valor) {
  const n = Number(valor) || 0;
  return "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}

export function rangoPrecio() {
  const valores = Object.values(negocio.precios).map(Number).filter((n) => n > 0);
  if (!valores.length) return "";
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  if (min === max) return formatoPrecio(min);
  return formatoPrecio(min) + "–" + formatoPrecio(max);
}

export function direccionLinea() {
  const d = negocio.direccion;
  return d.calle + ", " + d.barrio + ", " + d.ciudad;
}

export function enlaceWhatsapp(texto) {
  const base = "https://wa.me/" + negocio.whatsapp;
  if (!texto) return base;
  return base + "?text=" + encodeURIComponent(texto);
}

export function diaSemana(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return -1;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function partesBogota(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: negocio.zona,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date || new Date());
  const pick = (type) => parts.find((item) => item.type === type).value;
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hora = Number(pick("hour"));
  if (hora === 24) hora = 0;
  return {
    iso: pick("year") + "-" + pick("month") + "-" + pick("day"),
    dia: map[pick("weekday").slice(0, 3)] ?? 0,
    minutos: hora * 60 + Number(pick("minute"))
  };
}

function reglaDe(dia) {
  return negocio.horario.find((item) => item.dias.includes(dia)) || null;
}

function minutosReloj(hhmm) {
  const [hora, minuto] = String(hhmm || "0:0").split(":").map(Number);
  return hora * 60 + minuto;
}

export function horaCorta(hhmm) {
  const [hora, minuto] = String(hhmm || "00:00").split(":");
  return String(Number(hora)) + ":" + minuto;
}

export function hora12(hhmm) {
  const hour = Number(String(hhmm || "00:00").slice(0, 2));
  const suffix = hour < 12 ? "am" : "pm";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return hour12 + ":00 " + suffix;
}

export function horasDelDia(iso) {
  const regla = reglaDe(diaSemana(iso));
  if (!regla || regla.cerrado || !regla.abre || !regla.cierra) return [];
  const abre = Number(String(regla.abre).slice(0, 2));
  const cierra = Number(String(regla.cierra).slice(0, 2));
  const last = cierra - Number(negocio.horasAntesDeCerrar || 0);
  const slots = [];
  for (let hour = abre; hour <= last; hour += 1) slots.push(String(hour).padStart(2, "0") + ":00");
  return slots;
}

export function estadoApertura(date) {
  const ahora = partesBogota(date);
  const hoy = reglaDe(ahora.dia);
  if (hoy && !hoy.cerrado && hoy.abre && hoy.cierra) {
    const abre = minutosReloj(hoy.abre);
    const cierra = minutosReloj(hoy.cierra);
    if (ahora.minutos >= abre && ahora.minutos < cierra) return { abierto: true, texto: "Abierto ahora" };
  }
  const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  for (let salto = 0; salto < 8; salto += 1) {
    const dia = (ahora.dia + salto) % 7;
    const regla = reglaDe(dia);
    if (!regla || regla.cerrado || !regla.abre) continue;
    if (salto === 0 && ahora.minutos >= minutosReloj(regla.abre)) continue;
    const hora = horaCorta(regla.abre);
    if (salto === 0) return { abierto: false, texto: "Cerrado, abrimos hoy a las " + hora };
    if (salto === 1) return { abierto: false, texto: "Cerrado, abrimos mañana a las " + hora };
    return { abierto: false, texto: "Cerrado, abrimos el " + nombres[dia] + " a las " + hora };
  }
  return { abierto: false, texto: "Cerrado ahora" };
}

export function celularColombia(valor) {
  let digits = String(valor || "").replace(/\D/g, "");
  if ((digits.startsWith("57") && digits.length === 12) || (digits.startsWith("057") && digits.length === 13)) {
    digits = digits.slice(-10);
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return { ok: true, digitos: digits };
  }
  if (!digits) return { ok: false, mensaje: "Escribe tu celular." };
  return { ok: false, mensaje: "El celular debe tener 10 dígitos y empezar por 3. Ejemplo: 300 123 4567." };
}

export function avisoDuracion(nombre) {
  const minutos = Number(negocio.minutos[nombre]);
  if (!Number.isFinite(minutos) || minutos <= 0) return "";
  const base = "Duración estimada: " + minutos + " min.";
  if (minutos > Number(negocio.bloqueMinutos || 60)) {
    return base + " El bloque de una hora puede quedarse corto. Si necesitas más tiempo, escríbelo en la nota.";
  }
  return base;
}

export function minutosDe(nombre) {
  const minutos = Number(negocio.minutos[nombre]);
  return Number.isFinite(minutos) && minutos > 0 ? minutos : 60;
}
