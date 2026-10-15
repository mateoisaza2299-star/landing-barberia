const historia = {
  intro: [
    "Pupilos Barber lleva doce años en el mismo punto de Funza. Desde 2014 el oficio ha sido el mismo: tijera, navaja y tiempo.",
    "EDITAR: cuenta aquí cómo empezó el local, quién abrió la primera silla y qué querían cuidar desde el primer día."
  ],
  momentos: [
    {
      ano: "2014",
      titulo: "Abrimos en Funza",
      texto: "Pupilos Barber empieza en Funza. El mismo barrio y el mismo oficio, sin cambiar de esquina."
    },
    {
      ano: "EDITAR",
      titulo: "EDITAR: un momento del camino",
      texto: "EDITAR: sustituye este recuerdo. Puede ser la primera silla, un cliente que volvió o el día en que el local tomó su forma."
    },
    {
      ano: "12 años",
      titulo: "El mismo punto",
      texto: "No crecimos por moda. La gente vuelve cuando el corte queda bien y la conversación no estorba. Seguimos en el mismo punto de Funza."
    },
    {
      ano: "3 barberos",
      titulo: "Una cita a la vez",
      texto: "Hoy atienden Miguel, Camilo Herrera y Andrés Vega. Tres barberos, una cita a la vez, con calma."
    },
    {
      ano: "Hoy",
      titulo: "La puerta de siempre",
      texto: "Cra 6 #23-70, Zuame, Funza. Lunes a viernes de 9:00 am a 7:00 pm. Sábados de 9:00 am a 5:00 pm. Los domingos descansamos la tijera."
    }
  ],
  bloques: [
    {
      foto: "assets/historia/01-inicio.jpg",
      alt: "Barbero cortando el cabello de un cliente bajo luz cálida. EDITAR: describe la foto definitiva.",
      titulo: "Tijera, navaja y tiempo",
      texto: "El local es oscuro, cálido y simple a propósito. El corte se hace sin prisa y sin ruido.",
      nota: "EDITAR: sustituye esta foto y, si quieres, este párrafo."
    },
    {
      foto: "assets/historia/02-sillon.jpg",
      alt: "Sillón de barbería en cuero, madera oscura y luz de un aplique. EDITAR: describe la foto definitiva.",
      titulo: "La silla",
      texto: "Una cita a la vez. El sitio se siente cuidado, sin pose y sin letra pequeña.",
      nota: "EDITAR: aquí puedes contar qué significa esta silla para la casa."
    },
    {
      foto: "assets/historia/03-oficio.jpg",
      alt: "Detalle de un corte en Pupilos Barber. EDITAR: describe la foto definitiva.",
      titulo: "El oficio",
      texto: "Un buen corte se siente antes de verse. Por eso el trabajo sigue siendo de tijera, navaja y tiempo.",
      nota: "EDITAR: añade un detalle del día a día que quieras conservar."
    },
    {
      foto: "assets/historia/04-barrio.jpg",
      alt: "Interior cálido de la barbería. EDITAR: describe la foto definitiva.",
      titulo: "El barrio",
      texto: "Seguimos en Funza, en la Cra 6 #23-70, Zuame. Quien llega de paso y quien vuelve encuentra la misma puerta.",
      nota: "EDITAR: si hubo un cambio de local o de fachada, escríbelo aquí. Si no, borra esta línea."
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
    const img = document.createElement("img");
    img.src = bloque.foto;
    img.alt = bloque.alt;
    img.width = 1152;
    img.height = 864;
    img.loading = "lazy";
    img.decoding = "async";
    photo.appendChild(img);

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
