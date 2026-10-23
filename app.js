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
        return;
    }

    const grid = document.getElementById('professionalsGrid');
    grid.innerHTML = '';

    data.forEach(perfil => {
        const card = document.createElement('div');
        card.className = 'professional-card';
        
        const nombre = perfil.usuarios?.nombre || 'Profesional';
        const iniciales = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        
        const estrellas = Math.round(perfil.reputacion_promedio || 0);
        const estrellasHTML = '<i class="fas fa-star"></i>'.repeat(estrellas) + 
                              '<i class="far fa-star"></i>'.repeat(5 - estrellas);
        
        card.innerHTML = `
            <div class="professional-header">
                <div class="professional-avatar">${iniciales}</div>
                <div class="professional-info">
                    <h3>${nombre}</h3>
                    <div class="professional-specialty">${perfil.descripcion?.substring(0, 50) || 'Profesional'}...</div>
                </div>
            </div>
            
            <div class="professional-stats">
                <div class="rating">
                    ${estrellasHTML}
                    <span>${(perfil.reputacion_promedio || 0).toFixed(1)}</span>
                </div>
                ${perfil.verificado ? `
                    <div class="verified-badge">
                        <i class="fas fa-check-circle"></i>
                        <span>Verificado</span>
                    </div>
                ` : ''}
            </div>
            
            <p class="professional-description">${perfil.descripcion || 'Profesional verificado en la plataforma'}</p>
            
            <button class="btn-view-profile" data-id="${perfil.id}">Ver perfil completo</button>
        `;
        
        grid.appendChild(card);
    });

    // Agregar event listeners a los botones de ver perfil
    document.querySelectorAll('.btn-view-profile').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const perfilId = e.target.dataset.id;
            mostrarPerfilProfesional(perfilId);
        });
    });
}

