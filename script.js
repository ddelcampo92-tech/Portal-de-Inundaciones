// Definición de proyección UTM zona 14N (Estado de México)
proj4.defs('EPSG:32614', '+proj=utm +zone=14 +datum=WGS84 +units=m +no_defs');

// Función para detectar si las coordenadas están en UTM
function esCoordenadasUTM(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  // UTM tiene valores grandes (cientos de miles para X, millones para Y)
  return Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90;
}

// Función para convertir coordenadas UTM a WGS84
function convertirUTMaWGS84(coord) {
  if (!esCoordenadasUTM(coord)) return coord;
  try {
    // coord es [x, y] en UTM, convertir a [lng, lat] en WGS84
    const resultado = proj4('EPSG:32614', 'EPSG:4326', [coord[0], coord[1]]);
    return resultado; // [lng, lat]
  } catch (e) {
    console.warn('Error convirtiendo coordenada:', e);
    return coord;
  }
}

// Función para convertir geometría completa de UTM a WGS84
function convertirGeometriaAWGS84(geometry) {
  if (!geometry || !geometry.coordinates) return geometry;
  
  const tipo = geometry.type;
  const coords = geometry.coordinates;
  
  function convertirCoords(c) {
    if (typeof c[0] === 'number') {
      // Es un punto [x, y]
      return convertirUTMaWGS84(c);
    } else {
      // Es un array de coordenadas
      return c.map(convertirCoords);
    }
  }
  
  // Verificar si necesita conversión
  let necesitaConversion = false;
  try {
    if (tipo === 'Point') {
      necesitaConversion = esCoordenadasUTM(coords);
    } else if (tipo === 'LineString' || tipo === 'MultiPoint') {
      necesitaConversion = coords.length > 0 && esCoordenadasUTM(coords[0]);
    } else if (tipo === 'Polygon' || tipo === 'MultiLineString') {
      necesitaConversion = coords.length > 0 && coords[0].length > 0 && esCoordenadasUTM(coords[0][0]);
    } else if (tipo === 'MultiPolygon') {
      necesitaConversion = coords.length > 0 && coords[0].length > 0 && coords[0][0].length > 0 && esCoordenadasUTM(coords[0][0][0]);
    }
  } catch (e) {
    necesitaConversion = false;
  }
  
  if (!necesitaConversion) {
    return geometry;
  }
  
  console.log('🔄 Convirtiendo geometría de UTM a WGS84...');
  
  return {
    type: tipo,
    coordinates: convertirCoords(coords)
  };
}

const colores = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'];

// Mapa de colores para Obras de Protección por tipo de obra (constante global)
const colorMapObrasProteccion = {
  'BORDO DE PROTECCIÓN': '#E53935',           // Rojo
  'BORDO DE PROTECCION': '#E53935',           // Rojo (sin acento)
  'CANALIZACIÓN': '#1E88E5',                  // Azul
  'CANALIZACION': '#1E88E5',                  // Azul (sin acento)
  'MEJORAMIENTO DE CAUCES': '#43A047',        // Verde
  'PRESA DE CONTROL DE AVENIDAS': '#FB8C00',  // Naranja
  'PRESA DE CONTROL DE AZOLVES': '#8E24AA',   // Morado
  'PROTECCIÓN MARGINAL': '#00ACC1',           // Cian
  'PROTECCION MARGINAL': '#00ACC1',           // Cian (sin acento)
  'RECTIFICACIÓN': '#FDD835',                 // Amarillo
  'RECTIFICACION': '#FDD835',                 // Amarillo (sin acento)
  'SIN DATOS': '#607D8B',                     // Gris
  'NULL': '#607D8B',                          // Gris
  '': '#607D8B'                               // Gris para vacíos
};

// Mapeo de nombres técnicos a nombres de visualización (variable global)
const nombresCapas = {
  // Atlas de Inundaciones
  'atlas temporada 2020': 'Atlas Temporada 2020',
  'atlas temporada 2021': 'Atlas Temporada 2021',
  'atlas temporada 2022': 'Atlas Temporada 2022',
  'atlas temporada 2023': 'Atlas Temporada 2023',
  'atlas temporada 2024': 'Atlas Temporada 2024',
  // Inventario CAEM
  'cajas de captacion': 'Cajas de Captación',
  'cajas derivadoras': 'Cajas Derivadoras',
  'cajas rompedoras de presion': 'Cajas Rompedoras de Presión',
  'campamentos_edomex': 'Campamentos Grupo Tlaloc',
  'carcamos': 'Cárcamos',
  'fosas septicas': 'Fosas Sépticas',
  'galeria filtrante': 'Galería Filtrante',
  'lineas de conduccion-ap': 'Líneas de Conducción AP',
  'lineasdistribucion-drenaje': 'Líneas de Distribución Drenaje',
  'manantiales': 'Manantiales',
  'obras de toma': 'Obras de Toma',
  'plantas de bombeo': 'Plantas de Bombeo',
  'plantas de tratamiento': 'Plantas de Tratamiento',
  'pozos': 'Pozos',
  'tanques': 'Tanques',
  // Contexto Geográfico
  'cuerpos de agua': 'Cuerpos de Agua',
  'curvas de nivel': 'Curvas de Nivel',
  'estadomex': 'Límite Estatal',
  'estadomex_geojson': 'Límite Estatal (GeoJSON)',
  'municipios': 'Municipios',
  'municipios_geojson': 'Municipios (GeoJSON)',
  'obras de proteccion': 'Obras de Protección',
  'regiones': 'Regionalización',
  'regiones_geojson': 'Regionalización (GeoJSON)',
  'riesgo de inundacion': 'Riesgo de Inundación',
  'rios y arroyos': 'Ríos y Arroyos',
  // Programa Operativo Anual 2025
  'caem-dgig-fise-052-25-cp': 'FISE 052-25 CP',
  'caem-dgig-fise-053-25-cp': 'FISE 053-25 CP',
  'caem-dgig-fise-054-25-cp': 'FISE 054-25 CP',
  'caem-dgig-fise-055-25-cp': 'FISE 055-25 CP',
  'caem-dgig-fise-056-25-cp': 'FISE 056-25 CP'
};

let supabaseUrl = '';
let supabaseKey = '';
let capasConfig = {};
let capasActivas = {};
let capasData = {};
let ultimaCapaActivada = null; // Variable para rastrear la última capa activada
let measureMode = false;
let measurePoints = [];
let currentMeasureLine = null;
let measureLayer;
let profileMode = false;
let profileLine = null;
let searchMarker = null;
let areaMode = false;
let areaPoints = [];
let currentAreaPolygon = null;

// Coordenadas para el zoom de inicio (Estado de México)
const INITIAL_ZOOM_COORDS = {
  lat: 19.4326,
  lng: -99.1332,
  zoom: 9
};

// Coordenadas para México completo (vista inicial)
const MEXICO_BOUNDS = [
  [14.5388, -118.4662], // Esquina suroeste
  [32.7186, -86.7104]   // Esquina noreste
];

const map = L.map('map', {
  zoomControl: false
}).fitBounds(MEXICO_BOUNDS); // Inicia mostrando México completo

// Agregar escala gráfica en la parte inferior izquierda (arriba de la caja de transparencia)
L.control.scale({
  position: 'bottomleft',
  metric: true,
  imperial: false,
  maxWidth: 150
}).addTo(map);

// Iniciar con mapa satélite
let currentBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri',
  maxZoom: 19
}).addTo(map);

// Crear un pane especial para las mediciones con z-index alto
map.createPane('measurePane');
map.getPane('measurePane').style.zIndex = 650;
map.getPane('measurePane').style.pointerEvents = 'none'; // No interferir con clics del mapa

// Crear un pane para el highlight del municipio con z-index bajo (debajo de las capas de datos)
map.createPane('municipioHighlightPane');
map.getPane('municipioHighlightPane').style.zIndex = 350; // Por debajo de overlayPane (400)
map.getPane('municipioHighlightPane').style.pointerEvents = 'none'; // No interferir con clics

// Crear pane para la capa de municipios con z-index bajo
map.createPane('municipiosPane');
map.getPane('municipiosPane').style.zIndex = 360;

// Variable para la capa de municipios visible (controlada por zoom)
let municipiosVisibleLayer = null;
const ZOOM_MUNICIPIOS_VISIBLE = 7; // Nivel de zoom a partir del cual se ven los municipios

// Función para actualizar la visibilidad de la capa de municipios según el zoom
function actualizarVisibilidadMunicipios() {
  if (!municipiosVisibleLayer) return;
  
  const currentZoom = map.getZoom();
  
  // Mantener visible si hay municipio seleccionado O si el zoom es suficiente
  if (currentZoom >= ZOOM_MUNICIPIOS_VISIBLE || selectedMunicipio) {
    // Mostrar la capa con estilo visible
    municipiosVisibleLayer.setStyle({
      color: '#8a2035',
      weight: 1.5,
      opacity: 0.8,
      fillColor: '#8a2035',
      fillOpacity: 0.05
    });
  } else {
    // Ocultar la capa (estilo invisible) solo si no hay municipio seleccionado
    municipiosVisibleLayer.setStyle({
      opacity: 0,
      fillOpacity: 0,
      weight: 0
    });
  }
}

// Escuchar cambios de zoom para actualizar visibilidad de municipios
map.on('zoomend', actualizarVisibilidadMunicipios);

measureLayer = L.layerGroup({
  pane: 'measurePane'
}).addTo(map);

map.on('mousemove', function(e) {
  document.getElementById('coordinates').textContent = 
    `Lat: ${e.latlng.lat.toFixed(4)}° | Lon: ${e.latlng.lng.toFixed(4)}°`;
});

// Funciones para el indicador de carga
function showLoading(message = 'Cargando información', subtext = 'Por favor espera...') {
  const indicator = document.getElementById('loading-indicator');
  const loadingContent = indicator.querySelector('.loading-content');
  loadingContent.querySelector('.loading-text').childNodes[0].textContent = message + ' ';
  loadingContent.querySelector('.loading-subtext').textContent = subtext;
  indicator.classList.add('show');
}

function hideLoading() {
  const indicator = document.getElementById('loading-indicator');
  indicator.classList.remove('show');
}

function changeBasemap(type) {
  map.removeLayer(currentBasemap);
  
  switch(type) {
    case 'osm':
      currentBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      });
      break;
    case 'satellite':
      currentBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
      });
      break;
    case 'topo':
      currentBasemap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors',
        maxZoom: 17
      });
      break;
  }
  
  currentBasemap.addTo(map);
  
  // Actualizar clases active en todos los paneles de mapa base
  document.querySelectorAll('.basemap-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.basemap-option').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.basemap-option-right').forEach(btn => btn.classList.remove('active'));
  
  // Agregar clase active al botón correspondiente del tipo seleccionado
  const rightBtn = document.getElementById(`basemap-${type}-right`);
  if (rightBtn) {
    rightBtn.classList.add('active');
  }
  
  const floatBtn = document.getElementById(`basemap-${type}`);
  if (floatBtn) {
    floatBtn.classList.add('active');
  }
}

function reprojectGeometry(geom) {
  const reprojectCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      return proj4('EPSG:32614', 'EPSG:4326', coords);
    } else {
      return coords.map(c => reprojectCoords(c));
    }
  };

  return {
    type: geom.type,
    coordinates: reprojectCoords(geom.coordinates)
  };
}

// Función para validar que una geometría tenga coordenadas válidas
function isValidGeometry(geom) {
  if (!geom || !geom.coordinates) return false;
  
  const validateCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      // Es un par de coordenadas [lng, lat]
      const [lng, lat] = coords;
      return !isNaN(lng) && !isNaN(lat) && 
             isFinite(lng) && isFinite(lat) &&
             lng >= -180 && lng <= 180 &&
             lat >= -90 && lat <= 90;
    } else {
      // Es un array de coordenadas, validar recursivamente
      return coords.every(c => validateCoords(c));
    }
  };
  
  return validateCoords(geom.coordinates);
}

// Función para calcular el área geodésica de un polígono
function calcularAreaGeodesica(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  
  const R = 6371000; // Radio de la Tierra en metros
  let area = 0;
  
  if (latlngs.length > 2) {
    for (let i = 0; i < latlngs.length; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % latlngs.length];
      
      const lat1 = p1.lat * Math.PI / 180;
      const lat2 = p2.lat * Math.PI / 180;
      const lng1 = p1.lng * Math.PI / 180;
      const lng2 = p2.lng * Math.PI / 180;
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    area = Math.abs(area * R * R / 2);
  }
  
  return area;
}

function toggleSearch() {
  const searchInputs = document.getElementById('coord-search-inputs');
  const searchBtn = document.getElementById('search-btn');
  
  if (searchInputs.style.display === 'none') {
    searchInputs.style.display = 'block';
    searchBtn.classList.add('active');
  } else {
    searchInputs.style.display = 'none';
    searchBtn.classList.remove('active');
  }
}

function toggleMeasure() {
  measureMode = !measureMode;
  profileMode = false;
  areaMode = false;
  document.getElementById('measure-btn').classList.toggle('active', measureMode);
  document.getElementById('profile-btn').classList.remove('active');
  document.getElementById('area-btn').classList.remove('active');
  
  if (measureMode) {
    map.getContainer().style.cursor = 'crosshair';
    document.getElementById('map').classList.add('measuring-mode');
    map.getContainer().querySelector('.leaflet-container')?.classList.add('measuring-active');
    measurePoints = [];
    if (currentMeasureLine) {
      measureLayer.removeLayer(currentMeasureLine);
    }
    disableLayersInteractivity();
  } else {
    map.getContainer().style.cursor = '';
    document.getElementById('map').classList.remove('measuring-mode');
    map.getContainer().querySelector('.leaflet-container')?.classList.remove('measuring-active');
    enableLayersInteractivity();
  }
}

function toggleProfile() {
  profileMode = !profileMode;
  measureMode = false;
  areaMode = false;
  document.getElementById('profile-btn').classList.toggle('active', profileMode);
  document.getElementById('measure-btn').classList.remove('active');
  document.getElementById('area-btn').classList.remove('active');
  
  if (profileMode) {
    map.getContainer().style.cursor = 'crosshair';
    document.getElementById('map').classList.add('measuring-mode');
    map.getContainer().querySelector('.leaflet-container')?.classList.add('measuring-active');
    if (profileLine) {
      measureLayer.removeLayer(profileLine);
    }
    disableLayersInteractivity();
  } else {
    map.getContainer().style.cursor = '';
    document.getElementById('map').classList.remove('measuring-mode');
    map.getContainer().querySelector('.leaflet-container')?.classList.remove('measuring-active');
    document.getElementById('elevation-profile').classList.remove('show');
    enableLayersInteractivity();
  }
}

function toggleArea() {
  areaMode = !areaMode;
  measureMode = false;
  profileMode = false;
  document.getElementById('area-btn').classList.toggle('active', areaMode);
  document.getElementById('measure-btn').classList.remove('active');
  document.getElementById('profile-btn').classList.remove('active');
  
  if (areaMode) {
    // Limpiar todo cuando se activa para nueva medición
    measureLayer.clearLayers();
    if (currentAreaPolygon) {
      measureLayer.removeLayer(currentAreaPolygon);
      currentAreaPolygon = null;
    }
    map.getContainer().style.cursor = 'crosshair';
    document.getElementById('map').classList.add('measuring-mode');
    map.getContainer().querySelector('.leaflet-container')?.classList.add('measuring-active');
    areaPoints = [];
    disableLayersInteractivity();
  } else {
    // Limpiar todo cuando se desactiva
    map.getContainer().style.cursor = '';
    document.getElementById('map').classList.remove('measuring-mode');
    map.getContainer().querySelector('.leaflet-container')?.classList.remove('measuring-active');
    areaPoints = [];
    measureLayer.clearLayers();
    if (currentAreaPolygon) {
      measureLayer.removeLayer(currentAreaPolygon);
      currentAreaPolygon = null;
    }
    enableLayersInteractivity();
  }
}

// Función para limpiar todos los análisis (mediciones, perfiles, áreas)
function limpiarAnalisis() {
  // Desactivar todos los modos
  measureMode = false;
  profileMode = false;
  areaMode = false;
  
  // Remover clases activas de los botones
  const measureBtn = document.getElementById('measure-btn');
  const profileBtn = document.getElementById('profile-btn');
  const areaBtn = document.getElementById('area-btn');
  const measureBtnFloat = document.getElementById('measure-btn-float');
  const profileBtnFloat = document.getElementById('profile-btn-float');
  const areaBtnFloat = document.getElementById('area-btn-float');
  
  if (measureBtn) measureBtn.classList.remove('active');
  if (profileBtn) profileBtn.classList.remove('active');
  if (areaBtn) areaBtn.classList.remove('active');
  if (measureBtnFloat) measureBtnFloat.classList.remove('active');
  if (profileBtnFloat) profileBtnFloat.classList.remove('active');
  if (areaBtnFloat) areaBtnFloat.classList.remove('active');
  
  // Limpiar todas las capas de medición
  measureLayer.clearLayers();
  
  // Limpiar variables
  measurePoints = [];
  areaPoints = [];
  currentMeasureLine = null;
  currentAreaPolygon = null;
  profileLine = null;
  
  // Cerrar el panel de perfil de elevación si está abierto
  const elevationProfile = document.getElementById('elevation-profile');
  if (elevationProfile) {
    elevationProfile.classList.remove('show');
  }
  
  // Restaurar cursor y habilitar interactividad de capas
  map.getContainer().style.cursor = '';
  document.getElementById('map').classList.remove('measuring-mode');
  map.getContainer().querySelector('.leaflet-container')?.classList.remove('measuring-active');
  enableLayersInteractivity();
}

// Funciones para habilitar/deshabilitar interactividad de capas
function disableLayersInteractivity() {
  // Deshabilitar todas las capas activas
  Object.keys(capasActivas).forEach(nombre => {
    const layer = capasActivas[nombre];
    if (layer && layer.getLayers) {
      layer.getLayers().forEach(l => {
        if (l.options) {
          l.options.interactive = false;
        }
        if (l.off) {
          l.off('click');
        }
      });
    }
  });
  
  // Deshabilitar interactividad de la capa de municipios
  if (municipiosVisibleLayer) {
    municipiosVisibleLayer.eachLayer(l => {
      if (l.options) l.options.interactive = false;
      if (l.off) l.off('click');
    });
  }
  
  // Deshabilitar pointer events de todos los panes que pueden interferir
  const municipiosPane = map.getPane('municipiosPane');
  const overlayPane = map.getPane('overlayPane');
  const markerPane = map.getPane('markerPane');
  const tooltipPane = map.getPane('tooltipPane');
  const popupPane = map.getPane('popupPane');
  const shadowPane = map.getPane('shadowPane');
  
  if (municipiosPane) municipiosPane.style.pointerEvents = 'none';
  if (overlayPane) overlayPane.style.pointerEvents = 'none';
  if (markerPane) markerPane.style.pointerEvents = 'none';
  if (tooltipPane) tooltipPane.style.pointerEvents = 'none';
  if (popupPane) popupPane.style.pointerEvents = 'none';
  if (shadowPane) shadowPane.style.pointerEvents = 'none';
  
  // El measurePane también debe tener pointer-events: none para que los clics pasen al mapa
  const measurePane = map.getPane('measurePane');
  if (measurePane) {
    measurePane.style.pointerEvents = 'none';
    measurePane.style.zIndex = '650';
  }
}

function enableLayersInteractivity() {
  Object.keys(capasActivas).forEach(nombre => {
    const layer = capasActivas[nombre];
    if (layer && layer.getLayers) {
      layer.getLayers().forEach(l => {
        if (l.options) {
          l.options.interactive = true;
        }
      });
    }
  });
  
  // Restaurar interactividad de la capa de municipios
  if (municipiosVisibleLayer) {
    municipiosVisibleLayer.eachLayer(l => {
      if (l.options) l.options.interactive = true;
    });
  }
  
  // Restaurar pointer events de todos los panes
  const municipiosPane = map.getPane('municipiosPane');
  const overlayPane = map.getPane('overlayPane');
  const markerPane = map.getPane('markerPane');
  const tooltipPane = map.getPane('tooltipPane');
  const popupPane = map.getPane('popupPane');
  const shadowPane = map.getPane('shadowPane');
  
  if (municipiosPane) municipiosPane.style.pointerEvents = 'auto';
  if (overlayPane) overlayPane.style.pointerEvents = 'auto';
  if (markerPane) markerPane.style.pointerEvents = 'auto';
  if (tooltipPane) tooltipPane.style.pointerEvents = 'auto';
  if (popupPane) popupPane.style.pointerEvents = 'auto';
  if (shadowPane) shadowPane.style.pointerEvents = 'auto';
  
  // Restaurar z-index del pane de medición
  const measurePane = map.getPane('measurePane');
  if (measurePane) {
    measurePane.style.pointerEvents = 'none';
    measurePane.style.zIndex = '650';
  }
}

function closeProfile() {
  document.getElementById('elevation-profile').classList.remove('show');
  profileMode = false;
  document.getElementById('profile-btn').classList.remove('active');
  map.getContainer().style.cursor = '';
  document.getElementById('map').classList.remove('measuring-mode');
  map.getContainer().querySelector('.leaflet-container')?.classList.remove('measuring-active');
  enableLayersInteractivity();
}

// Variables para la ventana modal de simbología
let symbologyModalDragging = false;
let symbologyModalCurrentX;
let symbologyModalCurrentY;
let symbologyModalInitialX;
let symbologyModalInitialY;
let symbologyModalXOffset = 0;
let symbologyModalYOffset = 0;

// Capas que activan la simbología
const capasConSimbologia = ['regiones', 'regiones_geojson', 'riesgo de inundacion', 'obras de proteccion'];

// Verificar si hay capas con simbología activas
function hayCapasSimbologiaActivas() {
  return capasConSimbologia.some(capa => capasActivas && capasActivas[capa]);
}

function openSymbologyModal() {
  const modal = document.getElementById('symbology-modal');
  
  // Solo abrir si hay capas de regionalización o riesgo de inundación activas
  if (!hayCapasSimbologiaActivas()) {
    return;
  }
  
  updateSymbology();
  modal.classList.add('show');
}

function closeSymbologyModal() {
  const modal = document.getElementById('symbology-modal');
  modal.classList.remove('show');
}

// Función para actualizar automáticamente la simbología cuando cambian las capas
function checkSymbologyVisibility() {
  const modal = document.getElementById('symbology-modal');
  
  if (hayCapasSimbologiaActivas()) {
    // Si hay capas activas y el modal no está visible, abrirlo automáticamente
    if (!modal.classList.contains('show')) {
      updateSymbology();
      modal.classList.add('show');
    } else {
      // Si ya está visible, solo actualizar el contenido
      updateSymbology();
    }
  } else {
    // Si no hay capas activas, cerrar el modal
    modal.classList.remove('show');
  }
}

// Inicializar la funcionalidad de arrastre para la ventana de simbología
function initSymbologyDrag() {
  const modal = document.getElementById('symbology-modal');
  const header = document.getElementById('symbology-header');
  
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  function dragStart(e) {
    symbologyModalInitialX = e.clientX - symbologyModalXOffset;
    symbologyModalInitialY = e.clientY - symbologyModalYOffset;
    
    if (e.target === header || e.target.parentElement === header) {
      symbologyModalDragging = true;
      header.style.cursor = 'grabbing';
    }
  }
  
  function drag(e) {
    if (symbologyModalDragging) {
      e.preventDefault();
      
      symbologyModalCurrentX = e.clientX - symbologyModalInitialX;
      symbologyModalCurrentY = e.clientY - symbologyModalInitialY;
      
      symbologyModalXOffset = symbologyModalCurrentX;
      symbologyModalYOffset = symbologyModalCurrentY;
      
      setTranslate(symbologyModalCurrentX, symbologyModalCurrentY, modal);
    }
  }
  
  function dragEnd(e) {
    symbologyModalInitialX = symbologyModalCurrentX;
    symbologyModalInitialY = symbologyModalCurrentY;
    
    symbologyModalDragging = false;
    header.style.cursor = 'move';
  }
  
  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }
}

// Inicializar el arrastre cuando se carga la página
window.addEventListener('DOMContentLoaded', function() {
  initSymbologyDrag();
});

function updateSymbology() {
  const content = document.getElementById('symbology-content');
  
  // Solo mostrar simbología para Regionalización y Riesgo de Inundación
  const capasSimbologia = {
    'regiones': 'municipi_1',
    'regiones_geojson': 'municipi_1',
    'riesgo de inundacion': 'vulner_ri',
    'obras de proteccion': 'tipoobra'
  };
  
  // Función auxiliar para procesar una capa y obtener su HTML
  function processLayer(layerName, fieldName) {
    const layer = capasActivas[layerName];
    const displayName = nombresCapas[layerName] || layerName;
    const totalFeatures = layer && layer.getLayers ? layer.getLayers().length : 0;
    
    // Buscar variaciones del campo
    if (layer && layer.getLayers && layer.getLayers().length > 0) {
      const firstFeature = layer.getLayers()[0];
      const props = firstFeature.feature ? firstFeature.feature.properties : {};
      
      // Buscar el campo vulner_ri para riesgo de inundación
      if (props.hasOwnProperty('vulner_ri')) {
        fieldName = 'vulner_ri';
      } else if (props.hasOwnProperty('VULNER_RI')) {
        fieldName = 'VULNER_RI';
      }
      // Buscar el campo tipoobra para obras de protección
      else if (props.hasOwnProperty('tipoobra')) {
        fieldName = 'tipoobra';
      } else if (props.hasOwnProperty('TIPOOBRA')) {
        fieldName = 'TIPOOBRA';
      } else if (props.hasOwnProperty('TipoObra')) {
        fieldName = 'TipoObra';
      }
      // Buscar el campo municipi_1 para regionalización
      else if (props.hasOwnProperty('municipi_1')) {
        fieldName = 'municipi_1';
      } else if (props.hasOwnProperty('MUNICIPI_1')) {
        fieldName = 'MUNICIPI_1';
      }
    }
    
    let html = `<div class="symbology-layer">`;
    html += `<div class="symbology-layer-name">${displayName} <span class="symbology-total">(${totalFeatures})</span></div>`;
    
    // Obtener valores únicos CON SUS COLORES REALES
    const uniqueValues = new Map();
    
    // Verificar si es la capa de obras de protección para usar colores predefinidos
    const esObrasProteccion = layerName === 'obras de proteccion';
    
    if (layer && layer.getLayers) {
      layer.getLayers().forEach(l => {
        const props = l.feature ? l.feature.properties : {};
        const value = props[fieldName];
        
        // SOLO agregar si el valor existe (NO agregar "Sin dato")
        if (value !== null && value !== undefined && value !== '') {
          // Obtener el color real del layer
          let realColor = '#999999';
          
          // Para obras de protección, usar el mapa de colores global
          if (esObrasProteccion) {
            const tipoObraUpper = String(value).toUpperCase();
            realColor = colorMapObrasProteccion[tipoObraUpper] || colorMapObrasProteccion['SIN DATOS'] || '#FF5722';
          } else if (l.options && l.options.fillColor) {
            realColor = l.options.fillColor;
          } else if (l.options && l.options.color) {
            realColor = l.options.color;
          }
          
          if (!uniqueValues.has(value)) {
            uniqueValues.set(value, { count: 0, color: realColor });
          }
          uniqueValues.get(value).count++;
        }
      });
    }
    
    // Determinar el tipo de geometría
    let geometryType = 'point';
    if (layer && layer.getLayers && layer.getLayers().length > 0) {
      const firstLayer = layer.getLayers()[0];
      if (firstLayer instanceof L.Polyline && !(firstLayer instanceof L.Polygon)) {
        geometryType = 'line';
      } else if (firstLayer instanceof L.Polygon) {
        geometryType = 'polygon';
      }
    }
    
    // Si no hay valores únicos, mostrar un símbolo genérico con el color de la capa
    if (uniqueValues.size === 0 && totalFeatures > 0) {
      // Obtener el color de la primera feature de la capa
      let defaultColor = '#8a2035';
      if (layer && layer.getLayers && layer.getLayers().length > 0) {
        const firstLayer = layer.getLayers()[0];
        if (firstLayer.options && firstLayer.options.fillColor) {
          defaultColor = firstLayer.options.fillColor;
        } else if (firstLayer.options && firstLayer.options.color) {
          defaultColor = firstLayer.options.color;
        }
      }
      
      html += `<div class="symbology-item">`;
      
      if (geometryType === 'line') {
        html += `<div class="symbology-symbol line" style="background-color: ${defaultColor};"></div>`;
      } else if (geometryType === 'polygon') {
        html += `<div class="symbology-symbol" style="background-color: ${defaultColor}; opacity: 0.6;"></div>`;
      } else {
        html += `<div class="symbology-symbol point" style="background-color: ${defaultColor};"></div>`;
      }
      
      html += `<div class="symbology-label">`;
      html += `<div class="symbology-value">${displayName}</div>`;
      html += `<div class="symbology-count">(${totalFeatures})</div>`;
      html += `</div>`;
      html += `</div>`;
      
      html += `</div>`;
      return html;
    }
    
    // Ordenar valores alfabéticamente
    const sortedValues = Array.from(uniqueValues.entries()).sort((a, b) => 
      String(a[0]).localeCompare(String(b[0]))
    );
    
    // Mostrar cada valor único con su color REAL y conteo
    sortedValues.forEach(([value, data]) => {
      const color = data.color;
      const count = data.count;
      
      html += `<div class="symbology-item">`;
      
      if (geometryType === 'line') {
        html += `<div class="symbology-symbol line" style="background-color: ${color};"></div>`;
      } else if (geometryType === 'polygon') {
        html += `<div class="symbology-symbol" style="background-color: ${color}; opacity: 0.6;"></div>`;
      } else {
        html += `<div class="symbology-symbol point" style="background-color: ${color};"></div>`;
      }
      
      html += `<div class="symbology-label">`;
      html += `<div class="symbology-value">${value}</div>`;
      html += `<div class="symbology-count">(${count})</div>`;
      html += `</div>`;
      html += `</div>`;
    });
    
    html += `</div>`;
    return html;
  }
  
  // Filtrar solo las capas de Regionalización y Riesgo de Inundación activas
  const activeInventoryLayers = Object.keys(capasActivas).filter(name => 
    Object.keys(capasSimbologia).includes(name)
  );
  
  if (activeInventoryLayers.length === 0) {
    content.innerHTML = '<div class="symbology-empty">No hay capas de Regionalización o Riesgo de Inundación activas</div>';
    return;
  }
  
  let html = '';
  
  // Separar las capas activas
  const regionalizacionActiva = activeInventoryLayers.filter(name => 
    name === 'regiones' || name === 'regiones_geojson'
  );
  const riesgoActivo = activeInventoryLayers.filter(name => 
    name === 'riesgo de inundacion'
  );
  const obrasProteccionActiva = activeInventoryLayers.filter(name => 
    name === 'obras de proteccion'
  );
  
  // Sección Regionalización
  if (regionalizacionActiva.length > 0) {
    const totalRegiones = regionalizacionActiva.reduce((sum, layerName) => {
      const layer = capasActivas[layerName];
      return sum + (layer && layer.getLayers ? layer.getLayers().length : 0);
    }, 0);
    
    html += `<div class="symbology-section">`;
    html += `<div class="symbology-section-title">Regionalización <span class="symbology-section-count">(${totalRegiones})</span></div>`;
    
    regionalizacionActiva.forEach(layerName => {
      html += processLayer(layerName, capasSimbologia[layerName]);
    });
    
    html += `</div>`;
  }
  
  // Sección Riesgo de Inundación
  if (riesgoActivo.length > 0) {
    const totalRiesgo = riesgoActivo.reduce((sum, layerName) => {
      const layer = capasActivas[layerName];
      return sum + (layer && layer.getLayers ? layer.getLayers().length : 0);
    }, 0);
    
    html += `<div class="symbology-section">`;
    html += `<div class="symbology-section-title">Riesgo de Inundación <span class="symbology-section-count">(${totalRiesgo})</span></div>`;
    
    riesgoActivo.forEach(layerName => {
      html += processLayer(layerName, capasSimbologia[layerName]);
    });
    
    html += `</div>`;
  }
  
  // Sección Obras de Protección
  if (obrasProteccionActiva.length > 0) {
    const totalObras = obrasProteccionActiva.reduce((sum, layerName) => {
      const layer = capasActivas[layerName];
      return sum + (layer && layer.getLayers ? layer.getLayers().length : 0);
    }, 0);
    
    html += `<div class="symbology-section">`;
    html += `<div class="symbology-section-title">Obras de Protección <span class="symbology-section-count">(${totalObras})</span></div>`;
    
    obrasProteccionActiva.forEach(layerName => {
      html += processLayer(layerName, capasSimbologia[layerName]);
    });
    
    html += `</div>`;
  }
  
  content.innerHTML = html;
}

// Variables para búsqueda de lugares
let searchPlacesMarker = null;
let searchTimeout = null;

