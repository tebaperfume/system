export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return res.status(401).json({ ok: false, error: 'unauthorized' });

  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return res.status(500).json({ ok: false, error: 'env_missing' });
  const auth = { Authorization: 'Bearer ' + token };

  if (req.method === 'GET') {
    const k = await fetch(base + '/keys/uid:*', { headers: auth }).then(r => r.json());
    const keys = k.result || [];
    let items = [];
    if (keys.length) {
      const m = await fetch(base + '/mget', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      }).then(r => r.json());
      items = keys.map((key, i) => ({ uid: key.replace('uid:', ''), status: (m.result || [])[i] }));
    }
    return res.status(200).json({ ok: true, items });
  }

  if (req.method === 'POST') {
    const { action, uid } = req.body || {};
    if (!/^\d{10}$/.test(uid || '')) return res.status(400).json({ ok: false, error: 'bad_uid' });
    const key = 'uid:' + uid;
    if (action === 'approve')      await fetch(base + '/set/' + key + '/approved', { method: 'POST', headers: auth });
    else if (action === 'reject')  await fetch(base + '/set/' + key + '/rejected', { method: 'POST', headers: auth });
    else if (action === 'delete')  await fetch(base + '/del/' + key, { method: 'POST', headers: auth });
    else return res.status(400).json({ ok: false, error: 'bad_action' });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ ok: false });
}
