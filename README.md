# Laboratorio 2 - Mundial 2026

Proyecto del curso Programacion en Ambiente Web I (ISW-521).
Es una pagina web que muestra informacion del Mundial 2026 sacando los datos de una API.

## Con que esta hecho

- HTML
- CSS
- JavaScript

## Como abrirlo

Se abre el archivo index.html con la extension Live Server de Visual Studio Code.

## Que tiene la pagina

La pagina tiene 5 pantallas que se cambian con el menu de arriba:

1. Tour de Sedes: muestra las sedes del mundial y al hacer clic en una baja hasta los partidos de esa sede.
2. Agenda: muestra los dias que tienen 2 o mas partidos el mismo dia, en columnas.
3. Timeline: muestra todos los partidos ordenados por fecha y va cargando de 10 en 10 cuando bajas con el scroll.
4. Dashboard: eliges tu equipo favorito y ves sus partidos y su posicion en el grupo. El equipo se guarda para la proxima vez que entres.
5. Matriz: muestra una tabla por cada grupo con los resultados de los partidos entre los equipos.

## Que pasa si la API falla

La pagina esta hecha para que no se quede en blanco si algo sale mal:

- Guarda los ultimos datos que cargaron bien y los muestra con un aviso de que no estan actualizados.
- Si el servidor da error, la pagina reintenta sola varias veces esperando cada vez mas tiempo (1, 2, 4 y 8 segundos).

## API que utilice

https://worldcup26.ir
