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

  useEffect(() => {
    selectedCityIdRef.current = selectedCityId;
    onSelectCityRef.current = onSelectCity;
    onConnectCitiesRef.current = onConnectCities;
    onHoverCityRef.current = onHoverCity;
    citiesRef.current = cities;
  }, [selectedCityId, onSelectCity, onConnectCities, onHoverCity, cities]);

  // Helper to generate the custom marker HTML based on city properties
  const getMarkerHtml = (city: City, conns: number, isSelected: boolean, isHovered: boolean) => {
    const isCapital = city.type === 'capital';
    
    // Choose theme colors depending on the connection saturation
    let statusClass = 'border-slate-400 bg-slate-900 text-slate-300';
    let coreDotClass = 'bg-slate-400';
    if (conns === 2) {
      statusClass = 'border-emerald-500 bg-emerald-950 text-emerald-300';
      coreDotClass = 'bg-emerald-400';
    } else if (conns === 1) {
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

    return `
      <div class="relative flex items-center justify-center transition-all duration-350 ${scaleClass}">
        <!-- Selected halo effect -->
        ${isSelected ? '<span class="absolute inline-flex h-9 w-9 rounded-full bg-amber-500/30 animate-pulse"></span>' : ''}
        ${isHovered && !isSelected ? '<span class="absolute inline-flex h-8 w-8 rounded-full bg-slate-300/20"></span>' : ''}

        <!-- Main Pin node -->
        <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 bg-slate-900 ${statusClass} transition-all">
          <!-- Outer core ring depending on type -->
          <div class="w-3.5 h-3.5 rounded-full flex items-center justify-center ${isCapital ? 'animate-pulse' : ''}">
            <div class="w-2 h-2 rounded-full ${coreDotClass}"></div>
          </div>
        </div>

        <!-- Connection Badge indicator -->
        <span class="absolute -top-1.5 -right-1.5 text-[8.5px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full text-white shadow-sm border border-slate-700 ${
          conns === 2 
            ? 'bg-emerald-600 border-emerald-400' 
            : conns === 1 
              ? 'bg-amber-600 border-amber-400 animate-pulse' 
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

    // Add marker nodes for all 57 cities
    cities.forEach(city => {
      const conns = cityConnectionsMap[city.id] || 0;
      const isSel = selectedCityId === city.id;
      const isGov = hoveredCityId === city.id;

      const markerHtml = getMarkerHtml(city, conns, isSel, isGov);
      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-city-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([city.lat, city.lng], { icon: customIcon });

      // Interactive hover tooltips
      const trackerType = city.type === 'capital' ? '★ Capital' : '● Cidade';
      const tooltipContent = `
        <div class="p-1 px-1.5 font-sans leading-tight">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="font-bold text-slate-900 text-sm">${city.name}</span>
            <span class="text-[10px] bg-slate-200 text-slate-800 font-bold px-1 rounded">${city.state}</span>
          </div>
          <p class="text-[10px] text-slate-500 font-medium">${trackerType}</p>
          <div class="mt-1 flex items-center justify-between text-[10px] border-t border-slate-100 pt-1 text-slate-600">
            <span>Conexões:</span>
            <span class="font-extrabold ${conns === 2 ? 'text-emerald-600' : 'text-amber-500'}">
              ${conns} / 2
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

        // Swap out icons completely without destroying spatial markers
        marker.setIcon(L.divIcon({
          html: getMarkerHtml(city, conns, isSel, isGov),
          className: 'custom-city-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        }));

        // Dynamically update the floating tooltips connection state live
        const trackerType = city.type === 'capital' ? '★ Capital' : '● Cidade';
        const tooltipContent = `
          <div class="p-1.5 font-sans leading-tight">
            <div class="flex items-center gap-1.5 mb-0.5">
              <span class="font-bold text-slate-800 text-sm whitespace-nowrap">${city.name}</span>
              <span class="text-[10px] bg-slate-100 text-slate-700 font-bold px-1 rounded">${city.state}</span>
            </div>
            <p class="text-[10px] text-slate-400 font-medium">${trackerType}</p>
            <div class="mt-1 flex items-center justify-between text-[10px] border-t border-slate-100 pt-1 text-slate-600">
              <span class="mr-3">Conexões:</span>
              <span class="font-extrabold ${conns === 2 ? 'text-emerald-600' : 'text-amber-500'}">
                ${conns} / 2
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
  }, [cities, edges, selectedCityId, hoveredCityId, cityConnectionsMap]);

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