async function searchPlaces(event) {
  const query = event.target.value.trim();
  const resultsDiv = document.getElementById('search-places-results');
  const loadingDiv = document.getElementById('search-places-loading');
  
  // Limpiar timeout anterior
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  if (query.length < 3) {
    resultsDiv.innerHTML = '';
    return;
  }
  
  // Esperar 500ms después de que el usuario deje de escribir
  searchTimeout = setTimeout(async () => {
    loadingDiv.classList.add('show');
    resultsDiv.innerHTML = '';
    
    try {
      // Usar Nominatim de OpenStreetMap para búsqueda
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=mx`
      );
      
      if (!response.ok) throw new Error('Error en la búsqueda');
      
      const results = await response.json();
      loadingDiv.classList.remove('show');
      
      if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">No se encontraron resultados</div>';
        return;
      }
      
      resultsDiv.innerHTML = results.map(result => `
        <div class="search-result-item" onclick="goToPlace(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">
          <div class="place-name">${result.display_name.split(',')[0]}</div>
          <div class="place-address">${result.display_name}</div>
        </div>
      `).join('');
      
    } catch (error) {
      loadingDiv.classList.remove('show');
      resultsDiv.innerHTML = '<div style="padding: 15px; text-align: center; color: #e74c3c; font-size: 12px;">⚠️ Error al buscar lugares</div>';
    }
  }, 500);
}

function goToPlace(lat, lon, name) {
  // Remover marcador anterior si existe
  if (searchPlacesMarker) {
    map.removeLayer(searchPlacesMarker);
  }
  
  // Crear nuevo marcador con ícono personalizado
  searchPlacesMarker = L.marker([lat, lon], {
    icon: L.divIcon({
      className: 'custom-search-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #8a2035 0%, #b99056 100%); 
          width: 30px; 
          height: 30px; 
          border-radius: 50% 50% 50% 0; 
          transform: rotate(-45deg); 
          border: 3px solid white; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 12px; 
            height: 12px; 
            background: white; 
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    })
  }).addTo(map);
  
  // Crear popup con el nombre del lugar
  searchPlacesMarker.bindPopup(`
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 5px;">
      <strong style="color: #8a2035; font-size: 13px;">${name.split(',')[0]}</strong><br>
      <span style="font-size: 11px; color: #666;">${name}</span><br>
      <span style="font-size: 10px; color: #999; margin-top: 5px; display: block;">
        ${lat.toFixed(6)}°, ${lon.toFixed(6)}°
      </span>
    </div>
  `).openPopup();
  
  // Centrar el mapa en la ubicación
  map.setView([lat, lon], 14, {
    animate: true,
    duration: 1
  });
  
  // Cerrar el panel de búsqueda
  document.getElementById('search-places-panel').classList.remove('show');
  document.getElementById('search-places-btn').classList.remove('active');
}

map.on('click', function(e) {
  // Si estamos en modo de medición, cerrar todos los popups para evitar interferencias
  if (measureMode || profileMode || areaMode) {
    map.closePopup();
  }
  
  if (measureMode) {
    // Prevenir que otros elementos capturen el evento
    if (e.originalEvent) {
      L.DomEvent.stopPropagation(e.originalEvent);
    }
    
    measurePoints.push(e.latlng);
    
    if (currentMeasureLine) {
      measureLayer.removeLayer(currentMeasureLine);
    }
    
    if (measurePoints.length > 1) {
      currentMeasureLine = L.polyline(measurePoints, {
        color: '#8a2035',
        weight: 3,
        opacity: 0.7
      }).addTo(measureLayer);
      
      let totalDistance = 0;
      for (let i = 0; i < measurePoints.length - 1; i++) {
        totalDistance += measurePoints[i].distanceTo(measurePoints[i + 1]);
      }
      
      const distanceKm = (totalDistance / 1000).toFixed(2);
      currentMeasureLine.bindPopup(`Distancia: ${distanceKm} km`).openPopup();
    }
    
    L.circleMarker(e.latlng, {
      radius: 5,
      color: '#8a2035',
      fillColor: '#fff',
      fillOpacity: 1,
      weight: 2
    }).addTo(measureLayer);
    
    return; // No propagar el evento
  }
  
  if (profileMode) {
    // Prevenir que otros elementos capturen el evento
    if (e.originalEvent) {
      L.DomEvent.stopPropagation(e.originalEvent);
    }
    
    if (!profileLine) {
      profileLine = {
        start: e.latlng,
        line: null
      };
      L.circleMarker(e.latlng, {
        radius: 5,
        color: '#b99056',
        fillColor: '#fff',
        fillOpacity: 1,
        weight: 2
      }).addTo(measureLayer);
    } else {
      const line = L.polyline([profileLine.start, e.latlng], {
        color: '#b99056',
        weight: 3,
        opacity: 0.7
      }).addTo(measureLayer);
      
      L.circleMarker(e.latlng, {
        radius: 5,
        color: '#b99056',
        fillColor: '#fff',
        fillOpacity: 1,
        weight: 2
      }).addTo(measureLayer);
      
      getElevationProfile(profileLine.start, e.latlng);
      profileLine = null;
    }
    
    return; // No propagar el evento
  }
  
  if (areaMode) {
    // Prevenir que otros elementos capturen el evento
    if (e.originalEvent) {
      L.DomEvent.stopPropagation(e.originalEvent);
    }
    
    // Si ya hay al menos 3 puntos, verificar si el clic está cerca del primer punto
    if (areaPoints.length >= 3) {
      const firstPoint = areaPoints[0];
      const distance = e.latlng.distanceTo(firstPoint);
      const tolerancePixels = 15; // Tolerancia en píxeles
      const tolerance = tolerancePixels * 40075000 / (256 * Math.pow(2, map.getZoom())); // Convertir píxeles a metros según el zoom
      
      if (distance < tolerance) {
        // Cerrar el polígono - copiar la lógica del clic derecho
        map.closePopup();
        
        // Remover el polígono temporal
        if (currentAreaPolygon) {
          measureLayer.removeLayer(currentAreaPolygon);
        }
        
        // Crear el polígono cerrado
        currentAreaPolygon = L.polygon(areaPoints, {
          color: '#8a2035',
          fillColor: '#b99056',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.25
        }).addTo(measureLayer);
        
        // Calcular área
        let areaM2;
        try {
          areaM2 = L.GeometryUtil && L.GeometryUtil.geodesicArea 
            ? L.GeometryUtil.geodesicArea(areaPoints)
            : calcularAreaGeodesica(areaPoints);
        } catch (error) {
          areaM2 = calcularAreaGeodesica(areaPoints);
        }
        
        const areaKm2 = (areaM2 / 1000000).toFixed(4);
        const areaHa = (areaM2 / 10000).toFixed(2);
        
        // Calcular perímetro
        let perimeter = 0;
        for (let i = 0; i < areaPoints.length; i++) {
          const nextIndex = (i + 1) % areaPoints.length;
          perimeter += areaPoints[i].distanceTo(areaPoints[nextIndex]);
        }
        const perimeterKm = (perimeter / 1000).toFixed(3);
        
        // Crear y mostrar el popup
        const popupContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 8px; font-size: 11px;">
            <div style="line-height: 1.5;">
              <strong style="color: #8a2035; font-size: 11px;">Área:</strong><br>
              <span style="margin-left: 8px; font-size: 10px;">• ${areaKm2} km²</span><br>
              <span style="margin-left: 8px; font-size: 10px;">• ${areaHa} ha</span><br>
              <strong style="color: #8a2035; margin-top: 5px; display: inline-block; font-size: 11px;">Perímetro:</strong><br>
              <span style="margin-left: 8px; font-size: 10px;">• ${perimeterKm} km</span>
            </div>
          </div>
        `;
        
        currentAreaPolygon.bindPopup(popupContent, {
          maxWidth: 200,
          className: 'measurement-popup'
        }).openPopup();
        
        return; // No propagar el evento
      }
    }
    
    areaPoints.push(e.latlng);
    
    L.circleMarker(e.latlng, {
      radius: 5,
      color: '#8a2035',
      fillColor: '#fff',
      fillOpacity: 1,
      weight: 2
    }).addTo(measureLayer);
    
    if (currentAreaPolygon) {
      measureLayer.removeLayer(currentAreaPolygon);
    }
    
    // Mostrar polígono temporal sin popup
    if (areaPoints.length >= 2) {
      currentAreaPolygon = L.polyline(areaPoints, {
        color: '#8a2035',
        weight: 3,
        opacity: 0.8
      }).addTo(measureLayer);
    }
    
    return; // No propagar el evento
  }
});

// Evento de clic derecho para cerrar el polígono en modo área
map.on('contextmenu', function(e) {
  if (areaMode && areaPoints.length >= 3) {
    // Prevenir el menú contextual del navegador
    L.DomEvent.preventDefault(e);
    
    // Cerrar popups
    map.closePopup();
    
    // Prevenir propagación
    if (e.originalEvent) {
      L.DomEvent.stopPropagation(e.originalEvent);
    }
    
    // Remover el polígono temporal
    if (currentAreaPolygon) {
      measureLayer.removeLayer(currentAreaPolygon);
    }
    
    // Crear el polígono cerrado
    currentAreaPolygon = L.polygon(areaPoints, {
      color: '#8a2035',
      fillColor: '#b99056',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.25
    }).addTo(measureLayer);
    
    // Calcular área usando nuestra función personalizada o L.GeometryUtil si está disponible
    let areaM2;
    try {
      areaM2 = L.GeometryUtil && L.GeometryUtil.geodesicArea 
        ? L.GeometryUtil.geodesicArea(areaPoints)
        : calcularAreaGeodesica(areaPoints);
    } catch (error) {
      areaM2 = calcularAreaGeodesica(areaPoints);
    }
    
    const areaKm2 = (areaM2 / 1000000).toFixed(4);
    const areaHa = (areaM2 / 10000).toFixed(2);
    
    // Calcular perímetro
    let perimeter = 0;
    for (let i = 0; i < areaPoints.length; i++) {
      const nextIndex = (i + 1) % areaPoints.length;
      perimeter += areaPoints[i].distanceTo(areaPoints[nextIndex]);
    }
    const perimeterKm = (perimeter / 1000).toFixed(3);
    
    // Crear y mostrar el popup inmediatamente
    const popupContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 8px; font-size: 11px;">
        <div style="line-height: 1.5;">
          <strong style="color: #8a2035; font-size: 11px;">Área:</strong><br>
          <span style="margin-left: 8px; font-size: 10px;">• ${areaKm2} km²</span><br>
          <span style="margin-left: 8px; font-size: 10px;">• ${areaHa} ha</span><br>
          <strong style="color: #8a2035; margin-top: 5px; display: inline-block; font-size: 11px;">Perímetro:</strong><br>
          <span style="margin-left: 8px; font-size: 10px;">• ${perimeterKm} km</span>
        </div>
      </div>
    `;
    
    currentAreaPolygon.bindPopup(popupContent, {
      maxWidth: 180,
      className: 'area-popup'
    });
    
    // Abrir el popup en el centro del polígono
    const bounds = currentAreaPolygon.getBounds();
    const center = bounds.getCenter();
    currentAreaPolygon.openPopup(center);
    
    // Desactivar el modo de medición de área
    areaMode = false;
    document.getElementById('area-btn').classList.remove('active');
    map.getContainer().style.cursor = '';
    enableLayersInteractivity();
  }
});

async function getElevationProfile(start, end) {
  const status = document.getElementById('status');
  showLoading('Generando perfil de elevación', 'Consultando elevaciones del terreno...');
  status.textContent = '🔄 Obteniendo perfil de elevación...';
  status.className = 'status-info';
  
  const numPoints = 100;
  const elevations = [];
  const distances = [];
  
  const totalDistance = start.distanceTo(end);
  
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat = start.lat + (end.lat - start.lat) * fraction;
    const lng = start.lng + (end.lng - start.lng) * fraction;
    
    const distance = (totalDistance * fraction) / 1000; // en km
    distances.push(distance);
    
    try {
      const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
      const data = await response.json();
      const elevation = data.results[0].elevation;
      elevations.push(elevation);
    } catch (error) {
      elevations.push(0);
    }
  }
  
  status.textContent = '✅ Perfil de elevación generado';
  status.className = 'status-success';
  
  hideLoading();
  
  // Mostrar el panel del perfil de elevación
  document.getElementById('elevation-profile').classList.add('show');
  
  drawElevationChart(distances, elevations);
}

function buscarCoordenadas() {
  const lat = parseFloat(document.getElementById('search-lat').value);
  const lon = parseFloat(document.getElementById('search-lon').value);
  
  if (isNaN(lat) || isNaN(lon)) {
    alert('Por favor ingresa coordenadas válidas');
    return;
  }
  
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    alert('Coordenadas fuera de rango válido');
    return;
  }
  
  if (searchMarker) {
    map.removeLayer(searchMarker);
  }
  
  searchMarker = L.marker([lat, lon], {
    icon: L.divIcon({
      className: 'search-marker',
      html: '<div style="background: #8a2035; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map);
  
  searchMarker.bindPopup(`<b>Ubicación buscada</b><br>Lat: ${lat.toFixed(4)}°<br>Lon: ${lon.toFixed(4)}°`).openPopup();
  
  map.setView([lat, lon], 14);
}

function drawElevationChart(distances, elevations) {
  const canvas = document.getElementById('elevation-chart');
  const ctx = canvas.getContext('2d');
  
  // Ajustar el tamaño del canvas
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  const padding = { top: 45, right: 30, bottom: 55, left: 70 };
  const width = canvas.width - padding.left - padding.right;
  const height = canvas.height - padding.top - padding.bottom;
  
  // Limpiar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Fondo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Encontrar valores mínimos y máximos con margen adicional
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev;
  // Agregar 10% de margen arriba y abajo para dar espacio
  const elevMargin = elevRange * 0.1;
  const displayMinElev = minElev - elevMargin;
  const displayMaxElev = maxElev + elevMargin;
  const displayRange = displayMaxElev - displayMinElev;
  const maxDist = Math.max(...distances);
  
  // Dibujar líneas de cuadrícula y etiquetas del eje Y (elevación)
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#666';
  ctx.font = '11px Arial';
  
  const numYTicks = 5;
  for (let i = 0; i <= numYTicks; i++) {
    const y = padding.top + (height * i) / numYTicks;
    const elev = displayMaxElev - (displayRange * i) / numYTicks;
    
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + width, y);
    ctx.stroke();
    
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(elev) + 'm', padding.left - 10, y + 4);
  }
  
  // Dibujar líneas de cuadrícula y etiquetas del eje X (distancia)
  const numXTicks = 6;
  for (let i = 0; i <= numXTicks; i++) {
    const x = padding.left + (width * i) / numXTicks;
    const dist = (maxDist * i) / numXTicks;
    
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + height);
    ctx.stroke();
    
    ctx.textAlign = 'center';
    ctx.fillText(dist.toFixed(1) + 'km', x, padding.top + height + 20);
  }
  
  // Etiqueta del eje X
  ctx.fillStyle = '#47161D';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Distancia (km)', padding.left + width / 2, canvas.height - 15);
  
  // Etiqueta del eje Y
  ctx.save();
  ctx.fillStyle = '#47161D';
  ctx.font = 'bold 12px Arial';
  ctx.translate(15, padding.top + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Elevación (m)', 0, 0);
  ctx.restore();
  
  // Dibujar área de relleno bajo la línea
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + height);
  
  for (let i = 0; i < elevations.length; i++) {
    const x = padding.left + (distances[i] / maxDist) * width;
    const normalizedElev = (elevations[i] - displayMinElev) / displayRange;
    const y = padding.top + height - (normalizedElev * height);
    
    if (i === 0) {
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.lineTo(padding.left + width, padding.top + height);
  ctx.closePath();
  ctx.fillStyle = 'rgba(138, 32, 53, 0.15)';
  ctx.fill();
  
  // Dibujar línea de perfil suave
  ctx.beginPath();
  ctx.strokeStyle = '#8a2035';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  for (let i = 0; i < elevations.length; i++) {
    const x = padding.left + (distances[i] / maxDist) * width;
    const normalizedElev = (elevations[i] - displayMinElev) / displayRange;
    const y = padding.top + height - (normalizedElev * height);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Marco del gráfico
  ctx.strokeStyle = '#47161D';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding.left, padding.top, width, height);
  
  // Información adicional en la parte superior
  ctx.fillStyle = '#47161D';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  const info = `Min: ${Math.round(minElev)}m | Max: ${Math.round(maxElev)}m | Diferencia: ${Math.round(elevRange)}m | Distancia: ${maxDist.toFixed(2)}km`;
  ctx.fillText(info, padding.left + width / 2, padding.top - 10);
}

async function conectar() {
  // Configuración de Supabase pre-establecida
  supabaseUrl = document.getElementById('url').value.trim() || 'https://ppdpjvfpujjfbwpuifmi.supabase.co';
  supabaseKey = document.getElementById('key').value.trim() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwZHBqdmZwdWpqZmJ3cHVpZm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDAzMDksImV4cCI6MjA3NjA3NjMwOX0.2Pm_217ZLaYS-W8fDyE7bEr0IP0Y-fNZwVkuboBRRDo';
  
  // Establecer los valores en los campos si están vacíos
  document.getElementById('url').value = supabaseUrl;
  document.getElementById('key').value = supabaseKey;
  
  const status = document.getElementById('status');
  
  if (!supabaseUrl || !supabaseKey) {
    status.textContent = '⚠️ Completa URL y API Key';
    status.className = 'status-error';
    return;
  }
  
  showLoading('Conectando', 'Descubriendo capas disponibles...');
  status.textContent = '🔄 Conectando y descubriendo capas...';
  status.className = 'status-info';
  
  try {
    // Nombres exactos de las tablas en Supabase (con espacios y guiones)
    const tablasEsperadas = [
      // Atlas de Inundaciones
      'atlas temporada 2020',
      'atlas temporada 2021',
      'atlas temporada 2022',
      'atlas temporada 2023',
      'atlas temporada 2024',
      // Contexto Geográfico
      'cuerpos de agua',
      'curvas de nivel',
      'estadomex',
      'estadomex_geojson',
      'municipios',
      'municipios_geojson',
      'obras de proteccion',
      'regiones',
      'regiones_geojson',
      'riesgo de inundacion',
      'rios y arroyos'
    ];
    
    console.log('🔍 Buscando capas en Supabase...');
    console.log('📋 URL de Supabase:', supabaseUrl);
    console.log('📋 Tablas esperadas:', tablasEsperadas);
    
    // Intentar listar todas las tablas disponibles
    try {
      const schemaRes = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { 
          'apikey': supabaseKey, 
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (schemaRes.ok) {
        console.log('✅ Conexión a Supabase exitosa');
      } else {
        console.error('❌ Error de conexión:', schemaRes.status, schemaRes.statusText);
      }
    } catch (e) {
      console.warn('⚠️ No se pudo verificar la conexión:', e.message);
    }
    
    capasConfig = {};
    let colorIdx = 0;
    
    // Intentar conectar a cada tabla directamente
    const promesas = tablasEsperadas.map(async tbl => {
      try {
        // Codificar el nombre de la tabla para la URL (espacios y caracteres especiales)
        const encodedTable = encodeURIComponent(tbl);
        const testUrl = `${supabaseUrl}/rest/v1/${encodedTable}?select=*&limit=1`;
        console.log(`🔍 Probando tabla: ${tbl} (URL: ${testUrl})`);
        
        const r = await fetch(testUrl, {
          headers: { 
            'apikey': supabaseKey, 
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (r.ok) {
          const sampleData = await r.json();
          const hasData = sampleData && sampleData.length > 0;
          
          console.log(`${hasData ? '✅' : '⚠️'} Tabla ${tbl}: ${hasData ? 'CON DATOS' : 'VACÍA'} - Registros: ${sampleData.length}`);
          
          // Asignar color específico
          let color;
          if (tbl.includes('atlas temporada')) {
            // Azul fuerte para todas las capas de inundaciones
            color = '#0066CC'; // Azul fuerte que resalta
          } else if (tbl === 'obras de proteccion') {
            color = '#FF5722'; // Naranja intenso para obras de protección (será categorizado)
          } else if (tbl === 'riesgo de inundacion') {
            color = '#1E88E5'; // Azul medio para riesgo de inundacion (será categorizado)
          } else if (tbl === 'curvas de nivel') {
            color = '#795548'; // Café para curvas de nivel
          } else if (tbl.includes('cuerpos') || (tbl.includes('agua') && !tbl.includes('atlas'))) {
            color = '#0077be'; // Azul para cuerpos de agua
          } else if (tbl.includes('rios') || tbl.includes('arroyos')) {
            color = '#4A90E2'; // Azul claro para ríos
          } else if (tbl === 'estadomex' || tbl === 'estadomex_geojson') {
            color = '#000000'; // Negro para límite estatal
          } else if (tbl.includes('cajas')) {
            color = '#b48a3f'; // Naranja para cajas
          } else if (tbl === 'campamentos_edomex') {
            color = '#4CAF50'; // Verde para campamentos Tlaloc
          } else if (tbl === 'carcamos') {
            color = '#e98a3f'; // Naranja oscuro para cárcamos
          } else if (tbl === 'fosas septicas') {
            color = '#774720ff'; // Café para fosas sépticas
          } else if (tbl === 'galeria filtrante') {
            color = '#722bb4'; // Cian para galería filtrante
          } else if (tbl === 'manantiales') {
            color = '#2b51b4'; // Cian claro para manantiales
          } else if (tbl === 'obras de toma') {
            color = '#26C6DA'; // Cian medio para obras de toma
          } else if (tbl.includes('plantas de bombeo')) {
            color = '#9C27B0'; // Morado para plantas de bombeo
          } else if (tbl.includes('plantas de tratamiento')) {
            color = '#673AB7'; // Morado oscuro para plantas de tratamiento
          } else if (tbl === 'pozos') {
            color = '#3F51B5'; // Índigo para pozos
          } else if (tbl === 'tanques') {
            color = '#2196F3'; // Azul para tanques
          } else if (tbl === 'lineasdistribucion-drenaje') {
            color = '#3d3d3d'; // Gris oscuro para líneas de distribución drenaje
          } else if (tbl.includes('lineas')) {
            color = '#FF6B6B'; // Rojo para líneas de conducción
          } else if (tbl.includes('municipios')) {
            color = '#8a2035'; // Vino para municipios
          } else if (tbl.includes('regiones')) {
            color = '#9C27B0'; // Morado para regiones
          } else if (tbl === 'caem-dgig-fise-052-25-cp') {
            color = '#E91E63'; // Rosa fuerte para FISE 052-25 CP
          } else if (tbl === 'caem-dgig-fise-053-25-cp') {
            color = '#E91E63'; // Rosa fuerte para FISE 053-25 CP
          } else if (tbl === 'caem-dgig-fise-054-25-cp') {
            color = '#E91E63'; // Rosa fuerte para FISE 054-25 CP
          } else if (tbl === 'caem-dgig-fise-055-25-cp') {
            color = '#E91E63'; // Rosa fuerte para FISE 055-25 CP
          } else if (tbl === 'caem-dgig-fise-056-25-cp') {
            color = '#E91E63'; // Rosa fuerte para FISE 056-25 CP
          } else {
            color = colores[colorIdx % colores.length];
            colorIdx++;
          }
          
          capasConfig[tbl] = {
            tipo: null,
            srid: null,
            columna_geom: 'geom',
            color: color,
            hasData: hasData
          };
          
          return tbl;
        } else {
          const errorText = await r.text();
          console.log(`❌ Tabla ${tbl}: No accesible (${r.status}) - ${errorText.substring(0, 100)}`);
        }
        return null;
      } catch (err) {
        console.log(`❌ Error al acceder a ${tbl}:`, err.message);
        return null;
      }
    });
    
    await Promise.all(promesas);
    
    const capasEncontradas = Object.keys(capasConfig);
    const capasConDatos = capasEncontradas.filter(c => capasConfig[c].hasData);
    const capasVacias = capasEncontradas.filter(c => !capasConfig[c].hasData);
    
    console.log('📋 Capas encontradas:', capasEncontradas);
    console.log(`✅ Capas con datos (${capasConDatos.length}):`, capasConDatos);
    console.log(`⚠️ Capas vacías (${capasVacias.length}):`, capasVacias);
    
    if (capasEncontradas.length === 0) {
      throw new Error('No se encontraron capas espaciales.');
    }
    
    let mensaje = `✅ Conectado - ${capasEncontradas.length} capas encontradas`;
    if (capasVacias.length > 0) {
      mensaje += ` (${capasVacias.length} vacías)`;
    }
    
    status.textContent = mensaje;
    status.className = 'status-success';
    hideLoading();
    mostrarCapas();
    
    // Precargar datos de municipios para el selector (sin mostrar en el mapa)
    precargarMunicipiosParaSelector();
    
    // Precargar datos de fenómenos para el selector (sin mostrar en el mapa)
    precargarFenomenosParaSelector();
  } catch (err) {
    console.error('❌ Error de conexión:', err);
    status.textContent = '❌ Error: ' + err.message;
    status.className = 'status-error';
    hideLoading();
  }
}

function mostrarCapas() {
  const layersDiv = document.getElementById('layers');
  const layersSection = document.getElementById('layers-section');
  layersSection.style.display = 'block';
  layersDiv.innerHTML = '';
  
  // Obtener todas las capas disponibles
  const capasDisponibles = Object.keys(capasConfig);
  
  // Definir el orden específico para cada grupo
  const ordenInundaciones = [
    'atlas temporada 2020',
    'atlas temporada 2021',
    'atlas temporada 2022',
    'atlas temporada 2023',
    'atlas temporada 2024'
  ];
  
  const ordenContextoGeografico = [
    'obras de proteccion',
    'rios y arroyos',
    'cuerpos de agua',
    'curvas de nivel',
    'riesgo de inundacion',
    'municipios',
    'regiones',
    'regiones_geojson',
    'estadomex',
    'estadomex_geojson'
  ];
  
  // Filtrar capas que existen en el orden definido
  const inundaciones = ordenInundaciones.filter(nombre => capasConfig[nombre]);
  const contextoGeografico = ordenContextoGeografico.filter(nombre => capasConfig[nombre]);
  
  // Crear grupo Inundaciones
  if (inundaciones.length > 0) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'layers-group';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'layers-group-title';
    titleDiv.innerHTML = '<span>Inundaciones</span><span class="layers-group-toggle collapsed">▼</span>';
    titleDiv.onclick = () => toggleLayerGroup(titleDiv.nextElementSibling, titleDiv.querySelector('.layers-group-toggle'));
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'layers-group-content collapsed';
    
    inundaciones.forEach(nombre => {
      contentDiv.appendChild(createLayerItem(nombre, nombresCapas[nombre] || nombre));
    });
    
    groupDiv.appendChild(titleDiv);
    groupDiv.appendChild(contentDiv);
    layersDiv.appendChild(groupDiv);
  }
  
  // Crear grupo Contexto Geográfico
  if (contextoGeografico.length > 0) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'layers-group';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'layers-group-title';
    titleDiv.innerHTML = '<span>Contexto Geográfico</span><span class="layers-group-toggle collapsed">▼</span>';
    titleDiv.onclick = () => toggleLayerGroup(titleDiv.nextElementSibling, titleDiv.querySelector('.layers-group-toggle'));
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'layers-group-content collapsed';
    
    contextoGeografico.forEach(nombre => {
      contentDiv.appendChild(createLayerItem(nombre, nombresCapas[nombre] || nombre));
    });
    
    groupDiv.appendChild(titleDiv);
    groupDiv.appendChild(contentDiv);
    layersDiv.appendChild(groupDiv);
  }
}

function toggleLayerGroup(contentDiv, toggleIcon) {
  contentDiv.classList.toggle('collapsed');
  toggleIcon.classList.toggle('collapsed');
}

function createLayerItem(nombre, nombreDisplay) {
  const div = document.createElement('div');
  
  // Verificar si es una capa del Programa Operativo Anual 2025
  const capasPOA2025 = [
    'caem-dgig-fise-052-25-cp', 
    'caem-dgig-fise-053-25-cp',
    'caem-dgig-fise-054-25-cp',
    'caem-dgig-fise-055-25-cp',
    'caem-dgig-fise-056-25-cp'
  ];
  const esPOA2025 = capasPOA2025.includes(nombre);
  
  if (esPOA2025) {
    // Estructura similar a KML para capas POA 2025
    div.className = 'poa-layer-item';
    div.id = `poa-layer-${nombre}`;
    
    // Agregar indicador si la capa está vacía
    const isEmpty = capasConfig[nombre] && !capasConfig[nombre].hasData;
    
    // Contar objetos anticipadamente (se actualizará cuando se cargue)
    div.innerHTML = `
      <div class="poa-layer-header">
        <div class="poa-layer-info">
          <label class="poa-layer-checkbox">
            <input type="checkbox" id="layer_${nombre}" ${isEmpty ? 'disabled' : ''}>
            <span class="poa-layer-name">${nombreDisplay || nombre}</span>
            ${isEmpty ? '<span class="poa-empty-badge">(vacía)</span>' : ''}
          </label>
          <div class="poa-layer-count" id="poa-count-${nombre}"></div>
        </div>
        <div class="poa-layer-actions">
          <button class="poa-expand-btn" id="poa-expand-${nombre}" onclick="togglePOAObjectsList('${nombre}')" title="Ver objetos" disabled>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#b99056">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <button class="poa-action-btn" onclick="zoomToCapa('${nombre}')" title="Zoom a capa" id="poa-zoom-${nombre}">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="poa-objects-list" id="poa-objects-${nombre}">
        <!-- Los objetos se agregarán dinámicamente aquí -->
      </div>
    `;
    
    // Agregar evento al checkbox
    const checkbox = div.querySelector(`#layer_${nombre}`);
    checkbox.onchange = async () => {
      await toggleCapa(nombre, checkbox.checked);
      if (checkbox.checked) {
        updatePOAObjectsList(nombre);
      } else {
        // Limpiar la lista cuando se desactiva
        const objectsList = document.getElementById(`poa-objects-${nombre}`);
        if (objectsList) {
          objectsList.innerHTML = '';
          objectsList.classList.remove('expanded');
        }
        const expandBtn = document.getElementById(`poa-expand-${nombre}`);
        if (expandBtn) {
          expandBtn.disabled = true;
          expandBtn.classList.remove('expanded');
        }
      }
    };
    
    // Cargar el conteo de objetos inmediatamente
    if (!isEmpty) {
      loadPOAObjectCount(nombre);
    } else {
      const countElement = document.getElementById(`poa-count-${nombre}`);
      if (countElement) countElement.textContent = '0 objeto(s)';
    }
    
  } else {
    // Estructura estándar para otras capas
    div.className = 'layer-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `layer_${nombre}`;
    checkbox.onchange = () => toggleCapa(nombre, checkbox.checked);
    
    const label = document.createElement('label');
    label.textContent = nombreDisplay || nombre;
    label.htmlFor = `layer_${nombre}`;
    
    // Agregar indicador si la capa está vacía
    if (capasConfig[nombre] && !capasConfig[nombre].hasData) {
      const emptyBadge = document.createElement('span');
      emptyBadge.textContent = ' (vacía)';
      emptyBadge.style.color = '#ff6b6b';
      emptyBadge.style.fontSize = '10px';
      emptyBadge.style.fontWeight = 'normal';
      label.appendChild(emptyBadge);
      checkbox.disabled = true;
      checkbox.title = 'Esta capa no contiene datos';
    }
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'layer-actions';
    
    const zoomBtn = document.createElement('button');
    zoomBtn.className = 'zoom-btn';
    zoomBtn.innerHTML = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="14" fill="none" stroke="#b99056" stroke-width="3"/><line x1="34" y1="34" x2="46" y2="46" stroke="#b99056" stroke-width="4" stroke-linecap="round"/><line x1="24" y1="18" x2="24" y2="30" stroke="#b99056" stroke-width="2.5"/><line x1="18" y1="24" x2="30" y2="24" stroke="#b99056" stroke-width="2.5"/></svg>';
    zoomBtn.title = `Zoom a ${nombreDisplay || nombre}`;
    zoomBtn.onclick = (e) => {
      e.stopPropagation();
      zoomToCapa(nombre);
    };
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.innerHTML = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 8 L32 40 M20 28 L32 40 L44 28" stroke="#b99056" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="48" width="40" height="6" rx="2" fill="#b99056"/></svg>';
    downloadBtn.title = `Descargar ${nombreDisplay || nombre}`;
    downloadBtn.onclick = (e) => {
      e.stopPropagation();
      descargarCapa(nombre);
    };
    
    actionsDiv.appendChild(zoomBtn);
    actionsDiv.appendChild(downloadBtn);
    
    div.appendChild(checkbox);
    div.appendChild(label);
    div.appendChild(actionsDiv);
  }
  
  return div;
}

async function toggleCapa(nombre, activar) {
  // Capas que activan la simbología
  const capasQueActivanSimbologia = ['regiones', 'regiones_geojson', 'riesgo de inundacion', 'obras de proteccion'];
  
  if (activar) {
    await cargarCapa(nombre);
    ultimaCapaActivada = nombre;
    
    // Definir capas del POA 2025
    const capasPOA2025 = [
      'caem-dgig-fise-052-25-cp', 
      'caem-dgig-fise-053-25-cp',
      'caem-dgig-fise-054-25-cp',
      'caem-dgig-fise-055-25-cp',
      'caem-dgig-fise-056-25-cp'
    ];
    
    if (capasPOA2025.includes(nombre)) {
      // Si es una capa del POA 2025, abrir la tabla de atributos
      openPOAAttributesPanel(nombre);
    } else if (capasQueActivanSimbologia.includes(nombre)) {
      // Solo abrir simbología si es Regionalización o Riesgo de Inundación
      checkSymbologyVisibility();
    }
    
    // Si es una capa de inundaciones, actualizar el resumen general
    if (capasInundaciones.includes(nombre)) {
      setTimeout(updateResumenGeneralInundaciones, 500);
    }
  } else {
    if (capasActivas[nombre]) {
      // Si es la capa de regiones, eliminar las etiquetas PRIMERO
      if ((nombre === 'regiones' || nombre === 'regiones_geojson')) {
        if (capasActivas[nombre].labels && Array.isArray(capasActivas[nombre].labels)) {
          capasActivas[nombre].labels.forEach(label => {
            if (map.hasLayer(label)) {
              map.removeLayer(label);
            }
          });
          // Limpiar el array de etiquetas
          capasActivas[nombre].labels = [];
        }
      }
      
      // Luego remover la capa del mapa
      if (map.hasLayer(capasActivas[nombre])) {
        map.removeLayer(capasActivas[nombre]);
      }
      
      delete capasActivas[nombre];
      
      // Si se desactiva la última capa activada, actualizar a null o a otra capa activa
      if (ultimaCapaActivada === nombre) {
        const capasActivasArray = Object.keys(capasActivas);
        ultimaCapaActivada = capasActivasArray.length > 0 ? capasActivasArray[capasActivasArray.length - 1] : null;
      }
      
      // Si es una capa del POA 2025, cerrar la tabla de atributos
      const capasPOA2025 = [
        'caem-dgig-fise-052-25-cp', 
        'caem-dgig-fise-053-25-cp',
        'caem-dgig-fise-054-25-cp',
        'caem-dgig-fise-055-25-cp',
        'caem-dgig-fise-056-25-cp'
      ];
      if (capasPOA2025.includes(nombre)) {
        closePOAAttributesPanel();
      }
    }
    
    // Verificar si debe cerrar la simbología al desactivar una capa
    checkSymbologyVisibility();
    
    // Si es una capa de inundaciones, actualizar el resumen general
    if (capasInundaciones.includes(nombre)) {
      updateResumenGeneralInundaciones();
    }
  }
}

async function zoomToCapa(nombre) {
  const status = document.getElementById('status');
  
  if (!capasActivas[nombre]) {
    // Si la capa no está activa, activarla primero
    document.getElementById(`layer_${nombre}`).checked = true;
    await cargarCapa(nombre);
  }
  
  if (capasActivas[nombre]) {
    try {
      const bounds = capasActivas[nombre].getBounds();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
        status.textContent = `📍 Centrado en ${nombre}`;
        status.className = 'status-success';
      } else {
        status.textContent = `⚠️ No se puede centrar en ${nombre}`;
        status.className = 'status-error';
      }
    } catch (err) {
      status.textContent = `❌ Error al centrar: ${err.message}`;
      status.className = 'status-error';
    }
  }
}

