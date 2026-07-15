# SiteIQ

SiteIQ is a geospatial intelligence app for evaluating a site before development or construction. The project combines a React/Vite frontend with a FastAPI backend to provide terrain, flood, soil, climate, and land-cover insights for a selected location.

## What the app does

Users can:

- Pick a location on the map and define an analysis radius
- View elevation, terrain summaries, and elevation profiles
- Inspect drainage context and flood-risk indicators
- Review soil characteristics and land-cover composition
- Explore climate and solar data for the site
- See land-use suitability information and toggle map overlays
- Submit feedback and generate report-oriented outputs

## Tech stack

### Frontend
- React 19
- Vite
- Leaflet and react-leaflet
- Recharts and D3
- Axios

### Backend
- FastAPI
- Uvicorn
- Google Earth Engine API
- Requests, NumPy, Matplotlib, DiskCache, python-dotenv, contextily

## Project structure

- frontend: React app for the interactive map and site panels
- backend: FastAPI API services for geospatial analysis

## Getting started

### 1. Backend setup

From the backend folder:

```bash
cd siteiq-backend
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or .venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

The backend expects a Google Earth Engine service account JSON in the environment:

```bash
export EE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'
```

On Windows PowerShell:

```powershell
$env:EE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'
```

You can also optionally set a cache directory:

```bash
export CACHE_DIR=./.cache
```

Start the API:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at http://localhost:8000.

### 2. Frontend setup

From the frontend folder:

```bash
cd siteiq-frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

The frontend uses the following API base URL by default:

```bash
VITE_API_BASE=http://localhost:8000
```

You can place this in a frontend .env file if you need to override the default.

## Main API routes

The backend exposes endpoints such as:

- /health
- /elevation
- /terrain
- /terrain-profile
- /osm-context
- /flood-risk
- /elevation-grid
- /climate-solar
- /soil
- /land-cover
- /land-use-suitability
- /site-report-pdf
- /feedback

## Notes

- The backend uses Earth Engine credentials at startup, so missing or invalid service account configuration will prevent the app from running correctly.
- CORS is enabled for local frontend development on port 5173 and Vercel-hosted deployments.
- The app is designed for site intelligence workflows rather than generic mapping, so expect analysis-heavy requests and map overlays that depend on the selected point and radius.
