// Credenciales de Supabase
const SUPABASE_URL = 'https://otnntogauepkikqzfepi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EQkcz8C6-ktCawFiUQa_0w_bGFO0it-';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TOAST_ICONS = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info'
};

function mostrarToast(mensaje, tipo = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');

    const icon = document.createElement('i');
    icon.className = `fas ${TOAST_ICONS[tipo] || TOAST_ICONS.info} toast-icon`;
    icon.setAttribute('aria-hidden', 'true');

    const message = document.createElement('span');
    message.className = 'toast-message';
    message.textContent = mensaje;

    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Cerrar notificación');
    closeButton.textContent = '×';

    toast.append(icon, message, closeButton);

    let removeTimer;
    const close = () => {
        if (toast.classList.contains('hide')) return;
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
        clearTimeout(removeTimer);
        removeTimer = setTimeout(() => toast.remove(), 500);
    };

    closeButton.addEventListener('click', close);
    container.appendChild(toast);
    removeTimer = setTimeout(close, 4000);
}

function marcarErrorCampo(input, mensaje) {
    limpiarErrorCampo(input);
    input.classList.add('input-error');
    input.setAttribute('aria-invalid', 'true');

    const errorMessage = document.createElement('p');
    errorMessage.className = 'field-error';
    errorMessage.id = `${input.id}-error`;
    errorMessage.textContent = mensaje;
    input.closest('.form-group').appendChild(errorMessage);

    const describedBy = input.getAttribute('aria-describedby');
    input.setAttribute('aria-describedby', [describedBy, errorMessage.id].filter(Boolean).join(' '));
}

function limpiarErrorCampo(input) {
    input.classList.remove('input-error');
    input.removeAttribute('aria-invalid');

    const errorMessage = document.getElementById(`${input.id}-error`);
    if (errorMessage) {
        errorMessage.remove();
    }

    const describedBy = input.getAttribute('aria-describedby')
        ?.split(' ')
        .filter(id => id !== `${input.id}-error`);
    if (describedBy?.length) {
        input.setAttribute('aria-describedby', describedBy.join(' '));
    } else {
        input.removeAttribute('aria-describedby');
    }
}

function traducirErrorAuth(mensaje) {
    const mensajes = {
        'Invalid login credentials': 'Correo o contraseña incorrectos.',
        'Email not confirmed': 'Confirma tu correo antes de iniciar sesión.',
        'User already registered': 'Este correo ya está registrado.',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.'
    };
    return mensajes[mensaje] || mensaje;
}

function mostrarVistaResultados(mostrar) {
    const resultadosSection = document.getElementById('resultadosBusqueda');
    const categoriasSection = document.getElementById('categorias');
    const profesionalesSection = document.getElementById('profesionales');

    if (resultadosSection) resultadosSection.hidden = !mostrar;
    if (categoriasSection) categoriasSection.hidden = mostrar;
    if (profesionalesSection) profesionalesSection.hidden = mostrar;

    if (mostrar) {
        resultadosSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        categoriasSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// CARGAR CATEGORÍAS
// ============================================
async function cargarCategorias() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) {
        console.error('No se encontró el contenedor de categorías.');
        return;
    }

    let categorias;
    try {
        const response = await supabaseClient
            .from('categorias')
            .select('*')
            .order('id');

        if (response.error) throw response.error;
        categorias = response.data;
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        mostrarToast('No se pudieron cargar las categorías.', 'error');
        return;
    }

    const iconos = {
        'Hogar': 'fa-home',
        'Construcción': 'fa-hammer',
        'Digital': 'fa-laptop-code',
        'Salud': 'fa-heart',
        'Educación': 'fa-book',
        'Negocios': 'fa-briefcase'
    };

    let conteoPorCategoria = null;
    try {
        conteoPorCategoria = new Map();
        const tamanoPagina = 1000;
        let desde = 0;
        let hayMasServicios = true;

        while (hayMasServicios) {
            const { data: servicios, error } = await supabaseClient
                .from('servicios')
                .select('categoria_id, perfiles_profesionales(id)')
                .range(desde, desde + tamanoPagina - 1);

            if (error) throw error;

            servicios.forEach(servicio => {
                const profesional = Array.isArray(servicio.perfiles_profesionales)
                    ? servicio.perfiles_profesionales[0]
                    : servicio.perfiles_profesionales;
                if (!servicio.categoria_id || !profesional?.id) return;

                if (!conteoPorCategoria.has(servicio.categoria_id)) {
                    conteoPorCategoria.set(servicio.categoria_id, new Set());
                }
                conteoPorCategoria.get(servicio.categoria_id).add(profesional.id);
            });

            hayMasServicios = servicios.length === tamanoPagina;
            desde += tamanoPagina;
        }
    } catch (error) {
        console.error('Error al contar profesionales por categoría:', error);
        conteoPorCategoria = null;
    }

    const fragment = document.createDocumentFragment();
    categorias.forEach(cat => {
        const card = document.createElement('button');
        card.className = 'category-card';
        card.type = 'button';

        const iconContainer = document.createElement('span');
        iconContainer.className = 'category-icon';
        const icon = document.createElement('i');
        icon.className = `fas ${cat.icono || iconos[cat.nombre] || 'fa-star'}`;
        icon.setAttribute('aria-hidden', 'true');
        iconContainer.appendChild(icon);

        const name = document.createElement('span');
        name.className = 'category-name';
        name.textContent = cat.nombre || 'Categoría';

        card.append(iconContainer, name);
        if (conteoPorCategoria) {
            const count = conteoPorCategoria.get(cat.id)?.size || 0;
            const countLabel = document.createElement('span');
            countLabel.className = 'category-count';
            countLabel.textContent = `${count} ${count === 1 ? 'profesional' : 'profesionales'}`;
            card.appendChild(countLabel);
        } else {
            const countLabel = document.createElement('span');
            countLabel.className = 'category-count';
            countLabel.textContent = 'Conteo no disponible';
            card.appendChild(countLabel);
        }

        card.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (!searchInput) {
                console.error('No se encontró el campo de búsqueda.');
                mostrarToast('No se pudo iniciar la búsqueda.', 'error');
                return;
            }

            searchInput.value = cat.nombre || '';
            realizarBusqueda();
        });
        fragment.appendChild(card);
    });
    grid.replaceChildren(fragment);

    const botonDirectorio = document.getElementById('btnVerDirectorio');
    const mostrarTodas = botonDirectorio?.getAttribute('aria-expanded') === 'true';
    const tarjetas = [...grid.querySelectorAll('.category-card')];
    tarjetas.forEach((tarjeta, index) => {
        tarjeta.hidden = !mostrarTodas && index >= 6;
    });
    if (botonDirectorio) {
        botonDirectorio.hidden = tarjetas.length <= 6;
        botonDirectorio.setAttribute('aria-expanded', String(mostrarTodas));
        botonDirectorio.querySelector('span').textContent = mostrarTodas
            ? 'Ver menos categorías'
            : 'Ver todas las categorías';
        const icono = botonDirectorio.querySelector('i');
        icono.className = `fas ${mostrarTodas ? 'fa-arrow-up' : 'fa-arrow-right'}`;
    }
}

// ============================================
// GENERAR ESTRELLAS POR INTERVALOS
// 5.0 exacto = 5 llenas | 4.1 a 4.9 = 4 llenas + media
// ============================================
function generarEstrellasHTML(valor) {
    const numero = Number(valor);
    const rating = Number.isFinite(numero) ? Math.max(0, Math.min(5, numero)) : 0;
    const ratingMostrado = Number(rating.toFixed(1));
    const llenas = Math.floor(ratingMostrado);
    const media = ratingMostrado > llenas && ratingMostrado < 5 ? 1 : 0;
    const vacias = 5 - llenas - media;

    return '<i class="fas fa-star"></i>'.repeat(llenas) +
           '<i class="fas fa-star-half-stroke"></i>'.repeat(media) +
           '<i class="far fa-star"></i>'.repeat(vacias);
}

function obtenerPaletaAvatar(perfilId) {
    const id = String(perfilId ?? '');
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
        hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
    }
    return hash % 6;
}

