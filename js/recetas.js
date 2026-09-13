window.RECETAS = {
    // PINTOS
    'p-senor-pinto': [
        { id: 'pinto', cant: 1 }, { id: 'queso_frito', cant: 1 }, { id: 'huevos', cant: 1 }, { id: 'maduro', cant: 1 }
    ],
    'c-senor-pinto-cafe': [
        { id: 'pinto', cant: 1 }, { id: 'queso_frito', cant: 1 }, { id: 'huevos', cant: 1 }, { id: 'maduro', cant: 1 }, { id: 'cafe', cant: 1 }
    ],
    'p-burrote': [
        { id: 'pinto', cant: 1 }, { id: 'queso_frito', cant: 1 }, { id: 'huevos', cant: 1 }, { id: 'natilla', cant: 1 }, { id: 'tortilla_harina', cant: 1 }
    ],
    'c-burrote-cafe': [
        { id: 'pinto', cant: 1 }, { id: 'queso_frito', cant: 1 }, { id: 'huevos', cant: 1 }, { id: 'natilla', cant: 1 }, { id: 'tortilla_harina', cant: 1 }, { id: 'cafe', cant: 1 }
    ],
    'p-empanada-pinto': [
        { id: 'pinto', cant: 0.5 }, { id: 'masa_empanada', cant: 1 }
    ],
    'p-sra-empanada-m1': [
        { id: 'pinto', cant: 0.5 }, { id: 'masa_empanada', cant: 1 }, { id: 'carne_mechada', cant: 1 }, { id: 'ensalada', cant: 1 }
    ],
    'p-queso-pinto': [
        { id: 'pinto', cant: 1 }, { id: 'queso_frito', cant: 2 }
    ],

    // SNACKS
    'p-sr-patacon': [
        { id: 'patacones', cant: 1 }, { id: 'frijoles_molidos', cant: 1 }, { id: 'queso_rallado', cant: 1 }
    ],
    'p-sra-quesadilla': [
        { id: 'tortilla_harina', cant: 1 }, { id: 'queso_rallado', cant: 2 }, { id: 'carne_mechada', cant: 1 }
    ],
    'p-sra-hamburguesa': [
        { id: 'pan_hamburguesa', cant: 1 }, { id: 'torta_carne', cant: 1 }, { id: 'papas_fritas', cant: 1 }
    ],
    'p-empanada-carne': [
        { id: 'masa_empanada', cant: 1 }, { id: 'carne_mechada', cant: 1 }
    ],
    'p-empanada-queso': [
        { id: 'masa_empanada', cant: 1 }, { id: 'queso_mozzarella', cant: 1 }
    ],
    'p-sra-empanada-m2': [
        { id: 'masa_empanada', cant: 1 }, { id: 'ensalada', cant: 1 }
    ],
    'p-cono-salchipapa': [
        { id: 'papas_fritas', cant: 1 }, { id: 'salchicha', cant: 1 }
    ],
    'p-sr-papi-carne': [
        { id: 'porcion_carne', cant: 1 }
    ],

    // BEBIDAS
    'b-cafe-premium': [
        { id: 'cafe', cant: 1 }
    ],
    'b-agua': [
        { id: 'botella_agua', cant: 1 }
    ],
    'b-gaseosas': [
        { id: 'gaseosa', cant: 1 }
    ],
    'b-hidratante': [
        { id: 'hidratante', cant: 1 }
    ]
};

// Función universal para obtener la receta de cualquier producto vendido o catalogado
window.getDishRecipe = function(dishOrId, optDishName) {
    if (!dishOrId) return [];

    var dishId = typeof dishOrId === 'object' ? dishOrId.id : dishOrId;
    var dishName = (typeof dishOrId === 'object' ? (dishOrId.nombre || optDishName) : optDishName) || '';

    // 1. Si el objeto ya trae recetaItems explícita
    if (typeof dishOrId === 'object' && Array.isArray(dishOrId.recetaItems) && dishOrId.recetaItems.length > 0) {
        return dishOrId.recetaItems;
    }

    // 2. Buscar en catálogo en memoria (MenuController o VolioManager)
    if (window.MenuController && Array.isArray(window.MenuController.volioDishes)) {
        var foundVolio = window.MenuController.volioDishes.find(function(d) { return d.id === dishId; });
        if (foundVolio && Array.isArray(foundVolio.recetaItems) && foundVolio.recetaItems.length > 0) {
            return foundVolio.recetaItems;
        }
    }
    if (window.VolioManager && Array.isArray(window.VolioManager.dishes)) {
        var foundVolioMgr = window.VolioManager.dishes.find(function(d) { return d.id === dishId; });
        if (foundVolioMgr && Array.isArray(foundVolioMgr.recetaItems) && foundVolioMgr.recetaItems.length > 0) {
            return foundVolioMgr.recetaItems;
        }
    }

    // 3. Buscar en RECETAS fijas predefinidas
    if (window.RECETAS && window.RECETAS[dishId]) {
        return window.RECETAS[dishId].map(function(r) {
            return { inventarioId: r.id, cantidad: r.cant };
        });
    }

    // 4. Deducción inteligente basada en el nombre del platillo
    var nameLower = (dishName || dishId || '').toLowerCase();
    var items = [];
    if (nameLower.includes('pinto')) {
        items.push({ inventarioId: 'pinto', cantidad: 1 }, { inventarioId: 'queso_frito', cantidad: 1 }, { inventarioId: 'huevos', cantidad: 1 }, { inventarioId: 'maduro', cantidad: 1 });
    }
    if (nameLower.includes('burrote') || nameLower.includes('burrito')) {
        items.push({ inventarioId: 'tortilla_harina', cantidad: 1 }, { inventarioId: 'natilla', cantidad: 1 });
    }
    if (nameLower.includes('patacón') || nameLower.includes('patacon')) {
        items.push({ inventarioId: 'patacones', cantidad: 1 }, { inventarioId: 'frijoles_molidos', cantidad: 1 }, { inventarioId: 'queso_rallado', cantidad: 1 });
    }
    if (nameLower.includes('hamburguesa')) {
        items.push({ inventarioId: 'pan_hamburguesa', cantidad: 1 }, { inventarioId: 'torta_carne', cantidad: 1 }, { inventarioId: 'queso_mozzarella', cantidad: 1 }, { inventarioId: 'papas_fritas', cantidad: 1 });
    }
    if (nameLower.includes('empanada')) {
        items.push({ inventarioId: 'masa_empanada', cantidad: 1 }, { inventarioId: 'carne_mechada', cantidad: 1 });
    }
    if (nameLower.includes('salchipapa')) {
        items.push({ inventarioId: 'papas_fritas', cantidad: 1 }, { inventarioId: 'salchicha', cantidad: 1 });
    }
    if (nameLower.includes('café') || nameLower.includes('cafe')) {
        items.push({ inventarioId: 'cafe', cantidad: 1 }, { inventarioId: 'vaso_cafe_tapa', cantidad: 1 });
    }
    if (nameLower.includes('agua')) {
        items.push({ inventarioId: 'botella_agua', cantidad: 1 });
    }
    if (nameLower.includes('gaseosa')) {
        items.push({ inventarioId: 'gaseosa', cantidad: 1 });
    }
    if (nameLower.includes('hidratante') || nameLower.includes('powerade')) {
        items.push({ inventarioId: 'hidratante', cantidad: 1 });
    }

    if (items.length === 0) {
        items.push({ inventarioId: 'pinto', cantidad: 1 });
    }
    return items;
};
