import { useMemo, useState, useRef } from 'react';
import type { MouseEvent } from 'react';
import {
  Compass,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scale,
  Shield,
  Layers,
  Sparkles,
  MapPin,
  AlertTriangle,
  Clock,
  Coffee,
} from 'lucide-react';
import type { Corridor } from '../data/corridors';

interface CorridorMapProps {
  corridor: Corridor;
  nodeSeries: Array<{
    id: string;
    name: string;
    kmMarker: number;
    baseCongestion: number;
    bottleneckType: 'Toll Plaza' | 'Weighbridge' | 'Urban Interchange' | 'Highway Merge' | 'Clear';
    isRestStop?: boolean;
    coordinates: { lat: number; lng: number };
    simulatedCongestion: number;
    optimizedCongestion: number;
    baselineEta?: string;
    optimizedEta?: string;
  }>;
  aiRerouteActive: boolean;
  departureTime?: string;
}

export function CorridorMap({
  corridor,
  nodeSeries,
  aiRerouteActive,
  departureTime = '08:00',
}: CorridorMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'optimized' | 'baseline'>('both');
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Geographic projection bounds
  const { points, bounds } = useMemo(() => {
    const lats = nodeSeries.map((n) => n.coordinates.lat);
    const lngs = nodeSeries.map((n) => n.coordinates.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(0.04, maxLat - minLat);
    const lngSpan = Math.max(0.05, maxLng - minLng);

    const padLat = latSpan * 0.16;
    const padLng = lngSpan * 0.16;

    const bMinLat = minLat - padLat;
    const bMaxLat = maxLat + padLat;
    const bMinLng = minLng - padLng;
    const bMaxLng = maxLng + padLng;

    const width = 860;
    const height = 440;

    // Convert GPS (lat, lng) to SVG (x, y)
    // Note: Lat goes south-to-north, SVG y goes north-to-south
    const pts = nodeSeries.map((node) => {
      const x = ((node.coordinates.lng - bMinLng) / (bMaxLng - bMinLng)) * (width - 160) + 80;
      const y = ((bMaxLat - node.coordinates.lat) / (bMaxLat - bMinLat)) * (height - 120) + 60;
      return {
        ...node,
        x,
        y,
      };
    });

    return {
      points: pts,
      bounds: { bMinLat, bMaxLat, bMinLng, bMaxLng, width, height },
    };
  }, [nodeSeries]);

  // Construct SVG path string along the highway checkpoints
  const polylinePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      // Smooth cubic curve through points
      const prev = points[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');
  }, [points]);

  // Pan interactions
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  const activeNode = points.find((p) => p.id === selectedNodeId) ?? points[0];

  const getBottleneckIcon = (type: string, isRestStop?: boolean) => {
    if (isRestStop) {
      return <Coffee className="h-3 w-3 text-amber-300" />;
    }
    switch (type) {
      case 'Weighbridge':
        return <Scale className="h-3 w-3 text-amber-400" />;
      case 'Toll Plaza':
        return <Shield className="h-3 w-3 text-purple-400" />;
      case 'Urban Interchange':
      case 'Highway Merge':
        return <AlertTriangle className="h-3 w-3 text-rose-400" />;
      default:
        return <MapPin className="h-3 w-3 text-emerald-400" />;
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden relative shadow-xl backdrop-blur-md">
      {/* Top Map HUD Header */}
      <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <Compass className="h-4 w-4 text-purple-400" />
              Interactive GIS Corridor Telemetry Map
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-purple-300 border border-zinc-700">
              KENYA GIS • {corridor.code} • ETD {departureTime}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time geospatial positioning &amp; checkpoint congestion radar across {corridor.distanceKm} km
          </p>
        </div>

        {/* View Toggle & Map Controls */}
        <div className="flex items-center gap-2">
          {/* Layer Mode */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'both' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dual Mode
            </button>
            <button
              onClick={() => setViewMode('optimized')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'optimized' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              AI Dispatched
            </button>
            <button
              onClick={() => setViewMode('baseline')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'baseline' ? 'bg-rose-600/80 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Baseline
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Zoom In"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Zoom Out"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Reset View"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        className={`relative w-full h-[400px] sm:h-[440px] bg-[#0c0d12] overflow-hidden select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Tactical Grid Background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #a855f7 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />

        {/* Tactical Compass / GPS Coordinates HUD */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1 text-[11px] font-mono text-zinc-500 bg-zinc-950/80 px-3 py-2 rounded-lg border border-zinc-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
            <Layers className="h-3 w-3" />
            <span>GEO PROJECTION: KENYA EAST</span>
          </div>
          <div>DATUM: WGS 84 • EPSG:4326</div>
          <div>
            CENTER: {corridor.center.lat.toFixed(4)}° S, {corridor.center.lng.toFixed(4)}° E
          </div>
          <div>ZOOM: {(zoomLevel * 100).toFixed(0)}%</div>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex flex-wrap items-center gap-3 bg-zinc-950/90 px-3.5 py-2 rounded-lg border border-zinc-800 text-[11px] backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
            <span>Heavy Load (&gt;75%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            <span>Moderate Choke (50-75%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
            <span>AI Optimized Flow</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-2 rounded-full border border-purple-400 animate-ping" />
            <span>Active Radar Node</span>
          </div>
        </div>

        {/* SVG Drawing Layer */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Gradient for Baseline Choke */}
            <linearGradient id="baselineRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fb7185" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.8" />
            </linearGradient>

            {/* Gradient for AI Route */}
            <linearGradient id="aiRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.9" />
            </linearGradient>

            {/* Highway glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Coordinate Reference lines */}
          <line
            x1="40"
            y1={bounds.height / 2}
            x2={bounds.width - 40}
            y2={bounds.height / 2}
            stroke="#27272a"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={bounds.width / 2}
            y1="30"
            x2={bounds.width / 2}
            y2={bounds.height - 30}
            stroke="#27272a"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Highway Base Foundation (Road Bed) */}
          <path
            d={polylinePath}
            fill="none"
            stroke="#1e1b4b"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />

          {/* Baseline Congestion Path */}
          {(viewMode === 'both' || viewMode === 'baseline') && (
            <path
              d={polylinePath}
              fill="none"
              stroke="url(#baselineRouteGrad)"
              strokeWidth={viewMode === 'baseline' ? '6' : '3'}
              strokeDasharray={viewMode === 'both' ? '6 4' : 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              opacity={viewMode === 'both' ? '0.6' : '1'}
            />
          )}

          {/* AI Optimized Flow Path */}
          {(viewMode === 'both' || viewMode === 'optimized') && aiRerouteActive && (
            <>
              <path
                d={polylinePath}
                fill="none"
                stroke="url(#aiRouteGrad)"
                strokeWidth={viewMode === 'optimized' ? '6' : '4.5'}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />
              {/* Animated Traffic Simulation Particles / Flow dashes */}
              <path
                d={polylinePath}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeDasharray="10 18"
                strokeLinecap="round"
                className="animate-[dash_12s_linear_infinite]"
                opacity="0.85"
                style={{
                  strokeDashoffset: '1000',
                  animation: 'dashMove 10s linear infinite',
                }}
              />
            </>
          )}

          {/* Checkpoint Nodes */}
          {points.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const congestion = aiRerouteActive ? node.optimizedCongestion : node.simulatedCongestion;
            const isCritical = node.simulatedCongestion >= 80;

            const markerColor =
              congestion >= 75 ? '#f43f5e' : congestion >= 55 ? '#fbbf24' : '#a855f7';

            return (
              <g
                key={node.id}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                }}
              >
                {/* Radar Pulse Rings for Heavy Bottlenecks */}
                {isCritical && (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="22"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      opacity="0.3"
                    >
                      <animate
                        attributeName="r"
                        values="14;28;34"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.2;0"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}

                {/* Outer Selection Highlight Ring */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="18"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Node Solid Center Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? '12' : '9'}
                  fill="#09090b"
                  stroke={markerColor}
                  strokeWidth="3.5"
                  className="transition-all duration-200 group-hover:r-[13]"
                  filter="url(#glow)"
                />

                {/* Inner status dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="3.5"
                  fill={markerColor}
                />

                {/* Node Label Text */}
                <g transform={`translate(${node.x}, ${node.y + (index % 2 === 0 ? -20 : 26)})`}>
                  <rect
                    x="-60"
                    y="-11"
                    width="120"
                    height="22"
                    rx="5"
                    fill="#18181b"
                    fillOpacity="0.88"
                    stroke={isSelected ? '#a855f7' : '#27272a'}
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    y="3"
                    fill="#e4e4e7"
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="Inter, sans-serif"
                  >
                    {node.name.split('/')[0].trim()}
                  </text>
                </g>

                {/* KM Marker Tag */}
                <text
                  x={node.x}
                  y={node.y + (index % 2 === 0 ? -33 : 37)}
                  textAnchor="middle"
                  fill="#a1a1aa"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  KM {node.kmMarker} • {congestion}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Telemetry HUD Flyout */}
        {activeNode && (
          <div className="absolute top-4 right-4 z-20 w-72 bg-zinc-950/95 border border-zinc-800 rounded-xl p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  {getBottleneckIcon(activeNode.bottleneckType, activeNode.isRestStop)}
                  <span className="font-semibold text-zinc-200">
                    {activeNode.isRestStop ? `${activeNode.bottleneckType} • Rest Stop` : activeNode.bottleneckType}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1 leading-tight">
                  {activeNode.name}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-purple-300">
                KM {activeNode.kmMarker}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800/70">
                <span className="text-[10px] text-zinc-500 block">Baseline Load</span>
                <span className="text-sm font-mono font-bold text-rose-400">
                  {activeNode.simulatedCongestion}%
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800/70">
                <span className="text-[10px] text-zinc-500 block">AI Dispatch Load</span>
                <span className="text-sm font-mono font-bold text-purple-400">
                  {activeNode.optimizedCongestion}%
                </span>
              </div>
            </div>

            {/* Checkpoint Arrival ETA */}
            <div className="mt-2.5 p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[11px]">Checkpoint ETA:</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-white">
                  {aiRerouteActive ? (activeNode.optimizedEta ?? '--:--') : (activeNode.baselineEta ?? '--:--')}
                </span>
                {aiRerouteActive && activeNode.baselineEta && activeNode.baselineEta !== activeNode.optimizedEta && (
                  <span className="text-[10px] text-zinc-500 block line-through">
                    {activeNode.baselineEta}
                  </span>
                )}
              </div>
            </div>

            {/* GPS Coordinates */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-400 bg-zinc-900/50 px-2 py-1.5 rounded border border-zinc-800/50">
              <span>LAT: {activeNode.coordinates.lat.toFixed(4)}°</span>
              <span>LNG: {activeNode.coordinates.lng.toFixed(4)}°</span>
            </div>

            {/* AI Automated Recommendation */}
            <div className="mt-3 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs">
              <div className="flex items-center gap-1.5 text-purple-300 font-semibold mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Dispatch Policy</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug">
                {activeNode.bottleneckType === 'Weighbridge'
                  ? 'Weigh-in-Motion fast lane enabled. Commercial fleet allocated staggered arrival slot to eliminate 35-min queue.'
                  : activeNode.simulatedCongestion >= 80
                  ? 'Urban interchange congestion threshold exceeded. Off-corridor arterial bypass triggered.'
                  : 'Corridor velocity nominal. Continuous green wave maintained.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
