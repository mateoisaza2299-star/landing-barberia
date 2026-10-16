import { negocio, formatoPrecio } from "./config.js";

const base = [
  {
    nombre: "Corte normal",
    precio: "EDITAR",
    ritmo: "Según el cabello, sin prisa",
    duracion: "Según el cabello, sin prisa",
    descripcion: "Tijera y máquina, con lavado y el acabado que te queda natural. Lo trabajamos con calma para que se vea sencillo y se sienta bien al salir.",
    incluye: ["Corte con tijera y máquina", "Lavado", "Acabado natural"],
    ideal: "Para quien quiere un corte limpio, sin un estilo que pida demasiado.",
    cuidado: "Al día siguiente, péinalo como sueles hacerlo. Si algo no te queda en casa, lo vemos en la siguiente visita.",
    fotos: [
      { src: "assets/servicios/corte-normal/1.jpg", width: 1080, height: 1049, alt: "Corte con degradado medio y cabello corto peinado hacia atrás, visto de perfil." },
      { src: "assets/servicios/corte-normal/2.jpg", width: 902, height: 1599, alt: "Corte texturizado corto con degradado bajo, visto de perfil." },
      { src: "assets/servicios/corte-normal/3.jpg", width: 1080, height: 1465, alt: "Corte con línea definida en el lateral y cabello oscuro peinado hacia un lado." },
      { src: "assets/servicios/corte-normal/4.jpg", width: 1170, height: 1595, alt: "Corte con rulos arriba, puntas claras y degradado en los lados." },
      { src: "assets/servicios/corte-normal/5.jpg", width: 1050, height: 1600, alt: "Corte con un diseño de araña rapado en el lateral y cabello corto arriba." },
      { src: "assets/servicios/corte-normal/6.jpg", width: 1079, height: 1533, alt: "Corte con un diseño de mariposa rapado en el lateral." },
      { src: "assets/servicios/corte-normal/7.jpg", width: 1079, height: 1437, alt: "Corte con degradado y líneas rapadas en el lateral, cabello peinado hacia atrás." },
      { src: "assets/servicios/corte-normal/8.jpg", width: 1163, height: 1600, alt: "Corte con rulos largos atrás y un diseño rapado en el lateral." },
      { src: "assets/servicios/corte-normal/9.jpg", width: 1170, height: 1194, alt: "Corte con degradado y un corazón rapado en la nuca." },
      { src: "assets/servicios/corte-normal/10.jpg", width: 1200, height: 1600, alt: "Corte con un diseño de flor rapado en el lateral y cabello corto arriba." }
    ]
  },
  {
    nombre: "Fade definido",
    precio: "EDITAR",
    ritmo: "Según el degradado, sin prisa",
    duracion: "Según el degradado, sin prisa",
    descripcion: "Degradado limpio, línea precisa y textura arriba. Lo dejamos para que dure la semana, sin apretar el proceso.",
    incluye: ["Degradado", "Línea precisa", "Textura arriba"],
    ideal: "Para quien busca un corte marcado que se mantenga claro varios días.",
    cuidado: "El degradado se ve mejor si lo peinas seco los primeros días. Cuando la línea pida un retoque, vuelves."
  },
  {
    nombre: "Barba y perfilado",
    precio: "EDITAR",
    ritmo: "Según la barba, sin prisa",
    duracion: "Según la barba, sin prisa",
    descripcion: "Navaja caliente, toalla de vapor y un contorno que no se ve forzado. La barba queda tuya, solo más precisa.",
    incluye: ["Navaja caliente", "Toalla de vapor", "Contorno de la barba"],
    ideal: "Para quien quiere ordenar la barba sin dejarla de revista.",
    cuidado: "Evita rasparte la zona el mismo día. Si el contorno se abre con los días, lo cerramos en la próxima cita."
  },
  {
    nombre: "Afeitado clásico",
    precio: "EDITAR",
    ritmo: "Un ritual, sin prisa",
    duracion: "Un ritual, sin prisa",
    descripcion: "Ritual de navaja, vapor y bálsamo. Sales más ligero de lo que entraste. El tiempo es parte del servicio.",
    incluye: ["Navaja", "Vapor", "Bálsamo"],
    ideal: "Para quien quiere un afeitado completo y salir con la piel más ligera.",
    cuidado: "Esa noche, deja la piel en paz: sin rasurar de nuevo. Si sientes tirantez, un bálsamo suave basta."
  },
  {
    nombre: "Corte + barba",
    precio: "EDITAR",
    ritmo: "Corte y barba en la misma cita, sin prisa",
    duracion: "Corte y barba en la misma cita, sin prisa",
    descripcion: "El combo completo en una sola cita. Corte y barba, uno después del otro, con el mismo cuidado. Es lo que más se reserva.",
    incluye: ["Corte", "Barba y perfilado", "Una sola cita"],
    ideal: "Para quien quiere salir con el corte y la barba resueltos el mismo día.",
    cuidado: "En casa, el cabello y la barba se cuidan por separado. Si uno de los dos pide un ajuste, lo vemos juntos."
  },
  {
    nombre: "Diseño y línea",
    precio: "EDITAR",
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
  const numero = Number(valor);
  const precio = Number.isFinite(numero) && numero > 0 ? formatoPrecio(numero) : "EDITAR";
  const duracion = Number.isFinite(minutos) && minutos > 0 ? minutos + " min · " + item.ritmo : item.duracion;
  return {
    nombre: item.nombre,
    precio,
    duracion,
    minutos: Number.isFinite(minutos) ? minutos : 0,
    descripcion: item.descripcion,
    incluye: item.incluye,
    ideal: item.ideal,
    cuidado: item.cuidado,
    fotos: item.fotos || []
  };
});

