# LikelyHood

A web application that displays statistics about Phish's "Harry Hood" performances, including the last performance date, shows since last performance, and the probability of it being played at the next show.

## Project Structure

```
likelyhood-v2/
├── backend/           # Express.js server
│   ├── src/
│   │   ├── server.js
│   │   ├── api/
│   │   └── utils/
│   ├── .env
│   └── package.json
└── frontend/         # Static website
    ├── index.html
    ├── css/
    └── js/
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Phish.net API credentials:
   ```
   PHISH_API_KEY=your_api_key_here
   PHISH_PUBLIC_KEY=your_public_key_here
   PORT=3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Update the API_URL in `frontend/js/main.js` to point to your deployed backend URL

2. Serve the frontend directory using any static file server

## Deployment

### Backend
- Option A: One-click via render.yaml
   - Create a new Web Service on Render and connect this repo.
   - Render will detect `render.yaml` and propose a service named `likelyhood-backend` with rootDir `backend`.
   - In the Render service settings, add environment variable `PHISH_API_KEY` with your key (do NOT commit `.env`).
   - Deploy. Note the public URL (e.g., `https://likelyhood-backend.onrender.com`).

- Option B: Manual
   - Create a Node Web Service from the `backend` subdirectory.
   - Build command: `npm install`
   - Start command: `npm start`
   - Add env var `PHISH_API_KEY`.

### Frontend
- Deploy the frontend directory to GitHub Pages
   - Create a new GitHub repository and push this project.
   - In repo settings -> Pages, set Source to "Deploy from a branch", select `main` (or default) and `/frontend` as the folder (if supported). Alternatively, create a `gh-pages` branch containing the `frontend` files.
   - Update `frontend/js/main.js` `API_URL` to your Render backend URL.

## Security Notes
- The `.env` file containing API keys is not committed to the repository
- CORS is enabled only for the frontend domain
- API keys are only used in the backend

## Development

To modify the probability calculation algorithm, edit `backend/src/utils/probability.js`.

## Testing (backend)

Run unit tests for the probability utility:

```
cd backend
npm install
npm test
```

## Notes

- Backend uses Phish.net API v3 JSONP endpoint `setlists/latest` and parses the payload. It pages recent setlists to approximate a 2-year window and derives rotation-based probability.
- Keep your API key secret. Set it in Render as `PHISH_API_KEY`; do not commit `.env`.