async function cargarCapa(nombre) {
  const status = document.getElementById('status');
  showLoading(`Cargando capa: ${nombre}`, 'Obteniendo datos del servidor...');
  status.textContent = `🔄 Cargando ${nombre}...`;
  status.className = 'status-info';
  
  try {
    const config = capasConfig[nombre];
    
    let data = capasData[nombre];
    
    if (!data) {
      // Codificar el nombre de la tabla para la URL (espacios y caracteres especiales)
      const encodedNombre = encodeURIComponent(nombre);
      const fetchUrl = `${supabaseUrl}/rest/v1/${encodedNombre}?select=*`;
      console.log(`📥 Cargando datos de: ${nombre}`);
      console.log(`📍 URL: ${fetchUrl}`);
      
      // Cargar TODOS los registros usando paginación automática
      data = [];
      let offset = 0;
      const pageSize = 1000; // Cargar 1000 registros por página
      let hasMore = true;
      
      while (hasMore) {
        const rangeEnd = offset + pageSize - 1;
        console.log(`📄 Cargando registros ${offset}-${rangeEnd}...`);
        
        const res = await fetch(fetchUrl, {
          headers: { 
            'apikey': supabaseKey, 
            'Authorization': `Bearer ${supabaseKey}`,
            'Range': `${offset}-${rangeEnd}`,
            'Prefer': 'count=exact'
          }
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`❌ Error al cargar ${nombre}:`, res.status, errorText);
          throw new Error(`Error al cargar capa (${res.status}): ${errorText.substring(0, 100)}`);
        }
        
        const pageData = await res.json();
        data = data.concat(pageData);
        
        // Verificar si hay más datos
        const contentRange = res.headers.get('Content-Range');
        if (contentRange) {
          const match = contentRange.match(/(\d+)-(\d+)\/(\d+)/);
          if (match) {
            const [, start, end, total] = match;
            console.log(`✅ Cargados ${data.length} de ${total} registros`);
            
            // Si ya cargamos todos, terminamos
            if (parseInt(end) >= parseInt(total) - 1 || pageData.length < pageSize) {
              hasMore = false;
            } else {
              offset += pageSize;
              // Actualizar el mensaje de carga
              showLoading(`Cargando ${nombre}`, `${data.length} de ${total} registros...`);
            }
          } else {
            hasMore = false;
          }
        } else {
          // Si no hay Content-Range, asumimos que no hay más datos
          hasMore = false;
        }
      }
      
      capasData[nombre] = data;
      console.log(`🎉 Carga completa de ${nombre}: ${data.length} registros totales`);
    }
    
    if (nombre === 'municipios' || nombre === 'municipios_geojson') {
      const geoJsonLayer = L.geoJSON(null, {
        style: () => ({
          color: '#8a2035',
          weight: 2,
          opacity: 1,
          fillOpacity: 0,
          dashArray: '5, 5'  // Línea punteada
        }),
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>' + nombre + '</b><br>';
          popup += `<b>Municipio:</b> ${props.municipi_1}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'municipi_1') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        if (row.geom) {
          let geometry = typeof row.geom === 'string' ? JSON.parse(row.geom) : row.geom;
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            // Validar que las coordenadas sean válidas
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }
      
      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
      
      // Actualizar selector de municipios
      if (typeof populateMunicipioSelector === 'function') {
        setTimeout(populateMunicipioSelector, 500);
      }
    }
    else if (nombre === 'atlas temporada 2024' || nombre === 'atlas temporada 2023' || 
             nombre === 'atlas temporada 2022' || nombre === 'atlas temporada 2021' || 
             nombre === 'atlas temporada 2020') {
      console.log(`📊 Cargando capa de inundaciones: ${nombre}`);
      const names = [...new Set(data.map(d => d.name))];
      const colorMap = {};
      names.forEach((n, idx) => {
        colorMap[n] = colores[idx % colores.length];
      });
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: colorMap[feature.properties.name] || '#0066CC',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>' + nombre + '</b><br>';
          popup += `<b>Name:</b> ${props.name}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'name') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        if (row.geom) {
          let geometry = typeof row.geom === 'string' ? JSON.parse(row.geom) : row.geom;
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            // Validar que las coordenadas sean válidas
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }
      
      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
      console.log(`📋 Capa ${nombre} agregada a capasActivas. Total capas: ${Object.keys(capasActivas).length}`);
      
      // Actualizar selector de fenómenos
      if (typeof populateFenomenoSelector === 'function') {
        setTimeout(populateFenomenoSelector, 500);
      }
      
      // Si hay un municipio seleccionado, actualizar estadísticas
      if (selectedMunicipio && typeof filterByMunicipio === 'function') {
        console.log('🔄 Actualizando estadísticas para municipio seleccionado:', selectedMunicipio);
        setTimeout(() => filterByMunicipio(selectedMunicipio), 300);
      }
    }
    else if (nombre === 'cajas de captacion') {
      // Paleta de colores sólidos de morado a amarillo
      const coloresDrenaje = [
        '#440154', '#472878', '#3e4a89', '#31688e', '#26828e',
        '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#ead55a'
      ];
      
      // Obtener todos los proyectos únicos
      const proyectos = [...new Set(data.map(d => d.PROYECTO || d.proyecto || 'Sin Proyecto'))];
      const colorMap = {};
      proyectos.forEach((p, idx) => {
        // Asignar amarillo específicamente para "Colector"
        if (p === 'Colector') {
          colorMap[p] = '#FFEB3B'; // Amarillo brillante
        } else {
          colorMap[p] = coloresDrenaje[idx % coloresDrenaje.length];
        }
      });
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: colorMap[proyecto] || '#b48a3f',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
        },
        style: (feature) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return {
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillColor: colorMap[proyecto] || '#999999',
            fillOpacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>' + nombre + '</b><br>';
          popup += `<b>Proyecto:</b> ${props.PROYECTO || props.proyecto || 'Sin Proyecto'}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'PROYECTO' && key !== 'proyecto') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        if (row.geom) {
          let geometry = typeof row.geom === 'string' ? JSON.parse(row.geom) : row.geom;
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }
      
      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else if (nombre === 'campamentos_edomex') {
      // Estilo para Campamentos Grupo Tlaloc - Verde
      const tipos = [...new Set(data.map(d => d.tipo || d.TIPO || 'Sin Tipo'))];
      const colorMap = {};
      
      // Generar tonos de verde para cada tipo
      const tonosVerdes = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7'];
      
      tipos.forEach((t, idx) => {
        colorMap[t] = tonosVerdes[idx % tonosVerdes.length];
      });
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const tipo = feature.properties.tipo || feature.properties.TIPO || 'Sin Tipo';
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: colorMap[tipo] || '#4CAF50',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>Campamentos Grupo Tlaloc</b><br>';
          popup += `<b>Tipo:</b> ${props.tipo || props.TIPO || 'Sin Tipo'}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'tipo' && key !== 'TIPO') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }
      
      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else if (nombre === 'lineas de conduccion-drenaje') {
      // Paleta de colores variados para drenaje
      const coloresDrenaje = [
        '#8B4513', '#A0522D', '#D2691E', '#CD853F', '#B8860B',
        '#8B7355', '#654321', '#7B3F00', '#996515', '#6F4E37'
      ];
      
      // Obtener todos los proyectos únicos
      const proyectos = [...new Set(data.map(d => d.PROYECTO || d.proyecto || 'Sin Proyecto'))];
      const colorMap = {};
      proyectos.forEach((p, idx) => {
        colorMap[p] = coloresDrenaje[idx % coloresDrenaje.length];
      });
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: colorMap[proyecto] || '#8B4513',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
        },
        style: (feature) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return {
            color: colorMap[proyecto] || '#999999',
            weight: 1.5,  // Línea más delgada
            opacity: 1,
            fillOpacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>' + nombre + '</b><br>';
          popup += `<b>Proyecto:</b> ${props.PROYECTO || props.proyecto || 'Sin Proyecto'}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'PROYECTO' && key !== 'proyecto') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });

      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`, geometry);
            }
          }
        }
      });

      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else if (nombre === 'lineas de conduccion-ap') {
      // Paleta de colores para líneas de conducción AP
      const coloresAP = [
        '#FF6B6B', '#EE5A6F', '#DC4872', '#C73E74', '#B03576',
        '#972D78', '#7C2679', '#611F7A', '#46197A', '#2B1479'
      ];
      
      // Obtener todos los proyectos únicos
      const proyectos = [...new Set(data.map(d => d.PROYECTO || d.proyecto || 'Sin Proyecto'))];
      const colorMap = {};
      proyectos.forEach((p, idx) => {
        colorMap[p] = coloresAP[idx % coloresAP.length];
      });
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: colorMap[proyecto] || '#FF6B6B',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
        },
        style: (feature) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return {
            color: colorMap[proyecto] || '#999999',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>' + nombre + '</b><br>';
          popup += `<b>Proyecto:</b> ${props.PROYECTO || props.proyecto || 'Sin Proyecto'}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'PROYECTO' && key !== 'proyecto') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        if (row.geom) {
          let geometry = typeof row.geom === 'string' ? JSON.parse(row.geom) : row.geom;
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else if (nombre === 'lineasdistribucion-drenaje') {
      // Paleta de colores para líneas de distribución drenaje
      const coloresDistDrenaje = [
        '#3d3d3d', '#4a4a4a', '#575757', '#646464', '#717171',
        '#7e7e7e', '#8b8b8b', '#989898', '#a5a5a5', '#b2b2b2'
      ];
      
      // Obtener todos los proyectos únicos
      const proyectos = [...new Set(data.map(d => d.PROYECTO || d.proyecto || 'Sin Proyecto'))];
      const colorMap = {};
      proyectos.forEach((p, idx) => {
        colorMap[p] = coloresDistDrenaje[idx % coloresDistDrenaje.length];
      });
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: colorMap[proyecto] || '#3d3d3d',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
        },
        style: (feature) => {
          const proyecto = feature.properties.PROYECTO || feature.properties.proyecto || 'Sin Proyecto';
          return {
            color: colorMap[proyecto] || '#999999',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>' + nombre + '</b><br>';
          popup += `<b>Proyecto:</b> ${props.PROYECTO || props.proyecto || 'Sin Proyecto'}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'PROYECTO' && key !== 'proyecto') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`, geometry);
            }
          }
        }
      });

      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else if (nombre === 'estadomex' || nombre === 'estadomex_geojson') {
      // Límite Estatal: solo contorno negro sin relleno
      const geoJsonLayer = L.geoJSON(null, {
        style: () => ({
          color: '#000000',
          weight: 3,
          opacity: 1,
          fillOpacity: 0  // Sin relleno
        }),
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>Límite Estatal</b><br>';
          Object.keys(props).forEach(key => {
            if (key !== 'geom') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else if (nombre === 'regiones' || nombre === 'regiones_geojson') {
      // Regionalización: categorizada por municipi_1
      const municipios = [...new Set(data.map(d => d.municipi_1 || d.MUNICIPI_1 || 'Sin Municipio'))];
      const colorMap = {};
      
      // Array para guardar todas las etiquetas de esta capa
      const layerLabels = [];
      
      // Generar colores para cada municipio
      municipios.forEach((m, idx) => {
        colorMap[m] = colores[idx % colores.length];
      });
      
      const geoJsonLayer = L.geoJSON(null, {
        style: (feature) => {
          const municipio = feature.properties.municipi_1 || feature.properties.MUNICIPI_1 || 'Sin Municipio';
          return {
            color: colorMap[municipio] || '#999999',
            weight: 2,
            opacity: 1,
            fillColor: colorMap[municipio] || '#999999',
            fillOpacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          const municipioLabel = props.municipi_1 || props.MUNICIPI_1 || 'Sin Municipio';
          
          // Crear popup
          let popup = '<b>Regionalización</b><br>';
          popup += `<b>Municipio:</b> ${municipioLabel}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'municipi_1' && key !== 'MUNICIPI_1') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
          
          // Agregar etiqueta permanente con el nombre del municipio
          if (municipioLabel && municipioLabel !== 'Sin Municipio') {
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            
            // Calcular el desplazamiento hacia la izquierda (20% del ancho del bounds)
            const boundsWidth = bounds.getEast() - bounds.getWest();
            const offsetLng = boundsWidth * 0.20;
            
            // Aplicar el desplazamiento
            const adjustedCenter = L.latLng(center.lat, center.lng - offsetLng);
            
            const label = L.marker(adjustedCenter, {
              icon: L.divIcon({
                className: 'region-label',
                html: `<div style="
                  font-size: 11px;
                  font-weight: 700;
                  color: #000000;
                  text-align: center;
                  white-space: nowrap;
                  text-shadow: 
                    -1px -1px 0 #fff,
                    1px -1px 0 #fff,
                    -1px 1px 0 #fff,
                    1px 1px 0 #fff,
                    -2px 0 0 #fff,
                    2px 0 0 #fff,
                    0 -2px 0 #fff,
                    0 2px 0 #fff;
                  pointer-events: none;
                  padding: 2px 4px;
                ">${municipioLabel}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
              }),
              interactive: false
            });
            
            // Guardar referencia a la etiqueta
            layerLabels.push(label);
            label.addTo(map);
          }
        }
      });
      
      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
      
      // Guardar las etiquetas asociadas a esta capa
      geoJsonLayer.labels = layerLabels;
    }
    else if (nombre === 'riesgo de inundacion') {
      // Categorización para Riesgo de Inundación por campo "vulner_ri"
      // Gama de tonos azules: ALTA = azul más fuerte
      const colorMapRiesgo = {
        'ALTA': '#08306bff',      // Azul muy oscuro/fuerte
        'MEDIA': '#2979b9ff',     // Azul medio
        'BAJA': '#73b2d8ff',      // Azul claro
        'MUY BAJA': '#c8dcf0ff'   // Azul muy claro
      };
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const vulner = (feature.properties.vulner_ri || 'SIN DATOS').toUpperCase();
          const color = colorMapRiesgo[vulner] || '#1E88E5';
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
        },
        style: (feature) => {
          const vulner = (feature.properties.vulner_ri || 'SIN DATOS').toUpperCase();
          const color = colorMapRiesgo[vulner] || '#1E88E5';
          return {
            color: '#ffffff',
            weight: 1,
            opacity: 1,
            fillColor: color,
            fillOpacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>Riesgo de Inundación</b><br>';
          popup += `<b>Vulnerabilidad:</b> ${props.vulner_ri || 'Sin Datos'}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key !== 'vulner_ri') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else if (nombre === 'obras de proteccion') {
      // Categorización para Obras de Protección por campo "tipoobra"
      // Usar el mapa de colores global colorMapObrasProteccion
      
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const tipoobra = (feature.properties.tipoobra || feature.properties.TIPOOBRA || feature.properties.TipoObra || 'SIN DATOS').toUpperCase();
          const color = colorMapObrasProteccion[tipoobra] || colorMapObrasProteccion['SIN DATOS'] || '#FF5722';
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          });
        },
        style: (feature) => {
          const tipoobra = (feature.properties.tipoobra || feature.properties.TIPOOBRA || feature.properties.TipoObra || 'SIN DATOS').toUpperCase();
          const color = colorMapObrasProteccion[tipoobra] || colorMapObrasProteccion['SIN DATOS'] || '#FF5722';
          return {
            color: color,
            weight: 2,
            opacity: 1,
            fillColor: color,
            fillOpacity: 0.4
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          const tipoobra = props.tipoobra || props.TIPOOBRA || props.TipoObra || 'Sin clasificar';
          let popup = '<b>Obra de Protección</b><br>';
          popup += `<b>Tipo de Obra:</b> ${tipoobra}<br>`;
          Object.keys(props).forEach(key => {
            if (key !== 'geom' && key.toLowerCase() !== 'tipoobra') {
              const val = props[key];
              if (val !== null && val !== undefined && val !== '') {
                popup += `${key}: ${val}<br>`;
              }
            }
          });
          layer.bindPopup(popup);
        }
      });
      
      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`);
            }
          }
        }
      });
      
      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    else {
      const geoJsonLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          let fillColor = config.color;
          let strokeColor = '#ffffff';
          
          // Configuración especial para capas FISE basada en campo Avance
          const capasFISE = [
            'caem-dgig-fise-052-25-cp', 
            'caem-dgig-fise-053-25-cp',
            'caem-dgig-fise-054-25-cp',
            'caem-dgig-fise-055-25-cp',
            'caem-dgig-fise-056-25-cp'
          ];
          
          if (capasFISE.includes(nombre)) {
            const avance = feature.properties.Avance || feature.properties.avance || feature.properties.AVANCE;
            if (avance === 'SI' || avance === 'Si' || avance === 'si') {
              fillColor = '#e31a1cff'; // Rojo para SI
              strokeColor = '#e31a1cff'; // Rojo oscuro para el borde
            } else if (avance === 'NO' || avance === 'No' || avance === 'no') {
              fillColor = '#e3c745ff'; // Amarillo para NO
              strokeColor = '#e3c745ff'; // Amarillo para el borde
            } else if (avance === 'En proceso' || avance === 'en proceso' || avance === 'EN PROCESO') {
              fillColor = '#53d130ff'; // Verde para En proceso
              strokeColor = '#53d130ff'; // Verde para el borde
            }
          }
          
          const markerOptions = {
            radius: 7,
            fillColor: fillColor,
            color: strokeColor,
            weight: capasFISE.includes(nombre) ? 4 : 2,
            opacity: 1,
            fillOpacity: 0.9
          };
          
          // Agregar línea punteada para "En proceso"
          if (capasFISE.includes(nombre)) {
            const avance = feature.properties.Avance || feature.properties.avance || feature.properties.AVANCE;
            if (avance === 'En proceso' || avance === 'en proceso' || avance === 'EN PROCESO') {
              markerOptions.dashArray = '5, 5';
            }
          }
          
          return L.circleMarker(latlng, markerOptions);
        },
        style: (feature) => {
          let fillColor = config.color;
          let strokeColor = '#ffffff';
          
          // Configuración especial para capas FISE basada en campo Avance
          const capasFISE = [
            'caem-dgig-fise-052-25-cp', 
            'caem-dgig-fise-053-25-cp',
            'caem-dgig-fise-054-25-cp',
            'caem-dgig-fise-055-25-cp',
            'caem-dgig-fise-056-25-cp'
          ];
          
          if (capasFISE.includes(nombre)) {
            const avance = feature.properties.Avance || feature.properties.avance || feature.properties.AVANCE;
            if (avance === 'SI' || avance === 'Si' || avance === 'si') {
              fillColor = '#e31a1cff'; // Rojo para SI
              strokeColor = '#e31a1cff'; // Rojo oscuro para el borde
            } else if (avance === 'NO' || avance === 'No' || avance === 'no') {
              fillColor = '#e3c745ff'; // Amarillo para NO
              strokeColor = '#e3c745ff'; // Amarillo para el borde
            } else if (avance === 'En proceso' || avance === 'en proceso' || avance === 'EN PROCESO') {
              fillColor = '#53d130ff'; // Verde para En proceso
              strokeColor = '#53d130ff'; // Verde para el borde
            }
          }
          
          const styleOptions = {
            color: strokeColor,
            weight: capasFISE.includes(nombre) ? 4 : 2,
            opacity: 1,
            fillColor: fillColor,
            fillOpacity: 0.9
          };
          
          // Agregar línea punteada para "En proceso"
          if (capasFISE.includes(nombre)) {
            const avance = feature.properties.Avance || feature.properties.avance || feature.properties.AVANCE;
            if (avance === 'En proceso' || avance === 'en proceso' || avance === 'EN PROCESO') {
              styleOptions.dashArray = '5, 5';
            }
          }
          
          return styleOptions;
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          let popup = '<b>' + nombre + '</b><br>';
          Object.keys(props).forEach(key => {
            if (key !== 'geom') {
              popup += `${key}: ${props[key]}<br>`;
            }
          });
          layer.bindPopup(popup);
        }
      });

      data.forEach(row => {
        const geomField = config.columna_geom || 'geom';
        if (row[geomField]) {
          let geometry = typeof row[geomField] === 'string' ? JSON.parse(row[geomField]) : row[geomField];
          
          if (geometry.coordinates) {
            geometry = reprojectGeometry(geometry);
            
            // Validar que las coordenadas sean válidas
            if (isValidGeometry(geometry)) {
              geoJsonLayer.addData({
                type: 'Feature',
                properties: row,
                geometry: geometry
              });
            } else {
              console.warn(`Geometría inválida encontrada en ${nombre}`, geometry);
            }
          }
        }
      });

      const featureCount = geoJsonLayer.getLayers().length;
      console.log(`✅ ${nombre}: ${featureCount} features válidas de ${data.length} registros`);
      
      if (featureCount === 0) {
        throw new Error('No se encontraron geometrías válidas en la capa');
      }

      geoJsonLayer.addTo(map);
      capasActivas[nombre] = geoJsonLayer;
    }
    
    // Hacer zoom inicial a estadomex si existe
    if (nombre === 'estadomex' && capasActivas['estadomex']) {
      try {
        const bounds = capasActivas['estadomex'].getBounds();
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
          console.log('🗺️ Zoom ajustado a los límites del Estado de México');
        }
      } catch (err) {
        console.warn(`Error al obtener bounds de estadomex:`, err.message);
      }
    }
    
    // Hacer zoom automático a la primera capa que se activa
    const numCapasActivas = Object.keys(capasActivas).length;
    if (numCapasActivas === 1 && capasActivas[nombre]) {
      try {
        const bounds = capasActivas[nombre].getBounds();
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
          console.log(`🎯 Zoom automático a la primera capa: ${nombre}`);
        }
      } catch (err) {
        console.warn(`Error al hacer zoom a ${nombre}:`, err.message);
      }
    }
    
    status.textContent = `✅ ${nombre} cargado (${data.length} features)`;
    status.className = 'status-success';
    hideLoading();
  } catch (err) {
    status.textContent = `❌ Error en ${nombre}: ${err.message}`;
    status.className = 'status-error';
    document.getElementById(`layer_${nombre}`).checked = false;
    hideLoading();
  }
}

async function descargarCapa(nombre) {
  const status = document.getElementById('status');
  showLoading(`Preparando descarga: ${nombre}`, 'Generando archivo GeoJSON...');
  status.textContent = `⬇️ Descargando ${nombre}...`;
  status.className = 'status-info';
  
  try {
    let data = capasData[nombre];
    
    if (!data) {
      // Codificar el nombre de la tabla para la URL (espacios y caracteres especiales)
      const encodedNombre = encodeURIComponent(nombre);
      
      // Cargar TODOS los registros usando paginación automática
      data = [];
      let offset = 0;
      const pageSize = 1000; // Cargar 1000 registros por página
      let hasMore = true;
      
      while (hasMore) {
        const rangeEnd = offset + pageSize - 1;
        console.log(`📄 Descargando registros ${offset}-${rangeEnd}...`);
        
        const res = await fetch(`${supabaseUrl}/rest/v1/${encodedNombre}?select=*`, {
          headers: { 
            'apikey': supabaseKey, 
            'Authorization': `Bearer ${supabaseKey}`,
            'Range': `${offset}-${rangeEnd}`,
            'Prefer': 'count=exact'
          }
        });
        
        if (!res.ok) throw new Error('Error al descargar capa');
        
        const pageData = await res.json();
        data = data.concat(pageData);
        
        // Verificar si hay más datos
        const contentRange = res.headers.get('Content-Range');
        if (contentRange) {
          const match = contentRange.match(/(\d+)-(\d+)\/(\d+)/);
          if (match) {
            const [, start, end, total] = match;
            console.log(`📥 Descargados ${data.length} de ${total} registros de ${nombre}`);
            
            // Actualizar mensaje de progreso
            showLoading(`Descargando ${nombre}`, `${data.length} de ${total} registros...`);
            
            // Si ya descargamos todos, terminamos
            if (parseInt(end) >= parseInt(total) - 1 || pageData.length < pageSize) {
              hasMore = false;
            } else {
              offset += pageSize;
            }
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      console.log(`🎉 Descarga completa: ${data.length} registros totales`);
    }
    
    const config = capasConfig[nombre];
    const geomField = config.columna_geom || 'geom';
    
    const geojson = {
      type: 'FeatureCollection',
      features: data.map(row => {
        let geometry = row[geomField];
        if (typeof geometry === 'string') {
          geometry = JSON.parse(geometry);
        }
        
        if (geometry && geometry.coordinates) {
          geometry = reprojectGeometry(geometry);
        }
        
        const properties = { ...row };
        delete properties[geomField];
        
        return {
          type: 'Feature',
          properties: properties,
          geometry: geometry
        };
      })
    };
    
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    status.textContent = `✅ ${nombre}.geojson descargado (${data.length} features)`;
    status.className = 'status-success';
    hideLoading();
  } catch (err) {
    status.textContent = `❌ Error al descargar: ${err.message}`;
    status.className = 'status-error';
    hideLoading();
  }
}

// Función para cargar el conteo de objetos POA antes de activar la capa
async function loadPOAObjectCount(nombre) {
  try {
    const config = capasConfig[nombre];
    if (!config) return;
    
    // Hacer una consulta rápida solo para contar con filtro de Cartera
    const countUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(nombre)}?select=*&limit=1000`;
    
    const res = await fetch(countUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      // Contar cuántos tienen campo Cartera
      const countWithCartera = data.filter(item => 
        item.Cartera || item.cartera || item.CARTERA
      ).length;
      
      const countElement = document.getElementById(`poa-count-${nombre}`);
      if (countElement) {
        countElement.textContent = `${countWithCartera} objeto(s)`;
      }
      
      // Habilitar botón expandir si hay objetos
      const expandBtn = document.getElementById(`poa-expand-${nombre}`);
      if (expandBtn && countWithCartera > 0) {
        expandBtn.disabled = false;
      }
    }
  } catch (err) {
    console.error(`Error cargando conteo de ${nombre}:`, err);
    const countElement = document.getElementById(`poa-count-${nombre}`);
    if (countElement) {
      countElement.textContent = '0 objeto(s)';
    }
  }
}

// Función para actualizar la lista de objetos POA cuando se activa una capa
function updatePOAObjectsList(nombre) {
  if (!capasActivas[nombre]) return;
  
  const layer = capasActivas[nombre];
  const features = layer.getLayers();
  
  // Actualizar contador
  const countElement = document.getElementById(`poa-count-${nombre}`);
  
  // Filtrar objetos con campo "Cartera"
  const featuresConCartera = features.filter(feature => {
    const props = feature.feature.properties;
    return props && (props.Cartera || props.cartera || props.CARTERA);
  });
  
  if (countElement) {
    countElement.textContent = `${featuresConCartera.length} objeto(s)`;
  }
  
  // Habilitar botón expandir
  const expandBtn = document.getElementById(`poa-expand-${nombre}`);
  if (expandBtn && featuresConCartera.length > 0) {
    expandBtn.disabled = false;
  }
  
  if (featuresConCartera.length === 0) return;
  
  // Crear lista de objetos
  const objectsList = document.getElementById(`poa-objects-${nombre}`);
  if (!objectsList) return;
  
  objectsList.innerHTML = '';
  
  featuresConCartera.forEach((feature, index) => {
    const props = feature.feature.properties;
    const cartera = props.Cartera || props.cartera || props.CARTERA;
    
    const objectItem = document.createElement('div');
    objectItem.className = 'poa-object-item';
    objectItem.id = `poa-object-${nombre}-${index}`;
    objectItem.innerHTML = `
      <div class="poa-object-name" title="${cartera}">${cartera}</div>
      <div class="poa-object-actions">
        <button class="poa-object-hide-btn" onclick="hidePOAObject('${nombre}', ${index})" title="Ocultar objeto">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
          </svg>
        </button>
        <button class="poa-object-zoom-btn" onclick="zoomToPOAObject('${nombre}', ${index})" title="Zoom">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
          </svg>
        </button>
      </div>
    `;
    objectsList.appendChild(objectItem);
  });
}

// Función para ocultar un objeto individual del POA
window.hidePOAObject = function(nombre, index) {
  const layer = capasActivas[nombre];
  if (!layer) return;
  
  const features = layer.getLayers();
  const featuresConCartera = features.filter(feature => {
    const props = feature.feature.properties;
    return props && (props.Cartera || props.cartera || props.CARTERA);
  });
  
  if (featuresConCartera[index]) {
    const feature = featuresConCartera[index];
    
    // Alternar visibilidad
    if (map.hasLayer(feature)) {
      map.removeLayer(feature);
      // Cambiar estilo del item
      const objectItem = document.getElementById(`poa-object-${nombre}-${index}`);
      if (objectItem) {
        objectItem.classList.add('hidden');
        // Cambiar icono a "mostrar"
        const hideBtn = objectItem.querySelector('.poa-object-hide-btn');
        if (hideBtn) {
          hideBtn.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          `;
          hideBtn.title = 'Mostrar objeto';
        }
      }
    } else {
      map.addLayer(feature);
      // Restaurar estilo
      const objectItem = document.getElementById(`poa-object-${nombre}-${index}`);
      if (objectItem) {
        objectItem.classList.remove('hidden');
        // Cambiar icono a "ocultar"
        const hideBtn = objectItem.querySelector('.poa-object-hide-btn');
        if (hideBtn) {
          hideBtn.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
            </svg>
          `;
          hideBtn.title = 'Ocultar objeto';
        }
      }
    }
  }
};

// Función para expandir/colapsar la lista de objetos POA
window.togglePOAObjectsList = function(nombre) {
  const objectsList = document.getElementById(`poa-objects-${nombre}`);
  const expandBtn = document.getElementById(`poa-expand-${nombre}`);
  
  if (objectsList && expandBtn) {
    objectsList.classList.toggle('expanded');
    expandBtn.classList.toggle('expanded');
  }
};

// Función para hacer zoom a un objeto específico del POA
window.zoomToPOAObject = function(nombre, index) {
  const layer = capasActivas[nombre];
  if (!layer) return;
  
  const features = layer.getLayers();
  const featuresConCartera = features.filter(feature => {
    const props = feature.feature.properties;
    return props && (props.Cartera || props.cartera || props.CARTERA);
  });
  
  if (featuresConCartera[index]) {
    const feature = featuresConCartera[index];
    
    try {
      // Intentar obtener bounds (funciona para polígonos y líneas)
      if (feature.getBounds) {
        const bounds = feature.getBounds();
        map.fitBounds(bounds, { padding: [50, 50] });
      } 
      // Si es un punto (marker o circleMarker)
      else if (feature.getLatLng) {
        const latlng = feature.getLatLng();
        map.setView(latlng, 16); // Zoom level 16 para puntos
      }
      
      // Abrir popup si existe
      if (feature.getPopup()) {
        feature.openPopup();
      } else if (feature.bindPopup) {
        // Si tiene bindPopup pero no está abierto, abrirlo
        feature.openPopup();
      }
    } catch (err) {
      console.error('Error al hacer zoom al objeto:', err);
      // Fallback: zoom a toda la capa
      if (layer.getBounds) {
        map.fitBounds(layer.getBounds(), { padding: [50, 50] });
      }
    }
  }
};

// Función para alternar visibilidad de una capa POA
// Función para apagar todas las capas activas
function apagarTodasLasCapas() {
  const checkboxes = document.querySelectorAll('input[id^="layer_"]');
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      checkbox.checked = false;
      const layerName = checkbox.id.replace('layer_', '');
      descargarCapa_off(layerName);
    }
  });
  
  const status = document.getElementById('status');
  status.textContent = '✅ Todas las capas han sido apagadas';
  status.className = 'status-success';
  
  setTimeout(() => {
    status.textContent = 'Listo';
    status.className = '';
  }, 2000);
}

// Función para desactivar una capa
function descargarCapa_off(nombre) {
  if (capasActivas[nombre]) {
    map.removeLayer(capasActivas[nombre]);
    delete capasActivas[nombre];
  }
}

// Función para ajustar la transparencia de polígonos
function ajustarTransparencia(valor) {
  const opacidad = valor / 100;
  
  // Actualizar ambos displays de transparencia (sidebar y flotante)
  const transparencyValue = document.getElementById('transparency-value');
  const transparencyValueFloat = document.getElementById('transparency-value-float');
  const polygonTransparency = document.getElementById('polygon-transparency');
  const polygonTransparencyFloat = document.getElementById('polygon-transparency-float');
  
  if (transparencyValue) transparencyValue.textContent = valor + '%';
  if (transparencyValueFloat) transparencyValueFloat.textContent = valor + '%';
  
  // Sincronizar ambos sliders
  if (polygonTransparency) polygonTransparency.value = valor;
  if (polygonTransparencyFloat) polygonTransparencyFloat.value = valor;
  
  // Aplicar transparencia solo a la última capa activada
  if (ultimaCapaActivada && capasActivas[ultimaCapaActivada]) {
    const capa = capasActivas[ultimaCapaActivada];
    
    if (capa && capa.eachLayer) {
      capa.eachLayer(layer => {
        // Verificar si es un polígono (no un punto ni una línea)
        if (layer.setStyle && layer.feature && layer.feature.geometry) {
          const geomType = layer.feature.geometry.type;
          if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
            layer.setStyle({
              fillOpacity: opacidad
            });
          }
        }
      });
      console.log(`🎨 Transparencia ajustada a ${valor}% para la capa: ${ultimaCapaActivada}`);
    }
  } else {
    console.log('⚠️ No hay ninguna capa activada para ajustar transparencia');
  }
}

// Función para ocultar/mostrar la barra lateral
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mapElement = document.getElementById('map');
  const toggleContainer = document.getElementById('toggle-sidebar-container');
  const toggleBtn = document.getElementById('toggle-sidebar-btn');
  const searchContainer = document.getElementById('search-places-container');
  const deactivateContainer = document.getElementById('deactivate-layers-container');
  const zoomInicioContainer = document.getElementById('zoom-inicio-container');
  const toolsContainer = document.getElementById('tools-container');
  const transparencyContainer = document.getElementById('transparency-container');
  const rightToolbar = document.getElementById('right-toolbar');
  
  // Toggle las clases
  sidebar.classList.toggle('hidden');
  mapElement.classList.toggle('expanded');
  toggleContainer.classList.toggle('sidebar-hidden');
  toggleBtn.classList.toggle('sidebar-hidden');
  
  // Aplicar toggle solo si los elementos existen
  if (searchContainer) searchContainer.classList.toggle('sidebar-hidden');
  if (deactivateContainer) deactivateContainer.classList.toggle('sidebar-hidden');
  if (zoomInicioContainer) zoomInicioContainer.classList.toggle('sidebar-hidden');
  if (toolsContainer) toolsContainer.classList.toggle('sidebar-hidden');
  if (transparencyContainer) transparencyContainer.classList.toggle('sidebar-hidden');
  if (rightToolbar) rightToolbar.classList.toggle('sidebar-hidden');
  
  // Invalidar el tamaño del mapa inmediatamente y después de la transición
  // Esto asegura que el mapa se redibuje correctamente en toda el área expandida
  setTimeout(() => {
    map.invalidateSize({
      animate: true,
      pan: false
    });
  }, 50);
  
  setTimeout(() => {
    map.invalidateSize({
      animate: true,
      pan: false
    });
  }, 350);
}

// Función para hacer zoom al estado inicial
function zoomInicio() {
  // Si existe la capa de estadomex, hacer zoom a ella
  if (capasActivas['estadomex']) {
    try {
      const bounds = capasActivas['estadomex'].getBounds();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
        console.log('🗺️ Zoom ajustado a los límites del Estado de México');
        return;
      }
    } catch (err) {
      console.warn(`Error al obtener bounds de estadomex:`, err.message);
    }
  }
  
  // Si no existe estadomex o hubo error, volver a la vista del Estado de México
  map.setView([INITIAL_ZOOM_COORDS.lat, INITIAL_ZOOM_COORDS.lng], INITIAL_ZOOM_COORDS.zoom);
  console.log('🗺️ Zoom ajustado a la vista del Estado de México');
}

// Función para mostrar/ocultar el panel de herramientas flotante
function toggleToolsPanel() {
  const toolsBtn = document.getElementById('tools-btn');
  const toolsPanel = document.getElementById('tools-panel');
  
  toolsBtn.classList.toggle('active');
  toolsPanel.classList.toggle('show');
}

// Función para mostrar/ocultar el panel de mapas base
function toggleBasemapPanel() {
  const basemapBtn = document.getElementById('basemap-btn');
  const basemapPanel = document.getElementById('basemap-panel');
  
  basemapBtn.classList.toggle('active');
  basemapPanel.classList.toggle('show');
}

// Función para cambiar el mapa base desde el botón flotante
function changeBasemapFloat(type) {
  changeBasemap(type);
  
  // Cerrar el panel después de seleccionar
  setTimeout(() => {
    toggleBasemapPanel();
  }, 300);
}

// Función para mostrar/ocultar los inputs de búsqueda de coordenadas en el panel flotante
function toggleSearchCoord() {
  const coordInputs = document.getElementById('coord-search-inputs-float');
  const searchBtn = document.getElementById('search-btn-float');
  
  if (coordInputs.style.display === 'none' || coordInputs.style.display === '') {
    coordInputs.style.display = 'block';
    searchBtn.style.background = 'linear-gradient(135deg, #b99056 0%, #8a2035 100%)';
  } else {
    coordInputs.style.display = 'none';
    searchBtn.style.background = '';
  }
}

