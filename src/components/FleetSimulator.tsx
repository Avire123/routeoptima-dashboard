import { useMemo, useState } from 'react';
import {
  Truck,
  Bus,
  Clock,
  Fuel,
  Leaf,
  Scale,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { Corridor } from '../data/corridors';
import {
  VEHICLE_CLASSES,
  DEPARTURE_WINDOWS,
  type VehicleClass,
  type DepartureWindow,
} from '../data/fleet';
import { calculateEta } from '../utils/time';

interface FleetSimulatorProps {
  corridor: Corridor;
  trafficMultiplier: number;
  aiRerouteActive: boolean;
}

export function FleetSimulator({
  corridor,
  trafficMultiplier,
  aiRerouteActive,
}: FleetSimulatorProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(VEHICLE_CLASSES[0].id);
  const [fleetSize, setFleetSize] = useState<number>(12);
  const [selectedWindowId, setSelectedWindowId] = useState<string>(DEPARTURE_WINDOWS[1].id);
  const [convoyDepartureTime, setConvoyDepartureTime] = useState<string>('07:30');
  const [enableWeighbridgePreClearance, setEnableWeighbridgePreClearance] = useState<boolean>(true);
  const [offPeakNightShift, setOffPeakNightShift] = useState<boolean>(false);

  const vehicle: VehicleClass = useMemo(
    () => VEHICLE_CLASSES.find((v) => v.id === selectedVehicleId) ?? VEHICLE_CLASSES[0],
    [selectedVehicleId]
  );

  const effectiveWindow: DepartureWindow = useMemo(() => {
    if (offPeakNightShift) {
      return DEPARTURE_WINDOWS.find((w) => w.id === 'night-freight') ?? DEPARTURE_WINDOWS[2];
    }
    return DEPARTURE_WINDOWS.find((w) => w.id === selectedWindowId) ?? DEPARTURE_WINDOWS[0];
  }, [selectedWindowId, offPeakNightShift]);

  // Count weighbridges on this specific corridor
  const weighbridgeCount = useMemo(
    () => corridor.nodes.filter((n) => n.bottleneckType === 'Weighbridge').length,
    [corridor]
  );

  const fleetMetrics = useMemo(() => {
    // Traffic & vehicle sensitivity factor
    const trafficDrag = 1 + (trafficMultiplier - 1) * vehicle.congestionVulnerability;
    const windowFactor = effectiveWindow.delayMultiplier;

    // Single Vehicle Transit Time Calculations
    const baselineRunningMin = Math.round(corridor.baseDurationMin * trafficDrag * windowFactor);
    const baselineWeighbridgeMin = weighbridgeCount * vehicle.weighbridgeDelayMin;
    const singleBaselineTotalMin = baselineRunningMin + baselineWeighbridgeMin;

    // AI dispatch savings
    const aiSpeedBonus = aiRerouteActive ? 0.24 : 0;
    const optimizedRunningMin = Math.round(baselineRunningMin * (1 - aiSpeedBonus));

    // Automated weighbridge pre-clearance reduces stoppage time by 80%
    const optimizedWeighbridgeMin =
      aiRerouteActive && enableWeighbridgePreClearance
        ? Math.round(baselineWeighbridgeMin * 0.2)
        : baselineWeighbridgeMin;

    const singleOptimizedTotalMin = optimizedRunningMin + optimizedWeighbridgeMin;
    const singleTimeSavedMin = singleBaselineTotalMin - singleOptimizedTotalMin;

    // Convoy ETA calculations
    const baselineEtaObj = calculateEta(convoyDepartureTime, singleBaselineTotalMin);
    const optimizedEtaObj = calculateEta(convoyDepartureTime, singleOptimizedTotalMin);

    // Fleet-wide Aggregate Time
    const fleetTotalHoursSaved = Math.round(
      ((singleTimeSavedMin * fleetSize) / 60) * 10
    ) / 10;
    const weighbridgeHoursSaved = Math.round(
      (((baselineWeighbridgeMin - optimizedWeighbridgeMin) * fleetSize) / 60) * 10
    ) / 10;

    // Fuel & Financial Calculations
    const baseFuelRate = vehicle.fuelRateKesPerKm;
    const singleBaselineFuelKes = Math.round(
      corridor.distanceKm *
        baseFuelRate *
        effectiveWindow.fuelMultiplier *
        (1 + (trafficDrag - 1) * 0.42)
    );

    const fuelOptimizationDiscount = aiRerouteActive ? 0.16 : 0;
    const singleOptimizedFuelKes = Math.round(
      singleBaselineFuelKes * (1 - fuelOptimizationDiscount)
    );

    const totalFleetFuelBaselineKes = singleBaselineFuelKes * fleetSize;
    const totalFleetFuelOptimizedKes = singleOptimizedFuelKes * fleetSize;
    const totalFleetFuelSavedKes = totalFleetFuelBaselineKes - totalFleetFuelOptimizedKes;

    // Idle cost savings (Driver hourly wage + idle engine wear approx KES 650/hr)
    const driverTimeCostKesPerHour = 650;
    const operationalTimeSavingsKes = Math.round(
      fleetTotalHoursSaved * driverTimeCostKesPerHour
    );
    const grossTotalSavingsKes = totalFleetFuelSavedKes + operationalTimeSavingsKes;

    // CO2 Emissions
    const baselineCo2Kg = Math.round(
      corridor.distanceKm *
        vehicle.co2KgPerKm *
        fleetSize *
        (1 + (trafficDrag - 1) * 0.25)
    );
    const optimizedCo2Kg = Math.round(
      baselineCo2Kg * (1 - (aiRerouteActive ? 0.18 : 0))
    );
    const co2SavedKg = baselineCo2Kg - optimizedCo2Kg;

    return {
      singleBaselineTotalMin,
      singleOptimizedTotalMin,
      singleTimeSavedMin,
      baselineEtaObj,
      optimizedEtaObj,
      fleetTotalHoursSaved,
      weighbridgeHoursSaved,
      singleBaselineFuelKes,
      singleOptimizedFuelKes,
      totalFleetFuelBaselineKes,
      totalFleetFuelOptimizedKes,
      totalFleetFuelSavedKes,
      operationalTimeSavingsKes,
      grossTotalSavingsKes,
      baselineCo2Kg,
      optimizedCo2Kg,
      co2SavedKg,
    };
  }, [
    corridor,
    trafficMultiplier,
    aiRerouteActive,
    vehicle,
    effectiveWindow,
    weighbridgeCount,
    fleetSize,
    convoyDepartureTime,
    enableWeighbridgePreClearance,
  ]);

  const getVehicleIcon = (iconType: string) => {
    switch (iconType) {
      case 'heavy-truck':
        return <Truck className="h-5 w-5 text-purple-400" />;
      case 'medium-truck':
        return <Truck className="h-5 w-5 text-indigo-400" />;
      case 'bus':
        return <Bus className="h-5 w-5 text-amber-400" />;
      case 'van':
      default:
        return <Zap className="h-5 w-5 text-emerald-400" />;
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-xl backdrop-blur-md space-y-6 p-6">
      {/* Simulator Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
              <Truck className="h-4 w-4 text-purple-400" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Fleet Commercial Dispatch &amp; Logistics Engine
            </h2>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Batch Fleet Modeling
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Simulate commercial fleet operating expenditure, weighbridge queue fast-passes, and fleet carbon metrics on {corridor.name}
          </p>
        </div>

        {/* Night Shift Slot Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOffPeakNightShift((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              offPeakNightShift
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.35)]'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {offPeakNightShift ? 'Off-Peak Night Shift: Active (22:00)' : 'Day Shift Mode'}
          </button>
        </div>
      </div>

      {/* Vehicle Class Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
          Select Fleet Vehicle Class
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {VEHICLE_CLASSES.map((v) => {
            const isSelected = v.id === vehicle.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                    : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    {getVehicleIcon(v.iconType)}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      KES {v.fuelRateKesPerKm}/km
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{v.name}</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{v.description}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Payload: {v.payloadCapacity}</span>
                  <span
                    className={`font-medium ${
                      v.weighbridgeDelayMin > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {v.weighbridgeDelayMin > 0 ? `+${v.weighbridgeDelayMin}m Scale Queue` : 'Scale Exempt'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fleet Controls: Fleet Size & Departure Window */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Fleet Volume Slider */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">Active Fleet Volume</span>
            <span className="text-base font-mono font-bold text-purple-400">
              {fleetSize} {fleetSize === 1 ? 'Vehicle' : 'Vehicles'}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={fleetSize}
            onChange={(e) => setFleetSize(parseInt(e.target.value, 10))}
            className="w-full accent-purple-500 cursor-pointer"
          />

          <div className="flex items-center justify-between gap-1 pt-1">
            {[5, 10, 20, 35, 50].map((preset) => (
              <button
                key={preset}
                onClick={() => setFleetSize(preset)}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                  fleetSize === preset
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/60'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {preset} units
              </button>
            ))}
          </div>
        </div>

        {/* Departure Window Selector */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
          <span className="text-xs font-semibold text-zinc-300 block">
            Corridor Departure Window
          </span>

          <div className="grid grid-cols-3 gap-1.5">
            {DEPARTURE_WINDOWS.map((w) => {
              const active = effectiveWindow.id === w.id;
              return (
                <button
                  key={w.id}
                  disabled={offPeakNightShift}
                  onClick={() => setSelectedWindowId(w.id)}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    active
                      ? 'bg-purple-900/40 border-purple-500 text-white shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  } ${offPeakNightShift ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-[11px] font-semibold block truncate">{w.label}</span>
                  <span className="text-[10px] font-mono text-zinc-500 block">{w.timeRange}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-400 leading-tight">
            {effectiveWindow.description}
          </p>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1">
              <Clock className="h-3 w-3 text-purple-400" /> Convoy ETD:
            </span>
            <input
              type="time"
              value={convoyDepartureTime}
              onChange={(e) => setConvoyDepartureTime(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white font-mono"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Convoy ETA:</span>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-400">
                {aiRerouteActive ? fleetMetrics.optimizedEtaObj.formatted12 : fleetMetrics.baselineEtaObj.formatted12}
              </span>
              <span className="text-[10px] text-amber-300 ml-1 font-mono">
                {aiRerouteActive ? fleetMetrics.optimizedEtaObj.dayLabel : fleetMetrics.baselineEtaObj.dayLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Weighbridge Pre-Clearance & Automation */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Scale className="h-4 w-4 text-purple-400" />
                <span>Weighbridge Fast-Pass (E-Tag)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-purple-300">
                {weighbridgeCount} on route
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Automates axle load pre-clearance and slot reservations at Gilgil / Juja weighbridges, bypassing manual scale queues.
            </p>
          </div>

          <button
            onClick={() => setEnableWeighbridgePreClearance((prev) => !prev)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-2 ${
              enableWeighbridgePreClearance
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            {enableWeighbridgePreClearance ? 'AI Pre-Clearance: Active (-80% queue)' : 'Standard Weighbridge Queue'}
          </button>
        </div>
      </div>

      {/* Fleet KPI Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {/* Total Fleet Fuel Expense */}
        <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Total Fleet Fuel Burn</span>
            <Fuel className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              KES {fleetMetrics.totalFleetFuelOptimizedKes.toLocaleString()}
            </span>
            {fleetMetrics.totalFleetFuelSavedKes > 0 && (
              <span className="text-xs font-medium text-emerald-400">
                -KES {fleetMetrics.totalFleetFuelSavedKes.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Unoptimized burn: KES {fleetMetrics.totalFleetFuelBaselineKes.toLocaleString()}
          </p>
        </div>

        {/* Aggregate Transit Hours Saved */}
        <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Fleet Vehicle-Hours Saved</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {fleetMetrics.fleetTotalHoursSaved} hrs
            </span>
            <span className="text-xs font-medium text-purple-400">
              across {fleetSize} units
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Single vehicle: {fleetMetrics.singleOptimizedTotalMin} min (was {fleetMetrics.singleBaselineTotalMin} min)
          </p>
        </div>

        {/* Weighbridge Queue Reduction */}
        <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Scale Delays Avoided</span>
            <Scale className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {fleetMetrics.weighbridgeHoursSaved} hrs
            </span>
            <span className="text-xs font-medium text-amber-400">stoppage saved</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {weighbridgeCount > 0
              ? `${weighbridgeCount} monitored scale checkpoint(s)`
              : 'Zero weighbridges on this corridor'}
          </p>
        </div>

        {/* CO2 Emissions Mitigated */}
        <div className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Carbon Emission Reduction</span>
            <Leaf className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {fleetMetrics.co2SavedKg.toLocaleString()} kg
            </span>
            <span className="text-xs font-medium text-emerald-400">CO2e mitigated</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Fleet total footprint: {fleetMetrics.optimizedCo2Kg.toLocaleString()} kg CO2e
          </p>
        </div>
      </div>

      {/* Fleet ROI Executive Summary Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/30 via-zinc-900/50 to-emerald-950/30 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              Net Commercial Operational Savings: KES {fleetMetrics.grossTotalSavingsKes.toLocaleString()}
            </h4>
            <p className="text-[11px] text-zinc-400">
              Combines KES {fleetMetrics.totalFleetFuelSavedKes.toLocaleString()} diesel fuel conservation and KES {fleetMetrics.operationalTimeSavingsKes.toLocaleString()} in reduced driver idle wear.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            ROI Boost: +{(aiRerouteActive ? 21.8 : 0).toFixed(1)}% Fleet Efficiency
          </span>
        </div>
      </div>
    </div>
  );
}
