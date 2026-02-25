/* ══════════════════════════════════════════════════════════
   app.js — RecepDoc con Firebase
   Funciones: Auth Google · Storage · Firestore · Admin · Excel
   ══════════════════════════════════════════════════════════

   ⚠️  PASO 1: Reemplaza FIREBASE_CONFIG con tu configuración.
       Ve a console.firebase.google.com → Tu proyecto →
       Configuración del proyecto → "Agregar app web" → copia el config.

   ⚠️  PASO 2: Reemplaza el correo en ADMIN_EMAILS con el tuyo.
══════════════════════════════════════════════════════════ */

/* ── 🔧 CONFIGURACIÓN — EDITA ESTOS VALORES ── */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBF2Ivt-OGqNPpxMEUNt_f4Jd6uBpOhq2Y",
  authDomain:        "siscte2-e38de.firebaseapp.com",
  projectId:         "siscte2-e38de",
  storageBucket:     "siscte2-e38de.firebasestorage.app",
  messagingSenderId: "234056629895",
  appId:             "1:234056629895:web:a7f6953ccc7957a7398222",
  measurementId:     "G-4EBDH1RBGE"
};

/* ── 👑 ADMINISTRADORES — pon tu correo de Google aquí ── */
const ADMIN_EMAILS = [
  "parametrosp.cte@gmail.com",
];

/* ── Estado global ── */
let db, auth, storage;
let usuario = null;
let archivoSeleccionado = null;

/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN DE FIREBASE
══════════════════════════════════════════════════════════ */
async function initFirebase() {
  const { initializeApp } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");

  const { getFirestore, collection, addDoc, getDocs, orderBy, query, doc, getDoc } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

  const { getStorage, ref, uploadBytesResumable, getDownloadURL } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

  // Inicializar servicios
  const app = initializeApp(FIREBASE_CONFIG);
  db      = getFirestore(app);
  auth    = getAuth(app);
  storage = getStorage(app);

  // Guardar helpers en window para acceso global
  window._fb = {
    collection, addDoc, getDocs, orderBy, query, doc, getDoc,
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    ref, uploadBytesResumable, getDownloadURL
  };

  // Escuchar cambios de sesión
  onAuthStateChanged(auth, (u) => {
    if (u) {
      usuario = {
        uid:    u.uid,
        nombre: u.displayName,
        email:  u.email,
        foto:   u.photoURL
      };
      actualizarNav();
      esAdmin() ? show('nb-admin') : hide('nb-admin');
      irSubir();
    } else {
      usuario = null;
      actualizarNav();
      ir('vista-login');
    }
  });
}

/* ══════════════════════════════════════════════════════════
   AUTENTICACIÓN
══════════════════════════════════════════════════════════ */
async function login() {
  try {
    const provider = new window._fb.GoogleAuthProvider();
    await window._fb.signInWithPopup(auth, provider);
  } catch (e) {
    toast('Error al iniciar sesión: ' + e.message, 'err');
  }
}

async function logout() {
  try {
    await window._fb.signOut(auth);
  } catch (e) {}
}

const esAdmin = () =>
  usuario && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(usuario.email.toLowerCase());

/* ══════════════════════════════════════════════════════════
   HELPERS DE DOM
══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function show(id) { const e = $(id); if (e) e.style.display = 'block'; }
function hide(id) { const e = $(id); if (e) e.style.display = 'none'; }

function ir(vista) {
  ['vista-login', 'vista-subir', 'vista-exito', 'vista-admin'].forEach(v => {
    const el = $(v);
    if (el) el.style.display = 'none';
  });
  show(vista);

  // Activar tab correcto en navbar
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (vista === 'vista-subir' || vista === 'vista-exito') $('nb-subir')?.classList.add('active');
  if (vista === 'vista-admin') $('nb-admin')?.classList.add('active');
}

function actualizarNav() {
  if (usuario) {
    $('nav-foto').src = usuario.foto || avatarURL(usuario.nombre);
    $('nav-nombre').textContent = usuario.nombre?.split(' ')[0] || usuario.email;
    show('nav-sesion'); hide('nav-guest');
  } else {
    hide('nav-sesion'); show('nav-guest');
  }
}

// Escape HTML para prevenir XSS en la tabla
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function avatarURL(nombre) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || '?')}&background=00e5a0&color=000`;
}

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
let _toastTimer;
function toast(msg, tipo = 'ok') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${tipo} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.className = 'toast', 4000);
}

/* ══════════════════════════════════════════════════════════
   VISTA: SUBIR ARCHIVO
══════════════════════════════════════════════════════════ */
function irSubir() {
  archivoSeleccionado = null;
  $('dropzone').style.display     = 'flex';
  $('file-preview').style.display = 'none';
  $('progress-wrap').style.display = 'none';
  $('err-archivo').classList.remove('show');
  $('err-localidad').classList.remove('show');
  $('localidad').value   = '';
  $('localidad').classList.remove('err');
  $('codigo').value      = '';
  $('descripcion').value = '';
  resetBtn();

  // Llenar barra de usuario
  $('up-foto').src           = usuario.foto || avatarURL(usuario.nombre);
  $('up-nombre').textContent = usuario.nombre || '';
  $('up-email').textContent  = usuario.email  || '';

  ir('vista-subir');
}

