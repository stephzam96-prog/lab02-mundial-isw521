// Direccion de la API
const API = "https://worldcup26.ir";

const aviso = document.getElementById("aviso");

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.style.display = texto ? "block" : "none";
}

// Espera cierta cantidad de segundos
function esperar(segundos) {
  return new Promise(function (listo) {
    setTimeout(listo, segundos * 1000);
  });
}

// Muestra una cuenta atras en el aviso (para el 429 y el 500)
async function cuentaAtras(codigo, segundos) {
  for (let s = segundos; s > 0; s--) {
    mostrarAviso("Error " + codigo + ". Reintentando en " + s + " segundos...");
    await esperar(1);
  }
}

async function pedirDatos(ruta) {
  const url = API + ruta;
  const esperas = [1, 2, 4, 8]; // segundos antes de cada reintento

  for (let intento = 0; intento <= esperas.length; intento++) {
    try {
      const respuesta = await fetch(url);

      if (respuesta.ok) {
        const datos = await respuesta.json();
        localStorage.setItem("copia_" + ruta, JSON.stringify(datos));
        mostrarAviso("");
        return { datos: datos, viejo: false };
      }

      // Errores 500 o 429: reintentamos esperando cada vez mas
      if ((respuesta.status === 500 || respuesta.status === 429) && intento < esperas.length) {
        await cuentaAtras(respuesta.status, esperas[intento]);
        continue;
      }

      throw new Error("La API respondio con error " + respuesta.status);

    } catch (error) {
      if (intento < esperas.length) {
        await cuentaAtras("de conexion", esperas[intento]);
        continue;
      }
      console.log("No se pudo cargar " + ruta + ":", error);
      const copia = localStorage.getItem("copia_" + ruta);
      if (copia) {
        mostrarAviso("Mostrando datos guardados (no actualizados).");
        return { datos: JSON.parse(copia), viejo: true };
      }
      throw error;
    }
  }
}

//--------------------------------------------------------


// Carga la funcion de cada pantalla
const cargadores = {};

//--------------------------------------------------------

// Muestra una pantalla y esconde las demas
function mostrarPantalla(id) {
  const todas = document.querySelectorAll(".pantalla");
  todas.forEach(function (p) { p.style.display = "none"; });
  document.getElementById(id).style.display = "block";

  const botones = document.querySelectorAll(".boton-nav");
  botones.forEach(function (b) { b.classList.remove("activo"); });
  document.querySelector('[data-pantalla="' + id + '"]').classList.add("activo");

  // Si esa pantalla ya tiene su funcion para cargar datos, la llamamos
  if (cargadores[id]) {
    cargadores[id]();
  }
}

// Cuando la pagina termina de cargar, conectamos los botones del menu
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".boton-nav").forEach(function (boton) {
    boton.addEventListener("click", function () {
      mostrarPantalla(boton.dataset.pantalla);
    });
  });
  
  document.getElementById("agenda-anterior").addEventListener("click", function () {
    if (indiceFecha > 0) { indiceFecha--; dibujarFechaAgenda(); }
  });
  document.getElementById("agenda-siguiente").addEventListener("click", function () {
    if (indiceFecha < fechasAgenda.length - 1) { indiceFecha++; dibujarFechaAgenda(); }
  });

  mostrarPantalla("tour"); // arrancamos en la primera
});

// -------------  Pantalla 1: Tour de Sedes -------------------------

async function cargarTour() {
  const listaSedes = document.getElementById("lista-sedes");
  listaSedes.innerHTML = "<p>Cargando sedes...</p>";

  let sedes = [];
  try {
    const resultado = await pedirDatos("/get/stadiums");
    sedes = resultado.datos.stadiums;
  } catch (error) {
    listaSedes.innerHTML = "<p>No se pudieron cargar las sedes.</p>";
    return;
  }

  listaSedes.innerHTML = "";
  sedes.forEach(function (sede) {
    const boton = document.createElement("button");
    boton.className = "tarjeta-sede";

    //Contenido del boton con nombre, ciudad, pais y capacidad
    boton.innerHTML =
      "<strong>" + sede.name_en + "</strong><br>" +
      sede.city_en + ", " + sede.country_en + "<br>" +
      "Capacidad: " + Number(sede.capacity).toLocaleString();
    boton.addEventListener("click", function () {
      document.querySelectorAll(".tarjeta-sede").forEach(function (b) {
        b.classList.remove("activa");
      });
      boton.classList.add("activa");
      mostrarPartidosDeSede(sede);
    });
    listaSedes.appendChild(boton);
  });
}