// Función para buscar coordenadas desde el panel flotante
function buscarCoordenadasFloat() {
  const lat = parseFloat(document.getElementById('search-lat-float').value);
  const lon = parseFloat(document.getElementById('search-lon-float').value);
  
  if (isNaN(lat) || isNaN(lon)) {
    alert('Por favor ingresa coordenadas válidas');
    return;
  }
  
  // Remover marcador anterior si existe
  if (searchMarker) {
    map.removeLayer(searchMarker);
  }
  
  // Crear nuevo marcador
  searchMarker = L.marker([lat, lon], {
    icon: L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
          <path fill="#8a2035" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `),
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
  }).addTo(map);
  
  // Centrar el mapa en las coordenadas
  map.setView([lat, lon], 15);
  
  // Cerrar el panel de herramientas
  toggleToolsPanel();
  
  // Ocultar los inputs
  document.getElementById('coord-search-inputs-float').style.display = 'none';
  document.getElementById('search-btn-float').style.background = '';
}

// ========== FUNCIONES PARA MANEJO DE KML/KMZ ==========

// Variable global para almacenar las capas KML cargadas
let kmlLayers = [];
let kmlLayerCounter = 0;

// Función para manejar la carga de archivos KML/KMZ
async function handleKmlUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const fileExtension = fileName.split('.').pop().toLowerCase();

  try {
    showLoading('Cargando archivo', 'Procesando ' + fileName + '...');

    if (fileExtension === 'kmz') {
      // Procesar archivo KMZ (comprimido)
      await processKmzFile(file, fileName);
    } else if (fileExtension === 'kml') {
      // Procesar archivo KML
      await processKmlFile(file, fileName);
    } else {
      alert('Por favor selecciona un archivo KML o KMZ válido');
      hideLoading();
      return;
    }

    // Limpiar el input para poder cargar el mismo archivo nuevamente si es necesario
    event.target.value = '';
    hideLoading();

  } catch (error) {
    console.error('Error al cargar el archivo:', error);
    alert('Error al cargar el archivo: ' + error.message);
    hideLoading();
  }
}

// Función para procesar archivos KMZ
async function processKmzFile(file, fileName) {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  // Buscar el archivo .kml dentro del KMZ
  let kmlFile = null;
  for (let filename in contents.files) {
    if (filename.toLowerCase().endsWith('.kml')) {
      kmlFile = contents.files[filename];
      break;
    }
  }

  if (!kmlFile) {
    throw new Error('No se encontró archivo KML dentro del KMZ');
  }

  const kmlText = await kmlFile.async('string');
  loadKmlFromText(kmlText, fileName);
}

// Función para procesar archivos KML
async function processKmlFile(file, fileName) {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = function(e) {
      try {
        const kmlText = e.target.result;
        loadKmlFromText(kmlText, fileName);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = function() {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsText(file);
  });
}

// Función para cargar KML desde texto
function loadKmlFromText(kmlText, fileName) {
  try {
    // Crear un blob y URL temporal para el archivo
    const blob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);

    // Usar leaflet-omnivore para cargar el KML
    const kmlLayer = omnivore.kml(url);
    
    kmlLayer.on('ready', function() {
      // Liberar la URL temporal
      URL.revokeObjectURL(url);
      
      // Array para guardar las features individuales
      const features = [];
      
      // Aplicar estilos personalizados a las características
      kmlLayer.eachLayer(function(layer) {
        if (layer.setStyle) {
          layer.setStyle({
            color: '#8a2035',
            weight: 3,
            opacity: 0.5,
            fillColor: '#b99056',
            fillOpacity: 0.5
          });
        }
        
        // Guardar referencia a cada feature con su nombre y bounds
        const featureName = (layer.feature && layer.feature.properties && layer.feature.properties.name) 
          ? layer.feature.properties.name 
          : 'Sin nombre';
        
        features.push({
          name: featureName,
          layer: layer,
          bounds: layer.getBounds ? layer.getBounds() : null
        });
        
        // Agregar popup con información
        if (layer.feature && layer.feature.properties) {
          const props = layer.feature.properties;
          
          // Lista de propiedades técnicas que no queremos mostrar
          const technicalProps = [
            'stroke', 'stroke-opacity', 'stroke-width', 
            'fill', 'fill-opacity', 
            'marker-color', 'marker-size', 'marker-symbol',
            'styleUrl', 'styleHash', 'styleMapHash',
            '_storage_options', '_umap_options'
          ];
          
          let popupContent = '<div style="max-width: 250px;">';
          popupContent += '<b style="color: #8a2035; font-size: 14px; display: block; margin-bottom: 8px;">' + (props.name || 'Sin nombre') + '</b>';
          
          if (props.description) {
            popupContent += '<div style="font-size: 12px; color: #666; margin-bottom: 8px;">' + props.description + '</div>';
          }
          
          // Agregar otras propiedades, filtrando las técnicas
          for (let key in props) {
            // Filtrar propiedades que no queremos mostrar
            if (key !== 'name' && 
                key !== 'description' && 
                !technicalProps.includes(key) && 
                !key.startsWith('_') &&
                props[key]) {
              popupContent += '<div style="font-size: 11px; margin: 4px 0;"><b>' + key + ':</b> ' + props[key] + '</div>';
            }
          }
          
          popupContent += '</div>';
          layer.bindPopup(popupContent);
        }
      });
      
      // Agregar la capa al mapa
      kmlLayer.addTo(map);
      
      // Contar características
      let featureCount = features.length;
      
      // Guardar información de la capa
      kmlLayerCounter++;
      const layerInfo = {
        id: 'kml_' + kmlLayerCounter,
        name: fileName,
        layer: kmlLayer,
        visible: true,
        featureCount: featureCount,
        features: features // Guardar las features individuales
      };
      
      kmlLayers.push(layerInfo);
      
      // Actualizar la lista en la interfaz
      updateKmlLayersList();
      
      // Hacer zoom a la extensión de la capa
      try {
        const bounds = kmlLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.log('No se pudo hacer zoom automático');
      }
    });
    
    kmlLayer.on('error', function(e) {
      console.error('Error al cargar KML:', e);
      alert('Error al procesar el archivo KML');
    });
    
  } catch (error) {
    console.error('Error en loadKmlFromText:', error);
    throw error;
  }
}

// Función para actualizar la lista de capas KML
function updateKmlLayersList() {
  const container = document.getElementById('kml-layers-list-sidebar');
  const clearBtn = document.getElementById('clear-kml-btn');
  
  if (kmlLayers.length === 0) {
    container.innerHTML = '<div class="kml-empty-state">No hay archivos cargados</div>';
    clearBtn.disabled = true;
    return;
  }
  
  clearBtn.disabled = false;
  container.innerHTML = '';
  
  kmlLayers.forEach((layerInfo, index) => {
    const item = document.createElement('div');
    item.className = 'kml-layer-item';
    
    // Crear el header con info básica y acciones
    const hasMultipleFeatures = layerInfo.features && layerInfo.features.length > 1;
    
    item.innerHTML = `
      <div class="kml-layer-header">
        <div class="kml-layer-info">
          <div class="kml-layer-name" title="${layerInfo.name}">${layerInfo.name}</div>
          <div class="kml-layer-features">${layerInfo.featureCount} objeto(s)</div>
        </div>
        <div class="kml-layer-actions">
          ${hasMultipleFeatures ? `
          <button class="kml-expand-btn" onclick="toggleKmlFeaturesList(${index})" title="Ver objetos">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#b99056">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          ` : ''}
          <button class="kml-action-btn visibility-btn ${layerInfo.visible ? '' : 'hidden'}" 
                  onclick="toggleKmlLayerVisibility(${index})" 
                  title="${layerInfo.visible ? 'Ocultar' : 'Mostrar'}">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              ${layerInfo.visible ? 
                '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' :
                '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>'
              }
            </svg>
          </button>
          <button class="kml-action-btn" onclick="zoomToKmlLayer(${index})" title="Zoom a capa">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
            </svg>
          </button>
          <button class="kml-action-btn" onclick="removeKmlLayer(${index})" title="Eliminar">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Si tiene múltiples features, agregar la lista expandible
    if (hasMultipleFeatures) {
      const featuresList = document.createElement('div');
      featuresList.className = 'kml-features-list';
      featuresList.id = `kml-features-${index}`;
      
      layerInfo.features.forEach((feature, featureIndex) => {
        const featureItem = document.createElement('div');
        featureItem.className = 'kml-feature-item';
        featureItem.innerHTML = `
          <div class="kml-feature-name" title="${feature.name}">${feature.name}</div>
          <button class="kml-feature-zoom-btn" onclick="zoomToKmlFeature(${index}, ${featureIndex})" title="Zoom">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
            </svg>
          </button>
        `;
        featuresList.appendChild(featureItem);
      });
      
      item.appendChild(featuresList);
    }
    
    container.appendChild(item);
  });
}

// Función para expandir/colapsar la lista de features
function toggleKmlFeaturesList(index) {
  const featuresList = document.getElementById(`kml-features-${index}`);
  const expandBtn = event.currentTarget;
  
  if (featuresList) {
    featuresList.classList.toggle('expanded');
    expandBtn.classList.toggle('expanded');
  }
}

// Función para hacer zoom a una feature específica
function zoomToKmlFeature(layerIndex, featureIndex) {
  if (layerIndex < 0 || layerIndex >= kmlLayers.length) return;
  
  const layerInfo = kmlLayers[layerIndex];
  if (!layerInfo.features || featureIndex < 0 || featureIndex >= layerInfo.features.length) return;
  
  const feature = layerInfo.features[featureIndex];
  
  // Si la capa está oculta, mostrarla primero
  if (!layerInfo.visible) {
    layerInfo.layer.addTo(map);
    layerInfo.visible = true;
    updateKmlLayersList();
  }
  
  // Hacer zoom a la feature
  if (feature.bounds && feature.bounds.isValid()) {
    map.fitBounds(feature.bounds, { padding: [50, 50] });
    
    // Si tiene popup, abrirlo
    if (feature.layer && feature.layer.getPopup) {
      setTimeout(() => {
        feature.layer.openPopup();
      }, 300);
    }
  } else if (feature.layer && feature.layer.getLatLng) {
    // Para puntos
    const latlng = feature.layer.getLatLng();
    map.setView(latlng, 16);
    setTimeout(() => {
      if (feature.layer.openPopup) {
        feature.layer.openPopup();
      }
    }, 300);
  }
}

// Función para alternar la visibilidad de una capa KML
function toggleKmlLayerVisibility(index) {
  if (index < 0 || index >= kmlLayers.length) return;
  
  const layerInfo = kmlLayers[index];
  
  if (layerInfo.visible) {
    map.removeLayer(layerInfo.layer);
    layerInfo.visible = false;
  } else {
    layerInfo.layer.addTo(map);
    layerInfo.visible = true;
  }
  
  updateKmlLayersList();
}

// Función para hacer zoom a una capa KML
function zoomToKmlLayer(index) {
  if (index < 0 || index >= kmlLayers.length) return;
  
  const layerInfo = kmlLayers[index];
  
  // Si la capa está oculta, mostrarla primero
  if (!layerInfo.visible) {
    layerInfo.layer.addTo(map);
    layerInfo.visible = true;
    updateKmlLayersList();
  }
  
  try {
    const bounds = layerInfo.layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  } catch (e) {
    console.error('Error al hacer zoom:', e);
    alert('No se pudo calcular la extensión de esta capa');
  }
}

// Función para eliminar una capa KML específica
function removeKmlLayer(index) {
  if (index < 0 || index >= kmlLayers.length) return;
  
  const layerInfo = kmlLayers[index];
  
  // Remover la capa del mapa
  if (layerInfo.visible) {
    map.removeLayer(layerInfo.layer);
  }
  
  // Remover de la lista
  kmlLayers.splice(index, 1);
  
  // Actualizar la interfaz
  updateKmlLayersList();
}

// Función para limpiar todas las capas KML
function clearAllKml() {
  if (kmlLayers.length === 0) {
    return;
  }
  
  // Remover todas las capas del mapa
  kmlLayers.forEach(layerInfo => {
    if (layerInfo.visible) {
      map.removeLayer(layerInfo.layer);
    }
  });
  
  // Limpiar el array
  kmlLayers = [];
  
  // Actualizar la interfaz
  updateKmlLayersList();
}

// ========== FIN DE FUNCIONES KML/KMZ ==========

// ========== FUNCIONES PARA LA BARRA LATERAL DERECHA ==========

// Variable global para las capas KML del panel derecho
let kmlLayersRight = [];

// Función para alternar búsqueda de coordenadas desde la barra de herramientas
function toggleSearchCoordFromToolbar() {
  toggleCoordSearchPanelRight();
}

// Función para alternar búsqueda de lugares
function toggleSearchPlaces() {
  togglePlacesSearchPanelRight();
}

// Función para alternar el panel de KML desde la barra derecha
function toggleKmlPanelRight() {
  const panel = document.getElementById('kml-panel-right');
  const basemapPanel = document.getElementById('basemap-panel-right');
  const coordPanel = document.getElementById('coord-search-panel-right');
  const placesPanel = document.getElementById('places-search-panel-right');
  
  // Cerrar el panel de mapas base si está abierto
  if (basemapPanel && basemapPanel.classList.contains('show')) {
    basemapPanel.classList.remove('show');
  }
  
  // Cerrar el panel de coordenadas si está abierto
  if (coordPanel && coordPanel.classList.contains('show')) {
    coordPanel.classList.remove('show');
  }
  
  // Cerrar el panel de lugares si está abierto
  if (placesPanel && placesPanel.classList.contains('show')) {
    placesPanel.classList.remove('show');
  }
  
  if (panel) {
    if (panel.classList.contains('show')) {
      panel.classList.remove('show');
    } else {
      panel.classList.add('show');
    }
  }
}

// Función para alternar el panel de mapas base desde la barra derecha
function toggleBasemapPanelRight() {
  const panel = document.getElementById('basemap-panel-right');
  const kmlPanel = document.getElementById('kml-panel-right');
  const coordPanel = document.getElementById('coord-search-panel-right');
  const placesPanel = document.getElementById('places-search-panel-right');
  
  // Cerrar el panel de KML si está abierto
  if (kmlPanel && kmlPanel.classList.contains('show')) {
    kmlPanel.classList.remove('show');
  }
  
  // Cerrar el panel de coordenadas si está abierto
  if (coordPanel && coordPanel.classList.contains('show')) {
    coordPanel.classList.remove('show');
  }
  
  // Cerrar el panel de lugares si está abierto
  if (placesPanel && placesPanel.classList.contains('show')) {
    placesPanel.classList.remove('show');
  }
  
  if (panel) {
    if (panel.classList.contains('show')) {
      panel.classList.remove('show');
    } else {
      panel.classList.add('show');
    }
  }
}

// Función para alternar el panel de búsqueda de coordenadas desde la barra derecha
function toggleCoordSearchPanelRight() {
  const panel = document.getElementById('coord-search-panel-right');
  const kmlPanel = document.getElementById('kml-panel-right');
  const basemapPanel = document.getElementById('basemap-panel-right');
  const placesPanel = document.getElementById('places-search-panel-right');
  
  // Cerrar otros paneles si están abiertos
  if (kmlPanel && kmlPanel.classList.contains('show')) {
    kmlPanel.classList.remove('show');
  }
  
  if (basemapPanel && basemapPanel.classList.contains('show')) {
    basemapPanel.classList.remove('show');
  }
  
  if (placesPanel && placesPanel.classList.contains('show')) {
    placesPanel.classList.remove('show');
  }
  
  if (panel) {
    if (panel.classList.contains('show')) {
      panel.classList.remove('show');
    } else {
      panel.classList.add('show');
      // Enfocar el input de latitud cuando se abre el panel
      setTimeout(() => {
        const latInput = document.getElementById('coord-lat-input');
        if (latInput) latInput.focus();
      }, 100);
    }
  }
}

// Función para alternar el panel de búsqueda de lugares desde la barra derecha
function togglePlacesSearchPanelRight() {
  const panel = document.getElementById('places-search-panel-right');
  const kmlPanel = document.getElementById('kml-panel-right');
  const basemapPanel = document.getElementById('basemap-panel-right');
  const coordPanel = document.getElementById('coord-search-panel-right');
  
  // Cerrar otros paneles si están abiertos
  if (kmlPanel && kmlPanel.classList.contains('show')) {
    kmlPanel.classList.remove('show');
  }
  
  if (basemapPanel && basemapPanel.classList.contains('show')) {
    basemapPanel.classList.remove('show');
  }
  
  if (coordPanel && coordPanel.classList.contains('show')) {
    coordPanel.classList.remove('show');
  }
  
  if (panel) {
    if (panel.classList.contains('show')) {
      panel.classList.remove('show');
    } else {
      panel.classList.add('show');
      // Enfocar el input de búsqueda cuando se abre el panel
      setTimeout(() => {
        const searchInput = document.getElementById('places-search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  }
}

// Función para buscar lugares desde el panel
async function searchPlacesFromPanel(event) {
  const query = event.target.value.trim();
  const resultsDiv = document.getElementById('places-search-results');
  const loadingDiv = document.getElementById('places-search-loading');
  
  // Limpiar timeout anterior
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  if (query.length < 3) {
    resultsDiv.innerHTML = '';
    loadingDiv.classList.remove('show');
    return;
  }
  
  // Esperar 500ms después de que el usuario deje de escribir
  searchTimeout = setTimeout(async () => {
    loadingDiv.classList.add('show');
    resultsDiv.innerHTML = '';
    
    try {
      // Usar Nominatim de OpenStreetMap para búsqueda en México
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&countrycodes=mx`
      );
      
      if (!response.ok) throw new Error('Error en la búsqueda');
      
      const results = await response.json();
      loadingDiv.classList.remove('show');
      
      if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">No se encontraron resultados</div>';
        return;
      }
      
      resultsDiv.innerHTML = results.map(result => `
        <div class="place-result-item" onclick="goToPlaceFromPanel(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">
          <div class="place-result-name">${result.display_name.split(',')[0]}</div>
          <div class="place-result-address">${result.display_name}</div>
        </div>
      `).join('');
      
    } catch (error) {
      loadingDiv.classList.remove('show');
      resultsDiv.innerHTML = '<div style="padding: 15px; text-align: center; color: #e74c3c; font-size: 12px;">⚠️ Error al buscar lugares</div>';
    }
  }, 500);
}

// Función para ir al lugar seleccionado
function goToPlaceFromPanel(lat, lon, name) {
  // Remover marcador anterior si existe
  if (searchPlacesMarker) {
    map.removeLayer(searchPlacesMarker);
  }
  
  // Crear nuevo marcador con ícono personalizado
  searchPlacesMarker = L.marker([lat, lon], {
    icon: L.divIcon({
      className: 'custom-search-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #8a2035 0%, #b99056 100%); 
          width: 30px; 
          height: 30px; 
          border-radius: 50% 50% 50% 0; 
          transform: rotate(-45deg); 
          border: 3px solid white; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 12px; 
            height: 12px; 
            background: white; 
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    })
  }).addTo(map);
  
  // Crear popup con el nombre del lugar
  searchPlacesMarker.bindPopup(`
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 5px;">
      <strong style="color: #8a2035; font-size: 13px;">${name.split(',')[0]}</strong><br>
      <span style="font-size: 11px; color: #666;">${name}</span><br>
      <span style="font-size: 10px; color: #999; margin-top: 5px; display: block;">
        ${lat.toFixed(6)}°, ${lon.toFixed(6)}°
      </span>
    </div>
  `).openPopup();
  
  // Centrar el mapa en la ubicación
  map.setView([lat, lon], 14, {
    animate: true,
    duration: 1
  });
  
  // Cerrar el panel de búsqueda
  togglePlacesSearchPanelRight();
  
  // Mostrar mensaje de éxito
  const status = document.getElementById('status');
  if (status) {
    status.textContent = `📍 ${name.split(',')[0]}`;
    status.className = 'status-success';
  }
}

// ============================================================================
// BÚSQUEDA DE LUGARES PARA VISTA 3D
// ============================================================================

let searchTimeout3D = null;

async function searchPlacesFrom3D(event) {
  const query = event.target.value.trim();
  const resultsDiv = document.getElementById('places-search-results-3d');
  const loadingDiv = document.getElementById('places-search-loading-3d');
  
  // Limpiar timeout anterior
  if (searchTimeout3D) {
    clearTimeout(searchTimeout3D);
  }
  
  if (query.length < 3) {
    resultsDiv.innerHTML = '';
    if (loadingDiv) loadingDiv.style.display = 'none';
    return;
  }
  
  // Esperar 500ms después de que el usuario deje de escribir
  searchTimeout3D = setTimeout(async () => {
    if (loadingDiv) loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = '';
    
    try {
      // Usar Nominatim de OpenStreetMap para búsqueda en México
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&countrycodes=mx`
      );
      
      if (!response.ok) throw new Error('Error en la búsqueda');
      
      const results = await response.json();
      if (loadingDiv) loadingDiv.style.display = 'none';
      
      if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">No se encontraron resultados</div>';
        return;
      }
      
      resultsDiv.innerHTML = results.map(result => `
        <div class="place-result-item" onclick="goToPlaceFrom3D(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">
          <div class="place-result-name">${result.display_name.split(',')[0]}</div>
          <div class="place-result-address">${result.display_name}</div>
        </div>
      `).join('');
      
    } catch (error) {
      if (loadingDiv) loadingDiv.style.display = 'none';
      resultsDiv.innerHTML = '<div style="padding: 15px; text-align: center; color: #e74c3c; font-size: 12px;">⚠️ Error al buscar lugares</div>';
      console.error('Error en búsqueda 3D:', error);
    }
  }, 500);
}

// Función para ir al lugar seleccionado en vista 3D
function goToPlaceFrom3D(lat, lon, name) {
  if (!maplibreMap || !is3DActive) {
    console.warn('MapLibre no está disponible');
    return;
  }
  
  console.log(`🎯 Navegando a: ${name} [${lat}, ${lon}]`);
  
  // Centrar el mapa en la ubicación con animación
  maplibreMap.flyTo({
    center: [lon, lat],
    zoom: 14,
    pitch: 60,
    bearing: 0,
    duration: 2000,
    essential: true
  });
  
  // Agregar un marcador temporal en la ubicación
  const el = document.createElement('div');
  el.className = 'maplibre-marker-3d';
  el.style.width = '30px';
  el.style.height = '30px';
  el.style.background = 'linear-gradient(135deg, #8a2035 0%, #b99056 100%)';
  el.style.borderRadius = '50% 50% 50% 0';
  el.style.transform = 'rotate(-45deg)';
  el.style.border = '3px solid white';
  el.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  el.style.cursor = 'pointer';
  
  // Crear popup con información
  const popup = new maplibregl.Popup({ offset: 25 })
    .setHTML(`
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 5px;">
        <strong style="color: #8a2035; font-size: 13px;">${name.split(',')[0]}</strong><br>
        <span style="font-size: 11px; color: #666;">${name}</span><br>
        <span style="font-size: 10px; color: #999; margin-top: 5px; display: block;">
          ${lat.toFixed(6)}°, ${lon.toFixed(6)}°
        </span>
      </div>
    `);
  
  // Agregar marcador al mapa
  new maplibregl.Marker(el)
    .setLngLat([lon, lat])
    .setPopup(popup)
    .addTo(maplibreMap)
    .togglePopup();
  
  console.log('✅ Marcador agregado en vista 3D');
  
  // Limpiar el input de búsqueda
  const input = document.getElementById('places-search-input-3d');
  if (input) input.value = '';
  
  // Limpiar resultados
  const resultsDiv = document.getElementById('places-search-results-3d');
  if (resultsDiv) resultsDiv.innerHTML = '';
}

// Función para buscar coordenadas desde el panel
function buscarCoordenadasFromPanel() {
  const latInput = document.getElementById('coord-lat-input');
  const lngInput = document.getElementById('coord-lng-input');
  
  if (!latInput || !lngInput) return;
  
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  
  if (isNaN(lat) || isNaN(lng)) {
    alert('Por favor ingresa valores numéricos válidos para latitud y longitud');
    return;
  }
  
  // Validar rangos de coordenadas
  if (lat < -90 || lat > 90) {
    alert('La latitud debe estar entre -90 y 90 grados');
    return;
  }
  
  if (lng < -180 || lng > 180) {
    alert('La longitud debe estar entre -180 y 180 grados');
    return;
  }
  
  // Remover marcador anterior si existe
  if (searchMarker) {
    map.removeLayer(searchMarker);
  }
  
  // Crear nuevo marcador
  searchMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'search-marker',
      html: '<div style="background: #8a2035; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map);
  
  // Agregar popup al marcador
  searchMarker.bindPopup(`
    <div style="text-align: center;">
      <strong>Ubicación</strong><br>
      Lat: ${lat.toFixed(6)}°<br>
      Lon: ${lng.toFixed(6)}°
    </div>
  `).openPopup();
  
  // Hacer zoom a la ubicación
  map.setView([lat, lng], 15);
  
  // Cerrar el panel
  toggleCoordSearchPanelRight();
  
  // Mostrar mensaje de éxito
  const status = document.getElementById('status');
  if (status) {
    status.textContent = `📍 Ubicación encontrada: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    status.className = 'status-success';
  }
}

// Función para cambiar el mapa base desde el panel derecho
function changeBasemapFromRight(type) {
  // Simplemente llamar a la función principal changeBasemap
  changeBasemap(type);
}

// Función para manejar la carga de archivos KML desde el panel derecho
function handleKmlUploadRight(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  if (file.name.toLowerCase().endsWith('.kmz')) {
    reader.onload = function(e) {
      JSZip.loadAsync(e.target.result).then(function(zip) {
        const kmlFile = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
        if (kmlFile) {
          zip.files[kmlFile].async('string').then(function(kmlText) {
            loadKmlFromTextRight(kmlText, file.name);
          });
        }
      });
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = function(e) {
      loadKmlFromTextRight(e.target.result, file.name);
    };
    reader.readAsText(file);
  }
  
  // Limpiar el input
  event.target.value = '';
}

// Función para cargar KML desde texto en el panel derecho
function loadKmlFromTextRight(kmlText, fileName) {
  try {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
    
    const layer = omnivore.kml.parse(kmlText);
    
    // Contar features y extraer información
    let featureCount = 0;
    const features = [];
    
    layer.eachLayer(function(featureLayer) {
      featureCount++;
      if (featureLayer.feature && featureLayer.feature.properties) {
        features.push({
          name: featureLayer.feature.properties.name || `Objeto ${featureCount}`,
          layer: featureLayer
        });
      }
    });
    
    // Agregar al mapa
    layer.addTo(map);
    
    // Guardar referencia
    const layerIndex = kmlLayersRight.length;
    kmlLayersRight.push({
      name: fileName,
      layer: layer,
      visible: true,
      bounds: layer.getBounds(),
      featureCount: featureCount,
      features: features
    });
    
    // Zoom a la capa
    if (layer.getBounds().isValid()) {
      map.fitBounds(layer.getBounds());
    }
    
    // Actualizar la lista
    updateKmlLayersListRight();
    
    console.log('✅ KML cargado correctamente:', fileName);
  } catch (error) {
    console.error('Error al cargar KML:', error);
    alert('Error al cargar el archivo KML/KMZ');
  }
}

// Función para expandir/colapsar la lista de features
function toggleKmlFeaturesListRight(index) {
  const featuresList = document.getElementById(`kml-features-right-${index}`);
  if (featuresList) {
    featuresList.classList.toggle('expanded');
  }
}

// Función para hacer zoom a una feature específica
function zoomToKmlFeatureRight(layerIndex, featureIndex) {
  if (!kmlLayersRight[layerIndex]) return;
  
  const layerInfo = kmlLayersRight[layerIndex];
  if (!layerInfo.features || !layerInfo.features[featureIndex]) return;
  
  const feature = layerInfo.features[featureIndex];
  
  // Obtener los bounds de la feature
  if (feature.layer.getBounds) {
    map.fitBounds(feature.layer.getBounds());
  } else if (feature.layer.getLatLng) {
    map.setView(feature.layer.getLatLng(), 16);
  }
}

// Función para actualizar la lista de capas KML en el panel derecho
function updateKmlLayersListRight() {
  const container = document.getElementById('kml-layers-list-right');
  const clearBtn = document.getElementById('clear-kml-btn-right');
  
  if (!container) return;
  
  if (kmlLayersRight.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999; font-size: 13px;">No hay archivos KML cargados</div>';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  
  if (clearBtn) clearBtn.style.display = 'block';
  
  container.innerHTML = '';
  
  kmlLayersRight.forEach((layerInfo, index) => {
    const item = document.createElement('div');
    item.className = 'kml-layer-item-right';
    
    // Crear el header con info básica y acciones
    const hasMultipleFeatures = layerInfo.features && layerInfo.features.length > 1;
    
    item.innerHTML = `
      <div class="kml-layer-header-right">
        <div class="kml-layer-info-right">
          <div class="kml-layer-name-right" title="${layerInfo.name}">${layerInfo.name}</div>
          <div class="kml-layer-features-right">${layerInfo.featureCount || 1} objeto(s)</div>
        </div>
        <div class="kml-layer-actions-right">
          ${hasMultipleFeatures ? `
          <button class="kml-expand-btn-right" onclick="toggleKmlFeaturesListRight(${index})" title="Ver objetos">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#b99056">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          ` : ''}
          <button class="kml-action-btn-right visibility-btn ${layerInfo.visible ? '' : 'hidden'}" 
                  onclick="toggleKmlLayerVisibilityRight(${index})" 
                  title="${layerInfo.visible ? 'Ocultar' : 'Mostrar'}">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              ${layerInfo.visible ? 
                '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' :
                '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>'
              }
            </svg>
          </button>
          <button class="kml-action-btn-right" onclick="zoomToKmlLayerRight(${index})" title="Zoom a capa">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
            </svg>
          </button>
          <button class="kml-action-btn-right" onclick="removeKmlLayerRight(${index})" title="Eliminar">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Si tiene múltiples features, agregar la lista expandible
    if (hasMultipleFeatures) {
      const featuresList = document.createElement('div');
      featuresList.className = 'kml-features-list-right';
      featuresList.id = `kml-features-right-${index}`;
      
      layerInfo.features.forEach((feature, featureIndex) => {
        const featureItem = document.createElement('div');
        featureItem.className = 'kml-feature-item-right';
        featureItem.innerHTML = `
          <div class="kml-feature-name-right" title="${feature.name}">${feature.name}</div>
          <button class="kml-feature-zoom-btn-right" onclick="zoomToKmlFeatureRight(${index}, ${featureIndex})" title="Zoom">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#8a2035">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
            </svg>
          </button>
        `;
        featuresList.appendChild(featureItem);
      });
      
      item.appendChild(featuresList);
    }
    
    container.appendChild(item);
  });
}

// Función para alternar visibilidad de una capa KML
function toggleKmlLayerVisibilityRight(index) {
  if (!kmlLayersRight[index]) return;
  
  const layerInfo = kmlLayersRight[index];
  
  if (layerInfo.visible) {
    map.removeLayer(layerInfo.layer);
    layerInfo.visible = false;
  } else {
    layerInfo.layer.addTo(map);
    layerInfo.visible = true;
  }
  
  updateKmlLayersListRight();
}

// Función para hacer zoom a una capa KML
function zoomToKmlLayerRight(index) {
  if (!kmlLayersRight[index]) return;
  
  const layerInfo = kmlLayersRight[index];
  
  if (layerInfo.bounds && layerInfo.bounds.isValid()) {
    map.fitBounds(layerInfo.bounds);
  }
}

// Función para eliminar una capa KML
function removeKmlLayerRight(index) {
  if (!kmlLayersRight[index]) return;
  
  const layerInfo = kmlLayersRight[index];
  
  // Remover del mapa
  if (layerInfo.visible) {
    map.removeLayer(layerInfo.layer);
  }
  
  // Remover del array
  kmlLayersRight.splice(index, 1);
  
  // Actualizar la lista
  updateKmlLayersListRight();
}

// Función para limpiar todas las capas KML del panel derecho
function clearAllKmlRight() {
  if (kmlLayersRight.length === 0) return;
  
  // Confirmar
  if (!confirm('¿Deseas eliminar todos los archivos KML cargados?')) {
    return;
  }
  
  // Remover todas las capas del mapa
  kmlLayersRight.forEach(layerInfo => {
    if (layerInfo.visible) {
      map.removeLayer(layerInfo.layer);
    }
  });
  
  // Limpiar el array
  kmlLayersRight = [];
  
  // Actualizar la interfaz
  updateKmlLayersListRight();
}

// Cerrar paneles si se hace clic fuera de ellos
document.addEventListener('click', function(event) {
  const basemapPanel = document.getElementById('basemap-panel-right');
  const kmlPanel = document.getElementById('kml-panel-right');
  const toolbar = document.getElementById('right-toolbar');
  
  // Paneles de mapas base y KML
  if (basemapPanel && toolbar && kmlPanel) {
    const clickedInsideBasemapPanel = basemapPanel.contains(event.target);
    const clickedInsideKmlPanel = kmlPanel.contains(event.target);
    const clickedInsideToolbar = toolbar.contains(event.target);
    
    if (!clickedInsideBasemapPanel && !clickedInsideToolbar && basemapPanel.classList.contains('show')) {
      basemapPanel.classList.remove('show');
    }
    
    if (!clickedInsideKmlPanel && !clickedInsideToolbar && kmlPanel.classList.contains('show')) {
      kmlPanel.classList.remove('show');
    }
  }
});

// ========== FIN DE FUNCIONES PARA BARRA LATERAL DERECHA ==========

// ========== NUEVAS FUNCIONES ==========

// Función para toggle del botón de búsqueda en la sidebar izquierda
function toggleSearchSidebar() {
  const searchInputs = document.getElementById('coord-search-inputs');
  const searchBtn = document.getElementById('search-btn');
  
  if (searchInputs.style.display === 'none') {
    searchInputs.style.display = 'block';
    searchBtn.classList.add('active');
  } else {
    searchInputs.style.display = 'none';
    searchBtn.classList.remove('active');
  }
}

// Función para buscar coordenadas desde la sidebar
function buscarCoordenadasSidebar() {
  const lat = parseFloat(document.getElementById('search-lat').value);
  const lng = parseFloat(document.getElementById('search-lon').value);
  
  if (isNaN(lat) || isNaN(lng)) {
    alert('Por favor, ingresa coordenadas válidas.');
    return;
  }
  
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    alert('Las coordenadas deben estar dentro de los rangos válidos:\nLatitud: -90 a 90\nLongitud: -180 a 180');
    return;
  }
  
  // Remover marcador anterior si existe
  if (searchMarker) {
    map.removeLayer(searchMarker);
  }
  
  // Crear nuevo marcador personalizado
  const icon = L.divIcon({
    className: 'custom-search-marker',
    html: `<div style="
      background: linear-gradient(135deg, #8a2035 0%, #6d1a2a 100%);
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
  
  searchMarker = L.marker([lat, lng], { icon: icon })
    .addTo(map)
    .bindPopup(`<b>Ubicación buscada</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`)
    .openPopup();
  
  map.setView([lat, lng], 15);
  
  // Limpiar inputs después de buscar (opcional)
  // document.getElementById('search-lat').value = '';
  // document.getElementById('search-lon').value = '';
}

// Función para toggle del panel de transparencia

// ========== FIN NUEVAS FUNCIONES ==========

// Conectar automáticamente a Supabase al cargar la página
window.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Conectando automáticamente a Supabase...');
  // Esperar un momento para que el DOM esté completamente cargado
  setTimeout(function() {
    conectar();
  }, 500);
});

// Event listeners para búsqueda de coordenadas con Enter
document.addEventListener('DOMContentLoaded', function() {
  const latInput = document.getElementById('coord-lat-input');
  const lngInput = document.getElementById('coord-lng-input');
  
  if (latInput) {
    latInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        buscarCoordenadasFromPanel();
      }
    });
  }
  
  if (lngInput) {
    lngInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        buscarCoordenadasFromPanel();
      }
    });
  }
});

// ==================== VISTA DE RELIEVE CON MAPLIBRE ====================

let maplibreMap = null;
let is3DActive = false;
let activeLayersIn3D = {}; // Almacenar las capas activas en 3D

// API Key de MapTiler
const MAPTILER_KEY = 'V4RBY4K49xvpih23bdBO';

// Configuración del Estado de México con bounds ampliados
const EDOMEX_CONFIG = {
  maxBounds: [
    [-101.5, 17.5], // SO - Ampliado significativamente para dar más espacio y mostrar fondo negro
    [-97.5, 21.0]   // NE - Ampliado significativamente
  ],
  center: [-99.6557, 19.2827], // Toluca
  visualBounds: [
    [-100.2, 18.8],
    [-98.9, 20.0]
  ]
};

// Coordenadas del Estado de México y áreas específicas (manteniendo compatibilidad con tu HTML)
const EDOMEX_AREAS = {
  full: {
    center: [-99.6557, 19.2827],
    zoom: 9.5,
    pitch: 60,
    name: "Estado Completo"
  },
  norte: {
    center: [-99.2, 19.8],
    zoom: 10,
    pitch: 60,
    name: "Norte (Tepotzotlán, Zumpango)"
  },
  sur: {
    center: [-99.2, 18.9],
    zoom: 10,
    pitch: 60,
    name: "Sur (Tenancingo, Malinalco)"
  },
  este: {
    center: [-98.8, 19.3],
    zoom: 10,
    pitch: 65,
    name: "Este (Texcoco, Chalco)"
  },
  oeste: {
    center: [-100.1, 19.3],
    zoom: 10,
    pitch: 60,
    name: "Oeste (Valle de Bravo)"
  },
  centro: {
    center: [-99.6557, 19.2827],
    zoom: 10,
    pitch: 60,
    name: "Centro (Toluca)"
  },
  toluca: {
    center: [-99.6557, 19.2827],
    zoom: 11,
    pitch: 65,
    name: "Toluca"
  },
  naucalpan: {
    center: [-99.2386, 19.4735],
    zoom: 12,
    pitch: 65,
    name: "Naucalpan"
  },
  ecatepec: {
    center: [-99.0515, 19.6011],
    zoom: 11,
    pitch: 65,
    name: "Ecatepec"
  }
};

// ============================================================================
// EXTRAER ESTILOS DE CAPA LEAFLET (mejorado para capas categorizadas)
// ============================================================================
function extractLeafletStyle(layer) {
  const style = {
    fillColor: '#ff6b6b',
    fillOpacity: 0.4,
    color: '#ff0000',
    weight: 2,
    opacity: 1,
    radius: 6,
    categorized: false,
    styleFunction: null
  };
  
  // Intentar obtener estilos de diferentes tipos de capas
  if (layer.options) {
    if (layer.options.fillColor) style.fillColor = layer.options.fillColor;
    if (layer.options.fillOpacity !== undefined) style.fillOpacity = layer.options.fillOpacity;
    if (layer.options.color) style.color = layer.options.color;
    if (layer.options.weight !== undefined) style.weight = layer.options.weight;
    if (layer.options.opacity !== undefined) style.opacity = layer.options.opacity;
    if (layer.options.radius !== undefined) style.radius = layer.options.radius;
    
    // Capturar función de estilo para capas categorizadas
    if (layer.options.style && typeof layer.options.style === 'function') {
      style.categorized = true;
      style.styleFunction = layer.options.style;
    }
  }
  
  // Para CircleMarkers y Circles
  if (layer instanceof L.CircleMarker || layer instanceof L.Circle) {
    if (layer.options.fillColor) style.fillColor = layer.options.fillColor;
    if (layer.options.color) style.color = layer.options.color;
    if (layer.options.radius !== undefined) style.radius = layer.options.radius;
  }
  
  // Para Polylines y Polygons
  if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
    if (layer.options.color) style.color = layer.options.color;
    if (layer.options.weight !== undefined) style.weight = layer.options.weight;
    if (layer.options.fillColor) style.fillColor = layer.options.fillColor;
    if (layer.options.fillOpacity !== undefined) style.fillOpacity = layer.options.fillOpacity;
  }
  
  // Para GeoJSON layers, capturar función de estilo y opciones
  if (layer instanceof L.GeoJSON) {
    if (layer.options.style && typeof layer.options.style === 'function') {
      style.categorized = true;
      style.styleFunction = layer.options.style;
    }
    
    if (layer.options.pointToLayer && typeof layer.options.pointToLayer === 'function') {
      style.pointToLayer = layer.options.pointToLayer;
    }
    
    // Intentar obtener estilos del primer feature
    if (layer.getLayers().length > 0) {
      const firstLayer = layer.getLayers()[0];
      if (firstLayer.options) {
        if (firstLayer.options.fillColor) style.fillColor = firstLayer.options.fillColor;
        if (firstLayer.options.color) style.color = firstLayer.options.color;
        if (firstLayer.options.weight !== undefined) style.weight = firstLayer.options.weight;
        if (firstLayer.options.fillOpacity !== undefined) style.fillOpacity = firstLayer.options.fillOpacity;
        if (firstLayer.options.radius !== undefined) style.radius = firstLayer.options.radius;
      }
    }
  }
  
  console.log(`🎨 Estilos extraídos (categorizado: ${style.categorized}):`, style);
  return style;
}

// ============================================================================
// CARGAR CAPAS KML/KMZ EN 3D
// ============================================================================
async function loadActiveLayersIn3D() {
  if (!maplibreMap || !is3DActive) return;
  
  console.log('📥 Cargando capas activas en vista 3D...');
  
  // Limpiar capas anteriores
  Object.keys(activeLayersIn3D).forEach(layerId => {
    const layers = activeLayersIn3D[layerId];
    if (Array.isArray(layers)) {
      layers.forEach(id => {
        if (maplibreMap.getLayer(id)) {
          try {
            maplibreMap.removeLayer(id);
          } catch(e) {
            console.warn('No se pudo eliminar capa:', id);
          }
        }
      });
    }
    if (maplibreMap.getSource(layerId)) {
      try {
        maplibreMap.removeSource(layerId);
      } catch(e) {
        console.warn('No se pudo eliminar source:', layerId);
      }
    }
  });
  activeLayersIn3D = {};
  
  // Obtener capas del mapa Leaflet
  let layerCount = 0;
  let processedLayers = new Set(); // Para evitar duplicados
  
  map.eachLayer((layer) => {
    // Evitar procesar la misma capa dos veces
    if (processedLayers.has(layer)) return;
    
    // Verificar diferentes tipos de capas
    const hasGeoJSON = layer.toGeoJSON && typeof layer.toGeoJSON === 'function';
    const hasFeatures = layer._layers && Object.keys(layer._layers).length > 0;
    const isImageOverlay = layer instanceof L.ImageOverlay;
    
    // Procesar capas con GeoJSON
    if (hasGeoJSON && layer !== map) {
      try {
        const geojson = layer.toGeoJSON();
        
        // Verificar que el GeoJSON sea válido
        if (geojson && (geojson.type === 'FeatureCollection' || geojson.type === 'Feature')) {
          const layerId = `layer-3d-${Date.now()}-${layerCount}`;
          
          // Obtener nombre de la capa si existe
          let nombreCapa = layer.options?.name || layer.options?.title || `Capa ${layerCount + 1}`;
          
          // Extraer estilos de la capa Leaflet
          const leafletStyle = extractLeafletStyle(layer);
          
          console.log(`📍 Procesando capa: ${nombreCapa}`);
          addGeoJSONToMapLibre(layerId, geojson, nombreCapa, leafletStyle);
          processedLayers.add(layer);
          layerCount++;
        }
      } catch (e) {
        console.warn('⚠️ No se pudo convertir capa a GeoJSON:', e);
      }
    }
    // Procesar FeatureGroups y LayerGroups (KML/KMZ suelen estar aquí)
    else if (hasFeatures) {
      try {
        Object.values(layer._layers).forEach(subLayer => {
          if (subLayer.toGeoJSON && !processedLayers.has(subLayer)) {
            try {
              const geojson = subLayer.toGeoJSON();
              if (geojson && (geojson.type === 'FeatureCollection' || geojson.type === 'Feature')) {
                const layerId = `layer-3d-${Date.now()}-${layerCount}`;
                let nombreCapa = subLayer.options?.name || subLayer.options?.title || `SubCapa ${layerCount + 1}`;
                
                // Extraer estilos de la subcapa Leaflet
                const leafletStyle = extractLeafletStyle(subLayer);
                
                console.log(`📍 Procesando subcapa: ${nombreCapa}`);
                addGeoJSONToMapLibre(layerId, geojson, nombreCapa, leafletStyle);
                processedLayers.add(subLayer);
                layerCount++;
              }
            } catch (e) {
              console.warn('⚠️ Error procesando subcapa:', e);
            }
          }
        });
      } catch (e) {
        console.warn('⚠️ Error procesando grupo de capas:', e);
      }
    }
  });
  
  if (layerCount > 0) {
    console.log(`✅ ${layerCount} capa(s) cargada(s) en vista 3D`);
  } else {
    console.log('ℹ️ Sin capas para mostrar en vista 3D');
    console.log('💡 Asegúrate de tener capas KML/KMZ cargadas en el mapa 2D primero');
  }
}

// ============================================================================
// AGREGAR GEOJSON A MAPLIBRE (Optimizado con soporte para capas categorizadas)
// ============================================================================
function addGeoJSONToMapLibre(layerId, geojson, nombreCapa, leafletStyle = null) {
  if (!maplibreMap || !geojson) return;
  
  // Usar estilos por defecto si no se proporcionan
  const style = leafletStyle || {
    fillColor: '#ff6b6b',
    fillOpacity: 0.4,
    color: '#ff0000',
    weight: 2,
    opacity: 1,
    radius: 6,
    categorized: false
  };
  
  try {
    // Agregar source con optimizaciones
    maplibreMap.addSource(layerId, {
      type: 'geojson',
      data: geojson,
      tolerance: 0.5,
      buffer: 0,
      lineMetrics: true
    });
    
    // Determinar tipo de geometría
    const geometryType = geojson.geometry?.type || geojson.features?.[0]?.geometry?.type;
    
    console.log(`📍 Agregando capa "${nombreCapa}" tipo: ${geometryType}, categorizada: ${style.categorized}`);
    
    // POLÍGONOS
    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      // Si es categorizada, usar expresiones de MapLibre para colorear por propiedad
      if (style.categorized && style.styleFunction && geojson.features) {
        // Crear mapeo de colores basado en las features
        const colorMap = {};
        geojson.features.forEach(feature => {
          const featureStyle = style.styleFunction(feature);
          const key = JSON.stringify(feature.properties);
          colorMap[key] = featureStyle;
        });
        
        // Crear expresión de color para fill
        const fillColorExpression = ['match', ['get', 'fill-color-key']];
        const lineColorExpression = ['match', ['get', 'line-color-key']];
        
        // Agregar propiedad de color a cada feature
        geojson.features.forEach((feature, idx) => {
          const featureStyle = style.styleFunction(feature);
          feature.properties['fill-color-key'] = idx;
          feature.properties['line-color-key'] = idx;
          fillColorExpression.push(idx, featureStyle.fillColor || featureStyle.color || '#ff6b6b');
          lineColorExpression.push(idx, featureStyle.color || '#ff0000');
        });
        
        fillColorExpression.push('#ff6b6b'); // default
        lineColorExpression.push('#ff0000'); // default
        
        // Actualizar el source con los datos modificados
        maplibreMap.getSource(layerId).setData(geojson);
        
        // Fill con colores categorizados
        maplibreMap.addLayer({
          id: `${layerId}-fill`,
          type: 'fill',
          source: layerId,
          paint: {
            'fill-color': fillColorExpression,
            'fill-opacity': style.fillOpacity
          }
        });
        
        // Outline con colores categorizados
        maplibreMap.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: layerId,
          paint: {
            'line-color': lineColorExpression,
            'line-width': style.weight,
            'line-opacity': style.opacity
          }
        });
      } else {
        // Fill normal
        maplibreMap.addLayer({
          id: `${layerId}-fill`,
          type: 'fill',
          source: layerId,
          paint: {
            'fill-color': style.fillColor,
            'fill-opacity': style.fillOpacity
          }
        });
        
        // Outline normal
        maplibreMap.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: layerId,
          paint: {
            'line-color': style.color,
            'line-width': style.weight,
            'line-opacity': style.opacity
          }
        });
      }
      
      activeLayersIn3D[layerId] = [`${layerId}-fill`, `${layerId}-outline`];
    }
    
    // LÍNEAS
    else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
      maplibreMap.addLayer({
        id: `${layerId}-line`,
        type: 'line',
        source: layerId,
        paint: {
          'line-color': style.color,
          'line-width': style.weight,
          'line-opacity': style.opacity
        }
      });
      
      activeLayersIn3D[layerId] = [`${layerId}-line`];
    }
    
    // PUNTOS
    else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
      // Si es categorizada y tiene pointToLayer, extraer colores
      if (style.categorized && (style.styleFunction || style.pointToLayer) && geojson.features) {
        const colorExpression = ['match', ['get', 'point-color-key']];
        const strokeExpression = ['match', ['get', 'point-stroke-key']];
        
        geojson.features.forEach((feature, idx) => {
          let featureColor = style.fillColor;
          let strokeColor = style.color;
          
          // Intentar obtener color del styleFunction
          if (style.styleFunction) {
            const featureStyle = style.styleFunction(feature);
            if (featureStyle.fillColor) featureColor = featureStyle.fillColor;
            if (featureStyle.color) strokeColor = featureStyle.color;
          }
          
          feature.properties['point-color-key'] = idx;
          feature.properties['point-stroke-key'] = idx;
          colorExpression.push(idx, featureColor);
          strokeExpression.push(idx, strokeColor);
        });
        
        colorExpression.push(style.fillColor); // default
        strokeExpression.push(style.color); // default
        
        // Actualizar el source
        maplibreMap.getSource(layerId).setData(geojson);
        
        maplibreMap.addLayer({
          id: `${layerId}-point`,
          type: 'circle',
          source: layerId,
          paint: {
            'circle-radius': style.radius,
            'circle-color': colorExpression,
            'circle-stroke-width': style.weight,
            'circle-stroke-color': strokeExpression,
            'circle-opacity': style.fillOpacity,
            'circle-stroke-opacity': style.opacity
          }
        });
      } else {
        maplibreMap.addLayer({
          id: `${layerId}-point`,
          type: 'circle',
          source: layerId,
          paint: {
            'circle-radius': style.radius,
            'circle-color': style.fillColor,
            'circle-stroke-width': style.weight,
            'circle-stroke-color': style.color,
            'circle-opacity': style.fillOpacity,
            'circle-stroke-opacity': style.opacity
          }
        });
      }
      
      activeLayersIn3D[layerId] = [`${layerId}-point`];
    }
    
    console.log(`✅ Capa "${nombreCapa}" agregada a MapLibre (${geometryType}) con simbología preservada`);
    
  } catch (error) {
    console.error(`❌ Error agregando capa "${nombreCapa}":`, error);
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL: Toggle Vista 3D
// ============================================================================
async function toggle3DView() {
  const cesiumContainer = document.getElementById('cesium-container');
  const mapContainer = document.getElementById('map');
  const controls3DPanel = document.getElementById('controls-3d-panel');
  const toggleBtn = document.getElementById('toggle-3d-btn');
  const sidebar = document.getElementById('sidebar');
  const rightToolbar = document.getElementById('right-toolbar');
  const header = document.getElementById('header');
  const toggleSidebarContainer = document.getElementById('toggle-sidebar-container');
  const zoomInicioContainer = document.getElementById('zoom-inicio-container');
  const transparencyContainer = document.getElementById('transparency-container');
  const miloMascot = document.getElementById('milo-mascot');
  const northArrow = document.getElementById('north-arrow-3d');
  const rotationControls = document.getElementById('rotation-controls-3d');
  const scale3D = document.getElementById('scale-3d');

  if (!is3DActive) {
    console.log('🗻 Activando vista de relieve MapLibre...');
    
    is3DActive = true;
    
    // Ocultar mapa 2D
    if (mapContainer) mapContainer.style.display = 'none';
    
    // Mostrar contenedor 3D
    if (cesiumContainer) {
      cesiumContainer.style.display = 'block';
      cesiumContainer.style.opacity = '1';
    }
    
    // Mostrar panel de controles
    if (controls3DPanel) {
      controls3DPanel.style.display = 'block';
    }
    
    // Activar botón
    if (toggleBtn) {
      toggleBtn.classList.add('active-3d');
      toggleBtn.title = 'Volver a Vista 2D';
    }
    
    // OCULTAR TODOS LOS ELEMENTOS DE LA VISTA 2D
    if (sidebar) sidebar.style.display = 'none';
    if (rightToolbar) rightToolbar.style.display = 'none';
    if (header) header.style.display = 'none';
    if (toggleSidebarContainer) toggleSidebarContainer.style.display = 'none';
    if (zoomInicioContainer) zoomInicioContainer.style.display = 'none';
    if (transparencyContainer) transparencyContainer.style.display = 'none';
    if (miloMascot) miloMascot.style.display = 'none';
    
    // MOSTRAR ELEMENTOS EXCLUSIVOS DE VISTA 3D
    if (northArrow) northArrow.style.display = 'block';
    if (rotationControls) rotationControls.style.display = 'flex';
    if (scale3D) scale3D.style.display = 'block';
    
    // Mostrar botón "Volver a 2D"
    const backTo2DBtn = document.getElementById('back-to-2d-btn');
    if (backTo2DBtn) backTo2DBtn.style.display = 'flex';

    // Inicializar MapLibre si no existe
    if (!maplibreMap) {
      try {
        console.log('🚀 Inicializando MapLibre GL...');
        
        if (typeof maplibregl === 'undefined') {
          throw new Error('MapLibre GL no está cargado. Verifica que las librerías estén en el HTML.');
        }

        maplibreMap = new maplibregl.Map({
          container: 'cesium-container',
          style: {
            version: 8,
            sources: {
              'terrain-rgb': {
                type: 'raster-dem',
                tiles: [`https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`],
                tileSize: 256,
                maxzoom: 14,
                encoding: 'mapbox'
              },
              'satellite': {
                type: 'raster',
                tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`],
                tileSize: 256,
                maxzoom: 20
              }
            },
            layers: [
              {
                id: 'satellite-layer',
                type: 'raster',
                source: 'satellite',
                paint: {
                  'raster-opacity': 0.6
                }
              },
              {
                id: 'hillshade',
                type: 'hillshade',
                source: 'terrain-rgb',
                paint: {
                  'hillshade-exaggeration': 0.8,
                  'hillshade-shadow-color': '#000000',
                  'hillshade-accent-color': '#ffffff',
                  'hillshade-highlight-color': '#ffffff',
                  'hillshade-illumination-direction': 315
                }
              }
            ],
            terrain: {
              source: 'terrain-rgb',
              exaggeration: 1.5
            }
          },
          center: EDOMEX_CONFIG.center,
          zoom: 9.5,
          pitch: 60,
          bearing: 0, // SIEMPRE AL NORTE
          maxBounds: EDOMEX_CONFIG.maxBounds, // BOUNDS AMPLIADOS
          maxPitch: 85,
          antialias: true,
          preserveDrawingBuffer: true,
          optimizeForTerrain: true, // OPTIMIZACIÓN
          // Mejoras adicionales para renderizado
          fadeDuration: 300,
          refreshExpiredTiles: true,
          renderWorldCopies: false,
          trackResize: true
        });

        // Controles nativos de MapLibre
        maplibreMap.addControl(new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true
        }), 'top-right');

        // Evento de carga
        maplibreMap.on('load', () => {
          console.log('✅ MapLibre cargado exitosamente');
          
          // Establecer terreno
          maplibreMap.setTerrain({
            source: 'terrain-rgb',
            exaggeration: 1.5
          });
          
          // Configurar cielo
          maplibreMap.setSky({
            'sky-color': '#199EF3',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#ffffff',
            'horizon-fog-blend': 0.5,
            'fog-color': '#0000ff',
            'fog-ground-blend': 0.5
          });
          
          // Cargar capas activas del mapa 2D con un pequeño delay para asegurar que todo esté listo
          setTimeout(() => {
            loadActiveLayersIn3D();
            console.log('🔄 Intentando cargar capas KML/KMZ en 3D...');
            
            // Hacer zoom a las capas activas después de cargarlas
            setTimeout(() => {
              zoomToActiveLayers3D();
            }, 1000);
          }, 500);
          
          // Agregar evento de clic para mostrar popup con atributos
          maplibreMap.on('click', (e) => {
            const features = maplibreMap.queryRenderedFeatures(e.point);
            
            console.log('🖱️ Clic en mapa 3D - Features encontradas:', features.length);
            
            if (features.length > 0) {
              const feature = features[0];
              const properties = feature.properties;
              
              console.log('📋 Atributos de la feature:', properties);
              
              // Filtrar propiedades técnicas que no deben mostrarse
              const excludeKeys = [
                'fill-color-key', 
                'line-color-key', 
                'point-color-key', 
                'point-stroke-key',
                'geom'
              ];
              
              // Construir contenido del popup con los atributos
              let popupContent = '<div style="max-width: 350px; font-family: \'Segoe UI\', Arial, sans-serif;">';
              popupContent += '<h3 style="margin: 0 0 10px 0; color: #8a2035; font-size: 14px; font-weight: 700; border-bottom: 2px solid #b99056; padding-bottom: 5px;">Información del elemento</h3>';
              
              let hasVisibleProperties = false;
              
              if (properties && Object.keys(properties).length > 0) {
                // Ordenar propiedades: primero las más importantes
                const sortedKeys = Object.keys(properties).sort((a, b) => {
                  const priorityKeys = ['name', 'nombre', 'municipi_1', 'MUNICIPI_1', 'vulner_ri', 'PROYECTO', 'proyecto'];
                  const aIndex = priorityKeys.indexOf(a);
                  const bIndex = priorityKeys.indexOf(b);
                  
                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                  if (aIndex !== -1) return -1;
                  if (bIndex !== -1) return 1;
                  return a.localeCompare(b);
                });
                
                for (const key of sortedKeys) {
                  const value = properties[key];
                  
                  // Filtrar propiedades que no deben mostrarse
                  if (excludeKeys.includes(key)) continue;
                  if (value === null || value === undefined || value === '') continue;
                  
                  hasVisibleProperties = true;
                  
                  // Formatear el nombre de la clave
                  let displayKey = key;
                  const keyMap = {
                    'municipi_1': 'Municipio',
                    'MUNICIPI_1': 'Municipio',
                    'vulner_ri': 'Vulnerabilidad',
                    'PROYECTO': 'Proyecto',
                    'proyecto': 'Proyecto',
                    'name': 'Nombre',
                    'nombre': 'Nombre'
                  };
                  
                  if (keyMap[key]) {
                    displayKey = keyMap[key];
                  }
                  
                  // Estilo especial para propiedades importantes
                  const isImportant = ['Municipio', 'Vulnerabilidad', 'Proyecto', 'Nombre'].includes(displayKey);
                  const valueStyle = isImportant ? 'font-weight: 600; color: #000;' : 'color: #555;';
                  
                  popupContent += `
                    <div style="margin: 8px 0; padding: 6px; background: ${isImportant ? 'rgba(185, 144, 86, 0.1)' : 'transparent'}; border-radius: 4px;">
                      <strong style="color: #8a2035; font-size: 12px;">${displayKey}:</strong>
                      <span style="${valueStyle} font-size: 12px; margin-left: 4px;">${value}</span>
                    </div>
                  `;
                }
              }
              
              if (!hasVisibleProperties) {
                popupContent += '<p style="color: #666; font-size: 12px; text-align: center; padding: 10px;">No hay información adicional disponible</p>';
              }
              
              popupContent += '</div>';
              
              // Crear y mostrar popup
              new maplibregl.Popup({
                closeButton: true,
                closeOnClick: true,
                maxWidth: '400px',
                className: 'custom-popup-3d'
              })
                .setLngLat(e.lngLat)
                .setHTML(popupContent)
                .addTo(maplibreMap);
                
              console.log('✅ Popup mostrado en coordenadas:', e.lngLat);
            }
          });
          
          // Cambiar cursor al pasar sobre features clicables
          maplibreMap.on('mousemove', (e) => {
            const features = maplibreMap.queryRenderedFeatures(e.point);
            maplibreMap.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
          });
          
          // Actualizar escala cuando cambie el zoom o se mueva el mapa
          maplibreMap.on('zoom', updateScale3D);
          maplibreMap.on('move', updateScale3D);
          
          // Actualizar escala inicial
          updateScale3D();
        });

        maplibreMap.on('error', (e) => {
          console.error('❌ Error en MapLibre:', e);
        });

      } catch (error) {
        console.error('❌ Error al inicializar MapLibre:', error);
        alert('Error al cargar la vista de relieve. Verifica que MapLibre esté cargado en el HTML.');
        toggle3DView(); // Volver a 2D
        return;
      }
    } else {
      // Si ya existe, solo cargar capas y resetear vista
      loadActiveLayersIn3D();
      updateMapArea('full');
    }
    
  } else {
    console.log('🗺️ Volviendo a vista 2D...');
    
    is3DActive = false;
    
    // Mostrar mapa 2D
    if (mapContainer) {
      mapContainer.style.display = 'block';
      setTimeout(() => {
        if (map && map.invalidateSize) {
          map.invalidateSize();
        }
      }, 100);
    }
    
    // Ocultar contenedor 3D
    if (cesiumContainer) {
      cesiumContainer.style.display = 'none';
      cesiumContainer.style.opacity = '0';
    }
    
    // Ocultar panel de controles
    if (controls3DPanel) {
      controls3DPanel.style.display = 'none';
    }
    
    // Desactivar botón
    if (toggleBtn) {
      toggleBtn.classList.remove('active-3d');
      toggleBtn.title = 'Ver Relieve del Terreno';
    }
    
    // MOSTRAR TODOS LOS ELEMENTOS DE LA VISTA 2D
    if (sidebar) sidebar.style.display = 'block';
    if (rightToolbar) rightToolbar.style.display = 'flex';
    if (header) header.style.display = 'block';
    if (toggleSidebarContainer) toggleSidebarContainer.style.display = 'block';
    if (zoomInicioContainer) zoomInicioContainer.style.display = 'block';
    if (transparencyContainer) transparencyContainer.style.display = 'block';
    if (miloMascot) miloMascot.style.display = 'block';
    
    // OCULTAR ELEMENTOS EXCLUSIVOS DE VISTA 3D
    const northArrow = document.getElementById('north-arrow-3d');
    const rotationControls = document.getElementById('rotation-controls-3d');
    const backTo2DBtn = document.getElementById('back-to-2d-btn');
    const scale3D = document.getElementById('scale-3d');
    if (northArrow) northArrow.style.display = 'none';
    if (rotationControls) rotationControls.style.display = 'none';
    if (backTo2DBtn) backTo2DBtn.style.display = 'none';
    if (scale3D) scale3D.style.display = 'none';
  }
}

