# SiteIntel SMS API

This document explains how to test the SiteIntel SMS workflow locally using the FastAPI Swagger UI (`/docs`) and the `/sms/webhook` endpoint.

---

# Prerequisites

Before testing, ensure the following are running correctly:

- Python virtual environment activated
- FastAPI backend running
- Supabase project configured
- Earth Engine authenticated
- Database tables created

---

# Start the Backend

From the project root:

```bash
uvicorn app.main:app --reload
```

You should see:

```
INFO: Uvicorn running on http://127.0.0.1:8000
```

---

# Open Swagger

Open your browser and navigate to:

```
http://127.0.0.1:8000/docs
```

Locate the endpoint:

```
POST /sms/webhook
```

---

# SMS Conversation Flow

The SMS service works as a conversation.

Each request represents one SMS sent by a user.

Use the **same phone number** throughout the conversation because the backend stores the conversation state.

Example phone number:

```
+254712345678
```

---

# Step 1 - Start Conversation

Request Body

```json
{
  "from": "+254712345678",
  "text": "ASSESS"
}
```

Expected Response

```
Welcome to SiteIntel

Choose an analysis:

1. Site Assessment
2. Flood Risk
3. Climate Outlook

Reply with 1, 2 or 3.
```

---

# Step 2 - Select Analysis

Example:

```json
{
  "from": "+254712345678",
  "text": "1"
}
```

Expected Response

```
Enter the location you would like to assess.
```

---

# Step 3 - Send Location

Example:

```json
{
  "from": "+254712345678",
  "text": "Kitengela"
}
```

The backend will:

1. Geocode the location
2. Run the GIS analysis
3. Query Google Earth Engine
4. Calculate flood risk
5. Calculate terrain statistics
6. Retrieve soil information
7. Retrieve climate information
8. Retrieve land cover
9. Retrieve nearby OSM features
10. Calculate a suitability score
11. Generate a recommendation
12. Format the response into an SMS

Expected Response (example)

```
SiteIntel

Location: Kitengela

Suitability: 86/100

Rating: GOOD

• Low flood risk
• Gentle terrain

Suitable with minor precautions.

Reply ASSESS for another analysis.
```

---

# Current SMS Workflow

```
User
 │
 ▼
POST /sms/webhook
 │
 ▼
Conversation Service
 │
 ▼
Analysis Service
 │
 ├── Geocoder
 ├── Elevation
 ├── Terrain
 ├── Flood Risk
 ├── Soil
 ├── Climate
 ├── Land Cover
 ├── OSM Context
 │
 ▼
Recommendation Engine
 │
 ▼
SMS Formatter
 │
 ▼
SMS Response
```

---

# Next Step

Once local testing is successful, the `/sms/webhook` endpoint can be connected to **Africa's Talking Incoming Messages Callback** using a public URL (e.g., through ngrok during development or a deployed backend in production).
