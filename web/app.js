/* ═══════════════════════════════════════════════════════════════
   ALMANAQUE — lógica de la hoja.
   Sin dependencias. Lee un único promos.json y guarda la cartera
   del usuario en localStorage. Ver DESIGN.md para las reglas visuales.
   ═══════════════════════════════════════════════════════════════ */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const INICIAL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const CLAVE_CARTERA = 'almanaque.cartera.v1';

const $ = (id) => document.getElementById(id);

const estado = {
  datos: null,
  dia: new Date().getDay(),
  hoy: new Date().getDay(),
  cartera: cargarCartera(),
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

/**
 * Fecha en que cae ese día de la semana la próxima vez, contando hoy.
 * Responde la pregunta real del usuario: "¿cuándo me conviene ir?"
 */
function proximaFecha(dia) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((dia - d.getDay() + 7) % 7));
  return d;
}

/** Cuánto se puede ahorrar de verdad con una promo. Sin tope = infinito. */
function techo(p) {
  if (p.descuento_pct == null) return -1;
  return p.tope_monto == null ? Infinity : p.tope_monto;
}

const esMia = (p) => estado.cartera.size === 0 || estado.cartera.has(p.banco);

/* ─────────── render: promo ─────────── */

function pintarPromo(p, ajena) {
  const el = document.createElement('article');
  el.className = 'promo' + (ajena ? ' promo--ajena' : '');

  /* --- tope: el número más grande --- */
  let cifra, etiqueta, sinTope = false;
  if (p.descuento_pct == null && p.cuotas) {
    cifra = `${p.cuotas}×`;
    etiqueta = 'cuotas sin interés';
    sinTope = true;
  } else if (p.tope_monto == null) {
    cifra = 'SIN TOPE';
    etiqueta = 'ahorro libre';
    sinTope = true;
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

  const verificado = p.verificado_at
    ? new Date(p.verificado_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    : null;

  el.innerHTML = `
    <h3 class="promo__comercio">${escapar(p.comercio)}</h3>
    <p class="promo__banco">${escapar(p.banco)}</p>
    <p class="promo__tope">
      <span class="promo__tope-cifra" ${sinTope ? 'data-sintope="si"' : ''}>${cifra}</span>
      <span class="promo__tope-l">${etiqueta}</span>
    </p>
    ${datos.length ? `<div class="promo__datos">${datos.join('')}</div>` : ''}
    ${p.requisitos ? `<p class="promo__req">${escapar(p.requisitos)}</p>` : ''}
    <p class="promo__pie">
      ${p.confianza === 'baja' ? '<span class="promo__dudosa">verificá en la fuente</span>' : ''}
      <a class="promo__fuente" href="${escapar(p.url_fuente)}" target="_blank" rel="noopener noreferrer">${escapar(p.fuente_label ?? 'fuente')}</a>
      ${verificado ? `<span>· visto el ${verificado}</span>` : ''}
    </p>`;

  return el;
}

function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
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
  $('fechaMes').textContent = MESES[f.getMonth()];
  $('fechaRel').textContent = esHoy
    ? 'hoy'
    : `en ${(dia - estado.hoy + 7) % 7} ${(dia - estado.hoy + 7) % 7 === 1 ? 'día' : 'días'}`;

  /* promos del día, mías primero */
  const ids = new Set(datos.por_dia[dia] ?? []);
  const delDia = datos.promos.filter((p) => ids.has(p.id));
  const mias = delDia.filter(esMia);
  const ajenas = delDia.filter((p) => !esMia(p));

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
  } else if (!mias.length) {
    listado.innerHTML = `<p class="vacio">
      <span class="vacio__num">0</span>
      Ninguna de tus tarjetas sirve el <strong>${DIAS[dia].toLowerCase()}</strong>.<br>
      Abajo están las ${ajenas.length} que existen igual.</p>`;
  }

  for (const p of mias) listado.appendChild(pintarPromo(p, false));

  if (ajenas.length) {
    const r = document.createElement('p');
    r.className = 'rotulo';
    r.textContent = estado.cartera.size ? 'No tenés estas' : 'Otras del día';
    listado.appendChild(r);
    for (const p of ajenas) listado.appendChild(pintarPromo(p, true));
  }

  pintarBandaAviso(mias);
  pintarRiel();
}

