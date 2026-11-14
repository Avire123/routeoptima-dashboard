import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Fuel,
  Navigation,
  Sliders,
  Sparkles,
  TrendingDown,
  Truck,
  BarChart3,
  Compass,
  Calendar,
  FileText,
  Coffee,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CORRIDORS } from './data/corridors';
import { CorridorMap } from './components/CorridorMap';
import { FleetSimulator } from './components/FleetSimulator';
import { DispatchManifestModal } from './components/DispatchManifestModal';
import { calculateEta, formatDuration } from './utils/time';

type DashboardTab = 'all' | 'map' | 'fleet' | 'analytics';

export function App() {
  const [selectedId, setSelectedId] = useState<string>(CORRIDORS[0].id);
  const [trafficMultiplier, setTrafficMultiplier] = useState<number>(1.25); // 0.8x off-peak to 2.0x gridlock
  const [heavyFreightPct, setHeavyFreightPct] = useState<number>(40);
  const [weatherPenalty, setWeatherPenalty] = useState<boolean>(false);
  const [aiRerouteActive, setAiRerouteActive] = useState<boolean>(true);
  const [departureTime, setDepartureTime] = useState<string>('08:00');
  const [epraDieselPrice, setEpraDieselPrice] = useState<number>(180.50);
  const [ntsaRestStopEnabled, setNtsaRestStopEnabled] = useState<boolean>(true);
  const [isManifestOpen, setIsManifestOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');

  const corridor = useMemo(
    () => CORRIDORS.find((c) => c.id === selectedId) ?? CORRIDORS[0],
    [selectedId]
  );

  const simulation = useMemo(() => {
    const weatherFactor = weatherPenalty ? 1.18 : 1.0;
    const freightFactor = 1 + (heavyFreightPct - corridor.freightSharePct) * 0.006;
    const rawMultiplier = trafficMultiplier * weatherFactor * Math.max(0.85, freightFactor);

    // Check if long haul (>= 200 km) and NTSA rest break is enabled
    const restBreakMin = ntsaRestStopEnabled && corridor.distanceKm >= 200 ? 30 : 0;
    const restStopNode = corridor.nodes.find((n) => n.isRestStop);

    const rawBaselineMinutes = Math.round(corridor.baseDurationMin * rawMultiplier);
    const aiSavingsRatio = aiRerouteActive ? 0.24 : 0;
    const rawOptimizedMinutes = Math.round(rawBaselineMinutes * (1 - aiSavingsRatio));

    const baselineMinutes = rawBaselineMinutes + restBreakMin;
    const optimizedMinutes = rawOptimizedMinutes + restBreakMin;
    const timeSavedMin = rawBaselineMinutes - rawOptimizedMinutes;

    // Full route ETA
    const baselineEta = calculateEta(departureTime, baselineMinutes);
    const optimizedEta = calculateEta(departureTime, optimizedMinutes);
    const departureEtaObj = calculateEta(departureTime, 0);

    const baseFuelKes = Math.round(
      corridor.distanceKm * corridor.fuelRateKesPerKm * (1 + (rawMultiplier - 1) * 0.45)
    );
    const optimizedFuelKes = Math.round(baseFuelKes * (1 - (aiRerouteActive ? 0.16 : 0)));
    const fuelSavedKes = baseFuelKes - optimizedFuelKes;

    // EPRA Diesel Liters Calculation
    const baseFuelLiters = Math.round((baseFuelKes / epraDieselPrice) * 10) / 10;
    const optimizedFuelLiters = Math.round((optimizedFuelKes / epraDieselPrice) * 10) / 10;
    const fuelSavedLiters = Math.round((fuelSavedKes / epraDieselPrice) * 10) / 10;

    const nodeSeries = corridor.nodes.map((node) => {
      const simulatedCongestion = Math.min(
        100,
        Math.round(node.baseCongestion * rawMultiplier)
      );
      const optimizedCongestion = aiRerouteActive
        ? Math.max(18, Math.round(simulatedCongestion * 0.72))
        : simulatedCongestion;

      const progressRatio = corridor.distanceKm > 0 ? node.kmMarker / corridor.distanceKm : 0;
      let nodeBaselineMin = Math.round(rawBaselineMinutes * progressRatio);
      let nodeOptimizedMin = Math.round(rawOptimizedMinutes * progressRatio);

      // If at or past designated rest stop, incorporate 30m break
      if (restStopNode && node.kmMarker >= restStopNode.kmMarker) {
        nodeBaselineMin += restBreakMin;
        nodeOptimizedMin += restBreakMin;
      }

      const nodeBaselineEta = calculateEta(departureTime, nodeBaselineMin);
      const nodeOptimizedEta = calculateEta(departureTime, nodeOptimizedMin);

      return {
        ...node,
        simulatedCongestion,
        optimizedCongestion,
        baselineEta: nodeBaselineEta.formatted12,
        optimizedEta: nodeOptimizedEta.formatted12,
        dayLabel: aiRerouteActive ? nodeOptimizedEta.dayLabel : nodeBaselineEta.dayLabel,
      };
    });

    const peakNode = [...nodeSeries].sort(
      (a, b) => b.simulatedCongestion - a.simulatedCongestion
    )[0];

    return {
      baselineMinutes,
      optimizedMinutes,
      timeSavedMin,
      restBreakMin,
      departureEtaObj,
      baselineEta,
      optimizedEta,
      baseFuelKes,
      optimizedFuelKes,
      fuelSavedKes,
      baseFuelLiters,
      optimizedFuelLiters,
      fuelSavedLiters,
      nodeSeries,
      peakNode,
    };
  }, [
    corridor,
    trafficMultiplier,
    heavyFreightPct,
    weatherPenalty,
    aiRerouteActive,
    departureTime,
    epraDieselPrice,
    ntsaRestStopEnabled,
  ]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-purple-500/30">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              <Navigation className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">RouteOptima</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Kenya Transit Intelligence
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Geographic Highway GIS • Real-Time Congestion Optimization • Commercial Fleet Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Command Deck
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'map'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                GIS Map
              </button>
              <button
                onClick={() => setActiveTab('fleet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'fleet'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                Fleet Dispatch
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Telemetry
              </button>
            </div>

            {/* Export Manifest Button */}
            <button
              onClick={() => setIsManifestOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-purple-500 hover:text-white transition-all shadow-sm"
              title="Generate Official Dispatch Manifest"
            >
              <FileText className="h-3.5 w-3.5 text-purple-400" />
              <span>Manifest</span>
            </button>

            {/* AI Dispatch Master Toggle */}
            <button
              onClick={() => setAiRerouteActive((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                aiRerouteActive
                  ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiRerouteActive ? 'AI Dynamic Dispatch: ON' : 'AI Dynamic Dispatch: OFF'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Corridor Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CORRIDORS.map((item) => {
            const active = item.id === corridor.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setHeavyFreightPct(item.freightSharePct);
                }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  active
                    ? 'bg-zinc-900/90 border-purple-500/70 shadow-[0_0_25px_rgba(168,85,247,0.15)]'
                    : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-purple-400">{item.code}</span>
                  <span className="text-xs text-zinc-400">{item.distanceKm} km</span>
                </div>
                <p className="text-sm font-semibold text-zinc-100 line-clamp-1">{item.name}</p>
              </button>
            );
          })}
        </div>

        {/* FEATURE 1: Interactive GIS Route Map */}
        {(activeTab === 'all' || activeTab === 'map') && (
          <section className="space-y-3">
            <CorridorMap
              corridor={corridor}
              nodeSeries={simulation.nodeSeries}
              aiRerouteActive={aiRerouteActive}
              departureTime={departureTime}
            />
          </section>
        )}

        {/* FEATURE 2: Commercial Fleet Dispatch Simulator */}
        {(activeTab === 'all' || activeTab === 'fleet') && (
          <section className="space-y-3">
            <FleetSimulator
              corridor={corridor}
              trafficMultiplier={trafficMultiplier}
              aiRerouteActive={aiRerouteActive}
            />
          </section>
        )}

        {/* Corridor Executive KPIs */}
        {(activeTab === 'all' || activeTab === 'analytics') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* ETD & ETA Card */}
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                <span>Schedule &amp; Arrival (ETA)</span>
                <Clock className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-white">
                    {aiRerouteActive ? simulation.optimizedEta.formatted12 : simulation.baselineEta.formatted12}
                  </span>
                  {(aiRerouteActive ? simulation.optimizedEta.dayLabel : simulation.baselineEta.dayLabel) && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {aiRerouteActive ? simulation.optimizedEta.dayLabel : simulation.baselineEta.dayLabel}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                  <span>ETD: {simulation.departureEtaObj.formatted12}</span>
                  {simulation.timeSavedMin > 0 && aiRerouteActive && (
                    <span className="text-emerald-400 font-medium">
                      -{formatDuration(simulation.timeSavedMin)} earlier
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1.5 pt-1 border-t border-zinc-800">
                Baseline ETA: {simulation.baselineEta.formatted12} {simulation.baselineEta.dayLabel}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                <span>Optimized Transit Time</span>
                <Calendar className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">
                  {formatDuration(simulation.optimizedMinutes)}
                </span>
                {simulation.timeSavedMin > 0 && (
                  <span className="text-xs font-medium text-emerald-400">
                    -{formatDuration(simulation.timeSavedMin)} saved
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Unoptimized baseline: {formatDuration(simulation.baselineMinutes)}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                <span>Est. Fuel Cost &amp; Liters</span>
                <Fuel className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">
                  KES {simulation.optimizedFuelKes.toLocaleString()}
                </span>
                {simulation.fuelSavedKes > 0 && (
                  <span className="text-xs font-medium text-emerald-400">
                    -KES {simulation.fuelSavedKes.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Volume: <span className="text-purple-300 font-mono font-medium">{simulation.optimizedFuelLiters} L</span> ({simulation.fuelSavedLiters > 0 ? `-${simulation.fuelSavedLiters} L saved` : 'baseline'}) @ KES {epraDieselPrice}/L
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                <span>Primary Choke Point</span>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-base font-bold text-white truncate">
                {simulation.peakNode?.name}
              </div>
              <p className="text-xs text-amber-400/90 mt-1">
                {simulation.peakNode?.simulatedCongestion}% load •{' '}
                {simulation.peakNode?.bottleneckType}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                <span>Throughput Gain</span>
                <TrendingDown className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white">
                {aiRerouteActive ? '+24.0%' : '0.0%'}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {aiRerouteActive
                  ? 'Bypass & off-peak slot active'
                  : 'Enable AI Dispatch to optimize'}
              </p>
            </div>
          </div>
        )}

        {/* Simulation Scenario Controls + Congestion Profile Chart */}
        {(activeTab === 'all' || activeTab === 'analytics') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Sliders className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-white">Scenario Parameters</h2>
              </div>

              {/* Departure Time (ETD) Input */}
              <div className="space-y-2 border-b border-zinc-800 pb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-purple-400" /> Planned Departure (ETD)
                  </span>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: '06:30 Early', val: '06:30' },
                    { label: '08:00 Peak', val: '08:00' },
                    { label: '12:00 Midday', val: '12:00' },
                    { label: '17:30 Rush', val: '17:30' },
                    { label: '22:00 Night', val: '22:00' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => setDepartureTime(preset.val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        departureTime === preset.val
                          ? 'bg-purple-600/30 text-purple-300 border-purple-500/60 font-semibold'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* EPRA Diesel Price Configurator */}
              <div className="space-y-2 border-b border-zinc-800 pb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-purple-400" /> EPRA Diesel Price
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500 font-mono">KES</span>
                    <input
                      type="number"
                      step="0.5"
                      min="140"
                      max="260"
                      value={epraDieselPrice}
                      onChange={(e) => setEpraDieselPrice(parseFloat(e.target.value) || 180.5)}
                      className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white font-mono text-right focus:border-purple-500 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-500 font-mono">/L</span>
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Current EPRA Gazetted Pump Rate</span>
                  <span className="text-purple-300 font-mono font-medium">
                    {simulation.optimizedFuelLiters} L required
                  </span>
                </div>
              </div>

              {/* NTSA Driver Fatigue Rest Break Policy */}
              <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Coffee className="h-3.5 w-3.5 text-amber-400" />
                    <p className="text-xs font-medium text-zinc-200">NTSA Driver Rest Policy</p>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {corridor.distanceKm >= 200
                      ? 'Mandatory 30m break scheduled at designated rest node'
                      : 'Short haul (<200 km): Rest stop optional'}
                  </p>
                </div>
                <button
                  disabled={corridor.distanceKm < 200}
                  onClick={() => setNtsaRestStopEnabled((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    ntsaRestStopEnabled && corridor.distanceKm >= 200
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  } ${corridor.distanceKm < 200 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {ntsaRestStopEnabled && corridor.distanceKm >= 200 ? 'Active (+30m)' : 'Exempt / Off'}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Traffic Demand Multiplier</span>
                  <span className="font-mono text-purple-300">
                    {trafficMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={2.0}
                  step={0.05}
                  value={trafficMultiplier}
                  onChange={(e) => setTrafficMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Off-Peak (0.8x)</span>
                  <span>Rush Hour (1.5x)</span>
                  <span>Gridlock (2.0x)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-zinc-400" /> Heavy Commercial Share
                  </span>
                  <span className="font-mono text-purple-300">{heavyFreightPct}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={heavyFreightPct}
                  onChange={(e) => setHeavyFreightPct(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    Heavy Rain / Low Visibility
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Applies +18% wet-surface slowdown
                  </p>
                </div>
                <button
                  onClick={() => setWeatherPenalty((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    weatherPenalty
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {weatherPenalty ? 'Active (+18%)' : 'Clear Weather'}
                </button>
              </div>
            </div>

            {/* Recharts Congestion Curve */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    Node-by-Node Corridor Congestion Profile
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Baseline congestion load (%) vs. AI-rerouted corridor load across checkpoints
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulation.nodeSeries}>
                    <defs>
                      <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      fontSize={11}
                      tickFormatter={(val: string) => val.split('/')[0].trim()}
                    />
                    <YAxis stroke="#71717a" fontSize={11} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#3f3f46',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="simulatedCongestion"
                      name="Baseline Load (%)"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fill="url(#baselineGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="optimizedCongestion"
                      name="AI Optimized Load (%)"
                      stroke="#a855f7"
                      strokeWidth={2.5}
                      fill="url(#optGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Checkpoint Table */}
        {(activeTab === 'all' || activeTab === 'analytics') && (
          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Corridor Checkpoint Telemetry</h3>
              <span className="text-xs text-zinc-400">
                {corridor.nodes.length} monitored nodes
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/70 text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Checkpoint Node</th>
                    <th className="px-6 py-3">Marker</th>
                    <th className="px-6 py-3">Bottleneck Class</th>
                    <th className="px-6 py-3">Raw Load</th>
                    <th className="px-6 py-3">AI Dispatch Load</th>
                    <th className="px-6 py-3">Checkpoint ETA</th>
                    <th className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {simulation.nodeSeries.map((node) => (
                    <tr key={node.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-zinc-100 flex items-center gap-2">
                        {node.isRestStop && (
                          <span title="Designated Rest Stop">
                            <Coffee className="h-3.5 w-3.5 text-amber-400" />
                          </span>
                        )}
                        <span>{node.name}</span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-zinc-400">
                        KM {node.kmMarker}
                      </td>
                      <td className="px-6 py-3.5 text-zinc-300">
                        {node.bottleneckType}
                        {node.isRestStop && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            REST STOP
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-mono ${
                            node.simulatedCongestion >= 80
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {node.simulatedCongestion}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded font-mono bg-purple-500/15 text-purple-300">
                          {node.optimizedCongestion}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-mono text-zinc-100 font-semibold">
                          {aiRerouteActive ? node.optimizedEta : node.baselineEta}
                          {node.dayLabel && (
                            <span className="text-[10px] text-amber-400 ml-1.5 font-normal">
                              {node.dayLabel}
                            </span>
                          )}
                        </div>
                        {aiRerouteActive && node.baselineEta !== node.optimizedEta && (
                          <div className="text-[10px] text-zinc-500 line-through font-mono">
                            {node.baselineEta}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-zinc-400">
                        {node.isRestStop && ntsaRestStopEnabled && corridor.distanceKm >= 200 ? (
                          <span className="text-amber-400 font-medium inline-flex items-center gap-1">
                            <Coffee className="h-3 w-3" /> 30m NTSA Driver Rest Break
                          </span>
                        ) : node.simulatedCongestion >= 80 ? (
                          <span className="text-purple-400 font-medium inline-flex items-center gap-1">
                            Bypass / Off-Peak Window <ArrowRight className="h-3 w-3" />
                          </span>
                        ) : (
                          <span>Maintain Corridor Pace</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Official Dispatch Manifest Modal */}
      <DispatchManifestModal
        isOpen={isManifestOpen}
        onClose={() => setIsManifestOpen(false)}
        corridor={corridor}
        departureTime={departureTime}
        simulation={simulation}
        epraDieselPrice={epraDieselPrice}
        ntsaRestStopEnabled={ntsaRestStopEnabled}
        aiRerouteActive={aiRerouteActive}
      />
    </div>
  );
}

export default App;
