import { Router } from 'express';

const UPS_API_BASE = 'https://onlinetools.ups.com/api';
const UPS_AUTH_URL = 'https://onlinetools.ups.com/security/v1/oauth/token';
const TRACKINGMORE_API_BASE = 'https://api.trackingmore.com/v4';

export const trackingRouter = Router();

// Simple health for this router
trackingRouter.get('/tracking/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// UPS: Fetch OAuth token
trackingRouter.post('/ups/token', async (req, res) => {
  try {
    const { UPS_CLIENT_ID, UPS_CLIENT_SECRET } = process.env;
    if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Missing UPS credentials' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString('base64');
    const resp = await fetch(UPS_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
      },
      body: 'grant_type=client_credentials',
    });
    const text = await resp.text();
    res.status(resp.status).type('application/json').send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// UPS: Track package (server fetches fresh token each time for safety)
trackingRouter.get('/ups/track', async (req, res) => {
  try {
    const tracking = req.query.tracking;
    if (!tracking) return res.status(400).json({ error: 'Missing tracking' });

    const { UPS_CLIENT_ID, UPS_CLIENT_SECRET } = process.env;
    if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Missing UPS credentials' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString('base64');
    const tokenResp = await fetch(UPS_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      return res.status(tokenResp.status).type('application/json').send(text);
    }
    const tokenData = await tokenResp.json();
    const bearer = `Bearer ${tokenData.access_token}`;

    const upsResp = await fetch(`${UPS_API_BASE}/track/v1/details/${encodeURIComponent(tracking)}`, {
      method: 'GET',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json',
        'transId': `splitfin-${Date.now()}`,
        'transactionSrc': 'Splitfin',
      },
    });
    const text = await upsResp.text();
    res.status(upsResp.status).type('application/json').send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// TrackingMore: Detect courier
trackingRouter.post('/trackingmore-proxy', async (req, res) => {
  try {
    const action = req.query.action;
    const apiKey = process.env.TRACKINGMORE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing TRACKINGMORE_API_KEY' });

    if (action === 'detect') {
      const resp = await fetch(`${TRACKINGMORE_API_BASE}/couriers/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Tracking-Api-Key': apiKey,
        },
        body: JSON.stringify(req.body || {}),
      });
      const text = await resp.text();
      return res.status(resp.status).type('application/json').send(text);
    }

    if (action === 'create') {
      const resp = await fetch(`${TRACKINGMORE_API_BASE}/trackings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Tracking-Api-Key': apiKey,
        },
        body: JSON.stringify(req.body || {}),
      });
      const text = await resp.text();
      return res.status(resp.status).type('application/json').send(text);
    }

    if (action === 'get') {
      const tn = req.query.tracking_numbers || '';
      const cc = req.query.courier_code || '';
      const url = `${TRACKINGMORE_API_BASE}/trackings/get?tracking_numbers=${encodeURIComponent(tn)}&courier_code=${encodeURIComponent(cc)}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Tracking-Api-Key': apiKey },
      });
      const text = await resp.text();
      return res.status(resp.status).type('application/json').send(text);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