// ============================================================================
// FUNCIONES DE NAVEGACIÓN Y CONTROL
// ============================================================================

function updateMapArea(areaKey) {
  if (!maplibreMap || !is3DActive) return;
  
  const area = EDOMEX_AREAS[areaKey];
  if (!area) return;
  
  console.log(`📍 Mostrando área: ${area.name}`);
  
  maplibreMap.flyTo({
    center: area.center,
    zoom: area.zoom,
    pitch: area.pitch || 60,
    bearing: 0, // Siempre al norte
    duration: 2000,
    essential: true
  });
}

function updateTerrainExaggeration(value) {
  if (!maplibreMap) return;
  
  const exaggeration = parseFloat(value);
  
  maplibreMap.setTerrain({
    source: 'terrain-rgb',
    exaggeration: exaggeration
  });
  
  const valueDisplay = document.getElementById('exaggeration-value');
  if (valueDisplay) {
    valueDisplay.textContent = exaggeration.toFixed(1) + 'x';
  }
  
  console.log(`🗻 Exageración: ${exaggeration}x`);
}

// Funciones adicionales de navegación
function rotateCamera(direction) {
  if (!maplibreMap) return;
  
  const currentBearing = maplibreMap.getBearing();
  const newBearing = direction === 'left' ? currentBearing - 45 : currentBearing + 45;
  
  maplibreMap.easeTo({
    bearing: newBearing,
    duration: 500
  });
}

function tiltCamera(direction) {
  if (!maplibreMap) return;
  
  const currentPitch = maplibreMap.getPitch();
  let newPitch;
  
  if (direction === 'up') {
    // Inclinar hacia arriba (más cenital)
    newPitch = Math.max(0, currentPitch - 15);
  } else {
    // Inclinar hacia abajo (más horizontal)
    newPitch = Math.min(85, currentPitch + 15);
  }
  
  maplibreMap.easeTo({
    pitch: newPitch,
    duration: 500
  });
  
  console.log(`⬆️⬇️ Pitch ajustado a: ${newPitch}°`);
}

function resetNorth() {
  if (!maplibreMap) return;
  
  maplibreMap.easeTo({
    bearing: 0,
    pitch: 60,
    duration: 1000
  });
}

function groundLevelView() {
  if (!maplibreMap) return;
  
  const currentCenter = maplibreMap.getCenter();
  
  maplibreMap.flyTo({
    center: currentCenter,
    zoom: 14,
    pitch: 85,
    bearing: 0,
    duration: 2000
  });
  
  console.log('👁️ Vista a nivel del suelo activada');
}

function aerialView() {
  if (!maplibreMap) return;
  
  const currentCenter = maplibreMap.getCenter();
  
  maplibreMap.flyTo({
    center: currentCenter,
    zoom: 10,
    pitch: 0,
    bearing: 0,
    duration: 2000
  });
}

function moveCamera(direction) {
  if (!maplibreMap) return;
  
  const currentCenter = maplibreMap.getCenter();
  const moveDistance = 0.05; // ~5km
  
  let newLng = currentCenter.lng;
  let newLat = currentCenter.lat;
  
  switch(direction) {
    case 'north':
      newLat += moveDistance;
      break;
    case 'south':
      newLat -= moveDistance;
      break;
    case 'east':
      newLng += moveDistance;
      break;
    case 'west':
      newLng -= moveDistance;
      break;
  }
  
  // Verificar bounds
  if (newLng >= EDOMEX_CONFIG.maxBounds[0][0] && 
      newLng <= EDOMEX_CONFIG.maxBounds[1][0] &&
      newLat >= EDOMEX_CONFIG.maxBounds[0][1] && 
      newLat <= EDOMEX_CONFIG.maxBounds[1][1]) {
    
    maplibreMap.panTo([newLng, newLat], {
      duration: 500
    });
  } else {
    console.warn('⚠️ Límite del Estado de México alcanzado');
  }
}

// ============================================================================
// FUNCIÓN PARA HACER ZOOM A LAS CAPAS ACTIVAS EN 3D
// ============================================================================
function zoomToActiveLayers3D() {
  if (!maplibreMap || !is3DActive) {
    console.log('⚠️ No se puede hacer zoom: maplibreMap o is3DActive no están disponibles');
    return;
  }
  
  console.log('🎯 Iniciando zoom a capas activas...');
  console.log('📊 Capas activas en 3D:', activeLayersIn3D);
  
  try {
    // Recolectar todas las features de las capas activas
    let allFeatures = [];
    
    for (const layerId in activeLayersIn3D) {
      const layerIds = activeLayersIn3D[layerId];
      
      for (const mlLayerId of layerIds) {
        const features = maplibreMap.querySourceFeatures(layerId);
        if (features && features.length > 0) {
          allFeatures = allFeatures.concat(features);
          console.log(`📍 Capa "${layerId}" tiene ${features.length} features`);
        }
      }
    }
    
    if (allFeatures.length === 0) {
      console.log('ℹ️ No hay capas activas para hacer zoom');
      return;
    }
    
    console.log(`📦 Total de features encontradas: ${allFeatures.length}`);
    
    // Calcular bounds de todas las features
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;
    
    allFeatures.forEach(feature => {
      if (feature.geometry && feature.geometry.coordinates) {
        const processCoordinates = (coords) => {
          if (typeof coords[0] === 'number') {
            // Es un punto [lng, lat]
            minLng = Math.min(minLng, coords[0]);
            maxLng = Math.max(maxLng, coords[0]);
            minLat = Math.min(minLat, coords[1]);
            maxLat = Math.max(maxLat, coords[1]);
          } else {
            // Es un array de coordenadas
            coords.forEach(c => processCoordinates(c));
          }
        };
        
        processCoordinates(feature.geometry.coordinates);
      }
    });
    
    if (isFinite(minLng) && isFinite(maxLng) && isFinite(minLat) && isFinite(maxLat)) {
      // Calcular el centro y aplicar zoom
      const centerLng = (minLng + maxLng) / 2;
      const centerLat = (minLat + maxLat) / 2;
      
      // Calcular un zoom apropiado basado en el tamaño del área
      const lngDiff = maxLng - minLng;
      const latDiff = maxLat - minLat;
      const maxDiff = Math.max(lngDiff, latDiff);
      
      let zoom = 10;
      if (maxDiff < 0.01) zoom = 14;
      else if (maxDiff < 0.05) zoom = 12;
      else if (maxDiff < 0.1) zoom = 11;
      else if (maxDiff < 0.5) zoom = 10;
      else if (maxDiff < 1) zoom = 9;
      else zoom = 8;
      
      maplibreMap.flyTo({
        center: [centerLng, centerLat],
        zoom: zoom,
        pitch: 60,
        bearing: 0,
        duration: 2000,
        essential: true
      });
      
      console.log(`🎯 Zoom aplicado a capas activas - Centro: [${centerLng.toFixed(4)}, ${centerLat.toFixed(4)}], Zoom: ${zoom}`);
    }
  } catch (error) {
    console.error('❌ Error al hacer zoom a capas activas:', error);
  }
}

console.log('🗻 Sistema de relieve MapLibre cargado - Mejoras aplicadas');
console.log('📦 Configuración del Estado de México lista');
console.log('✨ Características: KML/KMZ en 3D, Renderizado optimizado, Bounds ampliados, Orientación al norte, Zoom a capas, Popups interactivos, Simbología preservada');

// ============================================================================
// FUNCIÓN PARA ACTUALIZAR ESCALA GRÁFICA EN 3D
// ============================================================================
function updateScale3D() {
  if (!maplibreMap || !is3DActive) return;
  
  const scaleContainer = document.getElementById('scale-3d');
  if (!scaleContainer) return;
  
  // Obtener el zoom actual
  const zoom = maplibreMap.getZoom();
  const center = maplibreMap.getCenter();
  
  // Calcular la resolución en metros por píxel en el centro del mapa
  const metersPerPixel = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);
  
  // Ancho máximo de la escala en píxeles
  const maxWidth = 150;
  
  // Calcular distancia en metros para el ancho máximo
  let distance = maxWidth * metersPerPixel;
  
  // Ajustar a valores "bonitos"
  let unit = 'm';
  if (distance >= 1000) {
    distance = distance / 1000;
    unit = 'km';
  }
  
  // Redondear a valores significativos
  let roundedDistance;
  if (distance >= 100) {
    roundedDistance = Math.round(distance / 100) * 100;
  } else if (distance >= 10) {
    roundedDistance = Math.round(distance / 10) * 10;
  } else if (distance >= 1) {
    roundedDistance = Math.round(distance);
  } else {
    roundedDistance = Math.round(distance * 10) / 10;
  }
  
  // Calcular el ancho real de la barra en píxeles
  const actualWidth = unit === 'km' 
    ? (roundedDistance * 1000) / metersPerPixel 
    : roundedDistance / metersPerPixel;
  
  // Actualizar el HTML de la escala
  scaleContainer.innerHTML = `
    <div style="
      position: relative;
      background: rgba(255, 255, 255, 0.85);
      border: 2px solid #333;
      border-top: none;
      width: ${actualWidth}px;
      height: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      <div style="
        position: absolute;
        top: -18px;
        right: 0;
        font-size: 11px;
        font-weight: bold;
        color: #333;
        background: rgba(255, 255, 255, 0.9);
        padding: 1px 4px;
        border-radius: 2px;
        white-space: nowrap;
      ">
        ${roundedDistance} ${unit}
      </div>
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        width: 25%;
        height: 100%;
        background: #333;
      "></div>
      <div style="
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 25%;
        height: 100%;
        background: #333;
      "></div>
    </div>
  `;
}

// ============================================================================
// FUNCIONALIDAD DE ARRASTRE PARA PANEL DE CONTROLES 3D
// ============================================================================

(function initDraggablePanel() {
  const panel = document.getElementById('controls-3d-panel');
  const header = panel?.querySelector('.controls-3d-header');
  
  if (!panel || !header) return;
  
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  // Touch events para móviles
  header.addEventListener('touchstart', dragStart);
  document.addEventListener('touchmove', drag);
  document.addEventListener('touchend', dragEnd);
  
  function dragStart(e) {
    if (e.type === 'touchstart') {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }
    
    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
      panel.style.transition = 'none';
    }
  }
  
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      
      if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }
      
      xOffset = currentX;
      yOffset = currentY;
      
      // Limitar el movimiento dentro de la ventana
      const rect = panel.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      xOffset = Math.max(0, Math.min(xOffset, maxX));
      yOffset = Math.max(0, Math.min(yOffset, maxY));
      
      setTranslate(xOffset, yOffset, panel);
    }
  }
  
  function dragEnd() {
    if (isDragging) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      panel.style.transition = '';
    }
  }
  
  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }
  
  console.log('✅ Panel de Controles 3D ahora es arrastrable');
})();

// ============================================================================
// FUNCIONES PARA TABLA DE ATRIBUTOS POA 2025
// ============================================================================

function openPOAAttributesPanel(nombre) {
  const panel = document.getElementById('poa-attributes-panel');
  const content = document.getElementById('poa-attributes-content');
  
  // Obtener los datos de la capa
  const layer = capasActivas[nombre];
  if (!layer || !layer.getLayers) {
    console.error('No se pudo encontrar la capa:', nombre);
    return;
  }
  
  const features = layer.getLayers();
  const displayName = nombresCapas[nombre] || nombre;
  
  // Verificar si es una capa FISE para agregar simbología
  const capasFISE = [
    'caem-dgig-fise-052-25-cp', 
    'caem-dgig-fise-053-25-cp',
    'caem-dgig-fise-054-25-cp',
    'caem-dgig-fise-055-25-cp',
    'caem-dgig-fise-056-25-cp'
  ];
  const esFISE = capasFISE.includes(nombre);
  
  // Generar HTML de la tabla
  let html = `<div class="poa-attributes-layer-name">${displayName}</div>`;
  
  // Agregar simbología solo para capas FISE
  if (esFISE) {
    html += `
      <div style="display: flex; gap: 10px; margin: 8px 0; padding: 6px; background-color: #f9f9f9; border-radius: 4px; font-size: 10px; justify-content: center; align-items: center;">
        <span style="display: flex; align-items: center; gap: 4px;">
          <svg width="15" height="2" style="display: block;">
            <line x1="0" y1="1" x2="15" y2="1" stroke="#e31a1cff" stroke-width="2"/>
          </svg>
          <span style="color: #333; font-weight: 500;">Terminado</span>
        </span>
        <span style="display: flex; align-items: center; gap: 4px;">
          <svg width="15" height="2" style="display: block;">
            <line x1="0" y1="1" x2="15" y2="1" stroke="#e3c745ff" stroke-width="2"/>
          </svg>
          <span style="color: #333; font-weight: 500;">Pendiente</span>
        </span>
        <span style="display: flex; align-items: center; gap: 4px;">
          <svg width="15" height="2" style="display: block;">
            <line x1="0" y1="1" x2="15" y2="1" stroke="#53d130ff" stroke-width="2" stroke-dasharray="2,1"/>
          </svg>
          <span style="color: #333; font-weight: 500;">En proceso</span>
        </span>
      </div>
    `;
  }
  
  if (features.length === 0) {
    html += '<div class="poa-attributes-empty">No hay datos disponibles</div>';
  } else {
    // Obtener las propiedades del primer feature
    const firstFeature = features[0];
    const firstProps = firstFeature.feature.properties;
    const columns = Object.keys(firstProps).filter(key => 
      key !== 'geom' && 
      key !== 'avance' && 
      key !== 'Avance' && 
      key !== 'AVANCE' && 
      key !== 'gid' && 
      key !== 'Gid' && 
      key !== 'GID'
    );
    
    if (columns.length === 0) {
      html += '<div class="poa-attributes-empty">No hay atributos para mostrar</div>';
    } else {
      // Tabla con encabezados verticales (cada fila es un atributo)
      html += '<table class="poa-attributes-table poa-attributes-table-vertical">';
      html += '<tbody>';
      
      // Cada fila muestra: Nombre del campo | Valor
      columns.forEach(col => {
        const value = firstProps[col] !== null && firstProps[col] !== undefined ? firstProps[col] : '-';
        html += '<tr>';
        html += `<th>${col}</th>`;
        html += `<td>${value}</td>`;
        html += '</tr>';
      });
      
      html += '</tbody></table>';
    }
  }
  
  content.innerHTML = html;
  panel.classList.add('show');
  
  // Hacer el panel arrastrable
  initPOAAttributesDrag();
}

