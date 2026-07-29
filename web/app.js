/* ═══════════════════════════════════════════════════════════════
   ALMANAQUE DEL AHORRO — lógica de la hoja.
   Sin dependencias. Lee un único promos.json y guarda la cartera
   del usuario en localStorage. Ver DESIGN.md para las reglas visuales.
   ═══════════════════════════════════════════════════════════════ */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const INICIAL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const CLAVE_CARTERA = 'almanaque.cartera.v1';

const $ = (id) => document.getElementById(id);

const estado = {
  datos: null,
  dia: new Date().getDay(),
  hoy: new Date().getDay(),
  cartera: cargarCartera(),
  offline: false,
};

/* ─────────── persistencia ─────────── */

function cargarCartera() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_CARTERA));
    return Array.isArray(v) ? new Set(v) : new Set();
  } catch {
    return new Set();
  }
}

function guardarCartera() {
  try {
    localStorage.setItem(CLAVE_CARTERA, JSON.stringify([...estado.cartera]));
  } catch {
    /* modo privado: la app sigue andando, solo no recuerda */
  }
}

/* ─────────── formato ─────────── */

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const PERIODO = {
  diario: 'por día',
  semanal: 'por semana',
  quincenal: 'por quincena',
  mensual: 'por mes',
  por_compra: 'por compra',
};

const MEDIO = {
  credito: 'crédito',
  debito: 'débito',
  qr: 'QR',
  modo: 'MODO',
  billetera: 'billetera',
  prepaga: 'prepaga',
  otro: '',
};

function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}

/**
 * url_fuente viene de un pipeline de scraping + modelo, o sea de texto que no
 * controlamos. Un `javascript:` acá sería XSS directo en el href, así que solo
 * dejamos pasar https.
 */
function urlSegura(u) {
  try {
    return new URL(String(u)).protocol === 'https:' ? String(u) : null;
  } catch {
    return null;
  }
}

/** Fecha en que cae ese día de la semana la próxima vez, contando hoy. */
function proximaFecha(dia) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((dia - d.getDay() + 7) % 7));
  return d;
}

const esMia = (p) => estado.cartera.size === 0 || estado.cartera.has(p.banco);
const esCuotas = (p) => p.descuento_pct == null && p.cuotas;

/**
 * Compra de referencia para rankear, en pesos. Una changa de súper de una
 * familia en AMBA. Solo se usa para comparar promos entre sí, nunca se le
 * muestra al usuario como si fuera su gasto.
 */
const TICKET_REFERENCIA = 80000;

/**
 * Ahorro real de una promo sobre la compra de referencia, en pesos.
 *
 * "Sin tope" NO es automáticamente mejor: un 15% sin tope sobre $80.000 son
 * $12.000, y un 35% topeado en $15.000 son $15.000. Rankear por presencia de
 * tope ponía la promo más débil del día como titular.
 */
function ahorroReal(p) {
  if (p.descuento_pct == null) return -1;
  const bruto = (p.descuento_pct / 100) * TICKET_REFERENCIA;
  if (p.tope_monto != null) return Math.min(p.tope_monto, bruto);
  // Sin tope declarado: vale el bruto. Tope desconocido: no puede encabezar el
  // día prometiendo un ahorro que no sabemos si existe, así que se penaliza.
  return p.sin_tope_explicito ? bruto : bruto * 0.5;
}

/* ─────────── render: promo ─────────── */