function resetBtn() {
  const btn = $('btn-enviar');
  btn.disabled    = false;
  btn.textContent = '📤 Enviar archivo';
}

/* ── Selección de archivo ── */
function seleccionarArchivo(f) {
  const ext = f.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls'].includes(ext)) {
    toast('Solo se aceptan archivos Excel (.xlsx o .xls)', 'err');
    return;
  }
  if (f.size > 50000 * 1024) { // 50.000 KB
    toast('El archivo no debe superar 50.000 KB (≈ 48,8 MB)', 'err');
    return;
  }
  archivoSeleccionado = f;
  $('fp-nombre').textContent = f.name;
  $('fp-peso').textContent   = (f.size / 1024).toFixed(1) + ' KB';
  $('dropzone').style.display     = 'none';
  $('file-preview').style.display = 'flex';
  $('err-archivo').classList.remove('show');
}

/* ── Validación del formulario ── */
function validarFormulario() {
  let ok = true;

  if (!$('localidad').value) {
    $('localidad').classList.add('err');
    $('err-localidad').classList.add('show');
    ok = false;
  } else {
    $('localidad').classList.remove('err');
    $('err-localidad').classList.remove('show');
  }

  if (!archivoSeleccionado) {
    $('err-archivo').classList.add('show');
    ok = false;
  } else {
    $('err-archivo').classList.remove('show');
  }

  return ok;
}