function closePOAAttributesPanel() {
  const panel = document.getElementById('poa-attributes-panel');
  panel.classList.remove('show');
}

// Variables para el arrastre del panel de atributos
let poaAttrDragging = false;
let poaAttrCurrentX;
let poaAttrCurrentY;
let poaAttrInitialX;
let poaAttrInitialY;
let poaAttrXOffset = 0;
let poaAttrYOffset = 0;

function initPOAAttributesDrag() {
  const panel = document.getElementById('poa-attributes-panel');
  const header = panel.querySelector('.poa-attributes-header');
  
  if (!header) return;
  
  // Remover listeners anteriores si existen
  header.removeEventListener('mousedown', poaAttrDragStart);
  document.removeEventListener('mousemove', poaAttrDrag);
  document.removeEventListener('mouseup', poaAttrDragEnd);
  
  // Agregar nuevos listeners
  header.addEventListener('mousedown', poaAttrDragStart);
  document.addEventListener('mousemove', poaAttrDrag);
  document.addEventListener('mouseup', poaAttrDragEnd);
}

function poaAttrDragStart(e) {
  poaAttrInitialX = e.clientX - poaAttrXOffset;
  poaAttrInitialY = e.clientY - poaAttrYOffset;
  
  const header = document.querySelector('.poa-attributes-header');
  if (e.target === header || header.contains(e.target)) {
    poaAttrDragging = true;
  }
}

function poaAttrDrag(e) {
  if (poaAttrDragging) {
    e.preventDefault();
    
    poaAttrCurrentX = e.clientX - poaAttrInitialX;
    poaAttrCurrentY = e.clientY - poaAttrInitialY;
    
    poaAttrXOffset = poaAttrCurrentX;
    poaAttrYOffset = poaAttrCurrentY;
    
    const panel = document.getElementById('poa-attributes-panel');
    panel.style.transform = `translate(${poaAttrCurrentX}px, ${poaAttrCurrentY}px)`;
  }
}

function poaAttrDragEnd() {
  if (poaAttrDragging) {
    poaAttrInitialX = poaAttrCurrentX;
    poaAttrInitialY = poaAttrCurrentY;
    poaAttrDragging = false;
  }
}

console.log('✅ Sistema de tabla de atributos POA 2025 cargado');

// ============================================
// SISTEMA DE FILTRO DE CAPAS ACTIVAS
// ============================================

// Almacén de capas activas
let activeLayersRegistry = new Map();

// Función para registrar una capa activa
function registerActiveLayer(layerId, layerName, color, layerObject, bounds) {
  activeLayersRegistry.set(layerId, {
    name: layerName,
    color: color || '#0077be',
    layer: layerObject,
    bounds: bounds,
    visible: true
  });
  updateActiveLayersList();
}

// Función para desregistrar una capa
function unregisterActiveLayer(layerId) {
  activeLayersRegistry.delete(layerId);
  updateActiveLayersList();
}

// Función para actualizar la lista de capas activas en el UI
function updateActiveLayersList() {
  const listContainer = document.getElementById('active-layers-list');
  const countSpan = document.getElementById('active-layers-count');
  
  if (!listContainer) return;
  
  const count = activeLayersRegistry.size;
  countSpan.textContent = `${count} capa${count !== 1 ? 's' : ''} activa${count !== 1 ? 's' : ''}`;
  
  if (count === 0) {
    listContainer.innerHTML = `
      <div class="filter-empty-state">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>No hay capas activas</span>
      </div>
    `;
    return;
  }
  
  let html = '';
  activeLayersRegistry.forEach((data, layerId) => {
    const visibilityIcon = data.visible ? 
      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>` :
      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
    
    html += `
      <div class="active-layer-item" data-layer-id="${layerId}">
        <div class="layer-color-indicator" style="background-color: ${data.color}"></div>
        <span class="layer-name" title="${data.name}">${data.name}</span>
        <button class="layer-zoom-btn" onclick="zoomToLayer('${layerId}')" title="Zoom a la capa">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
          </svg>
        </button>
        <button class="layer-visibility-btn ${data.visible ? '' : 'layer-hidden'}" onclick="toggleLayerVisibility('${layerId}')" title="${data.visible ? 'Ocultar capa' : 'Mostrar capa'}">
          ${visibilityIcon}
        </button>
        <button class="layer-remove-btn" onclick="removeLayerFromList('${layerId}')" title="Quitar capa">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    `;
  });
  
  listContainer.innerHTML = html;
  
  // Aplicar filtro actual si existe
  const filterInput = document.getElementById('layer-filter-input');
  if (filterInput && filterInput.value) {
    filterActiveLayers(filterInput.value);
  }
}

// Función para filtrar capas activas
function filterActiveLayers(searchTerm) {
  const items = document.querySelectorAll('.active-layer-item');
  const clearBtn = document.getElementById('filter-clear-btn');
  
  if (clearBtn) {
    clearBtn.style.display = searchTerm ? 'flex' : 'none';
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  items.forEach(item => {
    const layerName = item.querySelector('.layer-name').textContent.toLowerCase();
    if (term === '' || layerName.includes(term)) {
      item.classList.remove('hidden-by-filter');
    } else {
      item.classList.add('hidden-by-filter');
    }
  });
}

// Función para limpiar el filtro
function clearLayerFilter() {
  const filterInput = document.getElementById('layer-filter-input');
  if (filterInput) {
    filterInput.value = '';
    filterActiveLayers('');
  }
}

// Función para alternar visibilidad de una capa
function toggleLayerVisibility(layerId) {
  const layerData = activeLayersRegistry.get(layerId);
  if (!layerData) return;
  
  layerData.visible = !layerData.visible;
  
  // Actualizar visibilidad en el mapa
  if (layerData.layer) {
    if (typeof layerData.layer.setStyle === 'function') {
      layerData.layer.setStyle({ opacity: layerData.visible ? 1 : 0, fillOpacity: layerData.visible ? 0.5 : 0 });
    } else if (map && map.hasLayer) {
      if (layerData.visible) {
        if (!map.hasLayer(layerData.layer)) {
          map.addLayer(layerData.layer);
        }
      } else {
        if (map.hasLayer(layerData.layer)) {
          map.removeLayer(layerData.layer);
        }
      }
    }
  }
  
  updateActiveLayersList();
}

// Función para hacer zoom a una capa
function zoomToLayer(layerId) {
  const layerData = activeLayersRegistry.get(layerId);
  if (!layerData) return;
  
  if (layerData.bounds && map) {
    map.fitBounds(layerData.bounds, { padding: [50, 50] });
  } else if (layerData.layer && layerData.layer.getBounds && map) {
    try {
      const bounds = layerData.layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (e) {
      console.warn('No se pudo hacer zoom a la capa:', e);
    }
  }
}

// Función para registrar capas desde el sistema existente
function syncActiveLayersFromMap() {
  // Esta función puede ser llamada para sincronizar capas existentes
  // Será integrada con el sistema de capas existente
}

// ============================================
// FUNCIONES PARA FILTRO POR MUNICIPIO E INUNDACIONES
// ============================================

// Municipio seleccionado actualmente
let selectedMunicipio = '';
let municipioHighlightLayer = null;

// Definición de capas de Inundaciones
const capasInundaciones = [
  'atlas temporada 2020',
  'atlas temporada 2021',
  'atlas temporada 2022',
  'atlas temporada 2023',
  'atlas temporada 2024'
];

// Colores para las capas de inundaciones
const coloresInundaciones = {
  'atlas temporada 2020': '#1565C0',
  'atlas temporada 2021': '#1976D2',
  'atlas temporada 2022': '#1E88E5',
  'atlas temporada 2023': '#2196F3',
  'atlas temporada 2024': '#42A5F5'
};

// Variable para almacenar los datos de municipios precargados
let municipiosDataCache = null;

// Variable para almacenar los fenómenos precargados
let fenomenosDataCache = null;

// Capa oculta de municipios para consultas (no visible en mapa ni en panel)
let municipiosHiddenLayer = null;

// Función para precargar datos de municipios al inicio (sin mostrar en mapa)
async function precargarMunicipiosParaSelector() {
  console.log('🏘️ Precargando datos de municipios para el selector...');
  
  const select = document.getElementById('municipio-select');
  const countSpan = document.getElementById('municipio-count');
  
  if (!select) {
    console.warn('⚠️ No se encontró el elemento #municipio-select');
    return;
  }
  
  // Si ya hay capa oculta cargada, usar esos datos
  if (municipiosHiddenLayer) {
    console.log('✅ Capa oculta de municipios ya está cargada');
    poblarSelectorDesdeCapaOculta();
    return;
  }
  
  // Si ya hay datos en caché, crear la capa oculta
  if (municipiosDataCache && municipiosDataCache.length > 0) {
    console.log('✅ Usando datos de municipios en caché para crear capa oculta');
    crearCapaOcultaMunicipios(municipiosDataCache);
    poblarSelectorDesdeCapaOculta();
    return;
  }
  
  try {
    // Intentar cargar desde 'municipios' primero, luego 'municipios_geojson'
    const tablas = ['municipios_geojson', 'municipios'];
    let data = null;
    let tablaUsada = null;
    
    for (const tabla of tablas) {
      const encodedNombre = encodeURIComponent(tabla);
      const fetchUrl = `${supabaseUrl}/rest/v1/${encodedNombre}?select=*`;
      
      console.log(`🔍 Intentando cargar municipios desde: ${tabla}`);
      
      const response = await fetch(fetchUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        data = await response.json();
        if (data && data.length > 0) {
          console.log(`✅ Datos de municipios cargados desde ${tabla}: ${data.length} registros`);
          tablaUsada = tabla;
          
          // Mostrar ejemplo de estructura
          if (data[0]) {
            console.log('📋 Campos disponibles:', Object.keys(data[0]));
            if (data[0].geojson) {
              const sample = typeof data[0].geojson === 'string' 
                ? JSON.parse(data[0].geojson) 
                : data[0].geojson;
              console.log('📋 Tipo de geometría:', sample.type || sample.geometry?.type);
              if (sample.geometry?.coordinates?.[0]?.[0]?.[0]) {
                const coord = sample.geometry.coordinates[0][0][0];
                console.log('📋 Ejemplo de coordenada:', coord);
                // Detectar si son UTM (valores > 1000) o WGS84 (valores < 180)
                if (Array.isArray(coord) && (Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90)) {
                  console.warn('⚠️ DETECTADO: Coordenadas en sistema proyectado (UTM), no WGS84');
                }
              }
            }
          }
          break;
        }
      }
    }
    
    if (!data || data.length === 0) {
      console.warn('⚠️ No se pudieron precargar los datos de municipios');
      select.innerHTML = '<option value="">-- Carga la capa Municipios --</option>';
      select.disabled = true;
      if (countSpan) countSpan.textContent = '(No disponible)';
      return;
    }
    
    // Guardar en caché
    municipiosDataCache = data;
    
    // Crear capa oculta de municipios (para búsquedas)
    crearCapaOcultaMunicipios(data);
    
    // Crear capa visible de municipios (controlada por zoom)
    crearCapaVisibleMunicipios(data);
    
    // Poblar el selector desde la capa oculta
    poblarSelectorDesdeCapaOculta();
    
  } catch (error) {
    console.error('❌ Error al precargar municipios:', error);
    select.innerHTML = '<option value="">-- Error al cargar municipios --</option>';
    select.disabled = true;
    if (countSpan) countSpan.textContent = '(Error)';
  }
}

// Función para crear la capa oculta de municipios (sin agregar al mapa visualmente)
function crearCapaOcultaMunicipios(data) {
  console.log('🗺️ Creando capa oculta de municipios...');
  console.log('📊 Datos recibidos:', data.length, 'registros');
  
  // Mostrar ejemplo del primer registro para debug
  if (data.length > 0) {
    console.log('📋 Ejemplo de estructura de datos:', JSON.stringify(data[0]).substring(0, 500));
  }
  
  // Convertir datos a GeoJSON features
  const features = [];
  
  data.forEach((item, index) => {
    let feature = null;
    
    try {
      // Caso 1: Ya es un Feature GeoJSON completo
      if (item.type === 'Feature' && item.geometry) {
        feature = item;
      }
      // Caso 2: Tiene campo 'geojson' (común en Supabase con PostGIS)
      else if (item.geojson) {
        // Si geojson es string, parsearlo
        let geojsonData = item.geojson;
        if (typeof geojsonData === 'string') {
          try {
            geojsonData = JSON.parse(geojsonData);
          } catch (e) {
            console.warn(`⚠️ Error parseando geojson en registro ${index}`);
            return;
          }
        }
        
        if (geojsonData.type === 'Feature') {
          feature = geojsonData;
          // Asegurar propiedades del item original
          if (!feature.properties || Object.keys(feature.properties).length === 0) {
            feature.properties = {};
            Object.keys(item).forEach(key => {
              if (key !== 'geojson') {
                feature.properties[key] = item[key];
              }
            });
          }
        } else if (geojsonData.type === 'FeatureCollection' && geojsonData.features) {
          geojsonData.features.forEach(f => {
            if (f.geometry) features.push(f);
          });
          return;
        } else if (geojsonData.type && geojsonData.coordinates) {
          // Es solo la geometría
          feature = {
            type: 'Feature',
            properties: {},
            geometry: geojsonData
          };
          // Copiar propiedades del item
          Object.keys(item).forEach(key => {
            if (key !== 'geojson') {
              feature.properties[key] = item[key];
            }
          });
        }
      }
      // Caso 3: Tiene campo 'geometry' separado
      else if (item.geometry) {
        let geomData = item.geometry;
        if (typeof geomData === 'string') {
          try {
            geomData = JSON.parse(geomData);
          } catch (e) {
            return;
          }
        }
        feature = {
          type: 'Feature',
          properties: item.properties || {},
          geometry: geomData
        };
        // Copiar otras propiedades
        if (!feature.properties || Object.keys(feature.properties).length === 0) {
          feature.properties = {};
          Object.keys(item).forEach(key => {
            if (key !== 'geometry') {
              feature.properties[key] = item[key];
            }
          });
        }
      }
      // Caso 4: Tiene campo 'geom' (común en PostGIS)
      else if (item.geom) {
        let geomData = item.geom;
        if (typeof geomData === 'string') {
          try {
            geomData = JSON.parse(geomData);
          } catch (e) {
            return;
          }
        }
        feature = {
          type: 'Feature',
          properties: {},
          geometry: geomData
        };
        Object.keys(item).forEach(key => {
          if (key !== 'geom') {
            feature.properties[key] = item[key];
          }
        });
      }
      
      if (feature && feature.geometry) {
        features.push(feature);
      }
    } catch (err) {
      console.warn(`⚠️ Error procesando registro ${index}:`, err.message);
    }
  });
  
  console.log(`📊 Features creados: ${features.length}`);
  
  if (features.length === 0) {
    console.warn('⚠️ No se pudieron crear features para la capa oculta');
    console.warn('📋 Estructura del primer item:', Object.keys(data[0] || {}));
    return;
  }
  
  // Crear el GeoJSON layer pero NO agregarlo al mapa (solo para consultas)
  try {
    municipiosHiddenLayer = L.geoJSON({
      type: 'FeatureCollection',
      features: features
    }, {
      style: () => ({
        opacity: 0,
        fillOpacity: 0,
        weight: 0
      }),
      interactive: false
    });
    
    console.log(`✅ Capa oculta de municipios creada con ${features.length} features`);
  } catch (err) {
    console.error('❌ Error creando L.geoJSON:', err);
    municipiosHiddenLayer = null;
  }
}

// Función para crear la capa visible de municipios (controlada por zoom)
function crearCapaVisibleMunicipios(data) {
  console.log('🗺️ Creando capa visible de municipios (controlada por zoom)...');
  
  // Si ya existe, no crearla de nuevo
  if (municipiosVisibleLayer) {
    console.log('✅ Capa visible de municipios ya existe');
    return;
  }
  
  // Convertir datos a GeoJSON features (mismo proceso que la capa oculta)
  const features = [];
  
  data.forEach((item) => {
    let feature = null;
    
    try {
      if (item.type === 'Feature' && item.geometry) {
        feature = item;
      } else if (item.geojson) {
        let geojsonData = item.geojson;
        if (typeof geojsonData === 'string') {
          try { geojsonData = JSON.parse(geojsonData); } catch (e) { return; }
        }
        
        if (geojsonData.type === 'Feature') {
          feature = geojsonData;
          if (!feature.properties || Object.keys(feature.properties).length === 0) {
            feature.properties = {};
            Object.keys(item).forEach(key => {
              if (key !== 'geojson') feature.properties[key] = item[key];
            });
          }
        } else if (geojsonData.type === 'FeatureCollection' && geojsonData.features) {
          geojsonData.features.forEach(f => { if (f.geometry) features.push(f); });
          return;
        } else if (geojsonData.type && geojsonData.coordinates) {
          feature = { type: 'Feature', properties: {}, geometry: geojsonData };
          Object.keys(item).forEach(key => {
            if (key !== 'geojson') feature.properties[key] = item[key];
          });
        }
      } else if (item.geometry) {
        let geomData = item.geometry;
        if (typeof geomData === 'string') {
          try { geomData = JSON.parse(geomData); } catch (e) { return; }
        }
        feature = { type: 'Feature', properties: item.properties || {}, geometry: geomData };
        if (!feature.properties || Object.keys(feature.properties).length === 0) {
          feature.properties = {};
          Object.keys(item).forEach(key => {
            if (key !== 'geometry') feature.properties[key] = item[key];
          });
        }
      } else if (item.geom) {
        let geomData = item.geom;
        if (typeof geomData === 'string') {
          try { geomData = JSON.parse(geomData); } catch (e) { return; }
        }
        feature = { type: 'Feature', properties: {}, geometry: geomData };
        Object.keys(item).forEach(key => {
          if (key !== 'geom') feature.properties[key] = item[key];
        });
      }
      
      // IMPORTANTE: Convertir geometría de UTM a WGS84 si es necesario
      if (feature && feature.geometry) {
        feature.geometry = convertirGeometriaAWGS84(feature.geometry);
        features.push(feature);
      }
    } catch (err) { /* ignorar errores */ }
  });
  
  if (features.length === 0) {
    console.warn('⚠️ No se pudieron crear features para la capa visible');
    return;
  }
  
  // Log para verificar conversión
  if (features.length > 0 && features[0].geometry) {
    console.log('📋 Verificación de coordenadas después de conversión:');
    const geom = features[0].geometry;
    if (geom.type === 'MultiPolygon' && geom.coordinates[0]?.[0]?.[0]) {
      console.log('   Coordenada ejemplo:', geom.coordinates[0][0][0]);
    } else if (geom.type === 'Polygon' && geom.coordinates[0]?.[0]) {
      console.log('   Coordenada ejemplo:', geom.coordinates[0][0]);
    }
  }
  
  try {
    // Crear la capa con estilo inicial invisible (se mostrará según el zoom)
    municipiosVisibleLayer = L.geoJSON({
      type: 'FeatureCollection',
      features: features
    }, {
      pane: 'municipiosPane',
      style: () => ({
        opacity: 0,
        fillOpacity: 0,
        weight: 0
      }),
      interactive: true,
      onEachFeature: function(feature, layer) {
        // Agregar popup con nombre del municipio
        const props = feature.properties;
        const nomgeo = props.nomgeo || props.NOMGEO || 
                       props.nombre || props.NOMBRE ||
                       props.nom_mun || props.NOM_MUN ||
                       props.municipio || props.MUNICIPIO || 'Sin nombre';
        
        layer.bindTooltip(nomgeo, {
          permanent: false,
          direction: 'center',
          className: 'municipio-tooltip'
        });
        
        // Agregar evento click para seleccionar el municipio
        layer.on('click', function(e) {
          // Si estamos en modo medición, no interceptar el clic
          if (measureMode || profileMode || areaMode) {
            return; // Dejar que el evento pase al mapa
          }
          L.DomEvent.stopPropagation(e);
          seleccionarMunicipioDesdeClick(nomgeo, layer, feature);
        });
        
        // Cambiar cursor al pasar sobre el municipio
        layer.on('mouseover', function() {
          // No cambiar estilo si estamos midiendo
          if (measureMode || profileMode || areaMode) return;
          
          if (municipiosVisibleLayer && selectedMunicipio !== nomgeo) {
            layer.setStyle({
              color: '#8a2035',
              weight: 3,
              opacity: 1,
              fillColor: '#8a2035',
              fillOpacity: 0.15
            });
          }
        });
        
        layer.on('mouseout', function() {
          // No cambiar estilo si estamos midiendo
          if (measureMode || profileMode || areaMode) return;
          
          if (municipiosVisibleLayer && selectedMunicipio !== nomgeo) {
            // Restaurar estilo normal si no está seleccionado
            const currentZoom = map.getZoom();
            if (currentZoom >= ZOOM_MUNICIPIOS_VISIBLE || selectedMunicipio) {
              layer.setStyle({
                color: '#8a2035',
                weight: 1.5,
                opacity: 0.8,
                fillColor: '#8a2035',
                fillOpacity: 0.05
              });
            } else {
              layer.setStyle({
                color: '#8a2035',
                weight: 0,
                opacity: 0,
                fillOpacity: 0
              });
            }
          }
        });
      }
    }).addTo(map);
    
    // Actualizar visibilidad según zoom actual
    actualizarVisibilidadMunicipios();
    
    console.log(`✅ Capa visible de municipios creada con ${features.length} features`);
  } catch (err) {
    console.error('❌ Error creando capa visible de municipios:', err);
    municipiosVisibleLayer = null;
  }
}

// Función para seleccionar municipio desde click en el mapa
function seleccionarMunicipioDesdeClick(nombreMunicipio, layer, feature) {
  console.log('🖱️ Click en municipio:', nombreMunicipio);
  
  // Actualizar el selector
  const select = document.getElementById('municipio-select');
  if (select) {
    // Buscar la opción que coincida
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === nombreMunicipio) {
        select.selectedIndex = i;
        break;
      }
    }
  }
  
  // Obtener bounds del layer directamente (sin crear layer temporal)
  let bounds = null;
  try {
    if (layer.getBounds && typeof layer.getBounds === 'function') {
      bounds = layer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        console.log('✅ Bounds obtenidos del layer');
      }
    }
  } catch (err) {
    console.warn('Error obteniendo bounds:', err);
  }
  
  // Crear objeto municipioFeature
  const municipioFeature = {
    layer: layer,
    feature: feature,
    bounds: bounds,
    properties: feature.properties,
    fromClick: true
  };
  
  // Guardar municipio seleccionado
  selectedMunicipio = nombreMunicipio;
  
  // Mostrar loading
  const loadingDiv = document.getElementById('municipio-loading');
  if (loadingDiv) loadingDiv.style.display = 'flex';
  
  // Activar capa de municipios
  mostrarCapaMunicipios();
  
  // Hacer zoom al municipio (sin crear layers temporales)
  if (bounds && bounds.isValid && bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 13
    });
  }
  
  // Resaltar el municipio
  highlightMunicipio(municipioFeature);
  
  // Calcular estadísticas
  setTimeout(() => {
    console.log('📊 Calculando estadísticas de inundaciones...');
    const stats = calculateInundacionesStats(nombreMunicipio, municipioFeature);
    console.log('📊 Estadísticas calculadas:', stats);
    ultimasEstadisticas = stats;
    showInundacionesStats(stats);
    if (loadingDiv) loadingDiv.style.display = 'none';
  }, 100);
}

// Función para poblar el selector desde la capa oculta o desde caché
function poblarSelectorDesdeCapaOculta() {
  const select = document.getElementById('municipio-select');
  const countSpan = document.getElementById('municipio-count');
  
  if (!select) {
    console.warn('⚠️ No se encontró el selector de municipios');
    return;
  }
  
  const municipios = [];
  
  // Intentar primero desde la capa oculta
  if (municipiosHiddenLayer) {
    console.log('📋 Poblando selector desde capa oculta...');
    municipiosHiddenLayer.eachLayer(function(layer) {
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        
        const nomgeo = props.nomgeo || props.NOMGEO || 
                       props.nombre || props.NOMBRE ||
                       props.nom_mun || props.NOM_MUN ||
                       props.municipi_1 || props.MUNICIPI_1 ||
                       props.municipio || props.MUNICIPIO;
        
        if (nomgeo && !municipios.includes(nomgeo)) {
          municipios.push(nomgeo);
        }
      }
    });
  }
  
  // Si no hay municipios de la capa, intentar desde el caché de datos
  if (municipios.length === 0 && municipiosDataCache && municipiosDataCache.length > 0) {
    console.log('📋 Poblando selector desde caché de datos...');
    municipiosDataCache.forEach(item => {
      let props = item;
      
      // Buscar propiedades en diferentes estructuras
      if (item.properties) {
        props = item.properties;
      } else if (item.geojson) {
        if (typeof item.geojson === 'string') {
          try {
            const parsed = JSON.parse(item.geojson);
            props = parsed.properties || item;
          } catch (e) {
            props = item;
          }
        } else if (item.geojson.properties) {
          props = item.geojson.properties;
        }
      }
      
      const nomgeo = props.nomgeo || props.NOMGEO || 
                     props.nombre || props.NOMBRE ||
                     props.nom_mun || props.NOM_MUN ||
                     props.municipi_1 || props.MUNICIPI_1 ||
                     props.municipio || props.MUNICIPIO ||
                     props.CVE_MUN || props.cve_mun;
      
      if (nomgeo && !municipios.includes(nomgeo)) {
        municipios.push(nomgeo);
      }
    });
  }
  
  console.log(`📊 Se encontraron ${municipios.length} municipios`);
  
  if (municipios.length === 0) {
    select.innerHTML = '<option value="">-- Sin municipios disponibles --</option>';
    select.disabled = true;
    if (countSpan) countSpan.textContent = '(0)';
    return;
  }
  
  // Ordenar alfabéticamente
  municipios.sort((a, b) => a.localeCompare(b, 'es'));
  
  // Poblar el selector
  select.innerHTML = '<option value="">-- Seleccionar municipio --</option>';
  municipios.forEach(mun => {
    const option = document.createElement('option');
    option.value = mun;
    option.textContent = mun;
    select.appendChild(option);
  });
  
  select.disabled = false;
  if (countSpan) countSpan.textContent = `(${municipios.length})`;
  
  console.log(`✅ Selector de municipios poblado con ${municipios.length} municipios`);
}

// Función para precargar fenómenos de las capas de inundaciones al inicio
async function precargarFenomenosParaSelector() {
  console.log('🌊 Precargando datos de fenómenos para el selector...');
  
  const select = document.getElementById('fenomeno-select');
  const countSpan = document.getElementById('fenomeno-count');
  
  if (!select) {
    console.warn('⚠️ No se encontró el elemento #fenomeno-select');
    return;
  }
  
  // Si ya hay capas de inundaciones cargadas, usar esos datos
  const hayCapasCargadas = capasInundaciones.some(capaName => capasActivas[capaName]);
  if (hayCapasCargadas) {
    console.log('✅ Capas de inundaciones ya están cargadas, usando datos existentes');
    populateFenomenoSelector();
    return;
  }
  
  // Si ya hay datos en caché
  if (fenomenosDataCache && fenomenosDataCache.size > 0) {
    console.log('✅ Usando datos de fenómenos en caché');
    poblarSelectorFenomenosDesdeDatos(fenomenosDataCache);
    return;
  }
  
  try {
    const fenomenos = new Set();
    
    // Intentar cargar datos de cada capa de inundaciones
    for (const tabla of capasInundaciones) {
      const encodedNombre = encodeURIComponent(tabla);
      const fetchUrl = `${supabaseUrl}/rest/v1/${encodedNombre}?select=*&limit=500`;
      
      console.log(`🔍 Cargando fenómenos desde: ${tabla}`);
      
      try {
        const response = await fetch(fetchUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            console.log(`✅ Datos cargados de ${tabla}: ${data.length} registros`);
            
            // Extraer fenómenos
            data.forEach(item => {
              let props = item;
              if (item.properties) props = item.properties;
              else if (item.geojson && item.geojson.properties) props = item.geojson.properties;
              
              const fenomeno = props.FENOMENO || props.fenomeno || props.Fenomeno || 
                              props.FENÓMENO || props.fenómeno || props.Fenómeno;
              
              if (fenomeno && fenomeno.toString().trim() !== '') {
                fenomenos.add(fenomeno.toString().trim());
              }
            });
          }
        }
      } catch (e) {
        console.warn(`⚠️ Error al cargar ${tabla}:`, e.message);
      }
    }
    
    if (fenomenos.size === 0) {
      console.warn('⚠️ No se pudieron precargar los datos de fenómenos');
      select.innerHTML = '<option value="">-- Carga una capa de Inundaciones --</option>';
      select.disabled = true;
      if (countSpan) countSpan.textContent = '(No disponible)';
      return;
    }
    
    // Guardar en caché
    fenomenosDataCache = fenomenos;
    
    // Poblar el selector
    poblarSelectorFenomenosDesdeDatos(fenomenos);
    
  } catch (error) {
    console.error('❌ Error al precargar fenómenos:', error);
    select.innerHTML = '<option value="">-- Error al cargar fenómenos --</option>';
    select.disabled = true;
    if (countSpan) countSpan.textContent = '(Error)';
  }
}

// Función auxiliar para poblar el selector de fenómenos desde datos
function poblarSelectorFenomenosDesdeDatos(fenomenos) {
  const select = document.getElementById('fenomeno-select');
  const countSpan = document.getElementById('fenomeno-count');
  
  if (!select) return;
  
  const fenomenosArray = Array.from(fenomenos).sort();
  
  // Poblar el selector
  select.innerHTML = '<option value="">-- Todos los fenómenos --</option>';
  fenomenosArray.forEach(fenomeno => {
    const option = document.createElement('option');
    option.value = fenomeno;
    option.textContent = fenomeno;
    select.appendChild(option);
  });
  
  select.disabled = fenomenosArray.length === 0;
  if (countSpan) countSpan.textContent = `(${fenomenosArray.length})`;
  
  console.log(`✅ Selector de fenómenos poblado con ${fenomenosArray.length} opciones (precargado)`);
}

// Función para poblar el selector de municipios desde la capa "municipios"
function populateMunicipioSelector() {
  console.log('🔍 populateMunicipioSelector() llamada');
  
  const select = document.getElementById('municipio-select');
  const countSpan = document.getElementById('municipio-count');
  
  if (!select) {
    console.warn('⚠️ No se encontró el elemento #municipio-select');
    return;
  }
  
  // Verificar si la capa de municipios está cargada
  console.log('📋 Capas activas:', Object.keys(capasActivas));
  const municipiosLayer = capasActivas['municipios'];
  
  if (!municipiosLayer) {
    console.warn('⚠️ La capa "municipios" no está en capasActivas');
    select.innerHTML = '<option value="">-- Carga la capa Municipios primero --</option>';
    select.disabled = true;
    if (countSpan) countSpan.textContent = '(No cargada)';
    return;
  }
  
  console.log('✅ Capa de municipios encontrada:', municipiosLayer);
  
  // Obtener todos los nombres de municipios
  const municipios = [];
  let layerCount = 0;
  let propsExample = null;
  
  municipiosLayer.eachLayer(function(layer) {
    layerCount++;
    if (layer.feature && layer.feature.properties) {
      const props = layer.feature.properties;
      
      // Guardar ejemplo de propiedades para depuración
      if (!propsExample) {
        propsExample = props;
        console.log('📄 Ejemplo de propiedades del municipio:', props);
      }
      
      // Buscar el nombre del municipio en varios campos posibles
      const nomgeo = props.nomgeo || props.NOMGEO || 
                     props.nombre || props.NOMBRE ||
                     props.nom_mun || props.NOM_MUN ||
                     props.municipi_1 || props.MUNICIPI_1 ||
                     props.municipio || props.MUNICIPIO ||
                     props.CVE_MUN || props.cve_mun;
      
      if (nomgeo && !municipios.includes(nomgeo)) {
        municipios.push(nomgeo);
      }
    }
  });
  
  console.log(`📊 Se encontraron ${layerCount} layers, ${municipios.length} municipios únicos`);
  
  if (municipios.length === 0) {
    console.warn('⚠️ No se encontraron nombres de municipios. Campos disponibles:', propsExample ? Object.keys(propsExample) : 'ninguno');
    select.innerHTML = '<option value="">-- Sin municipios disponibles --</option>';
    select.disabled = true;
    if (countSpan) countSpan.textContent = '(0)';
    return;
  }
  
  // Ordenar alfabéticamente
  municipios.sort((a, b) => a.localeCompare(b, 'es'));
  
  // Poblar el selector
  select.innerHTML = '<option value="">-- Seleccionar municipio --</option>';
  municipios.forEach(mun => {
    const option = document.createElement('option');
    option.value = mun;
    option.textContent = mun;
    select.appendChild(option);
  });
  
  select.disabled = false;
  if (countSpan) countSpan.textContent = `(${municipios.length})`;
  
  console.log(`✅ Selector de municipios poblado con ${municipios.length} municipios`);
}

// Función para filtrar por municipio
function filterByMunicipio(municipio) {
  console.log('🏘️ filterByMunicipio llamada con:', municipio);
  selectedMunicipio = municipio;
  
  const infoBox = document.getElementById('municipio-info');
  const statsContainer = document.getElementById('inundaciones-stats');
  const loadingDiv = document.getElementById('municipio-loading');
  
  // Si no hay municipio seleccionado, limpiar todo
  if (!municipio) {
    clearMunicipioFilter();
    return;
  }
  
  // Mostrar loading
  if (loadingDiv) loadingDiv.style.display = 'flex';
  
  // Buscar el polígono del municipio
  const municipioFeature = findMunicipioPolygon(municipio);
  
  if (!municipioFeature) {
    console.warn('⚠️ No se encontró el polígono del municipio:', municipio);
    if (loadingDiv) loadingDiv.style.display = 'none';
    alert('No se encontró el polígono del municipio: ' + municipio + '\n\nPor favor, intenta de nuevo o verifica la conexión.');
    return;
  }
  
  console.log('✅ Municipio encontrado:', municipioFeature);
  
  // Activar/mostrar la capa de municipios para que sea visible
  mostrarCapaMunicipios();
  
  // Hacer zoom al municipio
  zoomToMunicipioFeature(municipioFeature);
  
  // Resaltar el municipio
  highlightMunicipio(municipioFeature);
  
  // Calcular estadísticas de inundaciones
  setTimeout(() => {
    console.log('📊 Calculando estadísticas de inundaciones...');
    const stats = calculateInundacionesStats(municipio, municipioFeature);
    console.log('📊 Estadísticas calculadas:', stats);
    ultimasEstadisticas = stats; // Guardar para exportar
    showInundacionesStats(stats);
    if (loadingDiv) loadingDiv.style.display = 'none';
  }, 100);
}

// Función para mostrar/activar la capa de municipios
function mostrarCapaMunicipios() {
  // Si existe la capa visible, mostrarla con estilo
  if (municipiosVisibleLayer) {
    municipiosVisibleLayer.setStyle({
      color: '#8a2035',
      weight: 1.5,
      opacity: 0.8,
      fillColor: '#8a2035',
      fillOpacity: 0.05
    });
    console.log('✅ Capa de municipios activada');
  }
}

// Función para limpiar el filtro de municipio
function clearMunicipioFilter() {
  selectedMunicipio = '';
  
  // Limpiar highlight
  if (municipioHighlightLayer && map) {
    map.removeLayer(municipioHighlightLayer);
    municipioHighlightLayer = null;
  }
  
  // Ocultar paneles
  const infoBox = document.getElementById('municipio-info');
  const statsContainer = document.getElementById('inundaciones-stats');
  if (infoBox) infoBox.style.display = 'none';
  if (statsContainer) statsContainer.style.display = 'none';
  
  // Resetear selector
  const select = document.getElementById('municipio-select');
  if (select) select.value = '';
  
  // Zoom al estado completo
  if (typeof map !== 'undefined' && map) {
    map.fitBounds([
      [18.35, -100.60],
      [20.30, -98.60]
    ]);
  }
  
  console.log('🗺️ Filtro de municipio limpiado');
}

// Variable para el fenómeno seleccionado
let selectedFenomeno = '';

// Función para llenar el selector de fenómenos
function populateFenomenoSelector() {
  console.log('🔍 populateFenomenoSelector() llamada');
  
  const select = document.getElementById('fenomeno-select');
  const countSpan = document.getElementById('fenomeno-count');
  
  if (!select) {
    console.warn('⚠️ No se encontró el selector de fenómenos');
    return;
  }
  
  // Recopilar todos los fenómenos únicos de las capas de inundaciones
  const fenomenos = new Set();
  
  capasInundaciones.forEach(capaName => {
    const capaLayer = capasActivas[capaName];
    if (!capaLayer) return;
    
    capaLayer.eachLayer(function(layer) {
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        // Buscar el campo FENOMENO (puede tener diferentes nombres)
        const fenomeno = props.FENOMENO || props.fenomeno || props.Fenomeno || 
                        props.FENÓMENO || props.fenómeno || props.Fenómeno;
        if (fenomeno && fenomeno.toString().trim() !== '') {
          fenomenos.add(fenomeno.toString().trim());
        }
      }
    });
  });
  
  // Si no hay fenómenos de capas activas pero hay caché, usar el caché
  if (fenomenos.size === 0 && fenomenosDataCache && fenomenosDataCache.size > 0) {
    console.log('📦 Usando fenómenos desde caché');
    fenomenosDataCache.forEach(f => fenomenos.add(f));
  }
  
  // Limpiar opciones anteriores
  select.innerHTML = '<option value="">-- Todos los fenómenos --</option>';
  
  // Agregar opciones ordenadas
  const fenomenosArray = Array.from(fenomenos).sort();
  fenomenosArray.forEach(fenomeno => {
    const option = document.createElement('option');
    option.value = fenomeno;
    option.textContent = fenomeno;
    select.appendChild(option);
  });
  
  // Actualizar contador y habilitar selector
  if (countSpan) {
    countSpan.textContent = `(${fenomenosArray.length})`;
  }
  
  select.disabled = fenomenosArray.length === 0;
  
  console.log(`✅ Selector de fenómenos poblado con ${fenomenosArray.length} opciones`);
}

// Función para filtrar por fenómeno
// Función para mostrar el popup de información
function showInfoPopup(message) {
  const overlay = document.getElementById('info-popup-overlay');
  const messageEl = document.getElementById('info-popup-message');
  
  if (overlay && messageEl) {
    messageEl.textContent = message || 'Seleccione la temporada de lluvias para habilitar la capa y consultar los datos geoespaciales asociados.';
    overlay.classList.add('show');
  }
}

// Función para cerrar el popup de información
function closeInfoPopup() {
  const overlay = document.getElementById('info-popup-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

// Cerrar popup al hacer clic fuera
document.addEventListener('click', function(e) {
  const overlay = document.getElementById('info-popup-overlay');
  if (e.target === overlay) {
    closeInfoPopup();
  }
});

// Cerrar popup con tecla Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeInfoPopup();
  }
});

function filterByFenomeno(fenomeno) {
  console.log('🌊 filterByFenomeno llamada con:', fenomeno);
  selectedFenomeno = fenomeno;
  
  // Verificar si hay capas de inundaciones activas
  const hayCapasActivas = capasInundaciones.some(capaName => capasActivas[capaName]);
  
  if (!hayCapasActivas && fenomeno) {
    // Mostrar popup informativo
    showInfoPopup('Seleccione la temporada de lluvias para habilitar la capa y consultar los datos geoespaciales asociados.');
    // Resetear el selector
    const select = document.getElementById('fenomeno-select');
    if (select) select.value = '';
    selectedFenomeno = '';
    return;
  }
  
  // Iterar sobre todas las capas de inundaciones
  capasInundaciones.forEach(capaName => {
    const capaLayer = capasActivas[capaName];
    if (!capaLayer) return;
    
    capaLayer.eachLayer(function(layer) {
      if (!layer.feature || !layer.feature.properties) return;
      
      const props = layer.feature.properties;
      const layerFenomeno = props.FENOMENO || props.fenomeno || props.Fenomeno || 
                           props.FENÓMENO || props.fenómeno || props.Fenómeno || '';
      
      // Si no hay filtro, mostrar todo
      if (!fenomeno) {
        if (layer.setStyle) {
          layer.setStyle({ opacity: 1, fillOpacity: 0.6 });
        }
        if (layer._icon) {
          layer._icon.style.opacity = '1';
        }
        return;
      }
      
      // Filtrar por fenómeno
      const matches = layerFenomeno.toString().trim().toLowerCase() === fenomeno.toLowerCase();
      
      if (layer.setStyle) {
        layer.setStyle({ 
          opacity: matches ? 1 : 0.15, 
          fillOpacity: matches ? 0.6 : 0.05 
        });
      }
      if (layer._icon) {
        layer._icon.style.opacity = matches ? '1' : '0.15';
      }
    });
  });
  
  // Actualizar estadísticas si hay municipio seleccionado
  if (selectedMunicipio) {
    const municipioFeature = findMunicipioPolygon(selectedMunicipio);
    if (municipioFeature) {
      const stats = calculateInundacionesStats(selectedMunicipio, municipioFeature);
      showInundacionesStats(stats);
    }
  }
  
  console.log('✅ Filtro de fenómeno aplicado:', fenomeno || 'Todos');
}

// Función para buscar el polígono del municipio
function findMunicipioPolygon(municipioName) {
  console.log('🔍 Buscando polígono de:', municipioName);
  
  // Función auxiliar para obtener bounds de forma segura (sin agregar layers al mapa)
  function obtenerBounds(layer, feature) {
    try {
      // Intentar obtener bounds del layer directamente
      if (layer && layer.getBounds && typeof layer.getBounds === 'function') {
        const bounds = layer.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          return bounds;
        }
      }
    } catch (err) {
      console.warn('⚠️ Error obteniendo bounds:', err.message);
    }
    return null;
  }
  
  // PRIMERO: Buscar en la capa visible de municipios (precargada y funcional)
  if (municipiosVisibleLayer) {
    let foundFeature = null;
    
    municipiosVisibleLayer.eachLayer(function(layer) {
      if (foundFeature) return;
      
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        
        const nomgeo = props.nomgeo || props.NOMGEO || 
                       props.nombre || props.NOMBRE ||
                       props.nom_mun || props.NOM_MUN ||
                       props.municipi_1 || props.MUNICIPI_1 ||
                       props.municipio || props.MUNICIPIO;
        
        if (nomgeo && nomgeo.toLowerCase().trim() === municipioName.toLowerCase().trim()) {
          console.log('✅ Municipio encontrado en capa visible:', nomgeo);
          
          const bounds = obtenerBounds(layer, layer.feature);
          
          if (bounds) {
            foundFeature = {
              layer: layer,
              feature: layer.feature,
              bounds: bounds,
              properties: props,
              fromVisibleLayer: true
            };
          } else {
            console.warn('⚠️ No se pudieron obtener bounds válidos para:', nomgeo);
          }
        }
      }
    });
    
    if (foundFeature) return foundFeature;
  }
  
  // SEGUNDO: Buscar en la capa oculta de municipios
  if (municipiosHiddenLayer) {
    let foundFeature = null;
    
    municipiosHiddenLayer.eachLayer(function(layer) {
      if (foundFeature) return;
      
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        
        const nomgeo = props.nomgeo || props.NOMGEO || 
                       props.nombre || props.NOMBRE ||
                       props.nom_mun || props.NOM_MUN ||
                       props.municipi_1 || props.MUNICIPI_1 ||
                       props.municipio || props.MUNICIPIO;
        
        if (nomgeo && nomgeo.toLowerCase().trim() === municipioName.toLowerCase().trim()) {
          console.log('✅ Municipio encontrado en capa oculta:', nomgeo);
          
          const bounds = obtenerBounds(layer, layer.feature);
          
          if (bounds) {
            foundFeature = {
              layer: layer,
              feature: layer.feature,
              bounds: bounds,
              properties: props,
              fromHiddenLayer: true
            };
          }
        }
      }
    });
    
    if (foundFeature) return foundFeature;
  }
  
  // TERCERO: Buscar en la capa de capasActivas (si el usuario la activó manualmente)
  const municipiosLayer = capasActivas['municipios'] || capasActivas['municipios_geojson'];
  
  if (municipiosLayer) {
    let foundFeature = null;
    
    municipiosLayer.eachLayer(function(layer) {
      if (foundFeature) return;
      
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        
        const nomgeo = props.nomgeo || props.NOMGEO || 
                       props.nombre || props.NOMBRE ||
                       props.nom_mun || props.NOM_MUN ||
                       props.municipi_1 || props.MUNICIPI_1 ||
                       props.municipio || props.MUNICIPIO;
        
        if (nomgeo && nomgeo.toLowerCase().trim() === municipioName.toLowerCase().trim()) {
          console.log('✅ Municipio encontrado en capa activa');
          foundFeature = {
            layer: layer,
            feature: layer.feature,
            bounds: layer.getBounds ? layer.getBounds() : null,
            properties: props
          };
        }
      }
    });
    
    if (foundFeature) return foundFeature;
  }
  
  // TERCERO: Buscar en datos precargados (fallback)
  if (municipiosDataCache && municipiosDataCache.length > 0) {
    console.log('🔍 Buscando en datos precargados...');
    
    for (const item of municipiosDataCache) {
      let props = item;
      let geometry = null;
      
      if (item.properties) {
        props = item.properties;
        geometry = item.geometry || item;
      } else if (item.geojson) {
        if (item.geojson.properties) {
          props = item.geojson.properties;
        }
        geometry = item.geojson.geometry || item.geojson;
      } else if (item.geometry) {
        geometry = item.geometry;
      }
      
      const nomgeo = props.nomgeo || props.NOMGEO || 
                     props.nombre || props.NOMBRE ||
                     props.nom_mun || props.NOM_MUN ||
                     props.municipi_1 || props.MUNICIPI_1 ||
                     props.municipio || props.MUNICIPIO;
      
      if (nomgeo && nomgeo.toLowerCase().trim() === municipioName.toLowerCase().trim()) {
        console.log('✅ Municipio encontrado en datos precargados');
        
        let feature = null;
        if (item.type === 'Feature') {
          feature = item;
        } else if (item.geojson && item.geojson.type === 'Feature') {
          feature = item.geojson;
        } else if (geometry) {
          feature = {
            type: 'Feature',
            properties: props,
            geometry: geometry
          };
        }
        
        if (feature && feature.geometry) {
          // Calcular bounds sin agregar layer al mapa
          let bounds = null;
          try {
            // Crear GeoJSON temporal solo para calcular bounds, sin agregarlo al mapa
            const tempGeoJSON = L.geoJSON(feature);
            bounds = tempGeoJSON.getBounds();
            // IMPORTANTE: Remover inmediatamente para evitar que quede en el mapa
            if (tempGeoJSON && map.hasLayer(tempGeoJSON)) {
              map.removeLayer(tempGeoJSON);
            }
          } catch (e) {
            console.warn('Error calculando bounds:', e);
          }
          
          return {
            layer: null,
            feature: feature,
            bounds: bounds,
            properties: props,
            fromCache: true
          };
        }
      }
    }
  }
  
  console.warn('⚠️ No se encontró el municipio:', municipioName);
  return null;
}

// Función para hacer zoom al municipio
function zoomToMunicipioFeature(municipioFeature) {
  if (!map || !municipioFeature || !municipioFeature.bounds) {
    console.warn('⚠️ No se puede hacer zoom: falta mapa o bounds');
    return;
  }
  
  let bounds = municipioFeature.bounds;
  
  // Validar que los bounds sean válidos
  if (!bounds.isValid || !bounds.isValid()) {
    console.warn('⚠️ Bounds inválidos, no se puede hacer zoom');
    return;
  }
  
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  
  console.log('📍 Bounds del municipio:', {
    sw: { lat: sw.lat, lng: sw.lng },
    ne: { lat: ne.lat, lng: ne.lng }
  });
  
  map.fitBounds(bounds, {
    padding: [50, 50],
    maxZoom: 13
  });
}

// Función para resaltar el municipio
function highlightMunicipio(municipioFeature) {
  // Limpiar highlight anterior
  if (municipioHighlightLayer && map) {
    map.removeLayer(municipioHighlightLayer);
    municipioHighlightLayer = null;
  }
  
  // Primero, resetear todos los municipios al estilo normal
  if (municipiosVisibleLayer) {
    municipiosVisibleLayer.eachLayer(function(layer) {
      layer.setStyle({
        color: '#8a2035',
        weight: 1.5,
        opacity: 0.8,
        fillColor: '#8a2035',
        fillOpacity: 0.05,
        dashArray: null
      });
    });
  }
  
  // Estilo de resaltado con línea punteada azul
  const estiloResaltado = {
    color: '#0077be',
    weight: 3,
    opacity: 1,
    fillColor: '#0077be',
    fillOpacity: 0.15,
    dashArray: '8, 6'
  };
  
  // Si viene de click, resaltar el layer
  if (municipioFeature.fromClick && municipioFeature.layer) {
    municipioFeature.layer.setStyle(estiloResaltado);
    municipioFeature.layer.bringToFront();
    return;
  }
  
  // Si viene del selector, buscar el layer en la capa visible y resaltarlo
  if (municipiosVisibleLayer && municipioFeature.properties) {
    const nombreBuscado = municipioFeature.properties.nomgeo || 
                          municipioFeature.properties.NOMGEO ||
                          municipioFeature.properties.nombre ||
                          municipioFeature.properties.NOMBRE ||
                          municipioFeature.properties.nom_mun ||
                          municipioFeature.properties.NOM_MUN ||
                          municipioFeature.properties.municipio ||
                          municipioFeature.properties.MUNICIPIO;
    
    if (nombreBuscado) {
      municipiosVisibleLayer.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties) {
          const props = layer.feature.properties;
          const nomgeo = props.nomgeo || props.NOMGEO || 
                         props.nombre || props.NOMBRE ||
                         props.nom_mun || props.NOM_MUN ||
                         props.municipio || props.MUNICIPIO;
          
          if (nomgeo && nomgeo.toLowerCase().trim() === nombreBuscado.toLowerCase().trim()) {
            layer.setStyle(estiloResaltado);
            layer.bringToFront();
          }
        }
      });
    }
  }
}

// Función para calcular estadísticas de inundaciones
function calculateInundacionesStats(municipioName, municipioFeature) {
  console.log('📊 Calculando estadísticas para:', municipioName);
  console.log('📋 Capas de inundaciones definidas:', capasInundaciones);
  console.log('📋 Capas activas:', Object.keys(capasActivas));
  
  const stats = {
    municipio: municipioName,
    superficie: 0,
    totalEventos: 0,
    capas: [],
    resumen: {
      encharcamientos: 0,
      inundaciones: 0,
      totalPorAnio: {}
    }
  };
  
  // Calcular superficie aproximada del municipio
  if (municipioFeature.feature && municipioFeature.feature.geometry) {
    stats.superficie = calculatePolygonArea(municipioFeature.feature.geometry);
    console.log('📐 Superficie calculada:', stats.superficie, 'km²');
  }
  
  // Obtener la geometría del municipio para intersección
  const municipioGeometry = municipioFeature.feature ? municipioFeature.feature.geometry : null;
  
  if (!municipioGeometry) {
    console.warn('⚠️ No se pudo obtener la geometría del municipio');
  }
  
  // Analizar cada capa de inundaciones
  capasInundaciones.forEach(capaName => {
    const capaLayer = capasActivas[capaName];
    
    if (!capaLayer) {
      console.log(`⏭️ Capa "${capaName}" no está cargada`);
      return;
    }
    
    console.log(`📍 Analizando capa: ${capaName}`);
    
    const capaStats = {
      nombre: capaName,
      nombreDisplay: capaName.replace('atlas temporada ', 'Atlas Temporada ').replace(/^\w/, c => c.toUpperCase()),
      color: coloresInundaciones[capaName] || '#0077be',
      totalFeatures: 0,
      featuresInside: 0,
      campos: {}
    };
    
    // Contar features y recopilar estadísticas por campo
    capaLayer.eachLayer(function(layer) {
      capaStats.totalFeatures++;
      
      // Verificar si está dentro del municipio
      let isInside = false;
      
      if (municipioGeometry && layer.feature && layer.feature.geometry) {
        const featureGeom = layer.feature.geometry;
        let coords = null;
        
        if (featureGeom.type === 'Point') {
          coords = featureGeom.coordinates;
        } else if (layer.getBounds) {
          const center = layer.getBounds().getCenter();
          coords = [center.lng, center.lat];
        }
        
        if (coords) {
          isInside = isPointInPolygon(coords, municipioGeometry);
        }
      }
      
      if (isInside) {
        capaStats.featuresInside++;
        
        // Recopilar estadísticas por campo
        if (layer.feature && layer.feature.properties) {
          const props = layer.feature.properties;
          
          Object.keys(props).forEach(key => {
            // Excluir campos técnicos
            if (['geom', 'geometry', 'id', 'gid', 'ogc_fid'].includes(key.toLowerCase())) return;
            
            const value = props[key];
            if (value === null || value === undefined || value === '') return;
            
            // Inicializar campo si no existe
            if (!capaStats.campos[key]) {
              capaStats.campos[key] = {
                valores: {},
                tipo: typeof value
              };
            }
            
            // Contar valores
            const valorStr = String(value);
            if (!capaStats.campos[key].valores[valorStr]) {
              capaStats.campos[key].valores[valorStr] = 0;
            }
            capaStats.campos[key].valores[valorStr]++;
            
            // Actualizar resumen
            const keyLower = key.toLowerCase();
            const valorLower = valorStr.toLowerCase();
            
            if (keyLower === 'name' || keyLower === 'tipo' || keyLower === 'categoria') {
              if (valorLower.includes('encharcamiento')) {
                stats.resumen.encharcamientos++;
              } else if (valorLower.includes('inundacion') || valorLower.includes('inundación')) {
                stats.resumen.inundaciones++;
              }
            }
          });
        }
      }
    });
    
    console.log(`  ✅ ${capaName}: ${capaStats.featuresInside} de ${capaStats.totalFeatures} features dentro del municipio`);
    
    stats.totalEventos += capaStats.featuresInside;
    
    // Guardar total por año
    const anio = capaName.replace('atlas temporada ', '');
    stats.resumen.totalPorAnio[anio] = capaStats.featuresInside;
    
    // Agregar a la lista solo si tiene features
    if (capaStats.featuresInside > 0) {
      stats.capas.push(capaStats);
    }
  });
  
  console.log('📊 Estadísticas finales:', {
    municipio: stats.municipio,
    totalEventos: stats.totalEventos,
    capasConDatos: stats.capas.length
  });
  
  return stats;
}

// Función para verificar si un punto está dentro de un polígono
function isPointInPolygon(point, polygon) {
  try {
    const [x, y] = point;
    let inside = false;
    
    let rings;
    if (polygon.type === 'MultiPolygon') {
      rings = polygon.coordinates.flat();
    } else if (polygon.type === 'Polygon') {
      rings = polygon.coordinates;
    } else {
      return false;
    }
    
    for (const ring of rings) {
      const coords = Array.isArray(ring[0][0]) ? ring[0] : ring;
      
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const [xi, yi] = coords[i];
        const [xj, yj] = coords[j];
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
    }
    
    return inside;
  } catch (e) {
    return false;
  }
}

// Función para calcular el área de un polígono (aproximada en km²)
// Función para calcular el área de un polígono usando la fórmula de Shoelace mejorada
function calculatePolygonArea(geometry) {
  try {
    if (!geometry || !geometry.coordinates) return 0;
    
    let totalArea = 0;
    
    // Función para calcular área de un anillo de coordenadas
    function calculateRingArea(ring) {
      if (!ring || ring.length < 3) return 0;
      
      let area = 0;
      const n = ring.length;
      
      for (let i = 0; i < n - 1; i++) {
        const [lon1, lat1] = ring[i];
        const [lon2, lat2] = ring[i + 1];
        
        // Fórmula de Shoelace para coordenadas geográficas
        // Ajustada para latitud media del Estado de México (~19.4°)
        const latMid = (lat1 + lat2) / 2;
        const lonFactor = Math.cos(latMid * Math.PI / 180);
        
        area += (lon2 - lon1) * lonFactor * (lat1 + lat2) / 2;
      }
      
      return Math.abs(area);
    }
    
    if (geometry.type === 'Polygon') {
      // Para polígonos simples, calcular área del anillo exterior
      if (geometry.coordinates[0]) {
        totalArea = calculateRingArea(geometry.coordinates[0]);
      }
    } else if (geometry.type === 'MultiPolygon') {
      // Para multipolígonos, sumar áreas de todos los polígonos
      geometry.coordinates.forEach(polygon => {
        if (polygon[0]) {
          totalArea += calculateRingArea(polygon[0]);
        }
      });
    }
    
    // Convertir de grados² a km²
    // 1 grado de latitud ≈ 111 km
    // 1 grado de longitud en lat 19.4° ≈ 111 * cos(19.4°) ≈ 104.7 km
    const kmPerDeg = 111.32; // km por grado (promedio)
    return totalArea * kmPerDeg * kmPerDeg;
    
  } catch (e) {
    console.error('Error calculando área:', e);
    return 0;
  }
}

// Función para actualizar los datos del municipio desde la capa de municipios
async function actualizarDatosMunicipio(nombreMunicipio) {
  const statSuperficie = document.getElementById('stat-superficie');
  const statPoblacion = document.getElementById('stat-poblacion');
  const statDensidad = document.getElementById('stat-densidad');
  const statRegion = document.getElementById('stat-region');
  
  // Valores por defecto
  if (statSuperficie) statSuperficie.textContent = '...';
  if (statPoblacion) statPoblacion.textContent = '...';
  if (statDensidad) statDensidad.textContent = '...';
  if (statRegion) statRegion.textContent = '...';
  
  try {
    const url = document.getElementById('url').value;
    const key = document.getElementById('key').value;
    
    if (!url || !key) {
      if (statSuperficie) statSuperficie.textContent = '--';
      if (statPoblacion) statPoblacion.textContent = '--';
      if (statDensidad) statDensidad.textContent = '--';
      if (statRegion) statRegion.textContent = '--';
      return;
    }
    
    // Consultar la tabla de municipios - obtener todos los campos para debug
    const nombreTabla = encodeURIComponent('municipios');
    const response = await fetch(`${url}/rest/v1/${nombreTabla}?nomgeo=ilike.${encodeURIComponent(nombreMunicipio)}&select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Error en respuesta municipios:', response.status);
      throw new Error('Error en consulta');
    }
    
    const datos = await response.json();
    console.log('📊 Datos del municipio obtenidos:', datos);
    
    if (datos && datos.length > 0) {
      const registro = datos[0];
      console.log('📋 Campos disponibles:', Object.keys(registro));
      
      // Buscar el campo de superficie (Km2)
      const km2 = registro.Km2 || registro.km2 || registro.KM2 || registro.area_km2 || registro.AREA_KM2 || registro.superficie;
      if (statSuperficie) {
        statSuperficie.textContent = km2 ? parseFloat(km2).toLocaleString('es-MX', {maximumFractionDigits: 2}) : '--';
      }
      console.log('  Km2:', km2);
      
      // Buscar el campo de población (Poblacio_2)
      const poblacion = registro.Poblacio_2 || registro.poblacio_2 || registro.POBLACIO_2 || 
                        registro.Poblacion || registro.poblacion || registro.POBLACION ||
                        registro.pob_total || registro.POB_TOTAL;
      if (statPoblacion) {
        // Manejar números que vienen como texto con comas como separador de miles
        let poblacionNum = '--';
        if (poblacion) {
          // Remover comas (separador de miles) antes de convertir a número
          const poblacionLimpia = String(poblacion).replace(/,/g, '');
          const num = parseFloat(poblacionLimpia);
          if (!isNaN(num)) {
            poblacionNum = num.toLocaleString('es-MX', {maximumFractionDigits: 0});
          }
        }
        statPoblacion.textContent = poblacionNum;
      }
      console.log('  Población:', poblacion);
      
      // Buscar el campo de densidad (Hab_km2)
      const densidad = registro.Hab_km2 || registro.hab_km2 || registro.HAB_KM2 ||
                       registro.densidad || registro.DENSIDAD || registro.den_pob;
      if (statDensidad) {
        statDensidad.textContent = densidad ? parseFloat(densidad).toLocaleString('es-MX', {maximumFractionDigits: 1}) : '--';
      }
      console.log('  Densidad:', densidad);
      
      // Buscar el campo de Región Hidrológica (RH)
      const regionH = registro.RH || registro.rh || registro.Rh || 
                      registro.region_h || registro.REGION_H || registro.region_hidrologica;
      if (statRegion) {
        statRegion.textContent = regionH || '--';
      }
      console.log('  Región Hidrológica:', regionH);
      
    } else {
      console.log('❌ No se encontró el municipio:', nombreMunicipio);
      if (statSuperficie) statSuperficie.textContent = '--';
      if (statPoblacion) statPoblacion.textContent = '--';
      if (statDensidad) statDensidad.textContent = '--';
      if (statRegion) statRegion.textContent = 'Sin datos';
    }
    
  } catch (error) {
    console.error('Error consultando datos del municipio:', error);
    if (statSuperficie) statSuperficie.textContent = '--';
    if (statPoblacion) statPoblacion.textContent = '--';
    if (statDensidad) statDensidad.textContent = '--';
    if (statRegion) statRegion.textContent = 'Error';
  }
}