/* La banda de publicidad del almanaque, usada para lo único que importa. */
function pintarBandaAviso(mias) {
  const banda = $('bandaAviso');
  const conPct = mias.filter((p) => p.descuento_pct != null);

  if (!conPct.length) {
    banda.hidden = true;
    return;
  }
  banda.hidden = false;

  const libre = conPct.some((p) => p.tope_monto == null);
  const suma = conPct.reduce((n, p) => n + (p.tope_monto ?? 0), 0);

  if (libre) {
    // Sin tope no hay techo que calcular: la noticia es que no hay límite.
    const mejor = conPct
      .filter((p) => p.tope_monto == null)
      .sort((a, b) => b.descuento_pct - a.descuento_pct)[0];
    $('bandaLabel').textContent = 'Lo mejor de hoy';
    $('techoDia').textContent = 'SIN TOPE';
    $('techoNota').textContent = `${mejor.descuento_pct}% en ${mejor.comercio}, sin límite de reintegro`;
  } else {
    $('bandaLabel').textContent = 'Techo de ahorro del día';
    $('techoDia').textContent = pesos.format(suma);
    $('techoNota').textContent =
      conPct.length === 1
        ? `${conPct[0].descuento_pct}% en ${conPct[0].comercio}`
        : `sumando las ${conPct.length} promos que podés usar`;
  }
}

function pintarRiel() {
  const riel = $('riel');
  riel.replaceChildren();

  for (let d = 0; d < 7; d++) {
    const ids = new Set(estado.datos.por_dia[d] ?? []);
    const n = estado.datos.promos.filter((p) => ids.has(p.id) && esMia(p)).length;

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'riel__dia';
    b.dataset.domingo = d === 0 ? 'si' : 'no';
    b.dataset.hoy = d === estado.hoy ? 'si' : 'no';
    b.dataset.vacio = n === 0 ? 'si' : 'no';
    if (d === estado.dia) b.setAttribute('aria-current', 'true');

    b.innerHTML = `
      <span class="riel__letra">${INICIAL[d]}</span>
      <span class="riel__n${n === 0 ? ' riel__cero' : ''}">${n}</span>`;
    b.setAttribute(
      'aria-label',
      `${DIAS[d]}: ${n} ${n === 1 ? 'descuento' : 'descuentos'}${d === estado.hoy ? ', hoy' : ''}`,
    );

    b.addEventListener('click', () => {
      estado.dia = d;
      pintarDia();
    });

    riel.appendChild(b);
  }
}

/* ─────────── sello de verificación ─────────── */

function pintarSello() {
  const sello = $('sello');
  const txt = $('selloTexto');
  const gen = new Date(estado.datos.generado_at);
  const horas = (Date.now() - gen.getTime()) / 36e5;

  if (horas < 48) {
    sello.dataset.viejo = 'no';
    txt.textContent = horas < 24 ? 'al día' : 'ayer';
  } else {
    sello.dataset.viejo = 'si';
    const d = Math.floor(horas / 24);
    txt.textContent = `hace ${d} días`;
  }
  sello.title = `Últimos datos: ${gen.toLocaleString('es-AR')}`;
}

/* ─────────── cartera ─────────── */

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

  $('telon').hidden = false;
  $('cartera').hidden = false;
  document.body.style.overflow = 'hidden';
  $('carteraListo').focus();
}

function cerrarCartera() {
  $('telon').hidden = true;
  $('cartera').hidden = true;
  document.body.style.overflow = '';
  $('abrirCartera').focus();
}

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
    $('listado').innerHTML = `<p class="vacio">
      <span class="vacio__num">!</span>
      No pude abrir el almanaque.<br>
      Revisá la conexión y volvé a entrar.</p>`;
    $('selloTexto').textContent = 'sin datos';
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('cartera').hidden) cerrarCartera();
  if (!$('cartera').hidden) return;
  if (e.key === 'ArrowRight') { estado.dia = (estado.dia + 1) % 7; pintarDia(); }
  if (e.key === 'ArrowLeft') { estado.dia = (estado.dia + 6) % 7; pintarDia(); }
});

/* Swipe lateral para pasar de hoja. */
let x0 = null;
document.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (x0 == null) return;
  const dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 70) {
    estado.dia = (estado.dia + (dx < 0 ? 1 : 6)) % 7;
    pintarDia();
  }
  x0 = null;
}, { passive: true });

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

arrancar();