// ============================================
// CARGAR PROFESIONALES
// ============================================
async function cargarProfesionales(limite = 3) {
    const { data, error } = await supabaseClient
        .from('perfiles_profesionales')
        .select(`
            *,
            usuarios(nombre),
            planes_suscripcion(nombre)
        `)
        .order('reputacion_promedio', { ascending: false })
        .limit(limite);

    if (error) {
        console.error('Error al cargar profesionales:', error);
        return false;
    }

    const grid = document.getElementById('professionalsGrid');
    if (!grid) {
        console.error('No se encontró el contenedor de profesionales.');
        return false;
    }
    grid.innerHTML = '';

    data.forEach(perfil => {
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 col-lg-4';
        
        const nombre = perfil.usuarios?.nombre || 'Profesional';
        const iniciales = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const paletaAvatar = obtenerPaletaAvatar(perfil.id);
        
        const estrellasHTML = generarEstrellasHTML(perfil.reputacion_promedio);
        
        card.innerHTML = `
            <div class="card h-100 border-0 shadow-sm professional-card-boost">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="professional-avatar me-3" data-avatar-palette="${paletaAvatar}">${iniciales}</div>
                        <div class="flex-grow-1">
                            <h5 class="card-title mb-1">${nombre}</h5>
                            <p class="card-text text-muted small mb-0">${perfil.descripcion?.substring(0, 50) || 'Profesional'}...</p>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="rating">
                            ${estrellasHTML}
                            <span class="ms-1 fw-semibold">${(perfil.reputacion_promedio || 0).toFixed(1)}</span>
                        </div>
                        ${perfil.verificado ? `
                            <span class="badge bg-success">
                                <i class="fas fa-check-circle"></i> Verificado
                            </span>
                        ` : ''}
                    </div>

                    <p class="card-text text-muted small">${perfil.descripcion || 'Profesional verificado en la plataforma'}</p>
                </div>
                <div class="card-footer bg-transparent border-0 pb-3">
                    <button class="btn btn-primary w-100 btn-view-profile" data-id="${perfil.id}">
                        <i class="fas fa-user me-2"></i>Ver perfil completo
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });

    // Agregar event listeners a los botones de ver perfil
    document.querySelectorAll('.btn-view-profile').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const perfilId = e.currentTarget.dataset.id;
            mostrarPerfilProfesional(perfilId);
        });
    });

    const botonVerProfesionales = document.getElementById('btnVerProfesionales');
    if (botonVerProfesionales) {
        const mostrandoTodos = limite > 3;
        botonVerProfesionales.textContent = mostrandoTodos
            ? 'Ver menos profesionales'
            : 'Ver todos los profesionales';
        botonVerProfesionales.setAttribute('aria-expanded', String(mostrandoTodos));
    }

    return true;
}

// ============================================
// BÚSQUEDA DE SERVICIOS
// ============================================
async function realizarBusqueda() {
    const termino = document.getElementById('searchInput').value.trim();
    const filtroCiudad = document.getElementById('filtroCiudad')?.value || '';

    if (!termino && !filtroCiudad) {
        mostrarToast('Por favor ingresa un término de búsqueda o selecciona una ubicación.', 'error');
        return;
    }

    const resultadosSection = document.getElementById('resultadosBusqueda');
    const resultadosGrid = document.getElementById('resultadosGrid');
    const resultadosTitulo = document.getElementById('resultadosTitulo');
    const searchEmpty = document.getElementById('searchEmpty');
    const categoriasSection = document.getElementById('categorias');
    const profesionalesSection = document.getElementById('profesionales');

    if (!resultadosSection || !resultadosGrid || !resultadosTitulo || !searchEmpty) {
        console.error('No se encontró la sección de resultados de búsqueda.');
        mostrarToast('No se pudieron mostrar los resultados. Recarga la página e intenta de nuevo.', 'error');
        return;
    }

    const escaparPatron = valor => valor.replace(/[\\%_]/g, caracter => `\\${caracter}`);
    const selectServicios = `
        *,
        perfiles_profesionales(
            id,
            usuarios(nombre),
            reputacion_promedio
        ),
        categorias(nombre)
    `;
    const patron = `%${escaparPatron(termino)}%`;
    const patronOr = `"%${escaparPatron(termino).replace(/"/g, '\\"')}%"`;
    const crearConsulta = buscarCategoria => {
        let consulta = supabaseClient
            .from('servicios')
            .select(buscarCategoria
                ? `*, perfiles_profesionales(id, usuarios(nombre), reputacion_promedio), categorias!inner(nombre)`
                : selectServicios);

        if (termino) {
            if (buscarCategoria) {
                consulta = consulta.ilike('categorias.nombre', patron);
            } else {
                consulta = consulta.or(`titulo.ilike.${patronOr},descripcion.ilike.${patronOr}`);
            }
        }
        if (filtroCiudad) consulta = consulta.ilike('ciudad', filtroCiudad);

        return consulta;
    };

    let responses;
    try {
        responses = termino
            ? await Promise.all([crearConsulta(false), crearConsulta(true)])
            : [await crearConsulta(false)];
    } catch (error) {
        console.error('No se pudieron consultar los servicios:', error);
        mostrarToast('No se pudo realizar la búsqueda. Intenta de nuevo.', 'error');
        return;
    }

    const errorResponse = responses.find(response => response.error);
    if (errorResponse) {
        console.error('Error en la búsqueda:', errorResponse.error);
        mostrarToast('No se pudo realizar la búsqueda. Intenta de nuevo.', 'error');
        return;
    }

    const servicios = new Map();
    responses.forEach(response => {
        (response.data || []).forEach(servicio => servicios.set(servicio.id, servicio));
    });
    const resultados = [...servicios.values()];

    if (resultadosSection.hidden) {
        history.pushState(
            { ...(history.state || {}), servitechSearchResults: true },
            ''
        );
    }
    resultadosSection.hidden = false;
    if (categoriasSection) categoriasSection.hidden = true;
    if (profesionalesSection) profesionalesSection.hidden = true;
    const criterios = [];
    if (termino) criterios.push(`para: "${termino}"`);
    if (filtroCiudad) criterios.push(`en ${filtroCiudad}`);
    resultadosTitulo.textContent = criterios.length
        ? `Resultados ${criterios.join(' · ')}`
        : 'Resultados';
    resultadosGrid.replaceChildren();

    if (resultados.length === 0) {
        resultadosGrid.hidden = true;
        searchEmpty.hidden = false;
        mostrarToast('No se encontraron servicios con esos criterios.', 'info');
    } else {
        resultadosGrid.hidden = false;
        searchEmpty.hidden = true;
        mostrarToast(`Se encontraron ${resultados.length} servicios.`, 'success');

        resultados.forEach(servicio => {
            const profesional = Array.isArray(servicio.perfiles_profesionales)
                ? servicio.perfiles_profesionales[0]
                : servicio.perfiles_profesionales;
            const usuario = Array.isArray(profesional?.usuarios)
                ? profesional.usuarios[0]
                : profesional?.usuarios;
            const categoria = Array.isArray(servicio.categorias)
                ? servicio.categorias[0]
                : servicio.categorias;

            const card = document.createElement('article');
            card.className = 'result-card';

            const heading = document.createElement('h3');
            heading.className = 'result-card-title';
            heading.textContent = servicio.titulo || 'Servicio sin título';
            card.appendChild(heading);

            const categoryLabel = document.createElement('p');
            categoryLabel.className = 'result-card-category';
            categoryLabel.textContent = categoria?.nombre || 'General';
            card.appendChild(categoryLabel);

            const description = document.createElement('p');
            description.className = 'result-card-description';
            const descriptionText = servicio.descripcion || 'Sin descripción';
            description.textContent = descriptionText.length > 140
                ? `${descriptionText.slice(0, 140)}…`
                : descriptionText;
            card.appendChild(description);

            if (servicio.ciudad || servicio.zona_barrio) {
                const location = document.createElement('div');
                location.className = 'result-card-location';
                const locationIcon = document.createElement('i');
                locationIcon.className = 'fas fa-map-marker-alt';
                locationIcon.setAttribute('aria-hidden', 'true');
                const locationText = document.createElement('span');
                locationText.textContent = [servicio.ciudad, servicio.zona_barrio].filter(Boolean).join(' - ');
                location.append(locationIcon, locationText);
                card.appendChild(location);
            }

            const details = document.createElement('div');
            details.className = 'result-card-details';

            const price = document.createElement('strong');
            price.className = 'result-card-price';
            price.textContent = servicio.precio == null
                ? 'Precio a convenir'
                : `$${Number(servicio.precio).toLocaleString('es-CO')} COP`;
            details.appendChild(price);

            const professionalName = document.createElement('span');
            professionalName.className = 'result-card-professional';
            const rating = Number(profesional?.reputacion_promedio || 0);
            professionalName.textContent = `${usuario?.nombre || 'Profesional'} · ${rating.toFixed(1)} ★`;
            details.appendChild(professionalName);
            card.appendChild(details);

            if (profesional?.id) {
                const profileButton = document.createElement('button');
                profileButton.className = 'btn-view-profile';
                profileButton.type = 'button';
                profileButton.textContent = 'Ver perfil del profesional';
                profileButton.addEventListener('click', () => mostrarPerfilProfesional(profesional.id));
                card.appendChild(profileButton);
            }

            resultadosGrid.appendChild(card);
        });
    }

    resultadosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// PANEL DE USUARIO
// ============================================
let usuarioPanelActual = null;
let perfilProfesionalPanelId = null;
let panelEstadoAnterior = null;
const VISTA_ACTIVA_STORAGE_KEY = 'servitech-active-view';
const BORRADOR_CALIFICACION_STORAGE_KEY = 'servitech-rating-draft';
let restaurarVistaCalificacion = null;
let estadoVistasCalificacionInicial = null;
let displayFooterCalificacionInicial = '';

function guardarVistaActiva(vista) {
    sessionStorage.setItem(VISTA_ACTIVA_STORAGE_KEY, JSON.stringify(vista));
}

function limpiarEstadoCalificacion() {
    try {
        const vistaActiva = JSON.parse(sessionStorage.getItem(VISTA_ACTIVA_STORAGE_KEY) || 'null');
        if (vistaActiva?.tipo === 'calificacion') {
            sessionStorage.removeItem(VISTA_ACTIVA_STORAGE_KEY);
        }
    } catch (error) {
        console.error('No se pudo leer la vista activa guardada:', error);
        sessionStorage.removeItem(VISTA_ACTIVA_STORAGE_KEY);
    }
    sessionStorage.removeItem(BORRADOR_CALIFICACION_STORAGE_KEY);
}

const seccionesOcultasAlAbrirPanel = [
    '#inicio',
    '#categorias',
    '#profesionales',
    '#estadisticas',
    '#como-funciona',
    '#resultadosBusqueda',
    '#calificacionPage',
    '.footer'
];

function cambiarVisibilidadPanel(abrir) {
    const panel = document.getElementById('panelUsuario');
    if (!panel) {
        console.error('No se encontró el panel de usuario.');
        mostrarToast('No se pudo abrir el panel de usuario.', 'error');
        return false;
    }

    if (abrir) {
        if (!panelEstadoAnterior) {
            panelEstadoAnterior = seccionesOcultasAlAbrirPanel
                .flatMap(selector => [...document.querySelectorAll(selector)])
                .map(elemento => [elemento, elemento.hidden]);
        }
        panel.hidden = false;
        panelEstadoAnterior.forEach(([elemento]) => { elemento.hidden = true; });
        return true;
    }

    panel.hidden = true;
    panelEstadoAnterior?.forEach(([elemento, estabaOculto]) => {
        elemento.hidden = estabaOculto;
    });
    panelEstadoAnterior = null;
    return true;
}

function mostrarSeccionPanelSinCarga(seccion) {
    const secciones = {
        perfil: 'seccionPerfil',
        servicios: 'seccionServicios',
        publicar: 'seccionPublicar',
        calificaciones: 'seccionCalificaciones',
        configuracion: 'seccionConfiguracion'
    };
    const id = secciones[seccion] || secciones.perfil;
    document.querySelectorAll('.panel-seccion').forEach(elemento => {
        elemento.hidden = elemento.id !== id;
    });
    document.querySelectorAll('.panel-nav-btn').forEach(boton => {
        boton.classList.toggle('active', boton.dataset.seccion === seccion);
    });
}

function restaurarVistaInicio() {
    if (restaurarVistaCalificacion) {
        restaurarVistaCalificacion();
        restaurarVistaCalificacion = null;
    }
    cambiarVisibilidadPanel(false);
    limpiarEstadoCalificacion();
    guardarVistaActiva({ tipo: 'inicio' });
}

async function abrirPanelUsuario(seccionInicial = 'perfil', { desplazar = true } = {}) {
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
            mostrarToast('Debes iniciar sesión.', 'error');
            mostrarModalAuth('login');
            return;
        }

        const { data: usuario, error: usuarioError } = await supabaseClient
            .from('usuarios')
            .select('id, nombre, email, telefono, ciudad, zona_barrio, rol')
            .eq('email', authData.user.email)
            .maybeSingle();
        if (usuarioError) throw usuarioError;
        if (!usuario) {
            mostrarToast('No se encontró tu perfil.', 'error');
            return;
        }

        const { data: perfil, error: perfilError } = await supabaseClient
            .from('perfiles_profesionales')
            .select('id')
            .eq('usuario_id', usuario.id)
            .maybeSingle();
        if (perfilError) throw perfilError;

        usuarioPanelActual = usuario;
        perfilProfesionalPanelId = perfil?.id ?? null;

        const userCard = document.getElementById('panelUserCard');
        const nombre = usuario.nombre || 'Usuario';
        const iniciales = nombre.split(/\s+/).filter(Boolean).map(parte => parte[0]).join('').slice(0, 2).toUpperCase();
        userCard.replaceChildren();

        const avatar = document.createElement('div');
        avatar.className = 'panel-user-avatar';
        avatar.dataset.avatarPalette = String(obtenerPaletaAvatar(usuario.email));
        avatar.textContent = iniciales;
        const nombreElemento = document.createElement('div');
        nombreElemento.className = 'panel-user-name';
        nombreElemento.textContent = nombre;
        const emailElemento = document.createElement('div');
        emailElemento.className = 'panel-user-email';
        emailElemento.textContent = usuario.email || '';
        userCard.append(avatar, nombreElemento, emailElemento);

        document.getElementById('editNombre').value = usuario.nombre || '';
        document.getElementById('editEmail').value = usuario.email || '';
        document.getElementById('editTelefono').value = usuario.telefono || '';
        document.getElementById('editCiudad').value = usuario.ciudad || '';
        document.getElementById('editZona').value = usuario.zona_barrio || '';
        document.getElementById('editRol').value = usuario.rol || 'No definido';

        const formEditarPerfil = document.getElementById('formEditarPerfil');
        formEditarPerfil.onsubmit = async event => {
            event.preventDefault();

            const submitBtn = formEditarPerfil.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';

            try {
                const nombreActualizado = document.getElementById('editNombre').value.trim();
                const telefono = document.getElementById('editTelefono').value.trim();
                const ciudad = document.getElementById('editCiudad').value.trim();
                const zona = document.getElementById('editZona').value.trim();

                if (!nombreActualizado) {
                    mostrarToast('El nombre es obligatorio.', 'error');
                    document.getElementById('editNombre').focus();
                    return;
                }

                const { error } = await supabaseClient
                    .from('usuarios')
                    .update({
                        nombre: nombreActualizado,
                        telefono: telefono || null,
                        ciudad: ciudad || null,
                        zona_barrio: zona || null
                    })
                    .eq('id', usuario.id);

                if (error) {
                    console.error('Error al actualizar perfil:', error);
                    mostrarToast('No se pudieron guardar los cambios.', 'error');
                    return;
                }

                usuarioPanelActual = {
                    ...usuarioPanelActual,
                    nombre: nombreActualizado,
                    telefono: telefono || null,
                    ciudad: ciudad || null,
                    zona_barrio: zona || null
                };
                mostrarToast('¡Perfil actualizado correctamente!', 'success');

                if (authData.user.email) {
                    await actualizarHeaderParaUsuarioLogueado(authData.user.email);
                }

                const userCard = document.getElementById('panelUserCard');
                const nuevasIniciales = nombreActualizado.split(/\s+/)
                    .filter(Boolean)
                    .map(parte => parte[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                const avatarActualizado = document.createElement('div');
                avatarActualizado.className = 'panel-user-avatar';
                avatarActualizado.dataset.avatarPalette = String(obtenerPaletaAvatar(usuarioPanelActual.email));
                avatarActualizado.textContent = nuevasIniciales;
                const nombreElementoActualizado = document.createElement('div');
                nombreElementoActualizado.className = 'panel-user-name';
                nombreElementoActualizado.textContent = nombreActualizado;
                const emailElementoActualizado = document.createElement('div');
                emailElementoActualizado.className = 'panel-user-email';
                emailElementoActualizado.textContent = usuario.email || '';
                userCard.replaceChildren(avatarActualizado, nombreElementoActualizado, emailElementoActualizado);
            } catch (error) {
                console.error('Error inesperado al actualizar perfil:', error);
                mostrarToast('Ocurrió un error. Intenta de nuevo.', 'error');
            } finally {
                if (submitBtn.isConnected) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Guardar cambios';
                }
            }
        };

        if (!cambiarVisibilidadPanel(true)) return;
        await mostrarSeccionPanel(seccionInicial);
        if (desplazar) {
            document.getElementById('panelUsuario').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (error) {
        sessionStorage.removeItem(VISTA_ACTIVA_STORAGE_KEY);
        console.error('Error al abrir el panel de usuario:', error);
        mostrarToast('No se pudo cargar tu panel. Intenta de nuevo.', 'error');
    }
}

async function mostrarSeccionPanel(seccion) {
    const seccionMap = {
        perfil: 'seccionPerfil',
        servicios: 'seccionServicios',
        publicar: 'seccionPublicar',
        calificaciones: 'seccionCalificaciones',
        configuracion: 'seccionConfiguracion'
    };
    const seccionId = seccionMap[seccion];
    if (!seccionId) {
        console.error('Se solicitó una sección desconocida del panel:', seccion);
        return;
    }

    document.querySelectorAll('.panel-seccion').forEach(elemento => {
        elemento.hidden = elemento.id !== seccionId;
    });
    document.querySelectorAll('.panel-nav-btn').forEach(boton => {
        boton.classList.toggle('active', boton.dataset.seccion === seccion);
    });
    guardarVistaActiva({ tipo: 'panel', seccion });

    if (seccion === 'servicios') await cargarMisServicios();
    if (seccion === 'calificaciones') await cargarMisCalificaciones();
    if (seccion === 'configuracion') {
        await cargarInfoPlan();
        configurarCambiarPassword();
        configurarEliminarCuenta();
        configurarCerrarSesion();
    }
    if (seccion === 'publicar') {
        const contenedor = document.getElementById('formPublicarServicioPanel');
        if (!contenedor.querySelector('button')) {
            const descripcion = document.createElement('p');
            descripcion.className = 'panel-empty';
            descripcion.textContent = 'Completa el formulario para publicar un servicio en tu perfil profesional.';
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'btn-primary';
            boton.textContent = 'Abrir formulario de publicación';
            boton.addEventListener('click', mostrarModalRegistroProfesional);
            contenedor.replaceChildren(descripcion, boton);
        }
    }
}

async function configurarCambiarPassword() {
    const form = document.getElementById('formCambiarPassword');
    if (!form) return;

    form.onsubmit = async event => {
        event.preventDefault();
        const actualInput = document.getElementById('configPasswordActual');
        const nuevaInput = document.getElementById('configPasswordNueva');
        const confirmInput = document.getElementById('configPasswordConfirm');
        const actual = actualInput.value;
        const nueva = nuevaInput.value;
        const confirmacion = confirmInput.value;

        if (nueva !== confirmacion) {
            mostrarToast('Las contraseñas nuevas no coinciden.', 'error');
            confirmInput.focus();
            return;
        }
        if (nueva.length < 6) {
            mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'error');
            nuevaInput.focus();
            return;
        }
        if (nueva === actual) {
            mostrarToast('La nueva contraseña debe ser diferente a la actual.', 'error');
            nuevaInput.focus();
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Actualizando...';

        try {
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            if (authError) throw authError;
            if (!authData.user?.email) {
                mostrarToast('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
                return;
            }

            const { data: sesionVerificada, error: verificacionError } = await supabaseClient.auth
                .signInWithPassword({ email: authData.user.email, password: actual });
            if (verificacionError) {
                mostrarToast('La contraseña actual no es correcta.', 'error');
                actualInput.focus();
                return;
            }
            if (sesionVerificada.user?.id !== authData.user.id) {
                mostrarToast('No se pudo verificar tu identidad. Inicia sesión de nuevo.', 'error');
                return;
            }

            const { error } = await supabaseClient.auth.updateUser({ password: nueva });
            if (error) throw error;
            mostrarToast('¡Contraseña actualizada correctamente!', 'success');
            form.reset();
        } catch (error) {
            console.error('Error al cambiar la contraseña:', error);
            mostrarToast('No se pudo cambiar la contraseña. Intenta de nuevo.', 'error');
        } finally {
            if (submitBtn.isConnected) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Actualizar contraseña';
            }
        }
    };
}

async function cargarInfoPlan() {
    const planInfo = document.getElementById('configPlanInfo');
    if (!planInfo) return;
    planInfo.replaceChildren();

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!authData.user?.email) {
            mostrarToast('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
            return;
        }

        const { data: usuario, error: usuarioError } = await supabaseClient
            .from('usuarios')
            .select('id')
            .eq('email', authData.user.email)
            .maybeSingle();
        if (usuarioError) throw usuarioError;

        let plan;
        if (usuario) {
            const { data: perfil, error: perfilError } = await supabaseClient
                .from('perfiles_profesionales')
                .select('planes_suscripcion(nombre, precio_mensual, limite_publicaciones)')
                .eq('usuario_id', usuario.id)
                .maybeSingle();
            if (perfilError) throw perfilError;
            plan = Array.isArray(perfil?.planes_suscripcion)
                ? perfil.planes_suscripcion[0]
                : perfil?.planes_suscripcion;
        }

        const badge = document.createElement('div');
        badge.className = 'config-plan-badge';
        const details = document.createElement('div');
        details.className = 'config-plan-details';
        const title = document.createElement('strong');
        const description = document.createElement('span');

        if (plan) {
            badge.textContent = plan.nombre || 'Plan activo';
            title.textContent = `$${Number(plan.precio_mensual || 0).toLocaleString('es-CO')} COP / mes`;
            description.textContent = `Hasta ${plan.limite_publicaciones ?? 0} publicaciones`;
        } else {
            badge.classList.add('config-plan-badge-muted');
            badge.textContent = 'Sin plan';
            title.textContent = 'No tienes un perfil profesional activo';
            description.textContent = 'Crea tu perfil para acceder a los planes';
        }

        details.append(title, description);
        planInfo.append(badge, details);
    } catch (error) {
        console.error('Error al cargar el plan del usuario:', error);
        mostrarToast('No se pudo cargar la información de tu plan.', 'error');
    }
}

function configurarEliminarCuenta() {
    const btn = document.getElementById('btnEliminarCuenta');
    if (!btn) return;

    btn.onclick = async () => {
        const confirmacion = confirm(
            '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible.'
        );
        if (!confirmacion) return;

        if (prompt('Escribe "ELIMINAR" para confirmar la eliminación de tu cuenta:') !== 'ELIMINAR') {
            mostrarToast('Operación cancelada.', 'info');
            return;
        }

        btn.disabled = true;
        try {
            const { data, error } = await supabaseClient.functions.invoke('delete-account', {
                body: { confirmation: 'ELIMINAR' }
            });
            if (error) throw error;
            if (!data?.success) {
                throw new Error('La función de eliminación no confirmó que la cuenta se eliminara.');
            }

            mostrarToast('Cuenta eliminada correctamente.', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('Error al eliminar la cuenta:', error);
            mostrarToast('No se pudo eliminar la cuenta. Verifica que la función segura delete-account esté configurada.', 'error');
        } finally {
            if (btn.isConnected) btn.disabled = false;
        }
    };
}

function configurarCerrarSesion() {
    const btn = document.getElementById('btnCerrarSesionConfig');
    if (!btn) return;

    btn.onclick = async () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            await cerrarSesion();
        }
    };
}

