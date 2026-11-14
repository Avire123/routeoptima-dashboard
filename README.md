# RouteOptima

RouteOptima is a commercial transport intelligence dashboard for optimizing freight movement across Kenya’s key logistics corridors. It simulates traffic conditions, fuel cost impact, rest-stop policy effects, and route-time improvements using a fleet dispatch model tailored to Kenyan highways.

<p align="center">
  <img src="./routeoptima-banner.png" alt="RouteOptima banner" width="1100" />
</p>

## Overview

This project models how route planning decisions affect:

- travel time and arrival estimates,
- heavy freight congestion behavior,
- fuel consumption and cost,
- mandatory NTSA rest-stop compliance,
- and AI-assisted rerouting performance.

It is designed as a modern interactive dashboard for fleet operators, logistics coordinators, and route planners who need fast decision support in a road-transport environment.

## Key Features

- Interactive GIS-style corridor map with geospatial checkpoints
- Commercial fleet dispatch simulator
- Real-time traffic and congestion scenario controls
- AI reroute impact analysis
- Route ETA and fuel-cost estimation
- NTSA driver rest-break scheduling logic
- corridor comparison across major Kenyan freight routes
- PDF-style dispatch manifest generator for route operations

## Supported Corridors

The app includes several representative Kenyan logistics corridors, including:

- Mombasa Port – Nairobi freight spine
- Nakuru – Eldoret – Malaba transit route
- Nairobi urban expressway and bypass corridors
- Nairobi – Nakuru – Kisumu logistics route
- Thika industrial corridor and other urban freight loops

## Tech Stack

- React 19
- TypeScript
- Vite
- Recharts
- Lucide React
- CSS Modules / custom styling

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/<your-username>/routeoptima.git
cd routeoptima
npm install
```

### Run locally

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

### Production build

```bash
npm run build
```

## Scripts

```bash
npm run dev     # start the app in development mode
npm run build   # create a production build
npm run preview # preview the production build locally
npm run lint    # run the configured linter
```

## Project Structure

```text
routeoptima/
├── public/
│   ├── favicon.svg
│   ├── routeoptima-banner.jpg
│   └── routeoptima-banner.png
├── src/
│   ├── components/
│   ├── data/
│   ├── utils/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── routeoptima-banner.png
```

## Use Cases

This dashboard is well suited for:

- logistics operations planning,
- fleet routing and dispatch simulation,
- route performance review,
- fuel and delivery time optimization,
- and corridor bottleneck visibility for freight stakeholders.

## Roadmap

Planned improvements include:

- live API-backed traffic data integration,
- historical route analytics,
- export to CSV / PDF documentation,
- real vehicle dispatch simulation,
- multi-region support beyond Kenya.

## License

This project is currently unlicensed and is intended for demo and portfolio use unless otherwise specified.

## Notes

This is a frontend prototype and operational dashboard concept. It is not connected to a live logistics backend or production traffic API yet, but it provides a strong foundation for building a broader transportation intelligence platform.
