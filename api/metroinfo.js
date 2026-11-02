export default async function handler(req, res) {
  const { path } = req.query;

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid path parameter.' });
  }

  const targetUrl = `https://apidevelopers.metroinfo.co.nz${path}`;

  if (!process.env.METROINFO_API_KEY) {
    return res.status(500).json({ error: 'METROINFO_API_KEY is not configured.' });
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.METROINFO_API_KEY,
        'Cache-Control': 'no-cache'
      }
    });

    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';
    const body = await upstreamResponse.text();

    res.setHeader('Content-Type', contentType);
    res.status(upstreamResponse.status).send(body);
  } catch (err) {
    console.error('MetroInfo proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch MetroInfo data.', details: err.message });
  }
}