async function mostrarPartidosDeSede(sede) {
  const zona = document.getElementById("partidos-sede");
  zona.innerHTML = "<h3>Partidos en " + sede.name_en + "</h3><p>Cargando...</p>";
  zona.scrollIntoView({ behavior: "smooth" });

  let partidos = [];
  try {
    const resultado = await pedirDatos("/get/games");
    partidos = resultado.datos.games;
  } catch (error) {
    zona.innerHTML = "<h3>Partidos en " + sede.name_en + "</h3>" +
      "<p>No se pudieron cargar los partidos de esta sede.</p>";
    return;
  }

  const deLaSede = partidos.filter(function (p) {
    return p.stadium_id === sede.id;
  });

  let html = "<h3>Partidos en " + sede.name_en + "</h3>";
  if (deLaSede.length === 0) {
    html += "<p>No hay partidos en esta sede.</p>";
  } else {
      deLaSede.forEach(function (p) {
      html += htmlPartido(p);
    }); 
  }
  zona.innerHTML = html;
}

// Registrar esta pantalla
cargadores.tour = cargarTour;


// -------------  Pantalla 2: Agenda Simultanea ----------------

// Convierte "06/11/2026 13:00" en una fecha de verdad, para poder ordenar
function aFecha(texto) {
  const partes = texto.split(" ");
  const dia = partes[0].split("/");
  const hora = partes[1].split(":");
  return new Date(dia[2], dia[0] - 1, dia[1], hora[0], hora[1]);
}

// ===== Pantalla 2: Agenda Simultanea =====
let fechasAgenda = [];
let indiceFecha = 0;
let partidosPorFecha = {};

async function cargarAgenda() {
  const contenedor = document.getElementById("agenda-columnas");
  contenedor.innerHTML =
    "<div class='columna'><div class='skeleton'></div></div>" +
    "<div class='columna'><div class='skeleton'></div></div>";

  let partidos = [];
  try {
    const resultado = await pedirDatos("/get/games");
    partidos = resultado.datos.games;
  } catch (error) {
    contenedor.innerHTML = "<p>No se pudieron cargar los partidos.</p>";
    return;
  }

  partidosPorFecha = {};
  partidos.forEach(function (p) {
    const dia = p.local_date.split(" ")[0];
    if (!partidosPorFecha[dia]) { partidosPorFecha[dia] = []; }
    partidosPorFecha[dia].push(p);
  });

  fechasAgenda = Object.keys(partidosPorFecha).filter(function (dia) {
    return partidosPorFecha[dia].length >= 2;
  });
  fechasAgenda.sort(function (a, b) {
    return aFecha(a + " 00:00") - aFecha(b + " 00:00");
  });

  indiceFecha = 0;
  dibujarFechaAgenda();
}

function dibujarFechaAgenda() {
  const contenedor = document.getElementById("agenda-columnas");
  const etiqueta = document.getElementById("agenda-fecha");

  if (fechasAgenda.length === 0) {
    etiqueta.textContent = "";
    contenedor.innerHTML = "<p>No hay fechas con partidos simultaneos.</p>";
    return;
  }

  const fecha = fechasAgenda[indiceFecha];
  etiqueta.textContent = " " + fecha + " (" + (indiceFecha + 1) +
    " de " + fechasAgenda.length + ") ";

  const delDia = partidosPorFecha[fecha];
  contenedor.innerHTML = "";
  delDia.forEach(function (p) {
    const columna = document.createElement("div");
    columna.className = "columna";
    const vs = p.finished === "TRUE" ? (p.home_score + " - " + p.away_score) : "vs";
        columna.innerHTML =
      "<h4>" + p.home_team_name_en + "<br>" + vs + "<br>" + p.away_team_name_en + "</h4>" +
      "<p>" + p.local_date.split(" ")[1] + "</p>";
    contenedor.appendChild(columna);
  });
}

