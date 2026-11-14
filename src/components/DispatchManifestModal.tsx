import {
  FileText,
  Download,
  Printer,
  X,
  ShieldCheck,
  Coffee,
  Scale,
} from 'lucide-react';
import type { Corridor } from '../data/corridors';
import { formatDuration } from '../utils/time';

interface DispatchManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  corridor: Corridor;
  departureTime: string;
  simulation: {
    baselineMinutes: number;
    optimizedMinutes: number;
    timeSavedMin: number;
    departureEtaObj: { formatted12: string; formatted24: string };
    baselineEta: { formatted12: string; formatted24: string; dayLabel: string };
    optimizedEta: { formatted12: string; formatted24: string; dayLabel: string };
    baseFuelKes: number;
    optimizedFuelKes: number;
    fuelSavedKes: number;
    baseFuelLiters: number;
    optimizedFuelLiters: number;
    fuelSavedLiters: number;
    nodeSeries: Array<{
      id: string;
      name: string;
      kmMarker: number;
      bottleneckType: string;
      isRestStop?: boolean;
      simulatedCongestion: number;
      optimizedCongestion: number;
      baselineEta: string;
      optimizedEta: string;
      dayLabel?: string;
    }>;
  };
  epraDieselPrice: number;
  ntsaRestStopEnabled: boolean;
  aiRerouteActive: boolean;
}

