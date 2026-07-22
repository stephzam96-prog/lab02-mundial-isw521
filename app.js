// Carga la funcion de cada pantalla
const cargadores = {};

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