// Credenciales de Supabase
const SUPABASE_URL = 'https://otnntogauepkikqzfepi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EQkcz8C6-ktCawFiUQa_0w_bGFO0it-';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// CARGAR CATEGORÍAS
// ============================================
async function cargarCategorias() {
    const { data, error } = await supabaseClient
        .from('categorias')
        .select('*')
        .order('id');

    if (error) {
        console.error('Error al cargar categorías:', error);
        return;
    }

    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    const iconos = {
        'Hogar': 'fa-home',
        'Construcción': 'fa-hammer',
        'Digital': 'fa-laptop-code',
        'Salud': 'fa-heart',
        'Educación': 'fa-book',
        'Negocios': 'fa-briefcase'
    };

    data.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon">
                <i class="fas ${iconos[cat.nombre] || 'fa-star'}"></i>
            </div>
            <div class="category-name">${cat.nombre}</div>
        `;
        card.addEventListener('click', () => {
            document.getElementById('searchInput').value = cat.nombre;
            realizarBusqueda();
        });
        grid.appendChild(card);
    });
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
        alert('Por favor ingresa un término de búsqueda');
        return;
    }

    const { data, error } = await supabaseClient
        .from('servicios')
        .select(`
            *,
            perfiles_profesionales(
                usuarios(nombre),
                reputacion_promedio
            ),
            categorias(nombre)
        `)
        .ilike('titulo', `%${termino}%`);

    if (error) {
        console.error('Error en la búsqueda:', error);
        alert('Error al realizar la búsqueda');
        return;
    }

    if (data.length === 0) {
        alert(`No se encontraron servicios para "${termino}"`);
    } else {
        alert(`Se encontraron ${data.length} servicios para "${termino}"`);
        console.log('Resultados:', data);
    }
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
            <button class="modal-close">&times;</button>
            <h2>Iniciar Sesión</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                    <label>Contraseña</label>
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

    modal.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert('Error al iniciar sesión: ' + error.message);
        } else {
            alert('¡Bienvenido! Sesión iniciada correctamente');
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
            <button class="modal-close">&times;</button>
            <h2>Crear Cuenta</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label>Nombre completo</label>
                    <input type="text" id="regNombre" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="regEmail" required>
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" id="regTelefono" required>
                </div>
                <div class="form-group">
                    <label>Ciudad</label>
                    <input type="text" id="regCiudad" required>
                </div>
                <div class="form-group">
                    <label>Contraseña</label>
                    <input type="password" id="regPassword" required minlength="6">
                </div>
                <div class="form-group">
                    <label>Tipo de cuenta</label>
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
            alert('Error al registrar: ' + authError.message);
            return;
        }

        // Insertar en tabla usuarios
        const { error: dbError } = await supabaseClient
            .from('usuarios')
            .insert([{
                nombre,
                email,
                password_hash: password, // En producción usar hash
                rol,
                telefono,
                ciudad
            }]);

        if (dbError) {
            alert('Error al guardar datos: ' + dbError.message);
        } else {
            alert('¡Registro exitoso! Bienvenido a Servitech');
            modal.remove();
            if (authData.session?.user.email) {
                await actualizarHeaderParaUsuarioLogueado(authData.session.user.email);
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
        alert('Error al cerrar sesión: ' + error.message);
        return;
    }

    location.reload();
}

// ============================================
// EVENT LISTENERS PARA BOTONES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log(' Página cargada, iniciando...');
    
    // Cargar datos
    cargarCategorias();
    cargarProfesionales(3);

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

    // Ver todos los profesionales
    document.querySelector('.btn-outline')?.addEventListener('click', () => {
        cargarProfesionales(10);
        alert('Mostrando más profesionales');
    });
});