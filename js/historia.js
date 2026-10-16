import { negocio, direccionLinea, textoHorario } from "./config.js";

const horarioTexto = negocio.horario.some((regla) => !regla.cerrado && regla.abre && regla.cierra)
  ? negocio.horario.filter((regla) => !regla.cerrado && regla.abre && regla.cierra).map((regla) => {
    return regla.etiqueta + " de " + textoHorario(regla).replace(" – ", " a ");
  }).join(". ")
  : "EDITAR";

const historia = {
  intro: [
    negocio.nombre + " es la barbería de " + negocio.barbero + " en " + negocio.direccion.ciudad + ".",
    "EDITAR: la historia del local."
  ],
  momentos: [
    {
      ano: "Hoy",
      titulo: "Un barbero",
      texto: negocio.barbero + " atiende " + negocio.nombre + " en la " + negocio.direccion.calle + ", " + negocio.direccion.ciudad + "."
    },
    {
      ano: "EDITAR",
      titulo: "EDITAR",
      texto: "EDITAR: un momento de la historia."
    }
  ],
  bloques: [
    {
      foto: "assets/historia/01-inicio.jpg",
      ancho: 1280,
      alto: 720,
      alt: "Barbero cortando el cabello de un cliente bajo luz cálida. EDITAR: describe la foto definitiva.",
      titulo: "Tijera, navaja y tiempo",
      texto: "EDITAR: el oficio en el local.",
      nota: "EDITAR: sustituye esta foto y, si quieres, este párrafo."
    },
    {
      foto: "assets/historia/02-sillon.jpg",
      ancho: 1152,
      alto: 864,
      alt: "Sillón de barbería en cuero, madera oscura y luz de un aplique. EDITAR: describe la foto definitiva.",
      titulo: "La silla",
      texto: "EDITAR: qué significa la silla.",
      nota: "EDITAR: aquí puedes contar qué significa esta silla para la casa."
    },
    {
      foto: "assets/historia/03-oficio.jpg",
      ancho: 1280,
      alto: 720,
      alt: "Detalle de un corte. EDITAR: describe la foto definitiva.",
      titulo: "El oficio",
      texto: "Un buen corte se siente antes de verse.",
      nota: "EDITAR: añade un detalle del día a día que quieras conservar."
    },
    {
      foto: "assets/historia/04-barrio.jpg",
      ancho: 1152,
      alto: 864,
      alt: "Interior cálido de una barbería. EDITAR: describe la foto definitiva.",
      titulo: negocio.direccion.ciudad,
      texto: direccionLinea() + ".",
      nota: "EDITAR: foto del local cuando la haya."
    }
  ]
};

const intro = document.querySelector("[data-historia-intro]");
const timeline = document.querySelector("[data-historia-timeline]");
const blocks = document.querySelector("[data-historia-blocks]");

if (intro) {
  historia.intro.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    intro.appendChild(p);
  });
}

if (timeline) {
  historia.momentos.forEach((momento, index) => {
    const item = document.createElement("li");
    item.className = "timeline-item reveal";
    if (index % 3 === 1) item.dataset.delay = "1";
    const year = document.createElement("p");
    year.className = "timeline-year";
    year.textContent = momento.ano;
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = momento.titulo;
    const text = document.createElement("p");
    text.textContent = momento.texto;
    copy.append(heading, text);
    item.append(year, copy);
    timeline.appendChild(item);
  });
}

if (blocks) {
  historia.bloques.forEach((bloque, index) => {
    const article = document.createElement("article");
    article.className = "historia-block reveal" + (index % 2 === 1 ? " is-flip" : "");
    if (index % 2 === 1) article.dataset.delay = "1";

    const photo = document.createElement("div");
    photo.className = "historia-photo";
    const picture = document.createElement("picture");
    const source = document.createElement("source");
    const stem = bloque.foto.replace(/\.jpe?g$/, "");
    const width = bloque.ancho || 1152;
    const height = bloque.alto || 864;
    source.type = "image/webp";
    source.srcset = stem + "-640.webp 640w, " + stem + ".webp " + width + "w";
    source.sizes = "(min-width: 800px) 46vw, 100vw";
    const img = document.createElement("img");
    img.src = bloque.foto;
    img.srcset = stem + "-640.jpg 640w, " + bloque.foto + " " + width + "w";
    img.sizes = "(min-width: 800px) 46vw, 100vw";
    img.alt = bloque.alt;
    img.width = width;
    img.height = height;
    img.loading = "lazy";
    img.decoding = "async";
    picture.append(source, img);
    photo.appendChild(picture);

    const copy = document.createElement("div");
    copy.className = "historia-block-copy";
    const heading = document.createElement("h3");
    heading.textContent = bloque.titulo;
    const text = document.createElement("p");
    text.textContent = bloque.texto;
    const note = document.createElement("p");
    note.className = "historia-note";
    note.textContent = bloque.nota;
    copy.append(heading, text, note);

    article.append(photo, copy);
    blocks.appendChild(article);
  });
}

const cierre = document.querySelector("[data-cierre]");
if (cierre) cierre.textContent = direccionLinea() + ". " + horarioTexto + ".";
