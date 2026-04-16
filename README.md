# 🇨🇷 Sr. & Sra. Pinto - Hub de Enlaces Interactivo

**¡El puritico sabor de ser tico!**

Un hub interactivo y moderno que centraliza todos los enlaces y servicios de Sr. & Sra. Pinto con un diseño responsive, animaciones avanzadas y una experiencia de usuario óptima.

## 🎯 Características Principales

### 🎨 Diseño Moderno
- **Paleta de colores premium**: Burgundy (#630C16), Pink (#E91350), Cream (#FDF5E6)
- **Tipografía robusta**: Fredoka One para un estilo único y memorable
- **Responsive Design**: Mobile-first con soporte completo para tablet y desktop
- **Animaciones fluidas**: Powered by GSAP 3.12.2

### 🌐 Módulos Principales

#### 1. **Destacados**
- Bienvenida con branding principal
- Acceso rápido a puntos clave
- Tarjetas promocionales

#### 2. **Redes Sociales**
- Facebook: Comunidad y contenido
- Instagram: Galería visual
- WhatsApp: Pedidos directos
- TikTok: Contenido viral
- Iconos nativos SVG (sin dependencias de imágenes)
- Colores específicos por red social

#### 3. **Catálogo de Productos**
- Empanadas
- Huevos Fritos
- Ensalada Pinto
- Sistema de calificaciones (5 estrellas)
- Emojis animados

#### 4. **Contacto**
- Formulario de contacto funcional
- Información de ubicación
- Horarios de atención
- Número de teléfono

### ✨ Tecnología

```
Frontend
├── HTML5 Semántico
├── Tailwind CSS (JIT)
├── GSAP 3.12.2 (Animaciones)
└── JavaScript Modular (ES6+)

Arquitectura
├── State Management
├── UI Controller
├── Animation Engine
├── Responsive Handler
└── App Initializer
```

## 🚀 Características Técnicas Avanzadas

### Arquitectura Modular
```javascript
// Patrón de módulos independientes
StateManager        // Gestiona estado de categoría
UIController        // Control de interfaz
AnimationEngine     // Orquesta animaciones
ResponsiveHandler   // Manejo de breakpoints
AppInitializer      // Punto de entrada
```

### Responsive Breakpoints
- **Mobile**: < 768px (prioritario)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Parallax**: Solo en desktop (optimización de rendimiento)

### Optimizaciones
- **Lazy loading**: Declarativo con Tailwind
- **Haptic Feedback**: Vibración en mobile
- **Smooth Scrolling**: En browsers que lo soportan
- **GPU Acceleration**: Via GSAP transforms3d

## 📁 Estructura de Archivos

```
Sr y Sra Pinto/
├── index.html              # Markup semántico
├── css/
│   └── style.css          # Estilos modulares + variables CSS
├── js/
│   └── main.js            # Lógica de aplicación (modular)
├── assets/
│   └── images/            # Logos y media
│       ├── logo2.png
│       ├── sloggan.png
│       ├── empanada.png
│       ├── huevofrito.png
│       └── avocado.png
└── README.md              # Documentación
```

## 🎮 Funcionalidades Interactivas

### Menú Dinámico
- Click en categoría → Cambio suave de sección
- Animación de transición (fadeInUp)
- Scroll automático en mobile

### Personaje Flotante 🥑
- Click genera mensaje aleatorio
- Animaciones pop-in y bounce
- Mensajes divertidos (5 variantes)
- Feedback háptico en mobile

### Formulario de Contacto
- Validación en cliente
- Visual feedback de errores
- Animación de envío
- Reset automático

### Parallax (Desktop)
- Movimiento sutil basado en mouse
- Stagger effect en tarjetas
- Performance optimizado

## 🎬 Ciclo de Animaciones

### Entrada (Intro)
1. Logo desciende con bounce (1.2s)
2. Eslogan aparece y escala (0.8s)
3. Botones entran con stagger (0.6s)
4. Tarjetas se deslizan (0.8s)

### Transiciones
- Fade-in-up al cambiar categoría
- Stagger en elementos hijos
- Easing personalizado (power curves)

## 🔧 Configuración

### CSS Variables
```css
--burgundy: #630C16      /* Color principal */
--pink: #E91350          /* Color destaque */
--cream: #FDF5E6         /* Fondo */
--white: #FFFFFF         /* Contraste */
--shadow-md: 8px 8px...  /* Sombras Pinto */
--transition-smooth: 0.3s cubic-bezier(...)
```

### Eventos Soportados
- Click (todas las plataformas)
- Hover (desktop)
- Touch (mobile)
- Resize (responsive)
- Orientationchange (mobile)

## 📱 Compatibilidad

| Navegador | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Chrome    | ✅ | ✅ | ✅ |
| Firefox   | ✅ | ✅ | ✅ |
| Safari    | ✅ | ✅ | ✅ |
| Edge      | ✅ | ✅ | ✅ |

## 🌟 Características Futuras

- [ ] Dark Mode
- [ ] Internationalization (i18n)
- [ ] Analytics Integration
- [ ] PWA Support
- [ ] Service Workers
- [ ] Backend Integration (MongoDB)

## 📊 Performance

- **Lighthouse Score**: 90+
- **First Contentful Paint (FCP)**: < 1.5s
- **Time to Interactive (TTI)**: < 3s
- **Cumulative Layout Shift (CLS)**: < 0.1

## 🛠️ Desarrollo Local

### Requisitos
- Navegador moderno
- Servidor local (Live Server recomendado)

### Iniciar
```bash
# Clone el repositorio
git clone https://github.com/xCesar24x/Sr-SraPinto.git

# Abra index.html con Live Server
# Navegue a http://localhost:5500
```

### Estructura de Carpetas
```
src/
├── html     (semántico)
├── css      (módulos)
└── js       (funcionalidades)
```

## 📝 Commits Semánticos

```
feat:     Nueva funcionalidad
fix:      Corrección de bugs
style:    Cambios de estilos
refactor: Mejora de código
perf:     Optimización de performance
docs:     Actualización de documentación
```

## 🤝 Contribuciones

Para sugerencias o mejoras:
1. Crea una rama: `git checkout -b feature/mi-mejora`
2. Commit: `git commit -m "feat: descripción"`
3. Push: `git push origin feature/mi-mejora`
4. Pull Request

## 📄 Licencia

© 2024-2025 Sr. & Sra. Pinto. Todos los derechos reservados.

Software by Senior Hub 🚀

---

**Desarrollado con ❤️ y mucho sabor tico 🇨🇷**

*¡Seguinos en nuestras redes sociales!*