async function cargarMisServicios() {
    const lista = document.getElementById('misServiciosList');
    if (!lista) return;

    lista.replaceChildren();
    const cargando = document.createElement('p');
    cargando.className = 'panel-empty';
    cargando.textContent = 'Cargando servicios...';
    lista.appendChild(cargando);

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
            lista.replaceChildren();
            mostrarToast('Debes iniciar sesión para ver tus servicios.', 'error');
            mostrarModalAuth('login');
            return;
        }

        let perfilId = perfilProfesionalPanelId;
        if (!perfilId || usuarioPanelActual?.email !== authData.user.email) {
            const { data: usuario, error: usuarioError } = await supabaseClient
                .from('usuarios')
                .select('id')
                .eq('email', authData.user.email)
                .maybeSingle();
            if (usuarioError) throw usuarioError;
            if (!usuario) {
                throw new Error('No se encontró el registro del usuario autenticado.');
            }

            const { data: perfil, error: perfilError } = await supabaseClient
                .from('perfiles_profesionales')
                .select('id')
                .eq('usuario_id', usuario.id)
                .maybeSingle();
            if (perfilError) throw perfilError;
            perfilId = perfil?.id ?? null;
            perfilProfesionalPanelId = perfilId;
        }

        if (!perfilId) {
            const mensaje = document.createElement('p');
            mensaje.className = 'panel-empty';
            mensaje.textContent = 'Esta cuenta aún no tiene un perfil profesional ni servicios publicados.';
            const botonCrear = document.createElement('button');
            botonCrear.type = 'button';
            botonCrear.className = 'btn-primary';
            botonCrear.textContent = 'Crear mi perfil profesional';
            botonCrear.addEventListener('click', () => mostrarSeccionPanel('publicar'));
            lista.replaceChildren(mensaje, botonCrear);
            return;
        }

        const { data: servicios, error } = await supabaseClient
            .from('servicios')
            .select('id, profesional_id, titulo, descripcion, precio, ciudad, zona_barrio, disponibilidad')
            .eq('profesional_id', perfilId)
            .order('id', { ascending: false });
        if (error) throw error;

        if (!servicios?.length) {
            const vacio = document.createElement('p');
            vacio.className = 'panel-empty';
            vacio.textContent = 'Aún no has publicado ningún servicio.';
            lista.replaceChildren(vacio);
            return;
        }

        lista.replaceChildren();
        servicios.forEach(servicio => {
            const item = document.createElement('article');
            item.className = 'mis-servicio-item';
            const info = document.createElement('div');
            info.className = 'mis-servicio-info';
            const titulo = document.createElement('h4');
            titulo.textContent = servicio.titulo || 'Servicio sin título';
            const descripcion = document.createElement('p');
            const textoDescripcion = servicio.descripcion || 'Sin descripción';
            descripcion.textContent = textoDescripcion.length > 100
                ? `${textoDescripcion.slice(0, 100)}...`
                : textoDescripcion;

            const meta = document.createElement('div');
            meta.className = 'mis-servicio-meta';
            const precio = document.createElement('span');
            precio.textContent = `$${Number(servicio.precio || 0).toLocaleString('es-CO')} COP`;
            const estado = document.createElement('span');
            estado.className = servicio.disponibilidad === false ? 'servicio-no-disponible' : 'servicio-disponible';
            estado.textContent = servicio.disponibilidad === false ? 'No disponible' : 'Disponible';
            meta.append(precio, estado);
            if (servicio.ciudad || servicio.zona_barrio) {
                const ubicacion = document.createElement('span');
                ubicacion.textContent = [servicio.ciudad, servicio.zona_barrio].filter(Boolean).join(' · ');
                meta.appendChild(ubicacion);
            }
            info.append(titulo, descripcion, meta);

            const acciones = document.createElement('div');
            acciones.className = 'mis-servicio-acciones';
            const botonEditar = document.createElement('button');
            botonEditar.type = 'button';
            botonEditar.className = 'btn-editar';
            botonEditar.dataset.id = servicio.id;
            botonEditar.textContent = 'Editar';
            botonEditar.addEventListener('click', () => mostrarModalEditarServicio(servicio));

            const botonEliminar = document.createElement('button');
            botonEliminar.type = 'button';
            botonEliminar.className = 'btn-eliminar';
            botonEliminar.dataset.id = servicio.id;
            botonEliminar.textContent = 'Eliminar';
            botonEliminar.addEventListener('click', async () => {
                if (window.confirm('¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.')) {
                    await eliminarServicio(servicio.id);
                }
            });

            acciones.append(botonEditar, botonEliminar);
            item.append(info, acciones);
            lista.appendChild(item);
        });
    } catch (error) {
        console.error('Error al cargar los servicios del usuario:', error);
        const mensaje = document.createElement('p');
        mensaje.className = 'panel-empty';
        mensaje.textContent = 'No se pudieron cargar tus servicios. Intenta de nuevo.';
        lista.replaceChildren(mensaje);
        mostrarToast('No se pudieron cargar tus servicios.', 'error');
    }
}

async function eliminarServicio(id) {
    if (!perfilProfesionalPanelId) {
        mostrarToast('No se pudo verificar el propietario del servicio.', 'error');
        return;
    }

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!authData.user || authData.user.email !== usuarioPanelActual?.email) {
            mostrarToast('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
            return;
        }

        const { error } = await supabaseClient
            .from('servicios')
            .delete()
            .eq('id', id)
            .eq('profesional_id', perfilProfesionalPanelId);
        if (error) throw error;

        mostrarToast('Servicio eliminado correctamente.', 'success');
        await cargarMisServicios();
    } catch (error) {
        console.error('Error al eliminar el servicio:', error);
        mostrarToast('No se pudo eliminar el servicio.', 'error');
    }
}