cargadores.agenda = cargarAgenda;




// ------------   Pantalla 3: Timeline Infinito ----------------

let partidosTimeline = [];
let mostrados = 0;
let observador = null;

async function cargarTimeline() {
  const lista = document.getElementById("timeline-lista");
  lista.innerHTML = "<p>Cargando partidos...</p>";
  mostrados = 0;

  let partidos = [];
  try {
    const resultado = await pedirDatos("/get/games");
    partidos = resultado.datos.games;
  } catch (error) {
    lista.innerHTML =
      "<p>No se pudieron cargar los partidos.</p>" +
      "<button id='reintentar-timeline'>Reintentar</button>";
    document.getElementById("reintentar-timeline")
      .addEventListener("click", cargarTimeline);
    return;
  }

  partidos.sort(function (a, b) {
    return aFecha(a.local_date) - aFecha(b.local_date);
  });
  partidosTimeline = partidos;

  lista.innerHTML = "";
  insertarMas();

  const centinela = document.getElementById("centinela");
  if (observador) { observador.disconnect(); }
  observador = new IntersectionObserver(function (entradas) {
    if (entradas[0].isIntersecting) {
      insertarMas();
    }
  });
  observador.observe(centinela);
}

function insertarMas() {
  const lista = document.getElementById("timeline-lista");
  const siguientes = partidosTimeline.slice(mostrados, mostrados + 10);
  siguientes.forEach(function (p) {
    lista.innerHTML += htmlPartido(p);
  });
  mostrados = mostrados + siguientes.length;
  if (mostrados >= partidosTimeline.length && observador) {
    observador.disconnect();
  }
}

cargadores.timeline = cargarTimeline;

// ------------ Pantalla 4: Dashboard del Fanatico ----------------

let listaEquipos = [];

async function cargarDashboard() {
  const selector = document.getElementById("selector-equipo");

  let equipos = [];
  try {
    const resultado = await pedirDatos("/get/teams");
    equipos = resultado.datos.teams;
  } catch (error) {
    document.getElementById("dashboard-contenido").innerHTML =
      "<p>No se pudieron cargar los equipos.</p>";
    return;
  }
  listaEquipos = equipos;

  if (selector.children.length === 0) {
    equipos.forEach(function (eq) {
      const opcion = document.createElement("option");
      opcion.value = eq.id;
      opcion.textContent = eq.name_en;
      selector.appendChild(opcion);
    });
    selector.addEventListener("change", function () {
      localStorage.setItem("equipoFavorito", selector.value);
      mostrarEquipoFavorito(selector.value);
    });
  }

  const guardado = localStorage.getItem("equipoFavorito");
  if (guardado) {
    selector.value = guardado;
    mostrarEquipoFavorito(guardado);
  }
}

async function mostrarEquipoFavorito(idEquipo) {
  const zona = document.getElementById("dashboard-contenido");
  zona.innerHTML = "<p>Cargando...</p>";

  const colores = ["#e63946", "#457b9d", "#2a9d8f", "#e9a02a", "#8e44ad"];
  const color = colores[Number(idEquipo) % colores.length];
  document.documentElement.style.setProperty("--color-equipo", color);

  let partidos = [];
  let grupos = [];
  try {
    const rp = await pedirDatos("/get/games");
    partidos = rp.datos.games;
    const rg = await pedirDatos("/get/groups");
    grupos = rg.datos.groups;
  } catch (error) {
    zona.innerHTML = "<p>No se pudieron cargar los datos del equipo.</p>";
    return;
  }

  const equipo = listaEquipos.find(function (e) { return e.id === idEquipo; });
  const nombre = equipo ? equipo.name_en : "Equipo";

  const susPartidos = partidos.filter(function (p) {
    return p.home_team_id === idEquipo || p.away_team_id === idEquipo;
  });

  let fila = null;
  grupos.forEach(function (g) {
    g.teams.forEach(function (t) {
      if (t.team_id === idEquipo) { fila = t; }
    });
  });

  const bandera = equipo ? "<img class='bandera' src='" + equipo.flag + "'> " : "";
  let html = "<h3>" + bandera + nombre + "</h3>";
  if (fila) {
    html += "<p>Puntos: " + fila.pts + " | Goles a favor: " + fila.gf +
      " | Goles en contra: " + fila.ga + "</p>";
  } else {
    html += "<p>No se encontro su posicion en el grupo.</p>";
  }
  html += "<h4>Sus partidos:</h4>";
  susPartidos.forEach(function (p) {
    html += htmlPartido(p);
  });
  zona.innerHTML = html;
}

