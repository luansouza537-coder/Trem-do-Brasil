import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { City, Edge } from '../types';
import { getSuggestedConnections } from '../utils/geo';

interface GameMapProps {
  cities: City[];
  edges: Edge[];
  selectedCityId: string | null;
  hoveredCityId: string | null;
  onSelectCity: (cityId: string | null) => void;
  onHoverCity: (cityId: string | null) => void;
  onConnectCities: (cityIdA: string, cityIdB: string) => void;
  tileLayerType: 'voyager' | 'positron' | 'dark' | 'satellite';
  flyToSignal: { lat: number; lng: number; timestamp: number } | null;
  showSuggestions: boolean;
  upgradedHubs: string[];
  maintenanceYards: string[];
  nearestYardDistances: Record<string, number>;
}

const TILE_LAYERS = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
  }
};

export default function GameMap({
  cities,
  edges,
  selectedCityId,
  hoveredCityId,
  onSelectCity,
  onHoverCity,
  onConnectCities,
  tileLayerType,
  flyToSignal,
  showSuggestions,
  upgradedHubs = [],
  maintenanceYards = [],
  nearestYardDistances = {},
}: GameMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const tilesRef = useRef<L.TileLayer | null>(null);
  
  // Layers for tracks
  const trackGroupRef = useRef<L.LayerGroup | null>(null);
  const suggestedGroupRef = useRef<L.LayerGroup | null>(null);
  const rubberBandRef = useRef<L.Polyline | null>(null);

  // Synchronization refs to bypass Leaflet event stale closures
  const selectedCityIdRef = useRef<string | null>(selectedCityId);
  const onSelectCityRef = useRef(onSelectCity);
  const onConnectCitiesRef = useRef(onConnectCities);
  const onHoverCityRef = useRef(onHoverCity);
  const citiesRef = useRef(cities);

  // Keep track of previous connections to animate newly built lines
  const prevEdgesRef = useRef<Edge[]>(edges);

  useEffect(() => {
    selectedCityIdRef.current = selectedCityId;
    onSelectCityRef.current = onSelectCity;
    onConnectCitiesRef.current = onConnectCities;
    onHoverCityRef.current = onHoverCity;
    citiesRef.current = cities;
  }, [selectedCityId, onSelectCity, onConnectCities, onHoverCity, cities]);

  // Train animation helper
  const animateTrainPath = (fromCity: City, toCity: City) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Create a beautiful, premium, custom SVG train/locomotive wrapper
    const trainSvg = `
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.45));">
          <!-- Outer circular high-contrast rim -->
          <circle cx="12" cy="12" r="11" fill="#0f172a" stroke="#fbbf24" stroke-width="1.8"/>
          <!-- Train body (cab & engine boiler facing right) -->
          <rect x="4" y="10.5" width="11" height="4" rx="1" fill="#ef4444" />
          <rect x="13.5" y="7.5" width="5.5" height="7" rx="0.8" fill="#ef4444" />
          <!-- Cabin Window -->
          <rect x="14.5" y="8.5" width="3.5" height="2.5" rx="0.5" fill="#38bdf8" />
          <!-- Chimney smoke stack & gold headlight -->
          <rect x="6" y="8" width="1.5" height="2.5" fill="#facc15" />
          <polygon points="19,11 21,12 19,13" fill="#fbbf24" />
          <!-- Wheels -->
          <circle cx="6.5" cy="15.2" r="1.3" fill="#fef08a" />
          <circle cx="10.5" cy="15.2" r="1.3" fill="#fef08a" />
          <circle cx="14.5" cy="15.2" r="1.3" fill="#fef08a" />
          <!-- Small sweet particles of white steam -->
          <circle cx="5.5" cy="5.5" r="0.9" fill="#f1f5f9" opacity="0.8" />
          <circle cx="4.2" cy="4.5" r="1.2" fill="#f1f5f9" opacity="0.6" />
        </svg>
      </div>
    `;

    // Angle of movement for rotation
    const dLat = toCity.lat - fromCity.lat;
    const dLng = toCity.lng - fromCity.lng;
    const angle = Math.atan2(dLat, dLng) * (180 / Math.PI);
    // Since geographic maps have positive Y pointing North, but pixel grids have positive Y pointing South:
    const rotationAngle = -angle; 

    // Create Marker that transforms rotatively
    const trainIcon = L.divIcon({
      html: `
        <div style="transform: rotate(${rotationAngle}deg); transform-origin: center; width: 28px; height: 28px;">
          ${trainSvg}
        </div>
      `,
      className: 'leaflet-train-icon-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const trainMarker = L.marker([fromCity.lat, fromCity.lng], {
      icon: trainIcon,
      zIndexOffset: 10000 // Ensure trains render on top of normal cities/rails
    }).addTo(map);

    const startTime = performance.now();
    const duration = 2500; // 2.5 seconds transit time

    const updateFrame = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(elapsed / duration, 1);

      // Smooth Ease-In-Out
      const ease = pct < 0.5 
        ? 2 * pct * pct 
        : 1 - Math.pow(-2 * pct + 2, 2) / 2;

      const currentLat = fromCity.lat + (toCity.lat - fromCity.lat) * ease;
      const currentLng = fromCity.lng + (toCity.lng - fromCity.lng) * ease;

      trainMarker.setLatLng([currentLat, currentLng]);

      if (pct < 1) {
        requestAnimationFrame(updateFrame);
      } else {
        // Remove train once destination reached
        trainMarker.remove();

        // Spawn beautiful gold wave celebration burst
        const burstSvg = `
          <div class="relative flex items-center justify-center pointer-events-none">
            <span class="absolute inline-flex h-12 w-12 rounded-full bg-amber-400/55 animate-ping"></span>
            <span class="absolute inline-flex h-6 w-6 rounded-full bg-amber-500/25 animate-pulse"></span>
          </div>
        `;
        const burstIcon = L.divIcon({
          html: burstSvg,
          className: 'train-arrival-sparkle',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        const burstMarker = L.marker([toCity.lat, toCity.lng], { icon: burstIcon }).addTo(map);
        setTimeout(() => burstMarker.remove(), 1000);
      }
    };

    requestAnimationFrame(updateFrame);
  };

  // 1. Detect and Animate new track validations immediately
  useEffect(() => {
    const prevEdges = prevEdgesRef.current;
    if (prevEdges && edges.length > prevEdges.length) {
      // Find the edge that was recently added
      const addedEdges = edges.filter(e => !prevEdges.some(pe => pe.id === e.id));
      addedEdges.forEach(edge => {
        const fromCity = cities.find(c => c.id === edge.from);
        const toCity = cities.find(c => c.id === edge.to);
        if (fromCity && toCity) {
          // Play train traveling from origin to destination
          animateTrainPath(fromCity, toCity);
        }
      });
    }
    prevEdgesRef.current = edges;
  }, [edges, cities]);

  // 2. Play casual passive backing trains over randomly connected paths to increase realism
  useEffect(() => {
    const timer = setInterval(() => {
      if (edges.length === 0 || !mapRef.current) return;
      // Spawn random train along an existing edge
      const randomEdge = edges[Math.floor(Math.random() * edges.length)];
      const fromCity = cities.find(c => c.id === randomEdge.from);
      const toCity = cities.find(c => c.id === randomEdge.to);
      if (fromCity && toCity) {
        // Toggle direction randomly for organic flow
        const reverse = Math.random() > 0.5;
        if (reverse) {
          animateTrainPath(toCity, fromCity);
        } else {
          animateTrainPath(fromCity, toCity);
        }
      }
    }, 14000); // Trigger a lively train elsewhere every 14 seconds

    return () => clearInterval(timer);
  }, [edges, cities]);

  // Helper to generate the custom marker HTML based on city properties
  const getMarkerHtml = (
    city: City, 
    conns: number, 
    isSelected: boolean, 
    isHovered: boolean,
    isUpgradedHub: boolean = false,
    hasMaintenanceYard: boolean = false
  ) => {
    const isCapital = city.type === 'capital';
    const maxConns = isUpgradedHub ? 3 : 2;
    
    // Choose theme colors depending on the connection saturation
    let statusClass = 'border-slate-400 bg-slate-900 text-slate-300';
    let coreDotClass = 'bg-slate-400';
    if (conns >= maxConns) {
      statusClass = 'border-emerald-500 bg-emerald-950 text-emerald-300';
      coreDotClass = 'bg-emerald-400';
    } else if (conns > 0) {
      statusClass = 'border-amber-500 bg-amber-950 text-amber-300';
      coreDotClass = 'bg-amber-400';
    } else if (isCapital) {
      statusClass = 'border-amber-400 bg-slate-900 text-amber-300';
      coreDotClass = 'bg-amber-400';
    } else {
      statusClass = 'border-sky-500 bg-slate-900 text-sky-300';
      coreDotClass = 'bg-sky-400';
    }

    const scaleClass = isSelected 
      ? 'scale-125 ring-4 ring-amber-500/40 z-50' 
      : isHovered 
        ? 'scale-110 ring-2 ring-slate-200 z-40' 
        : 'hover:scale-105 z-30';

    // Advanced dynamic central hubs and maintenance badges
    const hubBadge = isUpgradedHub 
      ? `<span class="absolute -top-1.5 -left-1.5 text-[9px] w-[17px] h-[17px] flex items-center justify-center rounded-full bg-amber-500 border border-slate-950 text-slate-950 font-black shadow-md z-[60]" title="Terminal Central Integrador">★</span>`
      : '';

    const yardBadge = hasMaintenanceYard
      ? `<span class="absolute -bottom-1.5 -left-1.5 text-[8px] w-[17px] h-[17px] flex items-center justify-center rounded-full bg-emerald-600 border border-slate-950 text-white font-bold shadow-md z-[60]" title="Pátio de Manutenção Ativo">🔧</span>`
      : '';

    return `
      <div class="relative flex items-center justify-center transition-all duration-350 ${scaleClass}">
        <!-- Selected halo effect -->
        ${isSelected ? '<span class="absolute inline-flex h-9 w-9 rounded-full bg-amber-500/30 animate-pulse"></span>' : ''}
        ${isHovered && !isSelected ? '<span class="absolute inline-flex h-8 w-8 rounded-full bg-slate-300/20"></span>' : ''}

        <!-- Upgrades and Status Badges Overlay -->
        ${hubBadge}
        ${yardBadge}

        <!-- Main Pin node -->
        <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 bg-slate-900 ${statusClass} transition-all" style="font-size: 11px;">
          <!-- Outer core ring depending on type -->
          ${city.portType === 'maritime' 
            ? '<span class="text-amber-400 font-bold select-none leading-none">⚓</span>' 
            : city.portType === 'fluvial' 
              ? '<span class="text-teal-300 font-bold select-none leading-none">🚢</span>' 
              : `
              <div class="w-3.5 h-3.5 rounded-full flex items-center justify-center ${isCapital ? 'animate-pulse' : ''}">
                <div class="w-2 h-2 rounded-full ${coreDotClass}"></div>
              </div>
              `
          }
        </div>

        <!-- Connection Badge indicator -->
        <span class="absolute -top-1.5 -right-1.5 text-[8.5px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full text-white shadow-sm border border-slate-700 ${
          conns >= maxConns 
            ? 'bg-emerald-600 border-emerald-450' 
            : conns > 0 
              ? 'bg-amber-600 border-amber-450 animate-pulse' 
              : 'bg-slate-700'
        }">
          ${conns}
        </span>
      </div>
    `;
  };

  // Calculate connection maps on-the-fly to configure marker badges
  const cityConnectionsMap = React.useMemo(() => {
    const counts: Record<string, number> = {};
    cities.forEach(c => { counts[c.id] = 0; });
    edges.forEach(edge => {
      counts[edge.from] = (counts[edge.from] || 0) + 1;
      counts[edge.to] = (counts[edge.to] || 0) + 1;
    });
    return counts;
  }, [cities, edges]);

  // Handle flying-to commands triggered by clicking in the checklist menu
  useEffect(() => {
    if (flyToSignal && mapRef.current) {
      mapRef.current.flyTo([flyToSignal.lat, flyToSignal.lng], 7, {
        animate: true,
        duration: 1.5
      });
    }
  }, [flyToSignal]);

  // 1. Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Build leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [-14.235, -51.925],
      zoom: 5,
      zoomControl: false,
      attributionControl: true
    });
    
    // Add default zoom control at bottom right for clean layout
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    // Apply first tileset
    const initialTiles = TILE_LAYERS[tileLayerType];
    tilesRef.current = L.tileLayer(initialTiles.url, {
      attribution: initialTiles.attribution,
      maxZoom: 18,
    }).addTo(map);

    // Track layers
    trackGroupRef.current = L.layerGroup().addTo(map);
    suggestedGroupRef.current = L.layerGroup().addTo(map);
    
    // Create rubber-band path layer
    rubberBandRef.current = L.polyline([], {
      color: '#fbbf24', // amber yellow
      weight: 3,
      dashArray: '5, 8',
      opacity: 0.8
    }).addTo(map);

    // Set up a ResizeObserver to handle container size changes beautifully and invalidate size
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: false });
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Secondary fallback in case container takes slightly longer to layout
    const fallbackTimer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);

    // Clicking map background deselects active node
    map.on('click', (e) => {
      // Ignore clicks on markers (leaflet stops propagation typically, but if it leaks, check target)
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.leaflet-marker-icon')) {
        onSelectCityRef.current(null);
      }
    });

    // Tracking rubber band coordinate
    map.on('mousemove', (e) => {
      if (rubberBandRef.current && selectedCityIdRef.current) {
        const originCity = citiesRef.current.find(c => c.id === selectedCityIdRef.current);
        if (originCity) {
          rubberBandRef.current.setLatLngs([
            [originCity.lat, originCity.lng],
            [e.latlng.lat, e.latlng.lng]
          ]);
        }
      }
    });

    // Clear rubber band if mouse leaves map frame
    map.on('mouseout', () => {
      if (rubberBandRef.current) {
        rubberBandRef.current.setLatLngs([]);
      }
    });

    // Add marker nodes for all cities in the game
    cities.forEach(city => {
      const conns = cityConnectionsMap[city.id] || 0;
      const isSel = selectedCityId === city.id;
      const isGov = hoveredCityId === city.id;
      const isUpgraded = upgradedHubs?.includes(city.id) || false;
      const hasYard = maintenanceYards?.includes(city.id) || false;

      const markerHtml = getMarkerHtml(city, conns, isSel, isGov, isUpgraded, hasYard);
      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-city-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([city.lat, city.lng], { icon: customIcon });

      // Interactive hover tooltips
      const trackerType = city.portType === 'maritime' 
        ? '⚓ Porto Marítimo' 
        : city.portType === 'fluvial' 
          ? '🚢 Porto Fluvial' 
          : city.type === 'capital' 
            ? '★ Capital' 
            : '● Cidade';

      const maxConns = isUpgraded ? 3 : 2;
      const tooltipContent = `
        <div class="p-1 px-1.5 font-sans leading-tight">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="font-bold text-slate-900 text-sm whitespace-nowrap">${city.name}</span>
            <span class="text-[10px] bg-slate-200 text-slate-800 font-bold px-1 rounded">${city.state}</span>
          </div>
          <p class="text-[10px] text-slate-500 font-medium">${trackerType}${isUpgraded ? ' (★ Terminal Central)' : ''}${hasYard ? ' (🔧 Manutenção)' : ''}</p>
          <div class="mt-1 flex items-center justify-between text-[10px] border-t border-slate-100 pt-1 text-slate-600">
            <span>Conexões:</span>
            <span class="font-extrabold ${conns >= maxConns ? 'text-emerald-600' : 'text-amber-500'}">
              ${conns} / ${maxConns}
            </span>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.95,
        className: 'leaflet-custom-tooltip border-none shadow-xl rounded-lg p-0 bg-white'
      });

      // Handle marker connectionClicks
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        
        const currentSelectedId = selectedCityIdRef.current;
        if (currentSelectedId && currentSelectedId !== city.id) {
          // Attempt track placement
          onConnectCitiesRef.current(currentSelectedId, city.id);
        } else {
          // First node selection toggler
          onSelectCityRef.current(currentSelectedId === city.id ? null : city.id);
        }
      });

      // Mouse interactive visual triggers
      marker.on('mouseover', () => {
        onHoverCityRef.current(city.id);
      });

      marker.on('mouseout', () => {
        onHoverCityRef.current(null);
      });

      marker.addTo(map);
      markersRef.current[city.id] = marker;
    });

    return () => {
      resizeObserver.disconnect();
      clearTimeout(fallbackTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
    };
  }, []);

  // Update Map Theme layer when selector state changes
  useEffect(() => {
    if (!mapRef.current || !tilesRef.current) return;

    mapRef.current.removeLayer(tilesRef.current);
    
    const nextTiles = TILE_LAYERS[tileLayerType];
    tilesRef.current = L.tileLayer(nextTiles.url, {
      attribution: nextTiles.attribution,
      maxZoom: 18,
    }).addTo(mapRef.current);
  }, [tileLayerType]);

  // Update city markers appearance dynamically based on app state
  useEffect(() => {
    cities.forEach(city => {
      const marker = markersRef.current[city.id];
      if (marker) {
        const conns = cityConnectionsMap[city.id] || 0;
        const isSel = selectedCityId === city.id;
        const isGov = hoveredCityId === city.id;
        const isUpgraded = upgradedHubs?.includes(city.id) || false;
        const hasYard = maintenanceYards?.includes(city.id) || false;

        // Swap out icons completely without destroying spatial markers
        marker.setIcon(L.divIcon({
          html: getMarkerHtml(city, conns, isSel, isGov, isUpgraded, hasYard),
          className: 'custom-city-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        }));

        // Dynamically update the floating tooltips connection state live
        const trackerType = city.portType === 'maritime' 
          ? '⚓ Porto Marítimo' 
          : city.portType === 'fluvial' 
            ? '🚢 Porto Fluvial' 
            : city.type === 'capital' 
              ? '★ Capital' 
              : '● Cidade';

        const maxConns = isUpgraded ? 3 : 2;

        let maintenanceText = '';
        if (conns > 0) {
          const mDist = nearestYardDistances[city.id];
          if (mDist === undefined || mDist === Infinity) {
            maintenanceText = `<p class="text-[10px] text-rose-600 font-bold mt-1 bg-rose-50/80 px-1 py-0.5 rounded border border-rose-200">⚠️ Risco de Falha! Sem Manutenção</p>`;
          } else {
            maintenanceText = `<p class="text-[10px] text-emerald-600 font-semibold mt-1 bg-emerald-50/80 px-1 py-0.5 rounded border border-emerald-200">🔧 Cobertura: ${mDist} km / 800 km</p>`;
          }
        }

        const tooltipContent = `
          <div class="p-1.5 font-sans leading-tight">
            <div class="flex items-center gap-1.5 mb-0.5">
              <span class="font-bold text-slate-800 text-sm whitespace-nowrap">${city.name}</span>
              <span class="text-[10px] bg-slate-100 text-slate-700 font-bold px-1 rounded">${city.state}</span>
            </div>
            <p class="text-[10px] text-slate-400 font-medium">${trackerType}${isUpgraded ? ' (★ Central Hub)' : ''}${hasYard ? ' (🔧 Yard)' : ''}</p>
            ${maintenanceText}
            <div class="mt-1 flex items-center justify-between text-[10px] border-t border-slate-100 pt-1 text-slate-600">
              <span class="mr-3 font-medium">Conexões:</span>
              <span class="font-extrabold ${conns >= maxConns ? 'text-emerald-600' : 'text-amber-500'}">
                ${conns} / ${maxConns}
              </span>
            </div>
          </div>
        `;
        marker.setTooltipContent(tooltipContent);
      }
    });

    // Clear rubber band if selectedCity is null
    if (!selectedCityId && rubberBandRef.current) {
      rubberBandRef.current.setLatLngs([]);
    }
  }, [cities, edges, selectedCityId, hoveredCityId, cityConnectionsMap, upgradedHubs, maintenanceYards, nearestYardDistances]);

  // Draw actual railway lines with layered aesthetics (dark base + dashed indicator)
  useEffect(() => {
    if (!mapRef.current || !trackGroupRef.current) return;

    // Purge old segments
    trackGroupRef.current.clearLayers();

    edges.forEach(edge => {
      const fromCity = cities.find(c => c.id === edge.from);
      const toCity = cities.find(c => c.id === edge.to);

      if (fromCity && toCity) {
        const latlngs: L.LatLngExpression[] = [
          [fromCity.lat, fromCity.lng],
          [toCity.lat, toCity.lng]
        ];

        const isBalsa = edge.type === 'balsa';

        if (isBalsa) {
          // 1. Water path shadow/rim
          const balsaShadow = L.polyline(latlngs, {
            color: '#0284c7', // Sky-600
            weight: 7,
            opacity: 0.4,
            lineCap: 'round'
          });

          // 2. Dotted aquatic line representing shipping ferry lane
          const balsaLine = L.polyline(latlngs, {
            color: '#0ea5e9', // Sky-500
            weight: 4.5,
            opacity: 0.9,
            dashArray: '6, 8',
            lineCap: 'round'
          });

          // 3. Central light core ripple wave
          const balsaRipple = L.polyline(latlngs, {
            color: '#e0f2fe', // Sky-100 water ripple
            weight: 1.5,
            opacity: 0.8,
            dashArray: '1, 14',
            lineCap: 'round'
          });

          // 4. Interactive hitbox
          const interactiveLayer = L.polyline(latlngs, {
            color: 'transparent',
            weight: 15,
            opacity: 0.0
          });

          const deleteHandler = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            onConnectCitiesRef.current(edge.from, edge.to);
          };
          interactiveLayer.on('click', deleteHandler);

          // Hover highlights
          interactiveLayer.on('mouseover', () => {
            balsaLine.setStyle({ color: '#38bdf8', weight: 6 });
            balsaShadow.setStyle({ color: '#fbbf24', weight: 9, opacity: 0.8 }); // gold glow selection
          });
          interactiveLayer.on('mouseout', () => {
            balsaLine.setStyle({ color: '#0ea5e9', weight: 4.5 });
            balsaShadow.setStyle({ color: '#0284c7', weight: 7, opacity: 0.4 });
          });

          interactiveLayer.bindTooltip(`Balsa Hidroviária: ${fromCity.name} ⇄ ${toCity.name} (${edge.distance} km)<br/><span class="text-[11px] text-cyan-400 font-bold">Clique para desativar rota hidroviária</span>`, {
            sticky: true,
            direction: 'auto',
            className: 'leaflet-railway-tooltip font-sans text-xs bg-slate-900 text-white rounded p-1.5'
          });

          trackGroupRef.current?.addLayer(balsaShadow);
          trackGroupRef.current?.addLayer(balsaLine);
          trackGroupRef.current?.addLayer(balsaRipple);
          trackGroupRef.current?.addLayer(interactiveLayer);

        } else {
          // 1. Ballast base layer (Leito de brita cinza largo)
          const ballastLayer = L.polyline(latlngs, {
            color: '#334155', // slate-700
            weight: 8,
            opacity: 0.85,
            lineCap: 'round'
          });

          // 2. Wooden Sleepers/Ties (Dormentes de madeira espaçados)
          const tieLayer = L.polyline(latlngs, {
            color: '#451a03', // canela escuro/mogno
            weight: 6.5,
            opacity: 1.0,
            dashArray: '2, 5', // barras transversais realistas
            lineCap: 'butt'
          });

          // 3. Steel Rails Base (Banda metálica vermelha)
          const railsBase = L.polyline(latlngs, {
            color: '#ef4444', // vermelho vivo
            weight: 4,
            opacity: 1.0,
            lineCap: 'round'
          });

          // 4. Steel Rails Center Split (Duplica o visual criando dois trilhos paralelos)
          const railsSplit = L.polyline(latlngs, {
            color: '#0f172a', // cor escura para cavar o meio
            weight: 1.4,
            opacity: 1.0,
            lineCap: 'round'
          });

          // 5. Interactive invisible hitbox (Excelente sensibilidade ao toque e mouse)
          const interactiveLayer = L.polyline(latlngs, {
            color: 'transparent',
            weight: 15,
            opacity: 0.0
          });

          // Click handler to remove track segments instantly
          const deleteHandler = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            onConnectCitiesRef.current(edge.from, edge.to);
          };

          interactiveLayer.on('click', deleteHandler);

          // Hover effects on the interactive area
          const hoverIn = () => {
            railsBase.setStyle({ color: '#fbbf24', weight: 5 }); // brilha em ouro
            ballastLayer.setStyle({ color: '#475569', weight: 10 });
          };
          const hoverOut = () => {
            railsBase.setStyle({ color: '#ef4444', weight: 4 });
            ballastLayer.setStyle({ color: '#334155', weight: 8 });
          };

          interactiveLayer.on('mouseover', hoverIn);
          interactiveLayer.on('mouseout', hoverOut);

          // Bind delete confirmation tooltip to the interactive area
          interactiveLayer.bindTooltip(`Trilho: ${fromCity.name} ⇄ ${toCity.name} (${edge.distance} km)<br/><span class="text-red-400 font-bold">Clique para remover trilho</span>`, {
            sticky: true,
            direction: 'auto',
            className: 'leaflet-railway-tooltip font-sans text-xs bg-slate-900 text-white rounded p-1.5'
          });

          trackGroupRef.current?.addLayer(ballastLayer);
          trackGroupRef.current?.addLayer(tieLayer);
          trackGroupRef.current?.addLayer(railsBase);
          trackGroupRef.current?.addLayer(railsSplit);
          trackGroupRef.current?.addLayer(interactiveLayer);
        }
      }
    });
  }, [edges, cities]);

  // Draw suggested railway draft guides (faint lines representing possible routes)
  useEffect(() => {
    if (!mapRef.current || !suggestedGroupRef.current) return;

    // Clear old guides
    suggestedGroupRef.current.clearLayers();

    if (!showSuggestions) return;

    const suggestedPairs = getSuggestedConnections(cities);
    
    suggestedPairs.forEach((pair) => {
      // Check if there is already an active edge
      const edgeId1 = `${pair.from}-${pair.to}`;
      const edgeId2 = `${pair.to}-${pair.from}`;
      const activeExists = edges.some((e) => e.id === edgeId1 || e.id === edgeId2);

      if (activeExists) return; // Already connected!

      const fromCity = cities.find((c) => c.id === pair.from);
      const toCity = cities.find((c) => c.id === pair.to);

      if (fromCity && toCity) {
        const latlngs: L.LatLngExpression[] = [
          [fromCity.lat, fromCity.lng],
          [toCity.lat, toCity.lng],
        ];

        // Faint guide plan line
        const guideLine = L.polyline(latlngs, {
          color: '#64748b', // slate-500
          weight: 2,
          opacity: 0.35,
          dashArray: '4, 8',
          lineCap: 'round',
        });

        // Click handler to instantly build this track guide
        const buildHandler = (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onConnectCitiesRef.current(pair.from, pair.to);
        };

        guideLine.on('click', buildHandler);

        // Hover effects to highlight that this can be created!
        guideLine.on('mouseover', () => {
          guideLine.setStyle({
            color: '#fbbf24', // golden alert
            weight: 3.5,
            opacity: 0.8,
            dashArray: 'none',
          });
        });

        guideLine.on('mouseout', () => {
          guideLine.setStyle({
            color: '#64748b',
            weight: 2,
            opacity: 0.35,
            dashArray: '4, 8',
          });
        });

        // Add a tooltip explaining that clicking connects
        guideLine.bindTooltip(`Planejado: ${fromCity.name} ⇄ ${toCity.name} (${pair.distance} km)<br/><span class="text-amber-400 font-bold">Clique para erguer ferrovia</span>`, {
          sticky: true,
          direction: 'auto',
          className: 'leaflet-railway-tooltip font-sans text-xs bg-slate-900 text-white rounded p-1.5',
        });

        suggestedGroupRef.current?.addLayer(guideLine);
      }
    });
  }, [cities, edges, showSuggestions, onConnectCities]);

  return (
    <div className="w-full h-full relative" id="map-container">
      {/* Absolute Loading Marker layer in leaf bounds */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ outline: 'none' }} />
    </div>
  );
}
