import { negocio, formatoPrecio } from "./config.js";

const base = [
  {
    nombre: "Corte clásico",
    precio: "$25.000",
    ritmo: "Según el cabello, sin prisa",
    duracion: "Según el cabello, sin prisa",
    descripcion: "Tijera y máquina, con lavado y el acabado que te queda natural. Lo trabajamos con calma para que se vea sencillo y se sienta bien al salir.",
    incluye: ["Corte con tijera y máquina", "Lavado", "Acabado natural"],
    ideal: "Para quien quiere un corte limpio, sin un estilo que pida demasiado.",
    cuidado: "Al día siguiente, péinalo como sueles hacerlo. Si algo no te queda en casa, lo vemos en la siguiente visita."
  },
  {
    nombre: "Fade definido",
    precio: "$32.000",
    ritmo: "Según el degradado, sin prisa",
    duracion: "Según el degradado, sin prisa",
    descripcion: "Degradado limpio, línea precisa y textura arriba. Lo dejamos para que dure la semana, sin apretar el proceso.",
    incluye: ["Degradado", "Línea precisa", "Textura arriba"],
    ideal: "Para quien busca un corte marcado que se mantenga claro varios días.",
    cuidado: "El degradado se ve mejor si lo peinas seco los primeros días. Cuando la línea pida un retoque, vuelves."
  },
  {
    nombre: "Barba y perfilado",
    precio: "$18.000",
    ritmo: "Según la barba, sin prisa",
    duracion: "Según la barba, sin prisa",
    descripcion: "Navaja caliente, toalla de vapor y un contorno que no se ve forzado. La barba queda tuya, solo más precisa.",
    incluye: ["Navaja caliente", "Toalla de vapor", "Contorno de la barba"],
    ideal: "Para quien quiere ordenar la barba sin dejarla de revista.",
    cuidado: "Evita rasparte la zona el mismo día. Si el contorno se abre con los días, lo cerramos en la próxima cita."
  },
  {
    nombre: "Afeitado clásico",
    precio: "$28.000",
    ritmo: "Un ritual, sin prisa",
    duracion: "Un ritual, sin prisa",
    descripcion: "Ritual de navaja, vapor y bálsamo. Sales más ligero de lo que entraste. El tiempo es parte del servicio.",
    incluye: ["Navaja", "Vapor", "Bálsamo"],
    ideal: "Para quien quiere un afeitado completo y salir con la piel más ligera.",
    cuidado: "Esa noche, deja la piel en paz: sin rasurar de nuevo. Si sientes tirantez, un bálsamo suave basta."
  },
  {
    nombre: "Corte + barba",
    precio: "$38.000",
    ritmo: "Corte y barba en la misma cita, sin prisa",
    duracion: "Corte y barba en la misma cita, sin prisa",
    descripcion: "El combo completo en una sola cita. Corte y barba, uno después del otro, con el mismo cuidado. Es lo que más se reserva.",
    incluye: ["Corte", "Barba y perfilado", "Una sola cita"],
    ideal: "Para quien quiere salir con el corte y la barba resueltos el mismo día.",
    cuidado: "En casa, el cabello y la barba se cuidan por separado. Si uno de los dos pide un ajuste, lo vemos juntos."
  },
  {
    nombre: "Diseño y línea",
    precio: "$15.000",
    ritmo: "Según el detalle, sin prisa",
    duracion: "Según el detalle, sin prisa",
    descripcion: "Líneas definidas y detalles a máquina, sin recargar el corte. Un acento, no un dibujo de más.",
    incluye: ["Líneas definidas", "Detalle a máquina"],
    ideal: "Para quien quiere un detalle preciso sin cambiar todo el corte.",
    cuidado: "Las líneas se suavizan con los días. Cuando se abran, se pueden retomar en otra visita."
  }
];