function pintarPromo(p, ajena) {
  const el = document.createElement('article');
  el.className = 'promo' + (ajena ? ' promo--ajena' : '');

  /* --- cifra principal --- */
  let cifra, etiqueta, clase = '';
  if (esCuotas(p)) {
    // Las cuotas no son un tope: no van en rojo ni compiten en el ranking.
    cifra = `${p.cuotas}×`;
    etiqueta = 'cuotas sin interés';
    clase = ' promo__tope-cifra--cuotas';
  } else if (p.tope_monto == null && p.sin_tope_explicito) {
    cifra = 'SIN TOPE';
    etiqueta = 'ahorro libre';
    clase = ' promo__tope-cifra--texto';
  } else if (p.tope_monto == null) {
    // La fuente no dijo el tope. Decir "sin tope" acá sería inventar la mejor
    // noticia posible sobre un dato que no tenemos.
    cifra = 'S/D';
    etiqueta = 'tope no informado';
    clase = ' promo__tope-cifra--incierto';
  } else {
    cifra = pesos.format(p.tope_monto);
    etiqueta = `tope ${PERIODO[p.tope_periodo] ?? ''}`.trim();
  }

  /* --- datos --- */
  const datos = [];
  if (p.descuento_pct != null) {
    datos.push(`<span class="dato dato--pct">${p.descuento_pct}% off</span>`);
  }
  if (p.cuotas && p.descuento_pct != null) {
    datos.push(`<span class="dato dato--cuotas">${p.cuotas} cuotas</span>`);
  }
  const medios = (p.medios_pago ?? []).map((m) => MEDIO[m]).filter(Boolean);
  if (medios.length) datos.push(`<span class="dato">${medios.join(' · ')}</span>`);
  if (p.canal === 'online') datos.push('<span class="dato">solo online</span>');
  if (p.canal === 'sucursal') datos.push('<span class="dato">solo en el local</span>');

  const url = urlSegura(p.url_fuente);
  const verificado = p.verificado_at
    ? new Date(p.verificado_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    : null;

  el.innerHTML = `
    <h3 class="promo__comercio">${escapar(p.comercio)}</h3>
    <p class="promo__banco">${escapar(p.banco)}</p>
    <p class="promo__tope">
      <span class="promo__tope-cifra${clase}">${cifra}</span>
      <span class="promo__tope-l">${etiqueta}</span>
    </p>
    ${datos.length ? `<div class="promo__datos">${datos.join('')}</div>` : ''}
    ${p.requisitos ? `<p class="promo__req">${escapar(p.requisitos)}</p>` : ''}
    <p class="promo__pie">
      ${p.confianza === 'baja' ? '<span class="promo__dudosa">verificá en la fuente</span>' : ''}
      ${vigenciaTexto(p)}
      ${url ? `<a class="promo__fuente" href="${escapar(url)}" target="_blank" rel="noopener noreferrer">${escapar(p.fuente_label ?? 'fuente')}</a>` : ''}
      ${verificado ? `<span>· visto el ${verificado}</span>` : ''}
    </p>`;

  return el;
}

/** Avisa cuando una promo está por caerse. Antes este dato no se imprimía. */
function vigenciaTexto(p) {
  if (!p.vigencia_hasta) return '';
  const fin = new Date(p.vigencia_hasta + 'T23:59:59');
  const dias = Math.ceil((fin - Date.now()) / 864e5);
  if (dias < 0 || dias > 7) return '';
  const txt = dias === 0 ? 'último día' : dias === 1 ? 'hasta mañana' : `quedan ${dias} días`;
  return `<span class="promo__vence">${txt}</span>`;
}

/* ─────────── render: la hoja ─────────── */

function pintarDia() {
  const { datos, dia } = estado;
  if (!datos) return;

  /* fecha */
  const f = proximaFecha(dia);
  const esHoy = dia === estado.hoy;
  const cajaFecha = $('fecha');
  cajaFecha.dataset.hoy = esHoy ? 'si' : 'no';
  cajaFecha.dataset.domingo = dia === 0 ? 'si' : 'no';
  $('fechaNombre').textContent = DIAS[dia];
  $('fechaNum').textContent = f.getDate();
  $('bandaMes').textContent = `${MESES[f.getMonth()]} ${f.getFullYear()}`;

  const faltan = (dia - estado.hoy + 7) % 7;
  $('fechaRel').textContent = esHoy ? 'hoy' : `en ${faltan} ${faltan === 1 ? 'día' : 'días'}`;

  /* La efeméride del almanaque, con lo que le sirve al usuario. */
  const finDeMes = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate();
  $('fechaNota').textContent =
    f.getDate() === finDeMes
      ? 'Último día del mes: mañana se renueva casi todo el catálogo.'
      : dia === 1
        ? 'Arranca la semana: se resetean los topes semanales.'
        : '';

  /* promos del día: mías primero, ordenadas por ahorro real */
  const ids = new Set(datos.por_dia[dia] ?? []);
  const delDia = datos.promos.filter((p) => ids.has(p.id));

  const porAhorro = (a, b) =>
    ahorroReal(b) - ahorroReal(a) || (b.descuento_pct ?? 0) - (a.descuento_pct ?? 0);

  const mias = delDia.filter((p) => esMia(p) && !esCuotas(p)).sort(porAhorro);
  const miasCuotas = delDia.filter((p) => esMia(p) && esCuotas(p)).sort((a, b) => b.cuotas - a.cuotas);
  const ajenas = delDia.filter((p) => !esMia(p)).sort(porAhorro);

  const listado = $('listado');
  listado.replaceChildren();
  listado.setAttribute('aria-busy', 'false');

  /* animación de pasar la hoja */
  const piso = $('piso');
  piso.style.animation = 'none';
  void piso.offsetWidth;
  piso.style.animation = '';

  if (!delDia.length) {
    listado.innerHTML = `<p class="vacio">
      <span class="vacio__num">0</span>
      No hay descuentos cargados para el <strong>${DIAS[dia].toLowerCase()}</strong>.<br>
      Probá otro día del riel.</p>`;
  } else if (!mias.length && !miasCuotas.length) {
    listado.innerHTML = `<p class="vacio">
      <span class="vacio__num">0</span>
      Ninguna de tus tarjetas sirve el <strong>${DIAS[dia].toLowerCase()}</strong>.<br>
      Abajo están las ${ajenas.length} que existen igual.</p>`;
  }

  for (const p of mias) listado.appendChild(pintarPromo(p, false));

  if (miasCuotas.length) {
    listado.appendChild(rotulo('Cuotas sin interés'));
    for (const p of miasCuotas) listado.appendChild(pintarPromo(p, false));
  }

  if (ajenas.length) {
    listado.appendChild(rotulo(estado.cartera.size ? 'No tenés estas' : 'Otras del día'));
    for (const p of ajenas) listado.appendChild(pintarPromo(p, true));
  }

  pintarBandaAviso(mias);
  pintarRiel();
}

function rotulo(texto) {
  const r = document.createElement('p');
  r.className = 'rotulo';
  r.textContent = texto;
  return r;
}

/**
 * La banda del anunciante, usada para el mejor ahorro del día.
 *
 * No suma topes: un tope mensual de Carrefour y uno semanal de Diarco son
 * unidades distintas y en comercios distintos — sumarlos da un número falso.
 * Muestra la mejor promo sola, elegida por techo real.
 */
function pintarBandaAviso(mias) {
  const banda = $('bandaAviso');
  if (!mias.length) {
    banda.hidden = true;
    return;
  }
  banda.hidden = false;

  const mejor = mias[0]; // ya viene ordenada por techo
  $('bandaLabel').textContent = 'Lo mejor de hoy';

  if (mejor.tope_monto == null && mejor.sin_tope_explicito) {
    $('techoDia').textContent = 'SIN TOPE';
    $('techoNota').textContent = `${mejor.descuento_pct}% en ${mejor.comercio}, sin límite de reintegro`;
  } else if (mejor.tope_monto == null) {
    $('bandaLabel').textContent = 'Lo mejor de hoy';
    $('techoDia').textContent = `${mejor.descuento_pct}%`;
    $('techoNota').textContent = `en ${mejor.comercio} · la fuente no informa el tope, verificá antes de comprar`;
  } else {
    $('techoDia').textContent = pesos.format(mejor.tope_monto);
    $('techoNota').textContent =
      `${mejor.descuento_pct}% en ${mejor.comercio} · tope ${PERIODO[mejor.tope_periodo] ?? ''}`.trim();
  }

  const otras = mias.length - 1;
  if (otras > 0) {
    $('techoNota').textContent += ` · ${otras} más ${otras === 1 ? 'abajo' : 'abajo'}`;
  }
}

function pintarRiel() {
  const riel = $('riel');

  /* Si reconstruimos los botones perdemos el foco del que acaban de tocar,
     así que la primera vez se crean y después solo se actualizan. */
  if (!riel.children.length) {
    for (let d = 0; d < 7; d++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'riel__dia';
      b.innerHTML = `<span class="riel__letra">${INICIAL[d]}</span><span class="riel__n"></span>`;
      b.addEventListener('click', () => {
        estado.dia = d;
        pintarDia();
      });
      riel.appendChild(b);
    }
  }

  for (let d = 0; d < 7; d++) {
    const ids = new Set(estado.datos.por_dia[d] ?? []);
    const n = estado.datos.promos.filter((p) => ids.has(p.id) && esMia(p)).length;
    const b = riel.children[d];

    b.dataset.domingo = d === 0 ? 'si' : 'no';
    b.dataset.hoy = d === estado.hoy ? 'si' : 'no';
    b.dataset.vacio = n === 0 ? 'si' : 'no';
    if (d === estado.dia) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');

    const celda = b.querySelector('.riel__n');
    celda.textContent = n === 0 ? '–' : n;
    celda.classList.toggle('riel__cero', n === 0);

    b.setAttribute(
      'aria-label',
      `${DIAS[d]}: ${n} ${n === 1 ? 'descuento' : 'descuentos'}${d === estado.hoy ? ', hoy' : ''}`,
    );
  }
}

/* ─────────── sello de verificación ─────────── */

function pintarSello() {
  const sello = $('sello');
  const txt = $('selloTexto');

  if (estado.offline) {
    sello.dataset.viejo = 'si';
    txt.textContent = 'sin conexión';
    sello.setAttribute('aria-label', 'Sin conexión. Tocá para reintentar.');
    return;
  }

  const gen = new Date(estado.datos.generado_at);
  const horas = (Date.now() - gen.getTime()) / 36e5;

  if (horas < 48) {
    sello.dataset.viejo = 'no';
    txt.textContent = horas < 24 ? 'al día' : 'ayer';
  } else {
    sello.dataset.viejo = 'si';
    txt.textContent = `hace ${Math.floor(horas / 24)} días`;
  }
  sello.setAttribute(
    'aria-label',
    `Datos verificados el ${gen.toLocaleString('es-AR')}. Tocá para actualizar.`,
  );
}

/* ─────────── cartera ─────────── */

let focoPrevio = null;

function abrirCartera() {
  const lista = $('carteraLista');
  lista.replaceChildren();

  /* Ordenados por cuántas promos aporta cada uno: lo útil arriba. */
  const conteo = new Map();
  for (const p of estado.datos.promos) {
    conteo.set(p.banco, (conteo.get(p.banco) ?? 0) + 1);
  }
  const bancos = [...conteo.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'),
  );

  for (const [banco, n] of bancos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('aria-pressed', String(estado.cartera.has(banco)));
    b.innerHTML = `
      <span class="chip__caja" aria-hidden="true"></span>
      <span>${escapar(banco)}</span>
      <span class="chip__n">${n}</span>`;
    b.addEventListener('click', () => {
      if (estado.cartera.has(banco)) estado.cartera.delete(banco);
      else estado.cartera.add(banco);
      b.setAttribute('aria-pressed', String(estado.cartera.has(banco)));
      guardarCartera();
      actualizarContador();
      pintarDia();
    });
    lista.appendChild(b);
  }

  focoPrevio = document.activeElement;
  $('telon').hidden = false;
  $('cartera').hidden = false;
  $('hoja').setAttribute('inert', '');
  $('riel').setAttribute('inert', '');
  document.body.style.overflow = 'hidden';
  $('carteraTitulo').focus();
}

function cerrarCartera() {
  $('telon').hidden = true;
  $('cartera').hidden = true;
  $('hoja').removeAttribute('inert');
  $('riel').removeAttribute('inert');
  document.body.style.overflow = '';
  (focoPrevio ?? $('abrirCartera')).focus();
}

const carteraAbierta = () => !$('cartera').hidden;

function actualizarContador() {
  const n = estado.cartera.size;
  $('carteraN').textContent = n || '·';
  $('abrirCartera').setAttribute(
    'aria-label',
    n ? `Mi cartera: ${n} seleccionados` : 'Elegir mis tarjetas y billeteras',
  );
}

/* ─────────── arranque ─────────── */

async function arrancar() {
  try {
    const res = await fetch('promos.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    estado.datos = await res.json();
  } catch {
    estado.offline = true;
    $('listado').innerHTML = `<p class="vacio">
      <span class="vacio__num">!</span>
      Todavía no bajé el almanaque a este teléfono.<br>
      Conectate una vez y después funciona sin señal.</p>`;
    $('selloTexto').textContent = 'sin datos';
    $('sello').dataset.viejo = 'si';
    return;
  }

  pintarSello();
  actualizarContador();
  pintarDia();

  /* Primera visita: pedimos la cartera una sola vez. */
  if (!localStorage.getItem(CLAVE_CARTERA)) {
    setTimeout(abrirCartera, 700);
  }
}

/**
 * Una PWA queda abierta o se reanuda desde la home al otro día. Sin esto,
 * "HOY" se queda clavado en el día en que se cargó el script — justo el error
 * que una app cuya única pregunta es qué día es no se puede permitir.
 */
function revisarSiCambioElDia() {
  const hoy = new Date().getDay();
  if (hoy === estado.hoy) return;
  const seguiaEnHoy = estado.dia === estado.hoy;
  estado.hoy = hoy;
  if (seguiaEnHoy) estado.dia = hoy;
  if (estado.datos) pintarDia();
}

$('abrirCartera').addEventListener('click', abrirCartera);
$('carteraListo').addEventListener('click', cerrarCartera);
$('telon').addEventListener('click', cerrarCartera);
$('carteraNada').addEventListener('click', () => {
  estado.cartera.clear();
  guardarCartera();
  actualizarContador();
  pintarDia();
  cerrarCartera();
});
$('sello').addEventListener('click', () => location.reload());

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) revisarSiCambioElDia();
});
addEventListener('focus', revisarSiCambioElDia);

document.addEventListener('keydown', (e) => {
  if (carteraAbierta()) {
    if (e.key === 'Escape') cerrarCartera();
    return; // con el diálogo abierto no se navegan los días de atrás
  }
  if (e.key === 'ArrowRight') { estado.dia = (estado.dia + 1) % 7; pintarDia(); }
  if (e.key === 'ArrowLeft') { estado.dia = (estado.dia + 6) % 7; pintarDia(); }
});

/* Swipe lateral para pasar de hoja. */
let x0 = null;
let y0 = null;
document.addEventListener('touchstart', (e) => {
  x0 = e.changedTouches[0].clientX;
  y0 = e.changedTouches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (x0 == null || carteraAbierta()) { x0 = y0 = null; return; }
  const dx = e.changedTouches[0].clientX - x0;
  const dy = e.changedTouches[0].clientY - y0;
  /* Guarda de eje: leyendo con una mano en movimiento, un scroll vertical
     se va 70px de costado sin querer. Solo pasa de hoja si el gesto es
     claramente horizontal. */
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
    estado.dia = (estado.dia + (dx < 0 ? 1 : 6)) % 7;
    pintarDia();
  }
  x0 = y0 = null;
}, { passive: true });

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

arrancar();
