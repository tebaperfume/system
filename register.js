export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const uid = ((req.body && req.body.uid) || '').toString().trim();
  if (!/^\d{10}$/.test(uid)) return res.status(400).json({ ok: false, error: 'bad_uid' });

  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return res.status(500).json({ ok: false, error: 'env_missing' });

  const auth = { Authorization: 'Bearer ' + token };
  const key = 'uid:' + uid;

  const g = await fetch(base + '/get/' + key, { headers: auth }).then(r => r.json());
  let status = g.result;

  if (!status) {
    await fetch(base + '/set/' + key + '/pending', { method: 'POST', headers: auth });
    status = 'new';
  }
  return res.status(200).json({ ok: true, status });
}
