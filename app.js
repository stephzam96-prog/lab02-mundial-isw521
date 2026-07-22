// Direccion de la API
const API = "https://worldcup26.ir";

// Pide datos a la API y devuelve el resultado
async function pedirDatos(ruta) {
  const respuesta = await fetch(API + ruta);
  const datos = await respuesta.json();
  return { datos: datos, viejo: false };
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
    boton.textContent = sede.name_en + " (" + sede.city_en + ")";
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
      html += "<div class='partido'>" + p.local_date + " — " +
        p.home_team_name_en + " vs " + p.away_team_name_en + "</div>";
    });
  }
  zona.innerHTML = html;
}

// Registrar esta pantalla
cargadores.tour = cargarTour;