// Función para actualizar el riesgo de inundación del municipio
async function actualizarRiesgoInundacion(nombreMunicipio) {
  const riesgoBadge = document.getElementById('riesgo-badge');
  const riesgoDetalles = document.getElementById('riesgo-detalles');
  
  if (!riesgoBadge || !riesgoDetalles) return;
  
  // Mostrar estado de carga
  riesgoBadge.textContent = '...';
  riesgoBadge.className = 'riesgo-badge';
  riesgoDetalles.innerHTML = '<span class="riesgo-hint">Consultando...</span>';
  
  try {
    // Consultar directamente a Supabase la tabla de riesgo de inundación
    const url = document.getElementById('url').value;
    const key = document.getElementById('key').value;
    
    if (!url || !key) {
      riesgoBadge.textContent = '--';
      riesgoDetalles.innerHTML = '<span class="riesgo-hint">Sin conexión a base de datos</span>';
      return;
    }
    
    // El nombre de la tabla tiene espacios, hay que codificarlo
    const nombreTabla = encodeURIComponent('riesgo de inundacion');
    
    // Buscar en la tabla por nom_mun (búsqueda insensible a mayúsculas)
    const response = await fetch(`${url}/rest/v1/${nombreTabla}?nom_mun=ilike.${encodeURIComponent(nombreMunicipio)}&select=nom_mun,vulner_ri`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Error en respuesta:', response.status, response.statusText);
      throw new Error('Error en consulta');
    }
    
    const datos = await response.json();
    
    if (datos && datos.length > 0) {
      const registro = datos[0];
      const vulnerRi = registro.vulner_ri || registro.VULNER_RI || 'Sin datos';
      
      // Normalizar el nivel de riesgo para asignar clase CSS
      const nivelNormalizado = vulnerRi.toString().toLowerCase().trim();
      let claseBadge = '';
      let textoMostrar = vulnerRi;
      
      if (nivelNormalizado.includes('muy alto') || nivelNormalizado === '5' || nivelNormalizado === 'critico' || nivelNormalizado === 'muy_alto') {
        claseBadge = 'muy-alto';
        textoMostrar = 'Muy Alto';
      } else if (nivelNormalizado.includes('alto') && !nivelNormalizado.includes('muy')) {
        claseBadge = 'alto';
        textoMostrar = 'Alto';
      } else if (nivelNormalizado.includes('medio') || nivelNormalizado === '3' || nivelNormalizado.includes('moderado')) {
        claseBadge = 'medio';
        textoMostrar = 'Medio';
      } else if (nivelNormalizado.includes('bajo') && !nivelNormalizado.includes('muy')) {
        claseBadge = 'bajo';
        textoMostrar = 'Bajo';
      } else if (nivelNormalizado.includes('muy bajo') || nivelNormalizado === '1' || nivelNormalizado.includes('minimo') || nivelNormalizado === 'muy_bajo') {
        claseBadge = 'muy-bajo';
        textoMostrar = 'Muy Bajo';
      }
      
      riesgoBadge.textContent = textoMostrar;
      riesgoBadge.className = 'riesgo-badge ' + claseBadge;
      riesgoDetalles.innerHTML = '';
      
    } else {
      // No se encontró el municipio
      riesgoBadge.textContent = 'N/D';
      riesgoBadge.className = 'riesgo-badge';
      riesgoDetalles.innerHTML = '<span class="riesgo-hint">Sin datos para este municipio</span>';
    }
    
  } catch (error) {
    console.error('Error consultando riesgo de inundación:', error);
    riesgoBadge.textContent = '--';
    riesgoBadge.className = 'riesgo-badge';
    riesgoDetalles.innerHTML = '<span class="riesgo-hint">Error al consultar datos</span>';
  }
}