const pictureOf = (foto, sizes, lazy) => {
  const picture = document.createElement("picture");
  const source = document.createElement("source");
  const stem = foto.src.replace(/\.jpe?g$/, "");
  source.type = "image/webp";
  source.srcset = stem + "-640.webp 640w, " + stem + ".webp " + foto.width + "w";
  source.sizes = sizes;
  const img = document.createElement("img");
  img.src = foto.src;
  img.srcset = stem + "-640.jpg 640w, " + foto.src + " " + foto.width + "w";
  img.sizes = sizes;
  img.alt = foto.alt;
  img.width = foto.width;
  img.height = foto.height;
  img.decoding = "async";
  if (lazy) img.loading = "lazy";
  picture.append(source, img);
  return picture;
};

document.querySelectorAll("[data-service]").forEach((button) => {
  const item = servicios.find((entry) => entry.nombre === button.getAttribute("data-service"));
  if (!item || !item.fotos.length || button.querySelector(".service-cover")) return;
  const cover = document.createElement("span");
  cover.className = "service-cover";
  cover.appendChild(pictureOf(item.fotos[0], "(min-width: 900px) 30vw, 100vw", true));
  button.insertBefore(cover, button.firstChild);
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
const gallery = document.querySelector("[data-service-gallery]");

if (modal && panel && title && price && duration && desc && includes && ideal && tip && reserve && gallery) {
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

  const lightbox = document.createElement("div");
  lightbox.className = "photo-lightbox";
  lightbox.hidden = true;
  const lightBackdrop = document.createElement("button");
  lightBackdrop.type = "button";
  lightBackdrop.className = "photo-lightbox-backdrop";
  lightBackdrop.setAttribute("aria-label", "Cerrar foto");
  const lightPicture = document.createElement("picture");
  const lightSource = document.createElement("source");
  lightSource.type = "image/webp";
  const lightImg = document.createElement("img");
  lightImg.alt = "";
  lightPicture.append(lightSource, lightImg);
  const lightClose = document.createElement("button");
  lightClose.type = "button";
  lightClose.className = "photo-lightbox-close";
  lightClose.setAttribute("aria-label", "Cerrar");
  lightClose.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  lightbox.append(lightBackdrop, lightPicture, lightClose);
  document.body.appendChild(lightbox);
  let lightReturn = null;

  const closeLightbox = () => {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    lightImg.removeAttribute("src");
    lightSource.removeAttribute("srcset");
    const back = lightReturn;
    lightReturn = null;
    if (back && typeof back.focus === "function") back.focus();
  };

  const openLightbox = (foto, trigger) => {
    const stem = foto.src.replace(/\.jpe?g$/, "");
    lightSource.srcset = stem + ".webp";
    lightImg.src = foto.src;
    lightImg.alt = foto.alt;
    lightImg.width = foto.width;
    lightImg.height = foto.height;
    lightReturn = trigger || null;
    lightbox.hidden = false;
    lightClose.focus();
  };

  lightClose.addEventListener("click", closeLightbox);
  lightBackdrop.addEventListener("click", closeLightbox);

  const mountGallery = (fotos) => {
    gallery.replaceChildren();
    if (!fotos.length) {
      gallery.hidden = true;
      return;
    }
    gallery.hidden = false;
    let index = 0;
    let swiped = false;
    const many = fotos.length > 1;
    const stage = document.createElement("div");
    stage.className = "service-stage";
    const zoom = document.createElement("button");
    zoom.type = "button";
    zoom.className = "service-zoom";
    zoom.setAttribute("aria-label", "Ampliar foto");
    stage.appendChild(zoom);
    const arrow = (dir, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "service-arrow service-arrow-" + dir;
      button.setAttribute("aria-label", label);
      button.innerHTML = dir === "prev"
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
      button.addEventListener("click", () => show(dir === "prev" ? index - 1 : index + 1));
      return button;
    };
    if (many) {
      stage.append(arrow("prev", "Foto anterior"), arrow("next", "Foto siguiente"));
    }
    const thumbs = document.createElement("div");
    thumbs.className = "service-thumbs";
    thumbs.setAttribute("role", "tablist");
    thumbs.setAttribute("aria-label", "Fotos del servicio");
    const count = document.createElement("p");
    count.className = "service-count";
    const thumbButtons = fotos.map((foto, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "service-thumb";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-label", "Foto " + (i + 1));
      const shot = pictureOf(foto, "54px", true);
      const thumbImg = shot.querySelector("img");
      if (thumbImg) thumbImg.alt = "";
      button.appendChild(shot);
      button.addEventListener("click", () => show(i));
      thumbs.appendChild(button);
      return button;
    });
    const show = (nextIndex) => {
      index = (nextIndex + fotos.length) % fotos.length;
      const foto = fotos[index];
      zoom.replaceChildren(pictureOf(foto, "(min-width: 700px) 560px, 92vw", false));
      if (many) {
        count.textContent = (index + 1) + " / " + fotos.length;
        thumbButtons.forEach((button, i) => {
          const on = i === index;
          button.setAttribute("aria-selected", String(on));
          button.tabIndex = on ? 0 : -1;
        });
      }
    };
    zoom.addEventListener("click", () => {
      if (swiped) {
        swiped = false;
        return;
      }
      openLightbox(fotos[index], zoom);
    });
    if (many) {
      let tracking = false;
      let startX = 0;
      let startY = 0;
      let pointerId = null;
      stage.addEventListener("pointerdown", (event) => {
        if (event.target.closest(".service-arrow")) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        tracking = true;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
      });
      const finish = (event, allow) => {
        if (!tracking || event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        tracking = false;
        pointerId = null;
        if (allow && Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          swiped = true;
          show(dx < 0 ? index + 1 : index - 1);
        }
      };
      stage.addEventListener("pointerup", (event) => finish(event, true));
      stage.addEventListener("pointercancel", (event) => finish(event, false));
    }
    gallery.appendChild(stage);
    if (many) gallery.append(thumbs, count);
    show(0);
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
    closeLightbox();
    mountGallery(item.fotos || []);
  };

  let closingSheet = false;
  let closeToken = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeSheet = (restore, done) => {
    if (modal.hidden || closingSheet) return;
    closeLightbox();
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
    if (!lightbox.hidden) {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") closeLightbox();
        else lightClose.focus();
      }
      return;
    }
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
      document.dispatchEvent(new CustomEvent("mc:reservar", {
        detail: { servicio, trigger }
      }));
    });
  });
}