export const servicios = base.map((item) => {
  const valor = negocio.precios[item.nombre];
  const minutos = Number(negocio.minutos[item.nombre]);
  const precio = Number.isFinite(Number(valor)) ? formatoPrecio(valor) : item.precio;
  const duracion = Number.isFinite(minutos) && minutos > 0 ? minutos + " min · " + item.ritmo : item.duracion;
  return {
    nombre: item.nombre,
    precio,
    duracion,
    minutos: Number.isFinite(minutos) ? minutos : 0,
    descripcion: item.descripcion,
    incluye: item.incluye,
    ideal: item.ideal,
    cuidado: item.cuidado
  };
});

const modal = document.querySelector("[data-service-modal]");
const panel = document.querySelector("[data-service-panel]");
const title = document.querySelector("#servicio-title");
const price = document.querySelector("[data-service-price]");
const duration = document.querySelector("[data-service-duration]");
const desc = document.querySelector("[data-service-desc]");
const includes = document.querySelector("[data-service-includes]");
const ideal = document.querySelector("[data-service-ideal]");
const tip = document.querySelector("[data-service-tip]");
const reserve = document.querySelector("[data-service-reserve]");

if (modal && panel && title && price && duration && desc && includes && ideal && tip && reserve) {
  let lastFocus = null;

  const focusable = () => [...panel.querySelectorAll("button, a[href], input, select, textarea")].filter((el) => {
    if (el.disabled) return false;
    return el.getClientRects().length > 0;
  });

  const lockPage = (sheetOpen) => {
    const reserva = document.querySelector("[data-modal]");
    const nav = document.querySelector("[data-nav]");
    const reservaOpen = !!(reserva && !reserva.hidden);
    const navOpen = !!(nav && nav.classList.contains("is-open"));
    document.body.classList.toggle("is-locked", sheetOpen || reservaOpen || navOpen);
  };

  const fill = (item) => {
    title.textContent = item.nombre;
    price.textContent = item.precio;
    duration.textContent = item.duracion;
    desc.textContent = item.descripcion;
    ideal.textContent = item.ideal;
    tip.textContent = item.cuidado;
    includes.replaceChildren();
    item.incluye.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      includes.appendChild(li);
    });
    reserve.dataset.servicio = item.nombre;
  };

  let closingSheet = false;
  let closeToken = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeSheet = (restore, done) => {
    if (modal.hidden || closingSheet) return;
    const token = ++closeToken;
    const finish = () => {
      if (token !== closeToken || modal.hidden) return;
      closingSheet = false;
      modal.classList.remove("is-closing");
      modal.hidden = true;
      document.removeEventListener("keydown", onKey, true);
      lockPage(false);
      if (restore && lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      if (typeof done === "function") done();
    };
    if (reduceMotion) {
      finish();
      return;
    }
    closingSheet = true;
    modal.classList.add("is-closing");
    const onEnd = (event) => {
      if (event.target !== panel) return;
      panel.removeEventListener("animationend", onEnd);
      finish();
    };
    panel.addEventListener("animationend", onEnd);
    window.setTimeout(finish, 460);
  };

  function onKey(event) {
    if (modal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSheet(true);
      return;
    }
    if (event.key !== "Tab") return;
    const nodes = focusable();
    if (!nodes.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  const openSheet = (trigger, item) => {
    if (!modal.hidden) return;
    closeToken += 1;
    closingSheet = false;
    modal.classList.remove("is-closing");
    lastFocus = trigger || null;
    fill(item);
    modal.hidden = false;
    lockPage(true);
    document.addEventListener("keydown", onKey, true);
    panel.focus({ preventScroll: true });
  };

  document.querySelectorAll("[data-service]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.getAttribute("data-service");
      const item = servicios.find((entry) => entry.nombre === name);
      if (!item) return;
      openSheet(button, item);
    });
  });

  modal.querySelectorAll("[data-service-close]").forEach((el) => {
    el.addEventListener("click", () => closeSheet(true));
  });

  reserve.addEventListener("click", () => {
    const servicio = reserve.dataset.servicio || title.textContent;
    const trigger = lastFocus;
    closeSheet(false, () => {
      document.dispatchEvent(new CustomEvent("pupilos:reservar", {
        detail: { servicio, trigger }
      }));
    });
  });
}
