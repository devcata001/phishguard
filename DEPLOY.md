# PhishGuard - AI-Powered Phishing Detection

## Deploy to Render

### Backend (API)

1. **Push to GitHub** (if not already):

   ```bash
   cd /home/catalyst/phishguard
   git init
   git add .
   git commit -m "PhishGuard with Gemini AI"
   git remote add origin https://github.com/YOUR_USERNAME/phishguard.git
   git push -u origin main
   ```

2. **Deploy Backend on Render**:

   - Go to https://render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Settings:
     - **Name**: `phishguard-api`
     - **Root Directory**: `backend`
     - **Runtime**: `Docker`
     - **Instance Type**: Free
   - Add Environment Variable:
     - **Key**: `GEMINI_API_KEY`
     - **Value**: `AIzaSyBhrjzxdWshGYkTH-sSgBHvcepe4qCax58`
   - Click "Create Web Service"

3. **Get your API URL** (e.g., `https://phishguard-api.onrender.com`)

### Frontend (Static Site)

1. **Deploy Frontend on Render**:

   - Click "New" → "Static Site"
   - Connect same GitHub repo
   - Settings:
     - **Name**: `phishguard`
     - **Root Directory**: `frontend`
     - **Build Command**: (leave empty)
     - **Publish Directory**: `.`
   - Click "Create Static Site"

2. **Update API URL in frontend**:
   Edit `frontend/app.js` line 10 to use your actual Render backend URL:
   ```javascript
   : "https://YOUR-BACKEND-NAME.onrender.com";
   ```

### Alternative: Deploy Both Together

You can also use the `render.yaml` Blueprint:

1. Go to Render Dashboard
2. Click "New" → "Blueprint"
3. Connect your repo
4. Render will auto-detect `render.yaml` and deploy

## Local Development

```bash
# Backend
cd backend
export GEMINI_API_KEY='your_key'
python app.py

# Frontend (separate terminal)
cd frontend
python3 -m http.server 5173
```

## API Endpoints

- `GET /health` - Health check
- `POST /analyze` - Analyze email for phishing
  ```json
  { "text": "email content here" }
  ```

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python, Flask
- **AI**: Google Gemini 2.5 Flash
