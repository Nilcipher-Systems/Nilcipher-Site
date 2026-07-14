// ============================================================
// UPLOAD CONCEPT IMAGES
// ============================================================
// Clients attach concept art / mockups / reference images with
// their order. Files go to Netlify Blobs (free tier, no extra
// service, no monthly fee) and we hand back short-lived keys
// that get attached to the Stripe payment metadata.
//
// Why not Formspree? File uploads are a PAID Formspree feature,
// and their free tier caps at 50 submissions/month. This costs
// nothing and has no cap worth worrying about.
//
// SECURITY: we validate type and size SERVER-SIDE. A browser
// `accept="image/*"` attribute is a hint, not a guard — anyone
// can POST whatever they like straight at this endpoint.
// ============================================================

const { getStore } = require('@netlify/blobs');

const MAX_BYTES = 5 * 1024 * 1024;   // 5 MB per file
const MAX_FILES = 5;

// Real image magic numbers. Checking the declared MIME type alone
// is worthless — it's attacker-controlled. This checks actual bytes.
const SIGNATURES = [
  { ext: 'png',  mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { ext: 'jpg',  mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { ext: 'gif',  mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] } // RIFF
];

function sniffImage(buf) {
  for (const sig of SIGNATURES) {
    if (sig.bytes.every((b, i) => buf[i] === b)) return sig;
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const files = Array.isArray(payload.files) ? payload.files : [];

  if (!files.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No files provided.' }) };
  }
  if (files.length > MAX_FILES) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Too many files. Maximum ${MAX_FILES}.` })
    };
  }

  try {
    const store = getStore('concepts');
    const saved = [];

    for (const f of files) {
      if (!f || typeof f.data !== 'string') {
        return { statusCode: 400, body: JSON.stringify({ error: 'Malformed file.' }) };
      }

      // data is a base64 data URL: "data:image/png;base64,iVBOR..."
      const comma = f.data.indexOf(',');
      const b64 = comma >= 0 ? f.data.slice(comma + 1) : f.data;
      const buf = Buffer.from(b64, 'base64');

      if (buf.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Empty file.' }) };
      }
      if (buf.length > MAX_BYTES) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `"${(f.name || 'file').slice(0, 40)}" is over 5MB.` })
        };
      }

      // Check the ACTUAL BYTES, not the claimed MIME type.
      const sig = sniffImage(buf);
      if (!sig) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Only PNG, JPG, GIF, and WEBP images are accepted.' })
        };
      }

      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${sig.ext}`;
      await store.set(key, buf, { metadata: { contentType: sig.mime } });
      saved.push(key);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: saved })
    };

  } catch (err) {
    console.error('Upload failed:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upload failed. You can also send images on Discord after ordering.' })
    };
  }
};