// Función para consultar los tipos de obra de la tabla 'obras de proteccion' en Supabase
async function consultarTiposObra() {
  const url = supabaseUrl || document.getElementById('url')?.value?.trim();
  const key = supabaseKey || document.getElementById('key')?.value?.trim();
  
  if (!url || !key) {
    console.error('❌ No hay conexión a Supabase configurada');
    return { success: false, error: 'Sin conexión a Supabase', tipos: [] };
  }
  
  try {
    console.log('🔍 Consultando tipos de obra en Supabase...');
    
    // Nombre de la tabla con espacio
    const nombreTabla = encodeURIComponent('obras de proteccion');
    
    // Consultar solo el campo tipoobra
    const response = await fetch(`${url}/rest/v1/${nombreTabla}?select=tipoobra`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Error en respuesta:', response.status, response.statusText);
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const datos = await response.json();
    console.log(`📊 Se obtuvieron ${datos.length} registros de obras de protección`);
    
    // Extraer valores únicos del campo tipoobra
    const tiposUnicos = new Map();
    
    datos.forEach(registro => {
      const tipo = registro.tipoobra || registro.TIPOOBRA || registro.TipoObra;
      if (tipo && tipo.trim() !== '') {
        const tipoNormalizado = tipo.trim().toUpperCase();
        if (!tiposUnicos.has(tipoNormalizado)) {
          tiposUnicos.set(tipoNormalizado, {
            valor: tipo.trim(),
            count: 1,
            color: colorMapObrasProteccion[tipoNormalizado] || colorMapObrasProteccion['SIN DATOS'] || '#607D8B'
          });
        } else {
          tiposUnicos.get(tipoNormalizado).count++;
        }
      }
    });
    
    // Convertir a array y ordenar alfabéticamente
    const tiposArray = Array.from(tiposUnicos.entries())
      .map(([key, data]) => ({
        tipo: data.valor,
        tipoNormalizado: key,
        cantidad: data.count,
        color: data.color
      }))
      .sort((a, b) => a.tipo.localeCompare(b.tipo));
    
    console.log('✅ Tipos de obra encontrados:');
    tiposArray.forEach(t => {
      console.log(`   - ${t.tipo}: ${t.cantidad} registros (${t.color})`);
    });
    
    return {
      success: true,
      totalRegistros: datos.length,
      tiposUnicos: tiposArray.length,
      tipos: tiposArray
    };
    
  } catch (error) {
    console.error('❌ Error consultando tipos de obra:', error);
    return {
      success: false,
      error: error.message,
      tipos: []
    };
  }
}

// Función auxiliar para obtener solo los nombres de los tipos de obra
async function obtenerListaTiposObra() {
  const resultado = await consultarTiposObra();
  if (resultado.success) {
    return resultado.tipos.map(t => t.tipo);
  }
  return [];
}

// Función auxiliar para obtener tipos de obra con sus colores asignados
async function obtenerTiposObraConColores() {
  const resultado = await consultarTiposObra();
  if (resultado.success) {
    return resultado.tipos.reduce((obj, t) => {
      obj[t.tipoNormalizado] = t.color;
      return obj;
    }, {});
  }
  return {};
}

// Función para mostrar las estadísticas de inundaciones
function showInundacionesStats(stats) {
  const infoBox = document.getElementById('municipio-info');
  const statsContainer = document.getElementById('inundaciones-stats');
  const statsContent = document.getElementById('inundaciones-stats-content');
  
  // Mostrar info del municipio
  if (infoBox) {
    document.getElementById('municipio-nombre').textContent = stats.municipio;
    document.getElementById('stat-total-eventos').textContent = stats.totalEventos;
    infoBox.style.display = 'block';
    
    // Actualizar datos del municipio desde la capa de municipios
    actualizarDatosMunicipio(stats.municipio);
    
    // Actualizar riesgo de inundación
    actualizarRiesgoInundacion(stats.municipio);
  }
  
  // Mostrar estadísticas de inundaciones
  if (statsContainer && statsContent) {
    if (stats.capas.length === 0) {
      statsContent.innerHTML = `
        <div class="no-inundaciones-msg">
          <svg viewBox="0 0 24 24"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>
          <p>No hay eventos de inundación registrados en este municipio</p>
          <small>Activa las capas de "Inundaciones" para ver estadísticas</small>
        </div>
      `;
    } else {
      let html = '';
      
      // Resumen general
      html += `
        <div class="inundacion-resumen">
          <div class="inundacion-resumen-title">
            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
            Resumen General
          </div>
          <div class="inundacion-resumen-grid">
            <div class="resumen-stat">
              <span class="resumen-value">${stats.totalEventos}</span>
              <span class="resumen-label">Total eventos</span>
            </div>
            <div class="resumen-stat">
              <span class="resumen-value">${stats.capas.length}</span>
              <span class="resumen-label">Temporadas con datos</span>
            </div>
          </div>
        </div>
      `;
      
      // Estadísticas por capa
      stats.capas.forEach(capa => {
        html += `
          <div class="inundacion-layer-stats">
            <div class="inundacion-layer-title">
              <div class="inundacion-layer-color" style="background-color: ${capa.color}"></div>
              <span>${capa.nombreDisplay}</span>
              <span class="inundacion-layer-count">${capa.featuresInside}</span>
            </div>
        `;
        
        // Mostrar estadísticas por campo
        const camposImportantes = ['name', 'tipo', 'categoria', 'descripcion', 'fecha', 'colonia', 'localidad', 'causa'];
        
        // Campos a excluir de la vista
        const camposExcluidos = ['id 1', 'id_1', 'clave', 'mun', 'cuenca 1', 'cuenca_1', 'temp lluv', 'temp_lluv', 'templluv'];
        
        // Variables para acumular totales
        let areaTotal = 0;
        let tieneArea = false;
        let pobAfecTotal = 0;
        let tienePobAfec = false;
        let vivAfecTotal = 0;
        let tieneVivAfec = false;
        
        Object.keys(capa.campos).forEach(campo => {
          const campoLower = campo.toLowerCase().replace(/\s+/g, ' ').trim();
          
          // Verificar si el campo está excluido
          if (camposExcluidos.some(excl => campoLower === excl || campoLower.includes(excl))) {
            return; // Saltar este campo
          }
          
          const campoData = capa.campos[campo];
          
          // Si es el campo Area, sumar los valores
          if (campoLower === 'area' || campoLower === 'área') {
            tieneArea = true;
            Object.entries(campoData.valores).forEach(([valor, count]) => {
              const numVal = parseFloat(valor);
              if (!isNaN(numVal)) {
                areaTotal += numVal * count;
              }
            });
            return; // No mostrar los valores individuales, se mostrará el total después
          }
          
          // Si es el campo Pob afec, sumar los valores
          if (campoLower === 'pob afec' || campoLower === 'pob_afec' || campoLower === 'pobafec' || campoLower === 'poblacion afectada') {
            tienePobAfec = true;
            Object.entries(campoData.valores).forEach(([valor, count]) => {
              const numVal = parseFloat(valor);
              if (!isNaN(numVal)) {
                pobAfecTotal += numVal * count;
              }
            });
            return;
          }
          
          // Si es el campo Viv afec, sumar los valores
          if (campoLower === 'viv afec' || campoLower === 'viv_afec' || campoLower === 'vivafec' || campoLower === 'viviendas afectadas') {
            tieneVivAfec = true;
            Object.entries(campoData.valores).forEach(([valor, count]) => {
              const numVal = parseFloat(valor);
              if (!isNaN(numVal)) {
                vivAfecTotal += numVal * count;
              }
            });
            return;
          }
          
          const valoresOrdenados = Object.entries(campoData.valores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Máximo 5 valores
          
          if (valoresOrdenados.length > 0) {
            const campoNombre = formatCampoNombre(campo);
            const campoIcono = getIconoParaCampo(campoLower);
            
            html += `
              <div class="inundacion-field-group">
                <div class="inundacion-field-title">${campoIcono}${campoNombre}</div>
                <div class="inundacion-field-values">
            `;
            
            valoresOrdenados.forEach(([valor, count]) => {
              html += `
                <div class="inundacion-field-chip">
                  <span>${truncateText(valor, 20)}</span>
                  <span class="chip-count">${count}</span>
                </div>
              `;
            });
            
            html += `
                </div>
              </div>
            `;
          }
        });
        
        // Mostrar totales acumulados si existen
        const hayTotales = (tieneArea && areaTotal > 0) || (tienePobAfec && pobAfecTotal > 0) || (tieneVivAfec && vivAfecTotal > 0);
        
        if (hayTotales) {
          html += `
            <div class="inundacion-field-group totales-group">
              <div class="inundacion-field-title">Totales Acumulados</div>
              <div class="inundacion-field-values totales-values">
          `;
          
          if (tienePobAfec && pobAfecTotal > 0) {
            html += `
              <div class="inundacion-field-chip total-chip pob-afec">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                <span>${pobAfecTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })} personas afectadas</span>
              </div>
            `;
          }
          
          if (tieneVivAfec && vivAfecTotal > 0) {
            html += `
              <div class="inundacion-field-chip total-chip viv-afec">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                <span>${vivAfecTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })} viviendas afectadas</span>
              </div>
            `;
          }
          
          if (tieneArea && areaTotal > 0) {
            html += `
              <div class="inundacion-field-chip total-chip area-total">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/></svg>
                <span>${areaTotal.toLocaleString('es-MX', { maximumFractionDigits: 2 })} m² área total</span>
              </div>
            `;
          }
          
          html += `
              </div>
            </div>
          `;
        }
        
        html += `</div>`;
      });
      
      statsContent.innerHTML = html;
    }
    
    statsContainer.style.display = 'block';
    
    // Ajustar posición debajo del resumen general si está visible
    adjustStatsPanelPosition();
  }
}

// Variable global para almacenar las últimas estadísticas calculadas
let ultimasEstadisticas = null;

// Función para exportar informe del municipio
async function exportarInformeMunicipio() {
  if (!selectedMunicipio || !ultimasEstadisticas) {
    alert('No hay datos de municipio para exportar');
    return;
  }
  
  const stats = ultimasEstadisticas;
  const fechaActual = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Crear contenido HTML para el informe
  let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe de Inundaciones - ${stats.municipio}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      padding: 40px; 
      color: #333;
      line-height: 1.6;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4a90a4;
    }
    .logo-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 10px;
    }
    .header h1 { 
      color: #4a90a4; 
      font-size: 24px;
      margin: 0;
    }
    .header h2 {
      color: #8a2035;
      font-size: 28px;
      margin: 10px 0;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .section { 
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title { 
      background: linear-gradient(135deg, #4a90a4, #3d7a8c);
      color: white; 
      padding: 10px 15px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 6px 6px 0 0;
    }
    .section-content {
      border: 1px solid #ddd;
      border-top: none;
      padding: 15px;
      border-radius: 0 0 6px 6px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .info-item {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .info-value {
      font-size: 28px;
      font-weight: 700;
      color: #4a90a4;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .temporada {
      margin-bottom: 20px;
      border-left: 4px solid #4a90a4;
      padding-left: 15px;
    }
    .temporada-title {
      font-size: 16px;
      font-weight: 600;
      color: #4a90a4;
      margin-bottom: 10px;
    }
    .temporada-eventos {
      background: #e3f2fd;
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      color: #1565c0;
      margin-bottom: 10px;
    }
    .campo-grupo {
      margin: 10px 0;
    }
    .campo-titulo {
      font-weight: 600;
      color: #555;
      font-size: 13px;
      margin-bottom: 5px;
    }
    .campo-valores {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .campo-chip {
      background: #f0f0f0;
      padding: 4px 10px;
      border-radius: 15px;
      font-size: 12px;
    }
    .campo-chip .count {
      background: #4a90a4;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      margin-left: 5px;
      font-size: 11px;
    }
    .totales {
      background: linear-gradient(135deg, #fff3e0, #ffe0b2);
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    .totales-title {
      font-weight: 600;
      color: #e65100;
      margin-bottom: 10px;
    }
    .total-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: white;
      padding: 8px 15px;
      border-radius: 20px;
      margin: 5px;
      font-size: 13px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #888;
      font-size: 11px;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-title">
      <h1>Sistema Estatal de Información del Agua</h1>
    </div>
    <h2>Informe de Inundaciones: ${stats.municipio}</h2>
    <div class="subtitle">Estado de México | Generado el ${fechaActual}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Resumen General</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-value">${stats.totalEventos}</div>
          <div class="info-label">Total de Eventos</div>
        </div>
        <div class="info-item">
          <div class="info-value">${stats.capas.length}</div>
          <div class="info-label">Temporadas con Datos</div>
        </div>
        <div class="info-item">
          <div class="info-value">${stats.superficie > 0 ? stats.superficie.toFixed(2) : '--'}</div>
          <div class="info-label">Superficie (km²)</div>
        </div>
      </div>
    </div>
  </div>
`;

  // Agregar estadísticas por temporada
  if (stats.capas.length > 0) {
    htmlContent += `
  <div class="section">
    <div class="section-title">Detalle por Temporada de Lluvias</div>
    <div class="section-content">
`;

    stats.capas.forEach(capa => {
      htmlContent += `
      <div class="temporada">
        <div class="temporada-title">${capa.nombreDisplay}</div>
        <div class="temporada-eventos">${capa.featuresInside} eventos registrados</div>
`;

      // Campos importantes
      const camposExcluidos = ['id 1', 'id_1', 'clave', 'mun', 'cuenca 1', 'cuenca_1', 'temp lluv', 'temp_lluv', 'templluv', 'area', 'área', 'pob afec', 'pob_afec', 'viv afec', 'viv_afec'];
      
      let areaTotal = 0, pobAfecTotal = 0, vivAfecTotal = 0;
      
      Object.keys(capa.campos).forEach(campo => {
        const campoLower = campo.toLowerCase().replace(/\s+/g, ' ').trim();
        const campoData = capa.campos[campo];
        
        // Acumular totales
        if (campoLower === 'area' || campoLower === 'área') {
          Object.entries(campoData.valores).forEach(([valor, count]) => {
            const numVal = parseFloat(valor);
            if (!isNaN(numVal)) areaTotal += numVal * count;
          });
          return;
        }
        if (campoLower.includes('pob') && campoLower.includes('afec')) {
          Object.entries(campoData.valores).forEach(([valor, count]) => {
            const numVal = parseFloat(valor);
            if (!isNaN(numVal)) pobAfecTotal += numVal * count;
          });
          return;
        }
        if (campoLower.includes('viv') && campoLower.includes('afec')) {
          Object.entries(campoData.valores).forEach(([valor, count]) => {
            const numVal = parseFloat(valor);
            if (!isNaN(numVal)) vivAfecTotal += numVal * count;
          });
          return;
        }
        
        if (camposExcluidos.some(excl => campoLower.includes(excl))) return;
        
        const valoresOrdenados = Object.entries(campoData.valores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        if (valoresOrdenados.length > 0) {
          htmlContent += `
        <div class="campo-grupo">
          <div class="campo-titulo">${formatCampoNombre(campo)}</div>
          <div class="campo-valores">
`;
          valoresOrdenados.forEach(([valor, count]) => {
            htmlContent += `<div class="campo-chip">${valor}<span class="count">${count}</span></div>`;
          });
          htmlContent += `
          </div>
        </div>
`;
        }
      });
      
      // Mostrar totales si existen
      if (areaTotal > 0 || pobAfecTotal > 0 || vivAfecTotal > 0) {
        htmlContent += `
        <div class="totales">
          <div class="totales-title">Totales Acumulados</div>
`;
        if (pobAfecTotal > 0) {
          htmlContent += `<div class="total-item">👥 ${pobAfecTotal.toLocaleString('es-MX')} personas afectadas</div>`;
        }
        if (vivAfecTotal > 0) {
          htmlContent += `<div class="total-item">🏠 ${vivAfecTotal.toLocaleString('es-MX')} viviendas afectadas</div>`;
        }
        if (areaTotal > 0) {
          htmlContent += `<div class="total-item">📐 ${areaTotal.toLocaleString('es-MX', { maximumFractionDigits: 2 })} m² área total</div>`;
        }
        htmlContent += `
        </div>
`;
      }
      
      htmlContent += `
      </div>
`;
    });

    htmlContent += `
    </div>
  </div>
`;
  }

  htmlContent += `
  <div class="footer">
    <p>Comisión del Agua del Estado de México (CAEM) | Sistema Estatal de Información del Agua</p>
    <p>Este informe fue generado automáticamente. La información aquí presentada es de carácter informativo.</p>
  </div>
</body>
</html>
`;

  // Crear blob y descargar
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Abrir en nueva ventana para imprimir como PDF
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  } else {
    // Si el popup está bloqueado, descargar como HTML
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Inundaciones_${stats.municipio.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  URL.revokeObjectURL(url);
}

// Función para ajustar la posición del panel de estadísticas debajo del resumen general
function adjustStatsPanelPosition() {
  const statsPanel = document.getElementById('inundaciones-stats');
  const resumenPanel = document.getElementById('inundaciones-resumen-general');
  
  if (!statsPanel) return;
  
  // Si el resumen general está visible, posicionar debajo de él
  if (resumenPanel && resumenPanel.style.display !== 'none') {
    const resumenRect = resumenPanel.getBoundingClientRect();
    const newTop = resumenRect.bottom + 10; // 10px de separación
    
    statsPanel.style.left = 'auto';
    statsPanel.style.right = '15px';
    statsPanel.style.top = newTop + 'px';
  } else {
    // Si no hay resumen general, posicionar arriba
    statsPanel.style.left = 'auto';
    statsPanel.style.right = '15px';
    statsPanel.style.top = '160px';
  }
}

// Función para formatear el nombre del campo
function formatCampoNombre(campo) {
  return campo
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

// Función para truncar texto
function truncateText(text, maxLength) {
  if (!text) return '';
  const str = String(text);
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Función para obtener ícono según el campo
function getIconoParaCampo(campoLower) {
  const iconos = {
    // Identificación y nombre
    'name': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    'nombre': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    
    // Tipo y categoría
    'tipo': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    'categoria': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/></svg>',
    
    // Fenómeno
    'fenomeno': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>',
    'fenómeno': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>',
    
    // Ubicación
    'colonia': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    'localidad': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    'ubicacion': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    'direccion': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    'calle': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    
    // Fecha y tiempo
    'fecha': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>',
    'hora': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
    'año': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>',
    
    // Causa y descripción
    'causa': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
    'descripcion': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
    'observacion': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
    
    // Cuenca y agua
    'cuenca': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/></svg>',
    'rio': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>',
    
    // Daños y afectaciones
    'daño': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    'dano': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    'afectacion': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    
    // Profundidad y niveles
    'profundidad': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>',
    'nivel': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>',
    
    // Acción y atención
    'accion': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l4.59-4.59L16 11l-6 6z"/></svg>',
    'atencion': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"/></svg>',
    
    // Coordenadas
    'latitud': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    'longitud': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    
    // Municipio
    'municipio': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg>',
    
    // Estado
    'estado': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>',
    
    // Número o cantidad genérica
    'numero': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 8c0 1.11-.9 2-2 2h-2v2h4v2H9v-4c0-1.11.9-2 2-2h2V9H9V7h4c1.1 0 2 .89 2 2v2z"/></svg>',
    
    // Fuente
    'fuente': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
    
    // Default para campos no reconocidos
    'default': '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
  };
  
  // Buscar coincidencia
  for (const [key, icon] of Object.entries(iconos)) {
    if (key !== 'default' && campoLower.includes(key)) {
      return icon;
    }
  }
  
  return iconos['default'];
}

// Observador para detectar cuando se carga la capa de municipios
function setupMunicipiosObserver() {
  // Verificar periódicamente si la capa está cargada
  const checkInterval = setInterval(() => {
    if (capasActivas && capasActivas['municipios']) {
      populateMunicipioSelector();
      clearInterval(checkInterval);
    }
  }, 1000);
  
  // Detener después de 60 segundos
  setTimeout(() => clearInterval(checkInterval), 60000);
}

// Observer para capas de inundaciones (para el selector de fenómenos)
function setupFenomenosObserver() {
  const checkInterval = setInterval(() => {
    // Verificar si hay alguna capa de inundaciones cargada
    const hayCapasInundaciones = capasInundaciones.some(capaName => capasActivas && capasActivas[capaName]);
    if (hayCapasInundaciones) {
      populateFenomenoSelector();
      clearInterval(checkInterval);
    }
  }, 1500);
  
  // Detener después de 60 segundos
  setTimeout(() => clearInterval(checkInterval), 60000);
}

// Inicializar los observadores al cargar
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setupMunicipiosObserver();
    setupFenomenosObserver();
  });
  // También ejecutar si el DOM ya está listo
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setupMunicipiosObserver();
    setupFenomenosObserver();
  }
}

// Función para actualizar el selector cuando se carga una capa
const originalCargarCapa = typeof cargarCapa === 'function' ? cargarCapa : null;

// Hook para actualizar los selectores después de cargar capas
function onCapaMunicipiosCargada() {
  setTimeout(populateMunicipioSelector, 500);
}

function onCapaInundacionesCargada() {
  setTimeout(populateFenomenoSelector, 500);
}

// ============================================
// PANEL FLOTANTE DE ESTADÍSTICAS - ARRASTRABLE
// ============================================

// Función para cerrar el panel de estadísticas
function closeInundacionesStats() {
  const statsContainer = document.getElementById('inundaciones-stats');
  if (statsContainer) {
    statsContainer.style.display = 'none';
  }
}

// Función para inicializar el panel arrastrable
function initDraggableStatsPanel() {
  const panel = document.getElementById('inundaciones-stats');
  const handle = document.getElementById('stats-drag-handle');
  
  if (!panel || !handle) {
    console.warn('⚠️ No se encontró el panel de estadísticas o el handle');
    return;
  }
  
  let isDragging = false;
  let startX, startY;
  let startLeft, startTop;
  
  // Inicio del arrastre
  function dragStart(e) {
    // Solo iniciar si se hace clic en el handle (no en el botón de cerrar)
    if (e.target.closest('.close-stats-btn')) return;
    
    isDragging = true;
    panel.classList.add('dragging');
    
    // Obtener posición del mouse/touch
    if (e.type === 'touchstart') {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else {
      startX = e.clientX;
      startY = e.clientY;
    }
    
    // Obtener posición actual del panel
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    // Convertir a posicionamiento left/top
    panel.style.right = 'auto';
    panel.style.left = startLeft + 'px';
    panel.style.top = startTop + 'px';
    
    e.preventDefault();
  }
  
  // Durante el arrastre
  function drag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    
    let clientX, clientY;
    if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calcular el desplazamiento
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    
    // Calcular nueva posición
    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;
    
    // Limitar dentro de la ventana
    const panelRect = panel.getBoundingClientRect();
    const maxLeft = window.innerWidth - panelRect.width - 10;
    const maxTop = window.innerHeight - panelRect.height - 10;
    const minTop = 150; // Debajo del header y coordenadas
    
    newLeft = Math.max(10, Math.min(maxLeft, newLeft));
    newTop = Math.max(minTop, Math.min(maxTop, newTop));
    
    // Aplicar nueva posición
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  }
  
  // Fin del arrastre
  function dragEnd(e) {
    if (isDragging) {
      isDragging = false;
      panel.classList.remove('dragging');
    }
  }
  
  // Event listeners para mouse
  handle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  // Event listeners para touch (móviles)
  handle.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', dragEnd);
  
  console.log('✅ Panel de estadísticas arrastrable inicializado');
}

// Función para resetear posición del panel
function resetStatsPosition() {
  adjustStatsPanelPosition();
}

// ============================================
// PANEL DE RESUMEN GENERAL DE INUNDACIONES
// ============================================

// Función para cerrar el panel de resumen general
function closeResumenGeneral() {
  const panel = document.getElementById('inundaciones-resumen-general');
  if (panel) {
    panel.style.display = 'none';
    // Reajustar posición del panel de estadísticas
    setTimeout(adjustStatsPanelPosition, 50);
  }
}

// Función para calcular y mostrar el resumen general de todas las capas de inundaciones activas
function updateResumenGeneralInundaciones() {
  const panel = document.getElementById('inundaciones-resumen-general');
  const content = document.getElementById('resumen-general-content');
  
  if (!panel || !content) return;
  
  // Verificar qué capas de inundaciones están activas
  const capasInundacionesActivas = capasInundaciones.filter(nombre => 
    capasActivas && capasActivas[nombre]
  );
  
  if (capasInundacionesActivas.length === 0) {
    panel.style.display = 'none';
    // Reajustar posición del panel de estadísticas
    setTimeout(adjustStatsPanelPosition, 50);
    return;
  }
  
  // Calcular totales para todas las capas activas
  let totalEventos = 0;
  let pobAfecTotal = 0;
  let vivAfecTotal = 0;
  let areaTotal = 0;
  let capasInfo = [];
  
  capasInundacionesActivas.forEach(nombreCapa => {
    const layer = capasActivas[nombreCapa];
    if (!layer || !layer.getLayers) return;
    
    const features = layer.getLayers();
    const numEventos = features.length;
    totalEventos += numEventos;
    
    let capaPobaAfec = 0;
    let capaVivAfec = 0;
    let capaArea = 0;
    let capaFenomenos = {};
    
    features.forEach(feature => {
      const props = feature.feature ? feature.feature.properties : {};
      
      // Buscar campo Fenomeno
      const fenomenoKeys = ['FENOMENO', 'Fenomeno', 'fenomeno', 'FENÓMENO', 'Fenómeno', 'fenómeno'];
      for (const key of fenomenoKeys) {
        if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
          const fenomeno = String(props[key]).trim();
          capaFenomenos[fenomeno] = (capaFenomenos[fenomeno] || 0) + 1;
          break;
        }
      }
      
      // Buscar campo Pob afec
      const pobKeys = ['Pob afec', 'pob afec', 'POB AFEC', 'Pob_afec', 'pob_afec', 'pobafec'];
      for (const key of pobKeys) {
        if (props[key] !== undefined && props[key] !== null) {
          const val = parseFloat(props[key]);
          if (!isNaN(val)) {
            pobAfecTotal += val;
            capaPobaAfec += val;
          }
          break;
        }
      }
      
      // Buscar campo Viv afec
      const vivKeys = ['Viv afec', 'viv afec', 'VIV AFEC', 'Viv_afec', 'viv_afec', 'vivafec'];
      for (const key of vivKeys) {
        if (props[key] !== undefined && props[key] !== null) {
          const val = parseFloat(props[key]);
          if (!isNaN(val)) {
            vivAfecTotal += val;
            capaVivAfec += val;
          }
          break;
        }
      }
      
      // Buscar campo Area
      const areaKeys = ['Area', 'area', 'AREA', 'Área', 'área'];
      for (const key of areaKeys) {
        if (props[key] !== undefined && props[key] !== null) {
          const val = parseFloat(props[key]);
          if (!isNaN(val)) {
            areaTotal += val;
            capaArea += val;
          }
          break;
        }
      }
    });
    
    capasInfo.push({
      nombre: nombresCapas[nombreCapa] || nombreCapa,
      eventos: numEventos,
      pobAfec: capaPobaAfec,
      vivAfec: capaVivAfec,
      area: capaArea,
      fenomenos: capaFenomenos
    });
  });
  
  // Generar HTML
  let html = `
    <div class="resumen-general-section">
      <div class="resumen-total-header">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
        <span>Totales de ${capasInundacionesActivas.length} capa${capasInundacionesActivas.length > 1 ? 's' : ''} activa${capasInundacionesActivas.length > 1 ? 's' : ''}</span>
      </div>
      
      <div class="resumen-totales-grid">
        <div class="resumen-total-item eventos">
          <div class="resumen-total-value">${totalEventos.toLocaleString('es-MX')}</div>
          <div class="resumen-total-label">Eventos registrados</div>
        </div>
  `;
  
  if (pobAfecTotal > 0) {
    html += `
        <div class="resumen-total-item pob">
          <div class="resumen-total-value">${pobAfecTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</div>
          <div class="resumen-total-label">Población afectada</div>
        </div>
    `;
  }
  
  if (vivAfecTotal > 0) {
    html += `
        <div class="resumen-total-item viv">
          <div class="resumen-total-value">${vivAfecTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</div>
          <div class="resumen-total-label">Viviendas afectadas</div>
        </div>
    `;
  }
  
  if (areaTotal > 0) {
    html += `
        <div class="resumen-total-item area">
          <div class="resumen-total-value">${areaTotal.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</div>
          <div class="resumen-total-label">m² área total</div>
        </div>
    `;
  }
  
  html += `
      </div>
    </div>
    
    <div class="resumen-capas-detalle">
      <div class="resumen-detalle-title">Desglose por capa</div>
  `;
  
  capasInfo.forEach(capa => {
    html += `
      <div class="resumen-capa-item">
        <div class="resumen-capa-nombre">${capa.nombre}</div>
        <div class="resumen-capa-stats">
          <span class="resumen-capa-stat">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>
            ${capa.eventos} eventos
          </span>
    `;
    
    if (capa.pobAfec > 0) {
      html += `
          <span class="resumen-capa-stat pob">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            ${capa.pobAfec.toLocaleString('es-MX')} pob.
          </span>
      `;
    }
    
    if (capa.vivAfec > 0) {
      html += `
          <span class="resumen-capa-stat viv">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            ${capa.vivAfec.toLocaleString('es-MX')} viv.
          </span>
      `;
    }
    
    html += `
        </div>
    `;
    
    // Mostrar fenómenos si hay
    const fenomenosArray = Object.entries(capa.fenomenos).sort((a, b) => b[1] - a[1]);
    if (fenomenosArray.length > 0) {
      html += `
        <div class="resumen-capa-fenomenos">
      `;
      fenomenosArray.forEach(([fenomeno, count]) => {
        html += `
          <span class="resumen-fenomeno-chip">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>
            ${fenomeno} <strong>${count}</strong>
          </span>
        `;
      });
      html += `</div>`;
    }
    
    html += `
      </div>
    `;
  });
  
  html += `</div>`;
  
  content.innerHTML = html;
  panel.style.display = 'block';
  
  // Ajustar posición del panel de estadísticas si está visible
  setTimeout(adjustStatsPanelPosition, 50);
}

// Función para inicializar el panel de resumen general arrastrable
function initDraggableResumenPanel() {
  const panel = document.getElementById('inundaciones-resumen-general');
  const handle = document.getElementById('resumen-drag-handle');
  
  if (!panel || !handle) return;
  
  let isDragging = false;
  let startX, startY;
  let startLeft, startTop;
  
  function dragStart(e) {
    if (e.target.closest('.close-stats-btn')) return;
    
    isDragging = true;
    panel.classList.add('dragging');
    
    if (e.type === 'touchstart') {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else {
      startX = e.clientX;
      startY = e.clientY;
    }
    
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    panel.style.right = 'auto';
    panel.style.left = startLeft + 'px';
    panel.style.top = startTop + 'px';
    
    e.preventDefault();
  }
  
  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    let clientX, clientY;
    if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    
    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;
    
    const panelRect = panel.getBoundingClientRect();
    const maxLeft = window.innerWidth - panelRect.width - 10;
    const maxTop = window.innerHeight - panelRect.height - 10;
    const minTop = 150;
    
    newLeft = Math.max(10, Math.min(maxLeft, newLeft));
    newTop = Math.max(minTop, Math.min(maxTop, newTop));
    
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  }
  
  function dragEnd(e) {
    if (isDragging) {
      isDragging = false;
      panel.classList.remove('dragging');
    }
  }
  
  handle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  handle.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', dragEnd);
  
  console.log('✅ Panel de resumen general arrastrable inicializado');
}

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
      initDraggableStatsPanel();
      initDraggableResumenPanel();
    }, 100);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        initDraggableStatsPanel();
        initDraggableResumenPanel();
      }, 100);
    });
  }
}


// Variables para almacenar las instancias de los gráficos
let graficosInundaciones = {
  eventos: null,
  poblacion: null,
  viviendas: null,
  superficie: null
};

// Variable para almacenar estadísticas para exportar
let estadisticasGrafico = null;

// Función para generar el gráfico comparativo de inundaciones
function generarGraficoComparativo() {
  console.log('📊 Generando gráficos comparativos de inundaciones...');
  
  const capasActivasInundaciones = [];
  
  capasInundaciones.forEach(capaName => {
    if (capasActivas[capaName]) {
      capasActivasInundaciones.push(capaName);
    }
  });
  
  console.log('📋 Capas de inundaciones activas:', capasActivasInundaciones);
  
  const panel = document.getElementById('grafico-comparativo-panel');
  const contentContainer = document.getElementById('grafico-panel-content');
  const leyendaContainer = document.getElementById('grafico-leyenda');
  
  if (!panel) return;
  
  // Mostrar panel centrado
  panel.style.display = 'block';
  panel.style.position = 'fixed';
  panel.style.left = '50%';
  panel.style.top = '50%';
  panel.style.transform = 'translate(-50%, -50%)';
  panel.style.zIndex = '2000';
  
  // Si no hay capas activas, mostrar mensaje
  if (capasActivasInundaciones.length === 0) {
    contentContainer.innerHTML = `
      <div class="grafico-no-data">
        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
        <p>No hay capas de inundaciones activas</p>
        <small>Activa al menos una capa del Atlas de Inundaciones para ver los gráficos</small>
      </div>
    `;
    leyendaContainer.innerHTML = '';
    return;
  }
  
  // Restaurar estructura de gráficos
  contentContainer.innerHTML = `
    <div class="graficos-grid">
      <div class="grafico-item">
        <div class="grafico-titulo">Número de Eventos</div>
        <canvas id="grafico-eventos"></canvas>
      </div>
      <div class="grafico-item">
        <div class="grafico-titulo">Población Afectada</div>
        <canvas id="grafico-poblacion"></canvas>
      </div>
      <div class="grafico-item">
        <div class="grafico-titulo">Viviendas Afectadas</div>
        <canvas id="grafico-viviendas"></canvas>
      </div>
      <div class="grafico-item">
        <div class="grafico-titulo">Superficie Afectada (m²)</div>
        <canvas id="grafico-superficie"></canvas>
      </div>
    </div>
  `;
  
  // Colores para las temporadas
  const coloresTemporadas = {
    'atlas temporada 2020': { bg: 'rgba(231, 76, 60, 0.7)', border: '#e74c3c' },
    'atlas temporada 2021': { bg: 'rgba(52, 152, 219, 0.7)', border: '#3498db' },
    'atlas temporada 2022': { bg: 'rgba(46, 204, 113, 0.7)', border: '#2ecc71' },
    'atlas temporada 2023': { bg: 'rgba(243, 156, 18, 0.7)', border: '#f39c12' },
    'atlas temporada 2024': { bg: 'rgba(155, 89, 182, 0.7)', border: '#9b59b6' }
  };
  
  // Recopilar estadísticas por capa
  const estadisticasPorCapa = {};
  
  capasActivasInundaciones.forEach(capaName => {
    const capaLayer = capasActivas[capaName];
    if (!capaLayer) return;
    
    estadisticasPorCapa[capaName] = {
      eventos: 0,
      poblacion: 0,
      viviendas: 0,
      superficie: 0
    };
    
    capaLayer.eachLayer(function(layer) {
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        
        estadisticasPorCapa[capaName].eventos++;
        
        const pobAfec = parseFloat(props['Pob afec'] || props['pob afec'] || props['POB AFEC'] || props['pob_afec'] || 0);
        if (!isNaN(pobAfec)) estadisticasPorCapa[capaName].poblacion += pobAfec;
        
        const vivAfec = parseFloat(props['Viv afec'] || props['viv afec'] || props['VIV AFEC'] || props['viv_afec'] || 0);
        if (!isNaN(vivAfec)) estadisticasPorCapa[capaName].viviendas += vivAfec;
        
        const area = parseFloat(props['Area'] || props['area'] || props['AREA'] || props['superficie'] || 0);
        if (!isNaN(area)) estadisticasPorCapa[capaName].superficie += area;
      }
    });
  });
  
  // Guardar para exportar
  estadisticasGrafico = { capas: capasActivasInundaciones, datos: estadisticasPorCapa, colores: coloresTemporadas };
  
  // Preparar datos
  const labels = capasActivasInundaciones.map(c => c.replace('atlas temporada ', ''));
  const backgroundColors = capasActivasInundaciones.map(c => coloresTemporadas[c]?.bg || 'rgba(128,128,128,0.7)');
  const borderColors = capasActivasInundaciones.map(c => coloresTemporadas[c]?.border || '#808080');
  
  // Destruir gráficos anteriores
  Object.keys(graficosInundaciones).forEach(key => {
    if (graficosInundaciones[key]) {
      graficosInundaciones[key].destroy();
      graficosInundaciones[key] = null;
    }
  });
  
  // Opciones comunes
  const opcionesComunes = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 8, cornerRadius: 4 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9, weight: '600' } } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 9 }, callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(1)+'K' : v } }
    }
  };
  
  // Crear gráficos
  graficosInundaciones.eventos = new Chart(document.getElementById('grafico-eventos').getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ data: capasActivasInundaciones.map(c => estadisticasPorCapa[c].eventos), backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 2, borderRadius: 4 }] },
    options: opcionesComunes
  });
  
  graficosInundaciones.poblacion = new Chart(document.getElementById('grafico-poblacion').getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ data: capasActivasInundaciones.map(c => estadisticasPorCapa[c].poblacion), backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 2, borderRadius: 4 }] },
    options: opcionesComunes
  });
  
  graficosInundaciones.viviendas = new Chart(document.getElementById('grafico-viviendas').getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ data: capasActivasInundaciones.map(c => estadisticasPorCapa[c].viviendas), backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 2, borderRadius: 4 }] },
    options: opcionesComunes
  });
  
  graficosInundaciones.superficie = new Chart(document.getElementById('grafico-superficie').getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ data: capasActivasInundaciones.map(c => estadisticasPorCapa[c].superficie), backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 2, borderRadius: 4 }] },
    options: opcionesComunes
  });
  
  // Leyenda
  let leyendaHTML = '<div class="grafico-leyenda-grid">';
  capasActivasInundaciones.forEach(capaName => {
    const stats = estadisticasPorCapa[capaName];
    const color = coloresTemporadas[capaName]?.border || '#808080';
    leyendaHTML += `<div class="grafico-leyenda-item"><div class="grafico-leyenda-color" style="background:${color}"></div><div class="grafico-leyenda-info"><span class="leyenda-titulo">Temporada ${capaName.replace('atlas temporada ','')}</span><span class="leyenda-dato">${stats.eventos} eventos | ${stats.poblacion.toLocaleString('es-MX')} hab. | ${stats.viviendas.toLocaleString('es-MX')} viv.</span></div></div>`;
  });
  leyendaHTML += '</div>';
  leyendaContainer.innerHTML = leyendaHTML;
  
  initDraggableGraficoPanel();
  console.log('✅ Gráficos comparativos generados');
}

// Drag del panel
function initDraggableGraficoPanel() {
  const panel = document.getElementById('grafico-comparativo-panel');
  const handle = document.getElementById('grafico-drag-handle');
  if (!panel || !handle) return;
  
  let isDragging = false, startX, startY, initialX, initialY;
  
  handle.addEventListener('mousedown', function(e) {
    if (e.target.closest('button')) return;
    isDragging = true;
    panel.style.transform = 'none';
    const rect = panel.getBoundingClientRect();
    initialX = rect.left; initialY = rect.top;
    startX = e.clientX; startY = e.clientY;
    panel.style.left = initialX + 'px';
    panel.style.top = initialY + 'px';
    handle.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    panel.style.left = (initialX + e.clientX - startX) + 'px';
    panel.style.top = (initialY + e.clientY - startY) + 'px';
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) { isDragging = false; handle.style.cursor = 'grab'; }
  });
}

// Exportar PDF
function exportarGraficoPDF() {
  if (!estadisticasGrafico || !estadisticasGrafico.capas.length) { alert('No hay gráficos para exportar'); return; }
  
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const imgs = {
    eventos: document.getElementById('grafico-eventos')?.toDataURL('image/png', 1.0) || '',
    poblacion: document.getElementById('grafico-poblacion')?.toDataURL('image/png', 1.0) || '',
    viviendas: document.getElementById('grafico-viviendas')?.toDataURL('image/png', 1.0) || '',
    superficie: document.getElementById('grafico-superficie')?.toDataURL('image/png', 1.0) || ''
  };
  
  let tabla = '<table><thead><tr><th>Temporada</th><th>Eventos</th><th>Población</th><th>Viviendas</th><th>Superficie (m²)</th></tr></thead><tbody>';
  estadisticasGrafico.capas.forEach(c => {
    const s = estadisticasGrafico.datos[c];
    const color = estadisticasGrafico.colores[c]?.border || '#808080';
    tabla += `<tr><td><span style="display:inline-block;width:12px;height:12px;background:${color};border-radius:2px;margin-right:8px;"></span>Temporada ${c.replace('atlas temporada ','')}</td><td>${s.eventos.toLocaleString('es-MX')}</td><td>${s.poblacion.toLocaleString('es-MX')}</td><td>${s.viviendas.toLocaleString('es-MX')}</td><td>${s.superficie.toLocaleString('es-MX',{maximumFractionDigits:2})}</td></tr>`;
  });
  tabla += '</tbody></table>';
  
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comparativo de Inundaciones por Temporada - CAEM</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial;padding:25px;color:#333}.header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #4a90a4}.header h1{color:#8A2035;font-size:18px;margin-bottom:3px}.header h2{color:#4a90a4;font-size:15px;margin-bottom:3px}.header h3{font-size:14px;font-weight:normal;color:#555}.fecha{color:#666;font-size:11px;margin-top:8px;font-style:italic}.graficos-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:15px 0}.grafico-item{border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center}.grafico-item h3{font-size:12px;color:#4a90a4;margin-bottom:8px}.grafico-item img{max-width:100%}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:11px}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background:#4a90a4;color:white}tr:nth-child(even){background:#f9f9f9}td:first-child{text-align:left}.footer{margin-top:25px;padding-top:15px;border-top:1px solid #ddd;text-align:center;color:#888;font-size:9px}</style></head><body><div class="header"><h1>Comisión del Agua del Estado de México</h1><h2>Sistema Estatal de Información del Agua</h2><h3>Comparativo de Inundaciones por Temporada</h3><div class="fecha">Generado el ${fecha}</div></div><div class="graficos-grid"><div class="grafico-item"><h3>Número de Eventos</h3><img src="${imgs.eventos}"></div><div class="grafico-item"><h3>Población Afectada</h3><img src="${imgs.poblacion}"></div><div class="grafico-item"><h3>Viviendas Afectadas</h3><img src="${imgs.viviendas}"></div><div class="grafico-item"><h3>Superficie (m²)</h3><img src="${imgs.superficie}"></div></div><h3 style="font-size:13px;color:#4a90a4;margin:20px 0 10px">Tabla de Datos</h3>${tabla}<div class="footer"><p>Comisión del Agua del Estado de México (CAEM)</p></div></body></html>`;
  
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.onload = () => setTimeout(() => w.print(), 300); }
}

// Cerrar panel
function cerrarGraficoComparativo() {
  const panel = document.getElementById('grafico-comparativo-panel');
  if (panel) panel.style.display = 'none';
  Object.keys(graficosInundaciones).forEach(k => { if (graficosInundaciones[k]) { graficosInundaciones[k].destroy(); graficosInundaciones[k] = null; } });
}

// Escape para cerrar
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarGraficoComparativo(); });

console.log('✅ Sistema de filtro por municipios y fenómenos con estadísticas de inundaciones cargado');
