/**
 * POST /api/fee
 * Tracks 2% dev fees for future on-chain settlement.
 *
 * Body: { userId, action, baseAmount, fee, ts, wallet? }
 * Returns: { ok }
 */

const DEV_WALLET = 'UQAOsFEKdjnYUO133YkeHsuPJc_HTjaaR6pdeVcekh1Tv8Bz';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, action, baseAmount, fee, ts, wallet } = req.body || {};
  if (!userId || !action || !fee) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }

  try {
    const { kv } = await import('@vercel/kv');

    // Track cumulative dev fees
    const currentFees = parseInt(await kv.get('dev:totalFees') || '0', 10);
    await kv.set('dev:totalFees', String(currentFees + fee));

    // Log individual fee event
    await kv.lpush('dev:fees:log', JSON.stringify({
      userId, action, baseAmount, fee, ts: ts || Date.now(), wallet: wallet || null, devWallet: DEV_WALLET
    }));

    // Track per-user cumulative fees
    const userFees = parseInt(await kv.get(`fees:${userId}`) || '0', 10);
    await kv.set(`fees:${userId}`, String(userFees + fee));

    console.log(`[fee] userId=${userId} action=${action} base=${baseAmount} fee=${fee} total_dev=${currentFees + fee}`);
  } catch (e) {
    console.warn('[fee] KV not available');
  }

  return res.status(200).json({ ok: true });
}
