const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 200;

const buckets = new Map();

function ingestRateLimit(req, res, next) {
  const key = req.ip || "global";
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > MAX_REQUESTS) {
    return res
      .status(429)
      .json({ error: "Too many ingest requests from this IP. Please slow down." });
  }

  return next();
}

module.exports = ingestRateLimit;

