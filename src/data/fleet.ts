export interface VehicleClass {
  id: string;
  name: string;
  category: string;
  description: string;
  payloadCapacity: string;
  fuelRateKesPerKm: number;
  weighbridgeDelayMin: number; // Stoppage time at each weighbridge
  congestionVulnerability: number; // Sensitivity factor to traffic slowdown
  co2KgPerKm: number; // Estimated kg of CO2 emissions per km
  iconType: 'heavy-truck' | 'medium-truck' | 'van' | 'bus';
}

export interface DepartureWindow {
  id: string;
  label: string;
  timeRange: string;
  delayMultiplier: number; // Impact on travel time
  fuelMultiplier: number;
  description: string;
  isPeak: boolean;
}

export const VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: 'heavy-semi',
    name: 'Heavy Articulated Semi-Trailer (6-Axle / 28-34T)',
    category: 'Class 4 Heavy Commercial',
    description: 'Long-haul freight carrier. Requires static axle load weighing and slow highway merge.',
    payloadCapacity: '28,000 - 34,000 kg',
    fuelRateKesPerKm: 64,
    weighbridgeDelayMin: 35,
    congestionVulnerability: 1.35,
    co2KgPerKm: 1.25,
    iconType: 'heavy-truck',
  },
  {
    id: 'rigid-truck',
    name: 'Rigid Freight Truck (10-Ton / Isuzu FRR/FSR)',
    category: 'Class 3 Regional Cargo',
    description: 'Standard medium distribution freight for regional intercity corridors.',
    payloadCapacity: '8,000 - 12,000 kg',
    fuelRateKesPerKm: 46,
    weighbridgeDelayMin: 18,
    congestionVulnerability: 1.15,
    co2KgPerKm: 0.78,
    iconType: 'medium-truck',
  },
  {
    id: 'light-van',
    name: 'Light Delivery Van / Pickup (3.5-Ton)',
    category: 'Class 2 Express Logistics',
    description: 'Agile last-mile and courier transport. 100% exempt from weighbridge queues.',
    payloadCapacity: '1,500 - 3,500 kg',
    fuelRateKesPerKm: 28,
    weighbridgeDelayMin: 0,
    congestionVulnerability: 0.90,
    co2KgPerKm: 0.36,
    iconType: 'van',
  },
  {
    id: 'intercity-bus',
    name: 'Intercity Commuter Coach (51-Seater / Scania)',
    category: 'Class 3 Passenger Mass Transit',
    description: 'Commercial bus carrier with passenger timetable commitments and high idle costs.',
    payloadCapacity: '51 Passengers',
    fuelRateKesPerKm: 39,
    weighbridgeDelayMin: 5,
    congestionVulnerability: 1.10,
    co2KgPerKm: 0.68,
    iconType: 'bus',
  },
];

export const DEPARTURE_WINDOWS: DepartureWindow[] = [
  {
    id: 'morning-peak',
    label: 'Morning Rush Hour',
    timeRange: '06:30 – 09:30',
    delayMultiplier: 1.35,
    fuelMultiplier: 1.20,
    description: 'Heavy commuter and commercial influx through urban interchanges.',
    isPeak: true,
  },
  {
    id: 'midday',
    label: 'Midday Commercial Run',
    timeRange: '11:00 – 15:30',
    delayMultiplier: 1.05,
    fuelMultiplier: 1.02,
    description: 'Moderate highway flow with intermittent weighbridge bottlenecks.',
    isPeak: false,
  },
  {
    id: 'night-freight',
    label: 'Night-Shift Off-Peak Slot',
    timeRange: '22:00 – 05:00',
    delayMultiplier: 0.80,
    fuelMultiplier: 0.90,
    description: 'Unimpeded highway cruising with green-channel weighbridge queues.',
    isPeak: false,
  },
];