export function DispatchManifestModal({
  isOpen,
  onClose,
  corridor,
  departureTime,
  simulation,
  epraDieselPrice,
  ntsaRestStopEnabled,
  aiRerouteActive,
}: DispatchManifestModalProps) {
  if (!isOpen) return null;

  const manifestId = `RO-KE-${corridor.code.replace(/[^a-zA-Z0-9]/g, '')}-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
  const currentDate = new Date().toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Generate downloadable CSV content
  const handleDownloadCsv = () => {
    const headers = [
      'Manifest ID',
      'Corridor Code',
      'Corridor Name',
      'Distance (km)',
      'Departure Time (ETD)',
      'Estimated Arrival Time (ETA)',
      'Total Transit Time (min)',
      'EPRA Diesel Price (KES/L)',
      'Est Fuel Burn (Liters)',
      'Est Fuel Cost (KES)',
      'AI Dynamic Dispatch',
    ];

    const summaryRow = [
      manifestId,
      corridor.code,
      `"${corridor.name}"`,
      corridor.distanceKm,
      simulation.departureEtaObj.formatted12,
      aiRerouteActive ? simulation.optimizedEta.formatted12 : simulation.baselineEta.formatted12,
      aiRerouteActive ? simulation.optimizedMinutes : simulation.baselineMinutes,
      epraDieselPrice.toFixed(2),
      aiRerouteActive ? simulation.optimizedFuelLiters : simulation.baseFuelLiters,
      aiRerouteActive ? simulation.optimizedFuelKes : simulation.baseFuelKes,
      aiRerouteActive ? 'ACTIVE' : 'OFF',
    ];

    const checkpointHeaders = [
      'Checkpoint Node',
      'KM Marker',
      'Checkpoint Class',
      'Congestion Load (%)',
      'Checkpoint ETA',
      'Rest Stop',
      'Dispatch Directive',
    ];

    const checkpointRows = simulation.nodeSeries.map((n) => [
      `"${n.name}"`,
      `KM ${n.kmMarker}`,
      n.bottleneckType,
      aiRerouteActive ? `${n.optimizedCongestion}%` : `${n.simulatedCongestion}%`,
      aiRerouteActive ? n.optimizedEta : n.baselineEta,
      n.isRestStop ? 'YES (NTSA Mandatory)' : 'NO',
      n.bottleneckType === 'Weighbridge'
        ? 'Weighbridge Check / Scale Pre-Clearance'
        : n.optimizedCongestion >= 80
        ? 'Arterial Bypass / Off-Peak slot'
        : 'Maintain highway cruising pace',
    ]);

    const csvContent = [
      headers.join(','),
      summaryRow.join(','),
      '',
      checkpointHeaders.join(','),
      ...checkpointRows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${manifestId}-transit-manifest.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0e0f15] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Actions (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/70 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
              <FileText className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Official Transit Dispatch Manifest</h3>
              <p className="text-xs text-zinc-400">KeNHA &amp; NTSA Compliant Commercial Driver Manifest</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Manifest Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-zinc-100 print:text-black print:bg-white print:p-4">
          {/* Manifest Title Banner */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5 print:border-zinc-400">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white print:text-black">
                  RouteOptima
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 print:border-black print:text-black">
                  KENYA TRANSIT MANIFEST
                </span>
              </div>
              <h2 className="text-base font-bold text-zinc-200 print:text-black mt-1">
                {corridor.name}
              </h2>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Corridor Code: <span className="font-mono font-semibold">{corridor.code}</span> • Region: {corridor.region}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-zinc-400 print:text-zinc-600 block">Manifest Serial No.</span>
              <span className="font-mono text-sm font-bold text-purple-400 print:text-black">
                {manifestId}
              </span>
              <span className="text-xs text-zinc-400 print:text-zinc-600 block mt-0.5">
                Issue Date: {currentDate}
              </span>
            </div>
          </div>

          {/* Key Dispatch Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 block uppercase font-medium">
                Departure (ETD)
              </span>
              <span className="text-sm font-mono font-bold text-white print:text-black">
                {departureTime} ({simulation.departureEtaObj.formatted12})
              </span>
              <span className="text-[10px] text-zinc-500 block">Scheduled release</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 block uppercase font-medium">
                Estimated Arrival (ETA)
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400 print:text-black">
                {aiRerouteActive ? simulation.optimizedEta.formatted12 : simulation.baselineEta.formatted12}
              </span>
              <span className="text-[10px] text-amber-300 block">
                {aiRerouteActive ? simulation.optimizedEta.dayLabel : simulation.baselineEta.dayLabel || 'Same day'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 block uppercase font-medium">
                Transit Distance &amp; Time
              </span>
              <span className="text-sm font-mono font-bold text-white print:text-black">
                {corridor.distanceKm} km
              </span>
              <span className="text-[10px] text-zinc-500 block">
                Duration: {formatDuration(aiRerouteActive ? simulation.optimizedMinutes : simulation.baselineMinutes)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 print:border-zinc-300">
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 block uppercase font-medium">
                Fuel Budget (EPRA Rate)
              </span>
              <span className="text-sm font-mono font-bold text-purple-400 print:text-black">
                KES {(aiRerouteActive ? simulation.optimizedFuelKes : simulation.baseFuelKes).toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500 block">
                {aiRerouteActive ? simulation.optimizedFuelLiters : simulation.baseFuelLiters} L @ KES {epraDieselPrice}/L
              </span>
            </div>
          </div>

          {/* NTSA Safety & KeNHA Compliance Badge */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3 text-xs print:border-zinc-300 print:bg-zinc-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 print:text-black" />
              <div>
                <span className="font-semibold text-white print:text-black">
                  NTSA Driver Fatigue &amp; KeNHA Axle Compliance:
                </span>{' '}
                <span className="text-zinc-300 print:text-zinc-700">
                  {ntsaRestStopEnabled
                    ? 'Mandatory 30-min fatigue break scheduled at designated highway rest node.'
                    : 'Standard continuous commercial run.'}
                </span>
              </div>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-purple-300 print:text-black">
              COMPLIANT
            </span>
          </div>

          {/* Node-by-Node Transit Schedule Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden print:border-zinc-400">
            <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs print:bg-zinc-100">
              <span className="font-bold text-white print:text-black">Waypoint &amp; Checkpoint Schedule</span>
              <span className="text-zinc-400 print:text-zinc-600 font-mono">
                {simulation.nodeSeries.length} Monitored Checkpoints
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/50 text-zinc-400 border-b border-zinc-800 print:border-zinc-300 print:text-black">
                <tr>
                  <th className="px-4 py-2 font-semibold">Checkpoint Node</th>
                  <th className="px-4 py-2 font-semibold">Marker</th>
                  <th className="px-4 py-2 font-semibold">Checkpoint Class</th>
                  <th className="px-4 py-2 font-semibold">Target ETA</th>
                  <th className="px-4 py-2 font-semibold">Driver Directive / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 print:divide-zinc-300">
                {simulation.nodeSeries.map((node) => (
                  <tr key={node.id} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-2.5 font-medium text-white print:text-black flex items-center gap-1.5">
                      {node.isRestStop && <Coffee className="h-3.5 w-3.5 text-amber-400 print:text-black" />}
                      {node.bottleneckType === 'Weighbridge' && <Scale className="h-3.5 w-3.5 text-purple-400 print:text-black" />}
                      <span>{node.name}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-zinc-400 print:text-black">
                      KM {node.kmMarker}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300 print:text-black">
                      {node.bottleneckType}
                      {node.isRestStop && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                          REST STOP
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-purple-300 print:text-black">
                      {aiRerouteActive ? node.optimizedEta : node.baselineEta}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 print:text-black">
                      {node.isRestStop && ntsaRestStopEnabled
                        ? 'Mandatory 30m Rest Break & Vehicle Walk-Around Inspection'
                        : node.bottleneckType === 'Weighbridge'
                        ? 'Weigh-in-Motion lane / Green Channel Weighing'
                        : node.optimizedCongestion >= 80
                        ? 'Maintain dynamic slot / Avoid arterial choke'
                        : 'Maintain continuous highway pace'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Driver & Controller Sign-Off Block */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-800 print:border-zinc-400 text-xs">
            <div className="space-y-4">
              <span className="font-semibold text-zinc-300 print:text-black block">
                Lead Driver / Crew Lead
              </span>
              <div className="border-b border-zinc-700 print:border-black h-8" />
              <div className="flex justify-between text-[11px] text-zinc-500 print:text-zinc-600">
                <span>Driver Name &amp; DL No.</span>
                <span>Signature &amp; Date</span>
              </div>
            </div>

            <div className="space-y-4">
              <span className="font-semibold text-zinc-300 print:text-black block">
                Corridor Dispatch Controller
              </span>
              <div className="border-b border-zinc-700 print:border-black h-8" />
              <div className="flex justify-between text-[11px] text-zinc-500 print:text-zinc-600">
                <span>Controller ID: {manifestId.slice(-6)}</span>
                <span>Authorization Stamp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
