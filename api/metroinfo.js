const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

module.exports = async function handler(req, res) {
  const { path } = req.query;

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing path parameter.' });
  }

  const targetUrl = `https://apis.metroinfo.co.nz${path}`;
  const subscriptionKey = process.env.METROINFO_API_KEY;

  if (!subscriptionKey) {
    return res.status(500).json({ error: 'METROINFO_API_KEY is not configured.' });
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Cache-Control': 'no-cache',
        'Accept': 'application/octet-stream'
      }
    });

    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text();
      return res.status(upstreamResponse.status).send(text);
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

    if (path.endsWith('.pb')) {
      try {
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
        return res.status(200).json(feed.toJSON ? feed.toJSON() : feed);
      } catch (decodeErr) {
        console.error('protobuf decode failed', decodeErr);
        return res.status(500).json({ error: 'protobuf decode failed', details: decodeErr.message });
      }
    }

    const text = buffer.toString('utf-8');
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
    return res.status(200).send(text);
  } catch (err) {
    console.error('MetroInfo proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch MetroInfo data', details: err.message });
  }
};
