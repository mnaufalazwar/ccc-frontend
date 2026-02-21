# ChitChatClub — Frontend

React + TypeScript frontend for the ChitChatClub English conversation practice platform.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router 6
- jsPDF (PDF export)

## Related Repositories

| Repository | Description |
|------------|-------------|
| [ccc-backend](https://github.com/YOUR_USERNAME/ccc-backend) | Spring Boot 3 REST API |
| [ccc-postgres](https://github.com/YOUR_USERNAME/ccc-postgres) | Docker Compose for PostgreSQL + pgAdmin |
| [ccc-documentation](https://github.com/YOUR_USERNAME/ccc-documentation) | Full project documentation |

## Getting Started

### Prerequisites

- Node.js 18+
- Backend running on http://localhost:8080 (see `ccc-backend` repo)

### Install & Run

```bash
npm install
npm run dev
```

The app starts on http://localhost:5173. API calls (`/api/*`) are proxied to the backend at `localhost:8080` via the Vite dev server.

## Build for Production

```bash
npm run build
```

Output is in the `dist/` directory.