/* ══════════════════════════════════════════════════════════
   ENVÍO A FIREBASE STORAGE + FIRESTORE
══════════════════════════════════════════════════════════ */
async function enviarArchivo() {
  if (!validarFormulario()) return;

  const btn = $('btn-enviar');
  btn.disabled    = true;
  btn.textContent = '⏳ Subiendo…';

  $('progress-wrap').style.display = 'block';
  $('progress-bar').style.width    = '0%';
  $('progress-txt').textContent    = '0%';

  try {
    const ahora      = new Date();
    const fechaTexto = ahora.toLocaleDateString('es-EC', {
      timeZone: 'America/Guayaquil', day: '2-digit', month: 'long', year: 'numeric'
    });
    const horaTexto = ahora.toLocaleTimeString('es-EC', {
      timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const localidad    = $('localidad').value;
    const codigo       = $('codigo').value.trim()      || null;
    const descripcion  = $('descripcion').value.trim() || null;

    // ── 1. Subir archivo a Firebase Storage ──
    const ruta       = `entregas/${usuario.uid}_${Date.now()}_${archivoSeleccionado.name}`;
    const storageRef = window._fb.ref(storage, ruta);
    const uploadTask = window._fb.uploadBytesResumable(storageRef, archivoSeleccionado);

    // ── 2. Progreso real ──
    const downloadURL = await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 90);
          $('progress-bar').style.width  = pct + '%';
          $('progress-txt').textContent  = pct + '%';
        },
        (error) => reject(error),
        async () => {
          const url = await window._fb.getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

    $('progress-bar').style.width = '95%';
    $('progress-txt').textContent = '95%';

    // ── 3. Guardar metadatos en Firestore ──
    await window._fb.addDoc(window._fb.collection(db, 'entregas'), {
      uid:           usuario.uid,
      nombre:        usuario.nombre,
      email:         usuario.email,
      foto:          usuario.foto,
      localidad,
      codigo,
      descripcion,
      nombreArchivo: archivoSeleccionado.name,
      tamanoKB:      +(archivoSeleccionado.size / 1024).toFixed(1),
      downloadURL,
      rutaStorage:   ruta,
      mimeType:      archivoSeleccionado.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fechaTexto,
      horaTexto,
      timestamp:     ahora.toISOString()
    });

    $('progress-bar').style.width = '100%';
    $('progress-txt').textContent = '100%';

    // ── 4. Pantalla de éxito ──
    $('ex-nombre').textContent   = usuario.nombre;
    $('ex-email').textContent    = usuario.email;
    $('ex-archivo').textContent  = archivoSeleccionado.name;
    $('ex-localidad').textContent = localidad;
    $('ex-fecha').textContent    = fechaTexto;
    $('ex-hora').textContent     = horaTexto;

    setTimeout(() => ir('vista-exito'), 500);

  } catch (err) {
    console.error(err);
    toast('Error al subir: ' + err.message, 'err');
    $('progress-wrap').style.display = 'none';
    resetBtn();
  }
}

/* ══════════════════════════════════════════════════════════
   PANEL DE ADMINISTRACIÓN
══════════════════════════════════════════════════════════ */
async function cargarAdmin() {
  $('tabla-body').innerHTML     = `<tr><td colspan="8" class="td-vacio">Cargando desde Firestore…</td></tr>`;
  $('admin-personas').innerHTML = `<p class="cargando">Cargando…</p>`;

  try {
    const q    = window._fb.query(
      window._fb.collection(db, 'entregas'),
      window._fb.orderBy('timestamp', 'desc')
    );
    const snap = await window._fb.getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ── Estadísticas ──
    const emails      = [...new Set(docs.map(d => d.email))];
    const localidades = [...new Set(docs.map(d => d.localidad).filter(Boolean))];
    $('st-total').textContent       = docs.length;
    $('st-unicos').textContent      = emails.length;
    $('st-localidades').textContent = localidades.length;
    $('st-ultimo').textContent      = docs.length
      ? `${docs[0].nombre} · ${docs[0].fechaTexto} · ${docs[0].horaTexto}`
      : 'Sin entregas aún';

    // ── Personas que enviaron ──
    const porPersona = {};
    docs.forEach(d => {
      if (!porPersona[d.email]) porPersona[d.email] = { ...d, cant: 0 };
      porPersona[d.email].cant++;
    });

    $('admin-personas').innerHTML = Object.values(porPersona).length
      ? Object.values(porPersona)
          .sort((a, b) => b.cant - a.cant)
          .map(p => `
            <div class="persona-row">
              <img class="persona-foto" src="${esc(p.foto || avatarURL(p.nombre))}" alt="">
              <div>
                <div class="persona-nombre">${esc(p.nombre || '—')}</div>
                <div class="persona-email">${esc(p.email)}</div>
                <div class="persona-ultima">Último envío: ${esc(p.fechaTexto)} · ${esc(p.horaTexto)}</div>
              </div>
              <span class="persona-badge">${p.cant} archivo${p.cant > 1 ? 's' : ''}</span>
            </div>`).join('')
      : `<p class="cargando">Sin entregas aún</p>`;

    // ── Tabla completa ──
    $('tabla-body').innerHTML = docs.length === 0
      ? `<tr><td colspan="8" class="td-vacio">No hay entregas aún</td></tr>`
      : docs.map((d, i) => `
          <tr>
            <td style="color:var(--muted);font-size:12px">${i + 1}</td>
            <td>
              <div class="td-user">
                <img class="td-foto" src="${esc(d.foto || avatarURL(d.nombre))}" alt="">
                <div>
                  <div class="td-nombre">${esc(d.nombre || '—')}</div>
                  <div class="td-email">${esc(d.email)}</div>
                </div>
              </div>
            </td>
            <td><span class="badge-loc">${esc(d.localidad || '—')}</span></td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(d.nombreArchivo)}">
              ${esc(d.nombreArchivo)}
            </td>
            <td style="color:var(--muted)">${d.tamanoKB} KB</td>
            <td style="color:var(--muted);white-space:nowrap">${esc(d.fechaTexto)}</td>
            <td style="color:var(--muted)">${esc(d.horaTexto)}</td>
            <td>
              <button class="btn-dl" onclick="descargarArchivo('${esc(d.id)}')">⬇ Descargar</button>
            </td>
          </tr>`).join('');

    // Guardar docs para exportar
    window._adminDocs = docs;

  } catch (e) {
    console.error(e);
    toast('Error al cargar el panel: ' + e.message, 'err');
  }
}

/* ── Descarga individual ── */
window.descargarArchivo = async function(docId) {
  try {
    toast('Preparando descarga…', 'ok');
    const snap = await window._fb.getDoc(window._fb.doc(db, 'entregas', docId));
    if (!snap.exists()) { toast('Registro no encontrado', 'err'); return; }
    const d = snap.data();

    if (d.downloadURL) {
      // Archivo en Storage → descargar directo
      const a = document.createElement('a');
      a.href     = d.downloadURL;
      a.download = d.nombreArchivo;
      a.target   = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('✅ Descarga iniciada');
    } else {
      toast('Este registro no tiene URL de descarga disponible', 'warn');
    }
  } catch (e) {
    toast('Error al descargar: ' + e.message, 'err');
  }
};

/* ══════════════════════════════════════════════════════════
   EXPORTAR INFORME A EXCEL
══════════════════════════════════════════════════════════ */
async function exportarExcel(docs) {
  // Cargar la librería SheetJS si no está disponible
  if (!window.XLSX) {
    toast('Cargando librería Excel…', 'ok');
    await new Promise((res, rej) => {
      const s    = document.createElement('script');
      s.src      = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload   = res;
      s.onerror  = rej;
      document.head.appendChild(s);
    });
  }

  // Construir filas del informe
  const filas = docs.map((d, i) => ({
    '#':            i + 1,
    'Nombre':       d.nombre   || '—',
    'Correo':       d.email    || '—',
    'Localidad':    d.localidad || '—',
    'Código':       d.codigo   || '—',
    'Descripción':  d.descripcion || '—',
    'Archivo':      d.nombreArchivo,
    'Tamaño (KB)':  d.tamanoKB,
    'Fecha':        d.fechaTexto,
    'Hora':         d.horaTexto,
    'URL Descarga': d.downloadURL || '—'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filas);

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 4  }, { wch: 24 }, { wch: 32 }, { wch: 14 },
    { wch: 16 }, { wch: 28 }, { wch: 36 }, { wch: 12 },
    { wch: 24 }, { wch: 12 }, { wch: 60 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Entregas');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `informe_recepcion_${fecha}.xlsx`);

  toast('✅ Informe Excel descargado', 'ok');
}

/* ══════════════════════════════════════════════════════════
   EVENT LISTENERS (cuando el DOM esté listo)
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // Iniciar Firebase
  initFirebase();

  // Botones de auth
  $('btn-google').addEventListener('click', login);
  $('btn-logout').addEventListener('click', logout);
  $('btn-logout-admin').addEventListener('click', logout);

  // Navegación
  $('nb-subir').addEventListener('click', () => usuario ? irSubir() : ir('vista-login'));
  $('nb-admin').addEventListener('click', () => {
    if (esAdmin()) { ir('vista-admin'); cargarAdmin(); }
    else toast('Acceso denegado', 'err');
  });
  $('btn-otro').addEventListener('click', irSubir);

  // Exportar Excel
  $('btn-excel').addEventListener('click', () => {
    if (window._adminDocs?.length) exportarExcel(window._adminDocs);
    else toast('No hay datos para exportar', 'warn');
  });

  // ── Dropzone drag & drop ──
  const dz = $('dropzone');
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('dz-over'); });
  dz.addEventListener('dragleave', ()  => dz.classList.remove('dz-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dz-over');
    if (e.dataTransfer.files[0]) seleccionarArchivo(e.dataTransfer.files[0]);
  });
  $('file-input').addEventListener('change', () => {
    if ($('file-input').files[0]) seleccionarArchivo($('file-input').files[0]);
  });
  $('btn-cambiar').addEventListener('click', () => {
    archivoSeleccionado = null;
    $('file-input').value           = '';
    $('file-preview').style.display = 'none';
    $('dropzone').style.display     = 'flex';
  });

  // ── Enviar ──
  $('btn-enviar').addEventListener('click', enviarArchivo);

  // Limpiar error de localidad al cambiar
  $('localidad').addEventListener('change', () => {
    $('localidad').classList.remove('err');
    $('err-localidad').classList.remove('show');
  });
});