cargadores.dashboard = cargarDashboard;

// ----------- Pantalla 5: Matriz de Enfrentamientos ----------------

async function cargarMatriz() {
  const contenedor = document.getElementById("matriz-contenido");
  contenedor.innerHTML = "<p>Cargando grupos...</p>";

  let grupos = [];
  let equipos = [];
  try {
    const rg = await pedirDatos("/get/groups");
    grupos = rg.datos.groups;
    const re = await pedirDatos("/get/teams");
    equipos = re.datos.teams;
  } catch (error) {
    contenedor.innerHTML = "<p>No se pudieron cargar los grupos.</p>";
    return;
  }

  // Los partidos pueden fallar; si fallan, dibujamos todo en "Pendiente"
  let partidos = [];
  try {
    const rp = await pedirDatos("/get/games");
    partidos = rp.datos.games;
  } catch (error) {
    partidos = [];
  }

  contenedor.innerHTML = "";
  grupos.forEach(function (g) {
    const equiposGrupo = g.teams.map(function (t) {
      return equipos.find(function (e) { return e.id === t.team_id; });
    }).filter(function (e) { return e; });
    contenedor.appendChild(dibujarMatrizGrupo(g.name, equiposGrupo, partidos));
  });
}

function buscarPartido(partidos, idA, idB) {
  return partidos.find(function (p) {
    const jugado = p.finished === "TRUE";
    const sonEllos =
      (p.home_team_id === idA && p.away_team_id === idB) ||
      (p.home_team_id === idB && p.away_team_id === idA);
    return sonEllos && jugado;
  });
}

function dibujarMatrizGrupo(nombre, equiposGrupo, partidos) {
  const caja = document.createElement("div");
  let html = "<h3>Grupo " + nombre + "</h3><table class='matriz'>";

  html += "<tr><th></th>";
  equiposGrupo.forEach(function (eq) {
    html += "<th><img class='bandera' src='" + eq.flag + "'><br>" + eq.fifa_code + "</th>";
  });
  html += "</tr>";

  equiposGrupo.forEach(function (filaEq) {
    html += "<tr><th><img class='bandera' src='" + filaEq.flag + "'><br>" + filaEq.fifa_code + "</th>";
    equiposGrupo.forEach(function (colEq) {
      if (filaEq.id === colEq.id) {
        html += "<td class='diagonal'></td>";
      } else {
        const juego = buscarPartido(partidos, filaEq.id, colEq.id);
        if (juego) {
          html += "<td>" + juego.home_score + " - " + juego.away_score + "</td>";
        } else {
          html += "<td>Pendiente</td>";
        }
      }
    });
    html += "</tr>";
  });

  html += "</table>";
  caja.innerHTML = html;
  return caja;
}

cargadores.matriz = cargarMatriz;


// Arma el HTML de un partido con su marcador y su estado
function htmlPartido(p) {
  let marcador;
  let estado;
  if (p.finished === "TRUE") {
    marcador = p.home_score + " - " + p.away_score;
    estado = "<span class='estado finalizado'>Finalizado</span>";
  } else {
    marcador = "vs";
    estado = "<span class='estado pendiente'>Pendiente</span>";
  }
  return "<div class='partido'>" +
    "<span class='fecha'>" + p.local_date + "</span> " +
    p.home_team_name_en + " <strong>" + marcador + "</strong> " + p.away_team_name_en +
    " " + estado +
    "</div>";
}