function mostrarModalEditarServicio(servicio) {
    if (!perfilProfesionalPanelId || String(servicio.profesional_id) !== String(perfilProfesionalPanelId)) {
        mostrarToast('No tienes permiso para editar este servicio.', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-small" role="dialog" aria-modal="true" aria-labelledby="tituloEditarServicio">
            <button class="modal-close" type="button" aria-label="Cerrar">&times;</button>
            <h2 id="tituloEditarServicio">Editar Servicio</h2>
            <form id="formEditarServicio">
                <div class="form-group">
                    <label for="editServTitulo">Título *</label>
                    <input type="text" id="editServTitulo" required maxlength="150">
                </div>
                <div class="form-group">
                    <label for="editServDesc">Descripción</label>
                    <textarea id="editServDesc" rows="4" maxlength="2000"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editServPrecio">Precio (COP)</label>
                        <input type="number" id="editServPrecio" min="0" step="any">
                    </div>
                    <div class="form-group">
                        <label for="editServDisp">Disponibilidad</label>
                        <select id="editServDisp">
                            <option value="true">Disponible</option>
                            <option value="false">No disponible</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn-primary btn-large">Guardar cambios</button>
            </form>
        </div>
    `;
    const tituloInput = modal.querySelector('#editServTitulo');
    const descripcionInput = modal.querySelector('#editServDesc');
    const precioInput = modal.querySelector('#editServPrecio');
    const disponibilidadInput = modal.querySelector('#editServDisp');
    tituloInput.value = servicio.titulo || '';
    descripcionInput.value = servicio.descripcion || '';
    precioInput.value = String(servicio.precio ?? 0);
    disponibilidadInput.value = String(servicio.disponibilidad !== false);

    const scrollAnterior = document.body.style.overflow;
    const onEsc = event => {
        if (event.key === 'Escape') cerrar();
    };
    const cerrar = () => {
        document.removeEventListener('keydown', onEsc);
        modal.remove();
        document.body.style.overflow = scrollAnterior;
    };
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').addEventListener('click', cerrar);
    modal.addEventListener('click', event => {
        if (event.target === modal) cerrar();
    });
    document.addEventListener('keydown', onEsc);

    modal.querySelector('#formEditarServicio').addEventListener('submit', async event => {
        event.preventDefault();
        const submitBtn = modal.querySelector('button[type="submit"]');
        const precio = Number(precioInput.value);
        const titulo = tituloInput.value.trim();
        if (!titulo || !Number.isFinite(precio) || precio < 0) {
            mostrarToast('Revisa el título y el precio del servicio.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        try {
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            if (authError) throw authError;
            if (!authData.user || authData.user.email !== usuarioPanelActual?.email) {
                mostrarToast('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
                return;
            }

            const datos = {
                titulo,
                descripcion: descripcionInput.value.trim() || null,
                precio,
                disponibilidad: disponibilidadInput.value === 'true'
            };
            const { error } = await supabaseClient
                .from('servicios')
                .update(datos)
                .eq('id', servicio.id)
                .eq('profesional_id', perfilProfesionalPanelId);
            if (error) throw error;

            mostrarToast('Servicio actualizado correctamente.', 'success');
            cerrar();
            await cargarMisServicios();
        } catch (error) {
            console.error('Error al actualizar el servicio:', error);
            mostrarToast('No se pudo actualizar el servicio.', 'error');
        } finally {
            if (submitBtn.isConnected) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar cambios';
            }
        }
    });
}

async function cargarMisCalificaciones() {
    const lista = document.getElementById('misCalificacionesList');
    if (!lista) return;
    lista.replaceChildren();

    if (!perfilProfesionalPanelId) {
        const vacio = document.createElement('p');
        vacio.className = 'panel-empty';
        vacio.textContent = 'Las calificaciones aparecerán aquí cuando tengas un perfil profesional.';
        lista.appendChild(vacio);
        return;
    }

    const { data: calificaciones, error } = await supabaseClient
        .from('calificaciones')
        .select('calificacion, comentario, fecha, servicios(titulo)')
        .eq('profesional_id', perfilProfesionalPanelId)
        .order('fecha', { ascending: false });
    if (error) {
        console.error('Error al cargar las calificaciones del usuario:', error);
        mostrarToast('No se pudieron cargar tus calificaciones.', 'error');
        return;
    }
    if (!calificaciones?.length) {
        const vacio = document.createElement('p');
        vacio.className = 'panel-empty';
        vacio.textContent = 'Todavía no has recibido calificaciones.';
        lista.appendChild(vacio);
        return;
    }

    calificaciones.forEach(calificacion => {
        const item = document.createElement('article');
        item.className = 'calificacion-item';
        const cabecera = document.createElement('div');
        cabecera.className = 'calificacion-item-header';
        const estrellas = document.createElement('div');
        estrellas.className = 'calificacion-estrellas';
        estrellas.innerHTML = generarEstrellasHTML(calificacion.calificacion);
        const fecha = document.createElement('span');
        fecha.className = 'calificacion-fecha';
        const fechaParseada = calificacion.fecha ? new Date(calificacion.fecha) : null;
        fecha.textContent = fechaParseada && !Number.isNaN(fechaParseada.getTime())
            ? fechaParseada.toLocaleDateString('es-CO')
            : '';
        cabecera.append(estrellas, fecha);
        const servicio = document.createElement('p');
        servicio.className = 'mis-servicio-meta';
        servicio.textContent = calificacion.servicios?.titulo || 'Servicio calificado';
        item.append(cabecera, servicio);
        if (calificacion.comentario) {
            const comentario = document.createElement('p');
            comentario.className = 'calificacion-comentario';
            comentario.textContent = `“${calificacion.comentario}”`;
            item.appendChild(comentario);
        }
        lista.appendChild(item);
    });
}

// ============================================
// PÁGINA DE CALIFICACIÓN
// ============================================
async function mostrarPaginaCalificacion(perfilId, modalPerfil = null) {
    let contratante;
    let profesional;

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) throw authError;

        const user = authData.user;
        if (!user) {
            mostrarToast('Debes iniciar sesión para calificar.', 'error');
            mostrarModalAuth('login');
            return;
        }

        const { data: contratanteData, error: contratanteError } = await supabaseClient
            .from('usuarios')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
        if (contratanteError) throw contratanteError;
        if (!contratanteData) {
            mostrarToast('No se encontró tu perfil de usuario.', 'error');
            return;
        }
        contratante = contratanteData;

        const { data: profesionalData, error: profesionalError } = await supabaseClient
            .from('perfiles_profesionales')
            .select('*, usuarios(nombre, ciudad)')
            .eq('id', perfilId)
            .maybeSingle();
        if (profesionalError) throw profesionalError;
        if (!profesionalData) {
            mostrarToast('No se encontró el profesional.', 'error');
            return;
        }
        profesional = profesionalData;
    } catch (error) {
        console.error('Error al preparar la página de calificación:', error);
        mostrarToast('No se pudo cargar el formulario de calificación. Intenta de nuevo.', 'error');
        return;
    }

    const calificacionPage = document.getElementById('calificacionPage');
    const profInfo = document.getElementById('calProfesionalInfo');
    const selectServicios = document.getElementById('calServicioPage');
    const valorInput = document.getElementById('calValorPage');
    const comentarioInput = document.getElementById('calComentarioPage');
    const textoLabel = document.getElementById('calificacionTextoPage');
    const form = document.getElementById('calificacionFormPage');
    const volverButton = document.getElementById('btnVolverCalificacion');

    if (!calificacionPage || !profInfo || !selectServicios || !valorInput
        || !comentarioInput || !textoLabel || !form || !volverButton) {
        console.error('No se encontró el formulario completo de calificación.');
        mostrarToast('No se pudo abrir el formulario de calificación. Recarga la página.', 'error');
        return;
    }

    let servicios = [];
    let errorCargaServicios = null;
    try {
        const { data: serviciosData, error: serviciosError } = await supabaseClient
            .from('servicios')
            .select('id, titulo')
            .eq('profesional_id', perfilId);
        if (serviciosError) throw serviciosError;
        servicios = serviciosData || [];
    } catch (error) {
        errorCargaServicios = error;
        console.error('Error al cargar los servicios del profesional:', error);
    }

    const vistasPrincipales = [
        'inicio',
        'resultadosBusqueda',
        'categorias',
        'profesionales',
        'estadisticas',
        'como-funciona'
    ].map(id => document.getElementById(id)).filter(Boolean);
    const estadoVistas = estadoVistasCalificacionInicial || vistasPrincipales.map(vista => ({
        vista,
        hidden: vista.hidden
    }));
    estadoVistasCalificacionInicial = null;
    const footer = document.querySelector('.footer');
    const footerDisplay = displayFooterCalificacionInicial || footer?.style.display;
    displayFooterCalificacionInicial = '';

    if (modalPerfil) modalPerfil.remove();

    const nombreProfesional = profesional.usuarios?.nombre || 'Profesional';
    const iniciales = nombreProfesional.split(' ').map(nombre => nombre[0]).join('').substring(0, 2).toUpperCase();
    const avatar = document.createElement('div');
    avatar.className = 'profesional-avatar';
    avatar.dataset.avatarPalette = String(obtenerPaletaAvatar(perfilId));
    avatar.textContent = iniciales;
    const detalles = document.createElement('div');
    detalles.className = 'profesional-detalles';
    const nombre = document.createElement('h4');
    nombre.textContent = nombreProfesional;
    const descripcion = document.createElement('p');
    descripcion.textContent = `${profesional.profesion || 'Profesional'} · ${profesional.usuarios?.ciudad || 'No especificada'}`;
    detalles.append(nombre, descripcion);
    profInfo.replaceChildren(avatar, detalles);

    selectServicios.replaceChildren(new Option('Selecciona un servicio', ''));
    servicios.forEach(servicio => {
        selectServicios.add(new Option(servicio.titulo || 'Servicio sin título', servicio.id));
    });
    selectServicios.disabled = servicios.length === 0;
    if (errorCargaServicios) {
        mostrarToast('No se pudieron cargar los servicios. Puedes volver a intentarlo más tarde.', 'error');
    } else if (servicios.length === 0) {
        mostrarToast('Este profesional no tiene servicios publicados para calificar.', 'info');
    }

    valorInput.value = '0';
    comentarioInput.value = '';
    textoLabel.textContent = 'Haz clic en las estrellas para calificar';
    const textosCalificacion = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
    const stars = document.querySelectorAll('.cal-star-page');
    let borrador = null;
    try {
        const borradorGuardado = JSON.parse(sessionStorage.getItem(BORRADOR_CALIFICACION_STORAGE_KEY) || 'null');
        if (borradorGuardado?.perfilId === String(perfilId)) {
            borrador = borradorGuardado;
        }
    } catch (error) {
        console.error('No se pudo recuperar el borrador de calificación:', error);
        sessionStorage.removeItem(BORRADOR_CALIFICACION_STORAGE_KEY);
    }

    if (borrador) {
        if (servicios.some(servicio => String(servicio.id) === borrador.servicioId)) {
            selectServicios.value = borrador.servicioId;
        }
        comentarioInput.value = typeof borrador.comentario === 'string' ? borrador.comentario : '';
    }

    const actualizarEstrellas = valor => {
        valorInput.value = String(valor);
        stars.forEach(item => {
            item.classList.toggle('filled', Number.parseInt(item.dataset.value, 10) <= valor);
        });
        textoLabel.textContent = textosCalificacion[valor] || 'Haz clic en las estrellas para calificar';
    };

    if (Number.isInteger(borrador?.calificacion) && borrador.calificacion >= 1 && borrador.calificacion <= 5) {
        actualizarEstrellas(borrador.calificacion);
    }

    const guardarBorradorCalificacion = () => {
        sessionStorage.setItem(BORRADOR_CALIFICACION_STORAGE_KEY, JSON.stringify({
            perfilId: String(perfilId),
            servicioId: selectServicios.value,
            calificacion: Number.parseInt(valorInput.value, 10) || 0,
            comentario: comentarioInput.value
        }));
    };
    form.oninput = guardarBorradorCalificacion;
    form.onchange = guardarBorradorCalificacion;

    stars.forEach(star => {
        star.onclick = () => {
            const valor = Number.parseInt(star.dataset.value, 10);
            actualizarEstrellas(valor);
            guardarBorradorCalificacion();
        };
    });

    const restaurarVistas = () => {
        calificacionPage.hidden = true;
        estadoVistas.forEach(({ vista, hidden }) => {
            vista.hidden = hidden;
        });
        if (footer) footer.style.display = footerDisplay;
    };
    restaurarVistaCalificacion = restaurarVistas;
    const recargarPerfilYProfesionales = () => {
        limpiarEstadoCalificacion();
        restaurarVistaCalificacion = null;
        guardarVistaActiva({ tipo: 'inicio' });
        restaurarVistas();
        setTimeout(async () => {
            await cargarProfesionales(3);
            await mostrarPerfilProfesional(perfilId);
        }, 1200);
    };

    vistasPrincipales.forEach(vista => {
        vista.hidden = true;
    });
    guardarVistaActiva({ tipo: 'calificacion', perfilId: String(perfilId) });
    if (footer) footer.style.display = 'none';
    calificacionPage.hidden = false;

    volverButton.onclick = () => {
        limpiarEstadoCalificacion();
        guardarVistaActiva({ tipo: 'inicio' });
        restaurarVistaCalificacion = null;
        restaurarVistas();
        mostrarPerfilProfesional(perfilId);
    };

    form.onsubmit = async event => {
        event.preventDefault();
        const servicioId = Number.parseInt(selectServicios.value, 10);
        const calificacion = Number.parseInt(valorInput.value, 10);
        const comentario = comentarioInput.value.trim();

        if (!servicioId) {
            mostrarToast('Selecciona un servicio.', 'error');
            selectServicios.focus();
            return;
        }
        if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
            mostrarToast('Selecciona una calificación.', 'error');
            stars[0]?.focus();
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const submitText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
        let calificacionGuardada = false;

        try {
            const { error: insertError } = await supabaseClient.from('calificaciones').insert([{
                servicio_id: servicioId,
                contratante_id: contratante.id,
                profesional_id: perfilId,
                calificacion,
                comentario: comentario || null
            }]);

            if (insertError) {
                if (insertError.code === '23505') {
                    mostrarToast('Ya calificaste este servicio anteriormente.', 'error');
                } else {
                    console.error('Error al guardar la calificación:', insertError);
                    mostrarToast('No se pudo enviar la calificación.', 'error');
                }
                return;
            }
            calificacionGuardada = true;

            let mensajeFinal = '¡Calificación enviada con éxito! Gracias por tu opinión.';
            let promedioActualizado = true;
            const { data: calificaciones, error: consultaError } = await supabaseClient
                .from('calificaciones')
                .select('calificacion')
                .eq('profesional_id', perfilId);

            if (consultaError) {
                console.error('Error al actualizar el promedio de calificaciones:', consultaError);
                mensajeFinal = 'Tu calificación se guardó, pero no se pudo actualizar el promedio.';
                promedioActualizado = false;
            } else if (calificaciones?.length) {
                const nuevoPromedio = calificaciones.reduce((suma, item) => suma + Number(item.calificacion), 0)
                    / calificaciones.length;
                const { error: promedioError } = await supabaseClient
                    .from('perfiles_profesionales')
                    .update({ reputacion_promedio: nuevoPromedio })
                    .eq('id', perfilId);
                if (promedioError) {
                    console.error('Error al guardar el promedio de reputación:', promedioError);
                    mensajeFinal = 'Tu calificación se guardó, pero no se pudo actualizar el promedio.';
                    promedioActualizado = false;
                }
            } else {
                console.error('No se encontraron calificaciones para calcular el promedio del profesional.');
                mensajeFinal = 'Tu calificación se guardó, pero no se pudo actualizar el promedio.';
                promedioActualizado = false;
            }

            mostrarToast(mensajeFinal, promedioActualizado ? 'success' : 'info');
            recargarPerfilYProfesionales();
        } catch (error) {
            console.error('Error inesperado al enviar la calificación:', error);
            if (calificacionGuardada) {
                mostrarToast('Tu calificación se guardó, pero no se pudo actualizar el promedio.', 'info');
                recargarPerfilYProfesionales();
            } else {
                mostrarToast('Ocurrió un error al enviar tu calificación. Intenta de nuevo.', 'error');
            }
        } finally {
            if (submitButton.isConnected) {
                submitButton.disabled = false;
                submitButton.textContent = submitText;
            }
        }
    };

    calificacionPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// MODAL DE PERFIL PROFESIONAL (CON BOOTSTRAP)
// ============================================
async function mostrarPerfilProfesional(perfilId) {
    const { data: perfil, error } = await supabaseClient
        .from('perfiles_profesionales')
        .select(`
            *,
            usuarios(nombre, email, telefono, ciudad),
            planes_suscripcion(nombre),
            servicios(*),
            insignias(*),
            calificaciones(calificacion, comentario, fecha)
        `)
        .eq('id', perfilId)
        .single();

    if (error) {
        console.error('Error al cargar perfil:', error);
        return;
    }

    const escaparHTML = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
    const nombre = perfil.usuarios?.nombre || 'Profesional';
    const iniciales = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const paletaAvatar = obtenerPaletaAvatar(perfil.id);
    const estrellasHTML = generarEstrellasHTML(perfil.reputacion_promedio);
    const fechaCalificacion = fecha => {
        const timestamp = Date.parse(fecha || '');
        return Number.isNaN(timestamp) ? 0 : timestamp;
    };
    const calificacionesRecientes = Array.isArray(perfil.calificaciones)
        ? [...perfil.calificaciones].sort((a, b) => fechaCalificacion(b.fecha) - fechaCalificacion(a.fecha))
        : [];

    const planNombre = perfil.planes_suscripcion?.nombre || 'Básico';
    const planColor = planNombre === 'Premium' ? 'bg-warning text-dark'
        : planNombre === 'Destacado' ? 'bg-info text-dark'
            : 'bg-secondary';
    const servicios = Array.isArray(perfil.servicios) ? perfil.servicios : [];
    const insignias = Array.isArray(perfil.insignias) ? perfil.insignias : [];
    const habilidades = typeof perfil.habilidades === 'string'
        ? perfil.habilidades.split(',').map(habilidad => habilidad.trim()).filter(Boolean)
        : [];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-profile-bootstrap" role="dialog" aria-modal="true" aria-labelledby="perfilTitulo">
            <button class="modal-close" type="button" aria-label="Cerrar">&times;</button>

            <div class="profile-header">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <div class="profile-avatar-large" data-avatar-palette="${paletaAvatar}">
                            ${escaparHTML(iniciales)}
                        </div>
                    </div>
                    <div class="col">
                        <h2 class="profile-name mb-1" id="perfilTitulo">${escaparHTML(nombre)}</h2>
                        <div class="profile-meta d-flex flex-wrap align-items-center gap-2">
                            <div class="rating">
                                ${estrellasHTML}
                                <span class="ms-1 fw-bold">${(Number(perfil.reputacion_promedio) || 0).toFixed(1)}</span>
                            </div>
                            ${perfil.verificado ? `
                                <span class="badge bg-success-soft">
                                    <i class="fas fa-check-circle"></i> Verificado
                                </span>
                            ` : ''}
                            <span class="badge ${planColor}">${escaparHTML(planNombre)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="profile-body">
                <div class="row g-4">
                    <div class="col-md-7">
                        <div class="info-card">
                            <h3 class="info-card-title">
                                <i class="fas fa-info-circle"></i> Descripción
                            </h3>
                            <p class="info-card-text">${escaparHTML(perfil.descripcion || 'Sin descripción')}</p>
                        </div>

                        ${habilidades.length > 0 ? `
                            <div class="info-card">
                                <h3 class="info-card-title">
                                    <i class="fas fa-lightbulb"></i> Habilidades
                                </h3>
                                <div class="habilidades-tags">
                                    ${habilidades.map(habilidad => `
                                        <span class="badge bg-primary-soft">${escaparHTML(habilidad)}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${servicios.length > 0 ? `
                            <div class="info-card">
                                <h3 class="info-card-title">
                                    <i class="fas fa-tools"></i> Servicios ofrecidos
                                </h3>
                                <div class="servicios-list">
                                    ${servicios.map(servicio => `
                                        <div class="servicio-item">
                                            <div class="servicio-header">
                                                <strong>${escaparHTML(servicio.titulo || '')}</strong>
                                                <span class="servicio-precio">$${(Number(servicio.precio) || 0).toLocaleString('es-CO')} COP</span>
                                            </div>
                                            ${servicio.descripcion ? `<p class="servicio-desc">${escaparHTML(servicio.descripcion)}</p>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="col-md-5">
                        <div class="info-sidebar">
                            <div class="info-sidebar-item">
                                <div class="info-sidebar-icon">
                                    <i class="fas fa-briefcase"></i>
                                </div>
                                <div class="info-sidebar-content">
                                    <span class="info-sidebar-label">Experiencia</span>
                                    <span class="info-sidebar-value">${(Number(perfil.experiencia_anios) || 0)} años</span>
                                </div>
                            </div>

                            <div class="info-sidebar-item">
                                <div class="info-sidebar-icon">
                                    <i class="fas fa-dollar-sign"></i>
                                </div>
                                <div class="info-sidebar-content">
                                    <span class="info-sidebar-label">Tarifa base</span>
                                    <span class="info-sidebar-value">$${(Number(perfil.tarifa_base) || 0).toLocaleString('es-CO')} COP</span>
                                </div>
                            </div>

                            ${perfil.tarifa_unidad ? `
                                <div class="info-sidebar-item">
                                    <div class="info-sidebar-icon">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                    <div class="info-sidebar-content">
                                        <span class="info-sidebar-label">Tarifa por</span>
                                        <span class="info-sidebar-value text-capitalize">${escaparHTML(perfil.tarifa_unidad)}</span>
                                    </div>
                                </div>
                            ` : ''}

                            <div class="info-sidebar-item">
                                <div class="info-sidebar-icon">
                                    <i class="fas fa-map-marker-alt"></i>
                                </div>
                                <div class="info-sidebar-content">
                                    <span class="info-sidebar-label">Ubicación</span>
                                    <span class="info-sidebar-value">${escaparHTML(perfil.usuarios?.ciudad || 'No especificada')}</span>
                                </div>
                            </div>

                            ${perfil.usuarios?.telefono ? `
                                <div class="info-sidebar-item">
                                    <div class="info-sidebar-icon">
                                        <i class="fas fa-phone"></i>
                                    </div>
                                    <div class="info-sidebar-content">
                                        <span class="info-sidebar-label">Teléfono</span>
                                        <span class="info-sidebar-value">${escaparHTML(perfil.usuarios.telefono)}</span>
                                    </div>
                                </div>
                            ` : ''}

                            ${perfil.usuarios?.email ? `
                                <div class="info-sidebar-item">
                                    <div class="info-sidebar-icon">
                                        <i class="fas fa-envelope"></i>
                                    </div>
                                    <div class="info-sidebar-content">
                                        <span class="info-sidebar-label">Email</span>
                                        <span class="info-sidebar-value email-value">${escaparHTML(perfil.usuarios.email)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        ${insignias.length > 0 ? `
                            <div class="info-card mt-3">
                                <h3 class="info-card-title">
                                    <i class="fas fa-award"></i> Insignias
                                </h3>
                                <div class="insignias-list">
                                    ${insignias.map(insignia => `
                                        <span class="insignia-badge">
                                            <i class="fas fa-medal"></i> ${escaparHTML(insignia.tipo || '')}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${calificacionesRecientes.length > 0 ? `
                    <div class="info-card mt-4">
                        <h3 class="info-card-title">
                            <i class="fas fa-comments"></i> Opiniones recientes (${calificacionesRecientes.length})
                        </h3>
                        <div class="calificaciones-list">
                            ${calificacionesRecientes.slice(0, 5).map(calificacion => {
                                const valor = Math.min(5, Math.max(0, Number.parseInt(calificacion.calificacion, 10) || 0));
                                const fecha = calificacion.fecha ? new Date(calificacion.fecha) : null;
                                const fechaTexto = fecha && !Number.isNaN(fecha.getTime())
                                    ? fecha.toLocaleDateString('es-CO')
                                    : '';
                                return `
                                    <div class="calificacion-item">
                                        <div class="calificacion-item-header">
                                            <div class="calificacion-estrellas">
                                                ${'<i class="fas fa-star"></i>'.repeat(valor)}${'<i class="far fa-star"></i>'.repeat(5 - valor)}
                                            </div>
                                            <span class="calificacion-fecha">${fechaTexto}</span>
                                        </div>
                                        ${calificacion.comentario ? `<p class="calificacion-comentario">"${escaparHTML(calificacion.comentario)}"</p>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="profile-footer">
                <button class="btn btn-secondary-custom" id="btnCalificar" type="button">
                    <i class="fas fa-star me-2"></i> Calificar servicio
                </button>
                <button class="btn btn-primary-custom" type="button">
                    <i class="fas fa-envelope me-2"></i> Contactar profesional
                </button>
            </div>
        </div>
    `;

    const overflowAnterior = document.body.style.overflow;
    const cerrar = () => {
        modal.remove();
        document.body.style.overflow = overflowAnterior;
        document.removeEventListener('keydown', onEsc);
    };
    const onEsc = event => {
        if (event.key === 'Escape') cerrar();
    };

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const btnCalificar = modal.querySelector('#btnCalificar');
    if (btnCalificar) {
        btnCalificar.addEventListener('click', event => {
            event.stopPropagation();
            cerrar();
            mostrarPaginaCalificacion(perfilId);
        });
    }
    modal.querySelector('.modal-close').addEventListener('click', cerrar);
    modal.addEventListener('click', event => {
        if (event.target === modal) cerrar();
    });
    document.addEventListener('keydown', onEsc);
}

// ============================================
// MODAL DE AUTENTICACIÓN UNIFICADO
// ============================================
function mostrarModalAuth(tabInicial = 'login') {
    document.querySelectorAll('.modal-overlay').forEach(modalExistente => modalExistente.remove());

    const tabActivoInicial = tabInicial === 'register' ? 'register' : 'login';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-auth" role="dialog" aria-modal="true" aria-labelledby="authTitle">
            <button class="modal-close" type="button" aria-label="Cerrar">&times;</button>
            <div class="modal-auth-header">
                <div class="modal-auth-logo"><i class="fas fa-bolt" aria-hidden="true"></i></div>
                <h2 class="modal-auth-title" id="authTitle">${tabActivoInicial === 'login' ? 'Bienvenido a Servitech' : 'Únete a Servitech'}</h2>
                <p class="modal-auth-subtitle" id="authSubtitle">${tabActivoInicial === 'login'
                    ? 'Entra con tu correo para seguir donde lo dejaste.'
                    : 'Crea tu cuenta y conecta con profesionales verificados.'}</p>
            </div>

            <div class="auth-tabs" role="tablist" aria-label="Autenticación">
                <button type="button" class="auth-tab ${tabActivoInicial === 'login' ? 'active' : ''}"
                    data-tab="login" role="tab" aria-selected="${tabActivoInicial === 'login'}">Iniciar Sesión</button>
                <button type="button" class="auth-tab ${tabActivoInicial === 'register' ? 'active' : ''}"
                    data-tab="register" role="tab" aria-selected="${tabActivoInicial === 'register'}">Crear Cuenta</button>
            </div>

            <form id="authLoginForm" class="auth-form ${tabActivoInicial === 'login' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="authLoginEmail">Correo electrónico</label>
                    <div class="input-with-icon">
                        <i class="fas fa-envelope" aria-hidden="true"></i>
                        <input type="email" id="authLoginEmail" required autocomplete="email" placeholder="tu@correo.com">
                    </div>
                </div>
                <div class="form-group">
                    <label for="authLoginPassword">Contraseña</label>
                    <div class="input-with-icon">
                        <i class="fas fa-lock" aria-hidden="true"></i>
                        <input type="password" id="authLoginPassword" required autocomplete="current-password" placeholder="••••••••">
                    </div>
                </div>
                <div class="auth-extras">
                    <label><input type="checkbox" id="authRecordarme"> Recordarme</label>
                    <a href="#" id="authOlvidePassword">¿Olvidaste tu contraseña?</a>
                </div>
                <button type="submit" class="auth-submit">Entrar</button>
            </form>

            <form id="authRegisterForm" class="auth-form ${tabActivoInicial === 'register' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="authRegNombre">Nombre completo</label>
                    <div class="input-with-icon">
                        <i class="fas fa-user" aria-hidden="true"></i>
                        <input type="text" id="authRegNombre" required autocomplete="name" placeholder="Carlos Alberto Ríos">
                    </div>
                </div>
                <div class="form-group">
                    <label for="authRegEmail">Correo electrónico</label>
                    <div class="input-with-icon">
                        <i class="fas fa-envelope" aria-hidden="true"></i>
                        <input type="email" id="authRegEmail" required autocomplete="email" placeholder="tu@correo.com">
                    </div>
                </div>
                <div class="form-group">
                    <label for="authRegTelefono">Teléfono / WhatsApp</label>
                    <div class="input-with-icon">
                        <i class="fas fa-phone" aria-hidden="true"></i>
                        <input type="tel" id="authRegTelefono" autocomplete="tel" placeholder="+57 300 000 0000">
                    </div>
                </div>
                <div class="form-group">
                    <label for="authRegCiudad">Ciudad</label>
                    <div class="input-with-icon">
                        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                        <input type="text" id="authRegCiudad" required autocomplete="address-level2" placeholder="Magangué">
                    </div>
                </div>
                <div class="form-group">
                    <label for="authRegPassword">Contraseña</label>
                    <div class="input-with-icon">
                        <i class="fas fa-lock" aria-hidden="true"></i>
                        <input type="password" id="authRegPassword" required minlength="6" autocomplete="new-password"
                            placeholder="Mínimo 6 caracteres">
                    </div>
                </div>
                <div class="form-group">
                    <label>Tipo de cuenta</label>
                    <div class="rol-selector">
                        <div class="rol-option">
                            <input type="radio" name="authRol" id="authRolContratante" value="contratante" checked>
                            <label for="authRolContratante"><i class="fas fa-search" aria-hidden="true"></i>Contratante</label>
                        </div>
                        <div class="rol-option">
                            <input type="radio" name="authRol" id="authRolProfesional" value="profesional">
                            <label for="authRolProfesional"><i class="fas fa-tools" aria-hidden="true"></i>Profesional</label>
                        </div>
                    </div>
                </div>
                <button type="submit" class="auth-submit">Crear mi cuenta</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const formLogin = modal.querySelector('#authLoginForm');
    const formRegister = modal.querySelector('#authRegisterForm');
    const titulo = modal.querySelector('#authTitle');
    const subtitulo = modal.querySelector('#authSubtitle');
    const tabs = [...modal.querySelectorAll('.auth-tab')];
    const onEsc = event => {
        if (event.key === 'Escape') cerrar();
    };
    const cerrar = () => {
        document.removeEventListener('keydown', onEsc);
        modal.remove();
    };

    modal.querySelector('.modal-close').addEventListener('click', cerrar);
    modal.addEventListener('click', event => {
        if (event.target === modal) cerrar();
    });
    document.addEventListener('keydown', onEsc);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mostrarLogin = tab.dataset.tab === 'login';
            tabs.forEach(item => {
                const activo = item === tab;
                item.classList.toggle('active', activo);
                item.setAttribute('aria-selected', String(activo));
            });
            formLogin.classList.toggle('hidden', !mostrarLogin);
            formRegister.classList.toggle('hidden', mostrarLogin);
            titulo.textContent = mostrarLogin ? 'Bienvenido a Servitech' : 'Únete a Servitech';
            subtitulo.textContent = mostrarLogin
                ? 'Entra con tu correo para seguir donde lo dejaste.'
                : 'Crea tu cuenta y conecta con profesionales verificados.';
            modal.querySelectorAll('.input-error').forEach(limpiarErrorCampo);
        });
    });

    modal.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => limpiarErrorCampo(input));
        input.addEventListener('change', () => limpiarErrorCampo(input));
    });

    formLogin.addEventListener('submit', async event => {
        event.preventDefault();
        const submitBtn = formLogin.querySelector('.auth-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';
        try {
            const email = modal.querySelector('#authLoginEmail').value.trim();
            const password = modal.querySelector('#authLoginPassword').value;
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                const campo = error.message === 'Email not confirmed'
                    ? modal.querySelector('#authLoginEmail')
                    : modal.querySelector('#authLoginPassword');
                marcarErrorCampo(campo, traducirErrorAuth(error.message));
                mostrarToast('No se pudo iniciar sesión.', 'error');
                return;
            }

            cerrar();
            mostrarToast('¡Bienvenido! Sesión iniciada.', 'success');
            if (data.user?.email) await actualizarHeaderParaUsuarioLogueado(data.user.email);
        } catch (error) {
            console.error('Error inesperado al iniciar sesión:', error);
            mostrarToast('Ocurrió un error al iniciar sesión. Intenta de nuevo.', 'error');
        } finally {
            if (submitBtn.isConnected) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        }
    });

    formRegister.addEventListener('submit', async event => {
        event.preventDefault();
        const submitBtn = formRegister.querySelector('.auth-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta...';
        try {
            const nombre = modal.querySelector('#authRegNombre').value.trim();
            const email = modal.querySelector('#authRegEmail').value.trim();
            const telefono = modal.querySelector('#authRegTelefono').value.trim();
            const ciudad = modal.querySelector('#authRegCiudad').value.trim();
            const password = modal.querySelector('#authRegPassword').value;
            const rol = modal.querySelector('input[name="authRol"]:checked')?.value;
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

            if (authError) {
                const campo = authError.message.startsWith('Password')
                    ? modal.querySelector('#authRegPassword')
                    : modal.querySelector('#authRegEmail');
                marcarErrorCampo(campo, traducirErrorAuth(authError.message));
                mostrarToast('No se pudo crear la cuenta.', 'error');
                return;
            }

            const { error: dbError } = await supabaseClient.from('usuarios').insert([{
                nombre,
                email,
                rol,
                telefono: telefono || null,
                ciudad
            }]);
            if (dbError) {
                console.error('Error al guardar usuario:', dbError);
                mostrarToast('La cuenta se creó, pero no se pudieron guardar tus datos.', 'error');
                cerrar();
                if (authData.session?.user.email) {
                    await actualizarHeaderParaUsuarioLogueado(authData.session.user.email);
                }
                return;
            }

            cerrar();
            if (authData.session?.user.email) {
                mostrarToast('¡Registro exitoso! Bienvenido a Servitech.', 'success');
                await actualizarHeaderParaUsuarioLogueado(authData.session.user.email);
            } else {
                mostrarToast('Cuenta creada. Revisa tu correo para confirmar.', 'success');
            }
        } catch (error) {
            console.error('Error inesperado al crear la cuenta:', error);
            mostrarToast('Ocurrió un error al crear la cuenta. Intenta de nuevo.', 'error');
        } finally {
            if (submitBtn.isConnected) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Crear mi cuenta';
            }
        }
    });

    modal.querySelector('#authOlvidePassword').addEventListener('click', async event => {
        event.preventDefault();
        const email = modal.querySelector('#authLoginEmail').value.trim();
        if (!email) {
            mostrarToast('Ingresa tu correo primero para recuperar la contraseña.', 'info');
            modal.querySelector('#authLoginEmail').focus();
            return;
        }

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
            if (error) throw error;
            mostrarToast('Revisa tu correo para restablecer la contraseña.', 'success');
        } catch (error) {
            console.error('Error al solicitar restablecimiento de contraseña:', error);
            mostrarToast('No se pudo enviar el correo de recuperación.', 'error');
        }
    });

    const campoInicial = tabActivoInicial === 'login'
        ? modal.querySelector('#authLoginEmail')
        : modal.querySelector('#authRegNombre');
    campoInicial.focus();
}

// ============================================
// HEADER Y SESIÓN DEL USUARIO
// ============================================
function aplicarTema() {
    document.documentElement.dataset.theme = 'dark';
}

async function actualizarHeaderParaUsuarioLogueado(email) {
    const navActions = document.querySelector('.nav-actions');

    if (!navActions) {
        console.error('No se encontró el contenedor de acciones de navegación.');
        return;
    }

    let nombreUsuario = email.split('@')[0];
    try {
        const { data: usuarioData, error } = await supabaseClient
            .from('usuarios')
            .select('nombre')
            .eq('email', email)
            .single();

        if (error) {
            throw error;
        }

        if (usuarioData && usuarioData.nombre) {
            nombreUsuario = usuarioData.nombre;
        }
    } catch (err) {
        console.log('No se pudo obtener el nombre, usando email', err);
    }

    const iniciales = nombreUsuario.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const paletaAvatarUsuario = obtenerPaletaAvatar(email);

    navActions.innerHTML = `
        <div class="user-menu-container">
            <button class="user-menu-trigger" id="userMenuTrigger" type="button" aria-label="Abrir menú de usuario" aria-controls="userDropdown" aria-expanded="false">
                <div class="user-avatar-small" data-avatar-palette="${paletaAvatarUsuario}"></div>
            </button>
            
            <div class="user-dropdown" id="userDropdown">
                <div class="user-dropdown-header">
                    <div class="user-avatar-large" data-avatar-palette="${paletaAvatarUsuario}"></div>
                    <div class="user-info">
                        <div class="user-display-name"></div>
                        <div class="user-email"></div>
                    </div>
                </div>
                
                <div class="user-dropdown-divider"></div>
                
                <ul class="user-dropdown-menu">
                    <li>
                        <a href="#" class="dropdown-item" id="menuMiPanel">
                            <i class="fas fa-th-large"></i>
                            <span>Mi Panel</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" class="dropdown-item" id="menuPublicarServicio">
                            <i class="fas fa-plus-circle"></i>
                            <span>Publicar servicio</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" class="dropdown-item" id="menuConfiguracion">
                            <i class="fas fa-cog"></i>
                            <span>Configuración</span>
                        </a>
                    </li>
                </ul>
                
                <div class="user-dropdown-divider"></div>
                
                <div class="user-dropdown-footer">
                    <button class="btn-logout" id="btnCerrarSesion">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    aplicarTema();

    navActions.querySelectorAll('.user-avatar-small, .user-avatar-large').forEach(avatar => {
        avatar.textContent = iniciales;
    });
    navActions.querySelector('.user-display-name').textContent = nombreUsuario;
    navActions.querySelector('.user-email').textContent = email;

    const trigger = navActions.querySelector('#userMenuTrigger');
    const dropdown = navActions.querySelector('#userDropdown');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('show');
        trigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu-container')) {
            dropdown.classList.remove('show');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });

    navActions.querySelector('#btnCerrarSesion').addEventListener('click', cerrarSesion);
}

async function cerrarSesion() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error('Error al cerrar sesión:', error);
        mostrarToast('No se pudo cerrar la sesión. Intenta de nuevo.', 'error');
        return;
    }

    location.reload();
}

// ============================================
// EVENT LISTENERS PARA BOTONES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log(' Página cargada, iniciando...');

    let vistaInicial = null;
    try {
        vistaInicial = JSON.parse(sessionStorage.getItem(VISTA_ACTIVA_STORAGE_KEY) || 'null');
    } catch (error) {
        console.error('No se pudo recuperar la vista guardada:', error);
        sessionStorage.removeItem(VISTA_ACTIVA_STORAGE_KEY);
        sessionStorage.removeItem(BORRADOR_CALIFICACION_STORAGE_KEY);
    }

    if (vistaInicial?.tipo === 'panel') {
        cambiarVisibilidadPanel(true);
        mostrarSeccionPanelSinCarga(vistaInicial.seccion);
        guardarVistaActiva(vistaInicial);
    } else if (vistaInicial?.tipo === 'calificacion' && typeof vistaInicial.perfilId === 'string') {
        const vistas = ['inicio', 'resultadosBusqueda', 'categorias', 'profesionales', 'estadisticas', 'como-funciona']
            .map(id => document.getElementById(id))
            .filter(Boolean);
        estadoVistasCalificacionInicial = vistas.map(vista => ({ vista, hidden: vista.hidden }));
        const footer = document.querySelector('.footer');
        displayFooterCalificacionInicial = footer?.style.display || '';
        vistas.forEach(vista => { vista.hidden = true; });
        if (footer) footer.style.display = 'none';
        document.getElementById('calificacionPage').hidden = false;
        guardarVistaActiva(vistaInicial);
    }

    aplicarTema();

    document.querySelectorAll('.panel-nav-btn').forEach(boton => {
        boton.addEventListener('click', () => {
            mostrarSeccionPanel(boton.dataset.seccion);
        });
    });

    document.getElementById('btnVolverPanel')?.addEventListener('click', () => {
        if (cambiarVisibilidadPanel(false)) {
            restaurarVistaInicio();
            document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        const menuItem = event.target.closest('#menuMiPanel, #menuPublicarServicio, #menuConfiguracion');
        if (!menuItem) return;

        event.preventDefault();
        if (menuItem.id === 'menuPublicarServicio') {
            abrirPanelUsuario('publicar');
        } else if (menuItem.id === 'menuConfiguracion') {
            abrirPanelUsuario('configuracion');
        } else {
            abrirPanelUsuario();
        }
    });

    // ============================================
    // NAVEGACIÓN SUAVE Y SECCIÓN ACTIVA
    // ============================================
    const navLinks = document.querySelectorAll('.nav-menu a');

    navLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);

            if (target) {
                const panelVisible = !document.getElementById('panelUsuario')?.hidden;
                const calificacionVisible = !document.getElementById('calificacionPage')?.hidden;
                if (panelVisible || calificacionVisible) {
                    restaurarVistaInicio();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return;
                }

                // Actualizar clase activa inmediatamente al hacer clic
                navLinks.forEach(link => link.classList.remove('active'));
                this.classList.add('active');

                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Detectar sección activa al hacer scroll
    const sections = document.querySelectorAll('section[id]');
    const header = document.querySelector('.header');
    let frameActualizacionHeader = null;

    const actualizarFondoHeader = () => {
        frameActualizacionHeader = null;
        if (!header) return;

        const alturaHeader = header.getBoundingClientRect().height;
        const seccionesVisibles = [...document.querySelectorAll('body > section:not([hidden]), body > footer')]
            .filter(section => {
                const estilos = getComputedStyle(section);
                return estilos.display !== 'none' && estilos.visibility !== 'hidden';
            });
        const puntoSeguimiento = alturaHeader / 2;
        const seccionActual = seccionesVisibles.find(section => {
            const rect = section.getBoundingClientRect();
            return rect.top <= puntoSeguimiento && rect.bottom > puntoSeguimiento;
        }) || seccionesVisibles.find(section => section.getBoundingClientRect().top > puntoSeguimiento);

        if (!seccionActual) return;

        const rectSeccion = seccionActual.getBoundingClientRect();
        const estilosSeccion = getComputedStyle(seccionActual);
        const desplazamiento = Math.max(0, Math.min(rectSeccion.height, -rectSeccion.top));
        const alturaFondo = Math.max(1, seccionActual.offsetHeight);
        const fondoTransparente = estilosSeccion.backgroundColor === 'rgba(0, 0, 0, 0)';
        const fondoColor = fondoTransparente
            ? getComputedStyle(document.body).backgroundColor
            : estilosSeccion.backgroundColor;
        const modoOscuro = document.documentElement.dataset.theme === 'dark';
        const canalesTexto = estilosSeccion.color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [31, 41, 55];
        const luminanciaTexto = canalesTexto[0] * 0.2126 + canalesTexto[1] * 0.7152 + canalesTexto[2] * 0.0722;
        const contrasteOscuro = !modoOscuro && (
            seccionActual.matches('.categories')
                ? desplazamiento / alturaFondo >= 0.65
                : seccionActual.matches('.hero, .stats, .calificacion-page, .footer')
                    ? false
                    : luminanciaTexto < 127
        );

        header.style.setProperty('--header-bg-image', estilosSeccion.backgroundImage);
        header.style.setProperty('--header-bg-color', fondoColor);
        header.style.setProperty('--header-bg-size', `100% ${alturaFondo}px`);
        header.style.setProperty('--header-bg-offset', `${-desplazamiento}px`);
        header.dataset.contrast = contrasteOscuro ? 'dark' : 'light';
    };

    const programarActualizacionHeader = () => {
        if (frameActualizacionHeader === null) {
            frameActualizacionHeader = requestAnimationFrame(actualizarFondoHeader);
        }
    };

    actualizarFondoHeader();
    window.addEventListener('scroll', programarActualizacionHeader, { passive: true });
    window.addEventListener('resize', programarActualizacionHeader);
    window.addEventListener('load', programarActualizacionHeader, { once: true });
    const observerVisibilidadSecciones = new MutationObserver(programarActualizacionHeader);
    document.querySelectorAll('body > section, body > footer').forEach(section => {
        observerVisibilidadSecciones.observe(section, {
            attributes: true,
            attributeFilter: ['hidden', 'style']
        });
    });
    if ('ResizeObserver' in window) {
        const observerTamanosSecciones = new ResizeObserver(programarActualizacionHeader);
        document.querySelectorAll('body > section, body > footer').forEach(section => {
            observerTamanosSecciones.observe(section);
        });
    }
    const observerTema = new MutationObserver(programarActualizacionHeader);
    observerTema.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => sectionObserver.observe(section));
    
    // Cargar datos
    cargarCategorias();
    cargarProfesionales(3);

    document.getElementById('btnVerDirectorio')?.addEventListener('click', event => {
        const button = event.currentTarget;
        const grid = document.getElementById('categoriesGrid');
        if (!grid) {
            console.error('No se encontró el contenedor de categorías.');
            mostrarToast('No se pudo actualizar el directorio de categorías.', 'error');
            return;
        }

        const mostrarTodas = button.getAttribute('aria-expanded') !== 'true';
        const tarjetas = [...grid.querySelectorAll('.category-card')];
        tarjetas.forEach((tarjeta, index) => {
            tarjeta.hidden = !mostrarTodas && index >= 6;
        });
        button.setAttribute('aria-expanded', String(mostrarTodas));
        button.querySelector('span').textContent = mostrarTodas
            ? 'Ver menos categorías'
            : 'Ver todas las categorías';
        button.querySelector('i').className = `fas ${mostrarTodas ? 'fa-arrow-up' : 'fa-arrow-right'}`;

        if (!mostrarTodas) {
            document.getElementById('categorias')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });

    // Botones del header
    document.querySelector('.nav-actions > .btn-secondary')
        ?.addEventListener('click', () => mostrarModalAuth('login'));
    document.querySelector('.nav-actions > .btn-primary')
        ?.addEventListener('click', () => mostrarModalAuth('register'));

    supabaseClient.auth.getSession().then(async ({ data, error }) => {
        if (error) {
            console.error('Error al comprobar la sesión:', error);
            return;
        }

        if (data.session?.user.email) {
            await actualizarHeaderParaUsuarioLogueado(data.session.user.email);
            let vistaGuardada;
            try {
                vistaGuardada = JSON.parse(sessionStorage.getItem(VISTA_ACTIVA_STORAGE_KEY) || 'null');
            } catch (storageError) {
                console.error('No se pudo recuperar la vista abierta anteriormente:', storageError);
                sessionStorage.removeItem(VISTA_ACTIVA_STORAGE_KEY);
                sessionStorage.removeItem(BORRADOR_CALIFICACION_STORAGE_KEY);
                return;
            }

            if (vistaGuardada?.tipo === 'panel') {
                await abrirPanelUsuario(vistaGuardada.seccion, { desplazar: false });
            } else if (vistaGuardada?.tipo === 'calificacion' && typeof vistaGuardada.perfilId === 'string') {
                await mostrarPaginaCalificacion(vistaGuardada.perfilId);
            } else if (vistaGuardada) {
                sessionStorage.removeItem(VISTA_ACTIVA_STORAGE_KEY);
            }
        } else {
            sessionStorage.removeItem(VISTA_ACTIVA_STORAGE_KEY);
            sessionStorage.removeItem(BORRADOR_CALIFICACION_STORAGE_KEY);
        }
    });

    // Acción para profesionales
    document.querySelector('.btn-action-secondary')?.addEventListener('click', () => {
        mostrarModalRegistroProfesional();
    });

    // Buscador
    document.getElementById('searchBtn')?.addEventListener('click', realizarBusqueda);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') realizarBusqueda();
    });
    document.querySelectorAll('.search-chips [data-term]').forEach(chip => {
        chip.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (!searchInput) return;

            searchInput.value = chip.dataset.term;
            realizarBusqueda();
        });
    });

    // Ver todos los profesionales
    document.getElementById('btnVerProfesionales')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        const mostrandoTodos = button.getAttribute('aria-expanded') === 'true';
        button.disabled = true;

        try {
            const cargaExitosa = await cargarProfesionales(mostrandoTodos ? 3 : 10);
            if (!cargaExitosa) {
                mostrarToast('No se pudo actualizar la lista de profesionales. Intenta de nuevo.', 'error');
            } else if (mostrandoTodos) {
                document.getElementById('profesionales')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        } catch (error) {
            console.error('Error al cambiar la cantidad de profesionales mostrados:', error);
            mostrarToast('No se pudo actualizar la lista de profesionales. Intenta de nuevo.', 'error');
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('volverExplorar')?.addEventListener('click', () => {
        if (history.state?.servitechSearchResults) {
            history.back();
        } else {
            mostrarVistaResultados(false);
        }
    });

    window.addEventListener('popstate', event => {
        const resultadosSection = document.getElementById('resultadosBusqueda');
        const hayResultadosVisibles = resultadosSection && !resultadosSection.hidden;
        if (event.state?.servitechSearchResults || hayResultadosVisibles) {
            mostrarVistaResultados(Boolean(event.state?.servitechSearchResults));
        }
    });

    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (menuToggle && navMenu) {
        const cerrarMenu = () => {
            navMenu.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');
            const icon = menuToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        };

        menuToggle.addEventListener('click', () => {
            const abierto = navMenu.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', String(abierto));
            menuToggle.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
            const icon = menuToggle.querySelector('i');
            if (icon) icon.className = abierto ? 'fas fa-xmark' : 'fas fa-bars';
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', cerrarMenu);
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && navMenu.classList.contains('open')) {
                cerrarMenu();
                menuToggle.focus();
            }
        });

        window.matchMedia('(min-width: 769px)').addEventListener('change', e => {
            if (e.matches) cerrarMenu();
        });
    }

    // Efecto sutil de seguimiento del cursor en las formas del hero
    const hero = document.querySelector('.hero');
    const lavaBlobs = hero?.querySelectorAll('.circle');
    const cursorMotion = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (hero && lavaBlobs?.length && cursorMotion.matches && !reducedMotion.matches) {
        let pointerFrame = null;

        hero.addEventListener('pointermove', event => {
            if (pointerFrame !== null) return;

            pointerFrame = requestAnimationFrame(() => {
                const bounds = hero.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                const y = (event.clientY - bounds.top) / bounds.height - 0.5;

                const intensidades = [-36, 24, -18];
                lavaBlobs.forEach((blob, index) => {
                    const intensidad = intensidades[index % intensidades.length];
                    blob.style.setProperty('--cursor-x', `${x * intensidad}px`);
                    blob.style.setProperty('--cursor-y', `${y * intensidad}px`);
                });
                pointerFrame = null;
            });
        });

        hero.addEventListener('pointerleave', () => {
            if (pointerFrame !== null) {
                cancelAnimationFrame(pointerFrame);
                pointerFrame = null;
            }
            lavaBlobs.forEach(blob => {
                blob.style.setProperty('--cursor-x', '0px');
                blob.style.setProperty('--cursor-y', '0px');
            });
        });
    }

    // Animar las estadísticas cuando entran en pantalla
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length > 0) {
        const formatoNumero = new Intl.NumberFormat('es-CO');
        const mostrarValorFinal = elemento => {
            const target = Number(elemento.dataset.target);
            if (!Number.isFinite(target)) {
                console.error('Valor objetivo no válido para una estadística:', elemento);
                return;
            }

            const suffix = elemento.dataset.suffix || '';
            const esDecimal = elemento.dataset.decimal === 'true';
            elemento.textContent = `${esDecimal ? target.toFixed(1) : formatoNumero.format(target)}${suffix}`;
        };

        const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (movimientoReducido || !('IntersectionObserver' in window)) {
            statNumbers.forEach(mostrarValorFinal);
        } else {
            const animarNumero = elemento => {
                const target = Number(elemento.dataset.target);
                if (!Number.isFinite(target)) {
                    console.error('Valor objetivo no válido para una estadística:', elemento);
                    return;
                }

                const suffix = elemento.dataset.suffix || '';
                const esDecimal = elemento.dataset.decimal === 'true';
                const inicio = performance.now();
                const duracion = 2000;

                const actualizar = tiempoActual => {
                    const progreso = Math.min((tiempoActual - inicio) / duracion, 1);
                    const easing = 1 - Math.pow(1 - progreso, 3);
                    const valorActual = target * easing;
                    const texto = esDecimal
                        ? valorActual.toFixed(1)
                        : formatoNumero.format(Math.floor(valorActual));
                    elemento.textContent = `${texto}${suffix}`;

                    if (progreso < 1) {
                        requestAnimationFrame(actualizar);
                    } else {
                        mostrarValorFinal(elemento);
                    }
                };

                requestAnimationFrame(actualizar);
            };

            const observer = new IntersectionObserver(entradas => {
                entradas.forEach(entrada => {
                    if (entrada.isIntersecting) {
                        animarNumero(entrada.target);
                        observer.unobserve(entrada.target);
                    }
                });
            }, { threshold: 0.3 });

            statNumbers.forEach(numero => observer.observe(numero));
        }
    }
});

// ============================================
// REGISTRO / PUBLICACIÓN COMO PROFESIONAL
// ============================================
async function mostrarModalRegistroProfesional() {
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
        console.error('Error al comprobar la sesión:', authError);
        mostrarToast('No se pudo comprobar tu sesión. Intenta de nuevo.', 'error');
        return;
    }
    const user = authData.user;

    const { data: categorias, error: categoriasError } = await supabaseClient
        .from('categorias')
        .select('id, nombre')
        .order('nombre');

    if (categoriasError) {
        console.error('Error al cargar categorías:', categoriasError);
        mostrarToast('No se pudieron cargar las categorías. Intenta de nuevo.', 'error');
        return;
    }
    if (!categorias?.length) {
        mostrarToast('No hay categorías disponibles para publicar un servicio.', 'error');
        return;
    }

    const escaparHTML = valor => String(valor).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
    const ciudades = ['Magangué', 'Cartagena', 'Barranquilla', 'Bogotá', 'Medellín', 'Otra'];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-wide" role="dialog" aria-modal="true" aria-labelledby="tituloProfesional">
            <button class="modal-close" type="button" aria-label="Cerrar">&times;</button>
            <h2 id="tituloProfesional">Únete como profesional</h2>
            <p style="color:var(--color-text-light);margin-bottom:1.5rem;">
                Completa tu perfil para empezar a recibir contratantes.
            </p>

            <form id="profesionalForm">
                <div class="form-section">
                    <h3 class="form-section-title">Datos personales</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profNombre">Nombre completo o del negocio *</label>
                            <input type="text" id="profNombre" required placeholder="Ej: Carlos Alberto Ríos">
                        </div>
                        <div class="form-group">
                            <label for="profProfesion">Profesión o servicio principal *</label>
                            <input type="text" id="profProfesion" required placeholder="Ej: Electricista certificado">
                        </div>
                        <div class="form-group">
                            <label for="profTelefono">Teléfono / WhatsApp</label>
                            <input type="tel" id="profTelefono" placeholder="+57 300 000 0000">
                        </div>
                        <div class="form-group">
                            <label for="profEmail">Correo electrónico *</label>
                            <input type="email" id="profEmail" required placeholder="correo@ejemplo.com"
                                ${user ? `value="${escaparHTML(user.email)}" readonly` : ''}>
                        </div>
                        ${!user ? `
                        <div class="form-group">
                            <label for="profPassword">Contraseña (para crear tu cuenta) *</label>
                            <input type="password" id="profPassword" required minlength="6" placeholder="Mínimo 6 caracteres">
                        </div>` : ''}
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">Especialidad y ubicación</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profCategoria">Categoría del servicio *</label>
                            <select id="profCategoria" required>
                                <option value="">Selecciona una categoría</option>
                                ${(categorias || []).map(c => `<option value="${escaparHTML(c.id)}">${escaparHTML(c.nombre)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="profCiudad">Ciudad principal *</label>
                            <select id="profCiudad" required>
                                <option value="">Selecciona una ciudad</option>
                                ${ciudades.map(c => `<option value="${escaparHTML(c)}">${escaparHTML(c)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="profZona">Zona o barrio de atención *</label>
                            <input type="text" id="profZona" required placeholder="Ej: Centro, Getsemaní, Bocagrande">
                            <p class="form-hint">¿Dónde prestas el servicio?</p>
                        </div>
                        <div class="form-group">
                            <label for="profExperiencia">Años de experiencia</label>
                            <input type="number" id="profExperiencia" min="0" max="60" placeholder="Ej: 8">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">Tarifas y disponibilidad</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profTarifa">Tarifa base (COP) *</label>
                            <input type="number" id="profTarifa" required min="0" placeholder="Ej: 60000">
                        </div>
                        <div class="form-group">
                            <label for="profUnidad">La tarifa es por</label>
                            <select id="profUnidad">
                                <option value="visita">Visita</option>
                                <option value="hora">Hora</option>
                                <option value="proyecto">Proyecto</option>
                                <option value="dia">Día</option>
                            </select>
                        </div>
                        <div class="form-group" style="grid-column:1/-1;">
                            <label for="profDisponibilidad">Disponibilidad</label>
                            <input type="text" id="profDisponibilidad" placeholder="Ej: Lunes a sábado">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">Presentación</h3>
                    <div class="form-group">
                        <label for="profDescripcion">Describe tu servicio y tu experiencia *</label>
                        <textarea id="profDescripcion" required maxlength="1000"
                            placeholder="Ej: Instalaciones eléctricas residenciales y comerciales, con garantía escrita de 30 días..."></textarea>
                    </div>
                    <div class="form-group" style="margin-top:1rem;">
                        <label for="profHabilidades">Habilidades o especialidades</label>
                        <input type="text" id="profHabilidades" placeholder="Tableros, Redes 110 V, Mantenimiento">
                        <p class="form-hint">Sepáralas con comas. Ayudan a que te encuentren en las búsquedas.</p>
                    </div>
                    <div class="rating-row">
                        <label>Calidad de tu portafolio (autoevaluación)</label>
                        <div class="rating-input" id="ratingInput">
                            <input type="hidden" id="profRating" value="0">
                            ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rating-star" data-value="${n}" aria-label="${n} estrellas"><i class="fas fa-star"></i></button>`).join('')}
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn-primary btn-large">Crear mi perfil profesional</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const cerrar = () => {
        modal.remove();
        document.body.style.overflow = overflowOriginal;
        document.removeEventListener('keydown', onEsc);
    };
    const onEsc = e => {
        if (e.key === 'Escape') cerrar();
    };

    modal.querySelector('.modal-close').addEventListener('click', cerrar);
    modal.addEventListener('click', e => {
        if (e.target === modal) cerrar();
    });
    document.addEventListener('keydown', onEsc);

    const stars = modal.querySelectorAll('.rating-star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const valor = Number.parseInt(star.dataset.value, 10);
            modal.querySelector('#profRating').value = valor;
            stars.forEach(item => item.classList.toggle('filled', Number.parseInt(item.dataset.value, 10) <= valor));
        });
    });

    modal.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', () => limpiarErrorCampo(input));
        input.addEventListener('change', () => limpiarErrorCampo(input));
    });

    modal.querySelector('#profesionalForm').addEventListener('submit', async e => {
        e.preventDefault();
        const submitButton = modal.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const nombre = modal.querySelector('#profNombre').value.trim();
            const profesion = modal.querySelector('#profProfesion').value.trim();
            const email = modal.querySelector('#profEmail').value.trim();
            const telefono = modal.querySelector('#profTelefono').value.trim();
            const ciudad = modal.querySelector('#profCiudad').value;
            const zona = modal.querySelector('#profZona').value.trim();
            if (!zona) {
                marcarErrorCampo(modal.querySelector('#profZona'), 'La zona es obligatoria');
                mostrarToast('Por favor completa todos los campos requeridos.', 'error');
                return;
            }
            const categoriaId = Number.parseInt(modal.querySelector('#profCategoria').value, 10);
            const experiencia = Number.parseInt(modal.querySelector('#profExperiencia').value, 10) || 0;
            const tarifa = Number.parseFloat(modal.querySelector('#profTarifa').value);
            const unidad = modal.querySelector('#profUnidad').value;
            const disponibilidad = modal.querySelector('#profDisponibilidad').value.trim();
            const descripcion = modal.querySelector('#profDescripcion').value.trim();
            const habilidades = modal.querySelector('#profHabilidades').value.trim();
            const rating = Number.parseInt(modal.querySelector('#profRating').value, 10) || 0;

            let authUser = user;
            if (!authUser) {
                const password = modal.querySelector('#profPassword').value;
                const { data, error } = await supabaseClient.auth.signUp({ email, password });
                if (error) {
                    marcarErrorCampo(modal.querySelector('#profEmail'), traducirErrorAuth(error.message));
                    mostrarToast('No se pudo crear la cuenta.', 'error');
                    return;
                }
                authUser = data.user;
                if (!authUser) {
                    mostrarToast('La cuenta no pudo confirmarse. Revisa tu correo e inicia sesión antes de crear el perfil.', 'error');
                    return;
                }
            }

            const { data: usuario, error: usuarioQueryError } = await supabaseClient
                .from('usuarios')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            if (usuarioQueryError) {
                console.error('Error al buscar el usuario:', usuarioQueryError);
                mostrarToast('No se pudieron consultar tus datos. Intenta de nuevo.', 'error');
                return;
            }

            let usuarioId = usuario?.id;
            if (!usuarioId) {
                const { data: nuevoUsuario, error } = await supabaseClient
                    .from('usuarios')
                    .insert([{
                        nombre,
                        email,
                        telefono,
                        ciudad,
                        zona_barrio: zona,
                        rol: 'profesional',
                        auth_id: authUser.id
                    }])
                    .select('id')
                    .single();
                if (error) {
                    console.error('Error al guardar los datos del usuario:', error);
                    mostrarToast('Error al guardar tus datos.', 'error');
                    return;
                }
                usuarioId = nuevoUsuario.id;
            } else {
                const { error } = await supabaseClient
                    .from('usuarios')
                    .update({ nombre, telefono, ciudad, zona_barrio: zona, rol: 'profesional' })
                    .eq('id', usuarioId);
                if (error) {
                    console.error('Error al actualizar los datos del usuario:', error);
                    mostrarToast('No se pudieron actualizar tus datos.', 'error');
                    return;
                }
            }

            const perfilDatos = {
                profesion,
                descripcion,
                experiencia_anios: experiencia,
                tarifa_base: tarifa,
                tarifa_unidad: unidad,
                disponibilidad_horario: disponibilidad,
                habilidades,
                portafolio_rating: rating
            };

            const { data: perfilExistente, error: perfilQueryError } = await supabaseClient
                .from('perfiles_profesionales')
                .select('id')
                .eq('usuario_id', usuarioId)
                .maybeSingle();
            if (perfilQueryError) {
                console.error('Error al buscar el perfil profesional:', perfilQueryError);
                mostrarToast('No se pudo consultar tu perfil profesional.', 'error');
                return;
            }

            let perfilId = perfilExistente?.id;
            if (perfilId) {
                const { error } = await supabaseClient
                    .from('perfiles_profesionales')
                    .update(perfilDatos)
                    .eq('id', perfilId);
                if (error) {
                    console.error('Error al actualizar el perfil profesional:', error);
                    mostrarToast('No se pudo actualizar tu perfil profesional.', 'error');
                    return;
                }
            } else {
                const { data: nuevoPerfil, error } = await supabaseClient
                    .from('perfiles_profesionales')
                    .insert([{ usuario_id: usuarioId, plan_id: 1, ...perfilDatos }])
                    .select('id')
                    .single();
                if (error) {
                    console.error('Error al crear el perfil profesional:', error);
                    mostrarToast('Error al crear el perfil.', 'error');
                    return;
                }
                perfilId = nuevoPerfil.id;
            }

            const { error: errorServicio } = await supabaseClient.from('servicios').insert([{
                profesional_id: perfilId,
                categoria_id: categoriaId,
                titulo: profesion,
                descripcion,
                precio: tarifa,
                disponibilidad: true,
                ciudad,
                zona_barrio: zona
            }]);
            if (errorServicio) {
                console.error('Error al publicar el servicio:', errorServicio);
                mostrarToast('Tu perfil se guardó, pero no se pudo publicar el servicio.', 'error');
                return;
            }

            mostrarToast('¡Perfil creado y servicio publicado!', 'success');
            cerrar();
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('Error inesperado al crear el perfil profesional:', error);
            mostrarToast('Ocurrió un error al guardar tu perfil. Intenta de nuevo.', 'error');
        } finally {
            if (submitButton.isConnected) submitButton.disabled = false;
        }
    });
}