// ============================================
// BÚSQUEDA DE SERVICIOS
// ============================================
async function realizarBusqueda() {
    const termino = document.getElementById('searchInput').value.trim();
    
    if (!termino) {
        mostrarToast('Por favor ingresa un término de búsqueda.', 'error');
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

    const selectServicios = `
        *,
        perfiles_profesionales(
            id,
            usuarios(nombre),
            reputacion_promedio
        ),
        categorias(nombre)
    `;
    const patron = `%${termino}%`;
    const patronOr = `"%${termino.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
    let responses;
    try {
        responses = await Promise.all([
            supabaseClient
                .from('servicios')
                .select(selectServicios)
                .or(`titulo.ilike.${patronOr},descripcion.ilike.${patronOr}`),
            supabaseClient
                .from('servicios')
                .select(`
                    *,
                    perfiles_profesionales(
                        id,
                        usuarios(nombre),
                        reputacion_promedio
                    ),
                    categorias!inner(nombre)
                `)
                .ilike('categorias.nombre', patron)
        ]);
    } catch (error) {
        console.error('No se pudieron consultar los servicios:', error);
        mostrarToast('No se pudo realizar la búsqueda. Intenta de nuevo.', 'error');
        return;
    }
    const [serviciosResponse, categoriaResponse] = responses;

    const errorResponse = [serviciosResponse, categoriaResponse]
        .find(response => response.error);
    if (errorResponse) {
        console.error('Error en la búsqueda:', errorResponse.error);
        mostrarToast('No se pudo realizar la búsqueda. Intenta de nuevo.', 'error');
        return;
    }

    const servicios = new Map();
    [serviciosResponse, categoriaResponse].forEach(response => {
        response.data.forEach(servicio => servicios.set(servicio.id, servicio));
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
    resultadosTitulo.textContent = `Resultados para: "${termino}"`;
    resultadosGrid.replaceChildren();

    if (resultados.length === 0) {
        resultadosGrid.hidden = true;
        searchEmpty.hidden = false;
        mostrarToast(`No se encontraron servicios para "${termino}".`, 'info');
    } else {
        resultadosGrid.hidden = false;
        searchEmpty.hidden = true;
        mostrarToast(`Se encontraron ${resultados.length} servicios para "${termino}".`, 'success');

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
// MODAL DE PERFIL PROFESIONAL
// ============================================
async function mostrarPerfilProfesional(perfilId) {
    const { data: perfil, error } = await supabaseClient
        .from('perfiles_profesionales')
        .select(`
            *,
            usuarios(nombre, email, telefono, ciudad),
            planes_suscripcion(nombre),
            servicios(*),
            insignias(*)
        `)
        .eq('id', perfilId)
        .single();

    if (error) {
        console.error('Error al cargar perfil:', error);
        return;
    }

    const nombre = perfil.usuarios?.nombre || 'Profesional';
    const iniciales = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    const estrellas = Math.round(perfil.reputacion_promedio || 0);
    const estrellasHTML = '<i class="fas fa-star"></i>'.repeat(estrellas) + 
                          '<i class="far fa-star"></i>'.repeat(5 - estrellas);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <div class="modal-header">
                <div class="professional-avatar-large">${iniciales}</div>
                <div class="modal-title">
                    <h2>${nombre}</h2>
                    <div class="modal-stats">
                        <div class="rating">
                            ${estrellasHTML}
                            <span>${(perfil.reputacion_promedio || 0).toFixed(1)}</span>
                        </div>
                        ${perfil.verificado ? '<div class="verified-badge"><i class="fas fa-check-circle"></i> Verificado</div>' : ''}
                        <div class="plan-badge">${perfil.planes_suscripcion?.nombre || 'Básico'}</div>
                    </div>
                </div>
            </div>
            
            <div class="modal-body">
                <div class="info-section">
                    <h3><i class="fas fa-info-circle"></i> Descripción</h3>
                    <p>${perfil.descripcion || 'Sin descripción'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-briefcase"></i> Experiencia</h3>
                    <p>${perfil.experiencia_anios || 0} años de experiencia</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-dollar-sign"></i> Tarifa base</h3>
                    <p>$${(perfil.tarifa_base || 0).toLocaleString()} COP</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Ubicación</h3>
                    <p>${perfil.usuarios?.ciudad || 'No especificada'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-phone"></i> Contacto</h3>
                    <p>${perfil.usuarios?.telefono || 'No disponible'}</p>
                    <p>${perfil.usuarios?.email || 'No disponible'}</p>
                </div>
                
                ${perfil.insignias && perfil.insignias.length > 0 ? `
                    <div class="info-section">
                        <h3><i class="fas fa-award"></i> Insignias</h3>
                        <div class="insignias-list">
                            ${perfil.insignias.map(ins => `<span class="insignia-badge">${ins.tipo}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${perfil.servicios && perfil.servicios.length > 0 ? `
                    <div class="info-section">
                        <h3><i class="fas fa-tools"></i> Servicios ofrecidos</h3>
                        <div class="servicios-list">
                            ${perfil.servicios.map(serv => `
                                <div class="servicio-item">
                                    <strong>${serv.titulo}</strong>
                                    <p>${serv.descripcion || ''}</p>
                                    <span class="servicio-precio">$${(serv.precio || 0).toLocaleString()} COP</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-footer">
                <button class="btn-primary btn-large">Contactar profesional</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Cerrar modal
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ============================================
// MODAL DE LOGIN
// ============================================
function mostrarModalLogin() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-small">
        <button class="modal-close" type="button" aria-label="Cerrar">&times;</button>
            <h2>Iniciar Sesión</h2>
            <form id="loginForm">
                <div class="form-group">
                <label for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                <label for="loginPassword">Contraseña</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <button type="submit" class="btn-primary btn-large">Iniciar Sesión</button>
            </form>
            <p class="modal-footer-text">
                ¿No tienes cuenta? <a href="#" id="switchToRegister">Regístrate aquí</a>
            </p>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => limpiarErrorCampo(input));
    });

    modal.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            const translatedError = traducirErrorAuth(error.message);
            const errorInput = error.message === 'Email not confirmed'
                ? modal.querySelector('#loginEmail')
                : modal.querySelector('#loginPassword');
            marcarErrorCampo(errorInput, translatedError);
            mostrarToast('No se pudo iniciar sesión. Revisa tus datos.', 'error');
        } else {
            mostrarToast('¡Bienvenido! Sesión iniciada correctamente.', 'success');
            modal.remove();
            if (data.user?.email) {
                await actualizarHeaderParaUsuarioLogueado(data.user.email);
            }
        }
    });

    modal.querySelector('#switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        modal.remove();
        mostrarModalRegistro();
    });
}

// ============================================
// MODAL DE REGISTRO
// ============================================
function mostrarModalRegistro(rolPredefinido = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-small">
            <button class="modal-close" type="button" aria-label="Cerrar">&times;</button>
            <h2>Crear Cuenta</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label for="regNombre">Nombre completo</label>
                    <input type="text" id="regNombre" required>
                </div>
                <div class="form-group">
                    <label for="regEmail">Email</label>
                    <input type="email" id="regEmail" required>
                </div>
                <div class="form-group">
                    <label for="regTelefono">Teléfono</label>
                    <input type="tel" id="regTelefono" required>
                </div>
                <div class="form-group">
                    <label for="regCiudad">Ciudad</label>
                    <input type="text" id="regCiudad" required>
                </div>
                <div class="form-group">
                    <label for="regPassword">Contraseña</label>
                    <input type="password" id="regPassword" required minlength="6">
                </div>
                <div class="form-group">
                    <label for="regRol">Tipo de cuenta</label>
                    <select id="regRol" required>
                        <option value="contratante">Soy Contratante (busco servicios)</option>
                        <option value="profesional">Soy Profesional (ofrezco servicios)</option>
                        <option value="ambos">Ambos</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary btn-large">Registrarse</button>
            </form>
            <p class="modal-footer-text">
                ¿Ya tienes cuenta? <a href="#" id="switchToLogin">Inicia sesión aquí</a>
            </p>
        </div>
    `;

    document.body.appendChild(modal);

    // Si hay un rol predefinido, seleccionarlo
    if (rolPredefinido) {
        modal.querySelector('#regRol').value = rolPredefinido;
    }

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => limpiarErrorCampo(input));
        input.addEventListener('change', () => limpiarErrorCampo(input));
    });

    modal.querySelector('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const telefono = document.getElementById('regTelefono').value;
        const ciudad = document.getElementById('regCiudad').value;
        const password = document.getElementById('regPassword').value;
        const rol = document.getElementById('regRol').value;

        // Registrar usuario en Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (authError) {
            const translatedError = traducirErrorAuth(authError.message);
            const errorInput = authError.message.startsWith('Password')
                ? modal.querySelector('#regPassword')
                : modal.querySelector('#regEmail');
            marcarErrorCampo(errorInput, translatedError);
            mostrarToast('No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.', 'error');
            return;
        }

        // Insertar en tabla usuarios
        const { error: dbError } = await supabaseClient
            .from('usuarios')
            .insert([{
                nombre,
                email,
                rol,
                telefono,
                ciudad
            }]);

        if (dbError) {
            console.error('Error al guardar datos del usuario:', dbError);
            mostrarToast('La cuenta se creó, pero no se pudieron guardar tus datos. Contacta al soporte.', 'error');
            modal.remove();
            if (authData.session?.user.email) {
                await actualizarHeaderParaUsuarioLogueado(authData.session.user.email);
            }
        } else {
            modal.remove();
            if (authData.session?.user.email) {
                mostrarToast('¡Registro exitoso! Bienvenido a Servitech.', 'success');
                await actualizarHeaderParaUsuarioLogueado(authData.session.user.email);
            } else {
                mostrarToast('Cuenta creada. Revisa tu correo para confirmar tu dirección.', 'success');
            }
        }
    });

    modal.querySelector('#switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        modal.remove();
        mostrarModalLogin();
    });
}

// ============================================
// HEADER Y SESIÓN DEL USUARIO
// ============================================
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

    navActions.innerHTML = `
        <div class="user-menu-container">
            <button class="user-menu-trigger" id="userMenuTrigger" type="button" aria-label="Abrir menú de usuario" aria-controls="userDropdown" aria-expanded="false">
                <div class="user-avatar-small"></div>
            </button>
            
            <div class="user-dropdown" id="userDropdown">
                <div class="user-dropdown-header">
                    <div class="user-avatar-large"></div>
                    <div class="user-info">
                        <div class="user-display-name"></div>
                        <div class="user-email"></div>
                    </div>
                </div>
                
                <div class="user-dropdown-divider"></div>
                
                <ul class="user-dropdown-menu">
                    <li>
                        <a href="#" class="dropdown-item">
                            <i class="fas fa-user"></i>
                            <span>Mi perfil</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" class="dropdown-item">
                            <i class="fas fa-tools"></i>
                            <span>Mis servicios</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" class="dropdown-item">
                            <i class="fas fa-star"></i>
                            <span>Mis calificaciones</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" class="dropdown-item">
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

    document.getElementById('btnVerDirectorio')?.addEventListener('click', () => {
        document.getElementById('categorias')?.scrollIntoView({ behavior: 'smooth' });
        mostrarToast('Mostrando todas las categorías disponibles.', 'info');
    });

    // Botones del header
    document.querySelectorAll('.btn-secondary')[0]?.addEventListener('click', mostrarModalLogin);
    document.querySelectorAll('.btn-primary')[0]?.addEventListener('click', mostrarModalRegistro);

    supabaseClient.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error('Error al comprobar la sesión:', error);
            return;
        }

        if (data.session?.user.email) {
            actualizarHeaderParaUsuarioLogueado(data.session.user.email);
        }
    });

    // Botones del hero
    document.querySelector('.btn-action-primary')?.addEventListener('click', () => {
        document.getElementById('searchInput').focus();
        document.getElementById('searchInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.querySelector('.btn-action-secondary')?.addEventListener('click', () => {
        mostrarModalRegistro('profesional');
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
    document.querySelector('.view-more .btn-outline')?.addEventListener('click', () => {
        cargarProfesionales(10);
        mostrarToast('Cargando más profesionales…', 'info');
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