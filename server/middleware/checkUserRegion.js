import geoip from "geoip-lite";

// South Indian states to match against
// Includes both full names and ISO 3166-2 subdivision codes
// because geoip-lite returns codes (e.g. "TN", "TG") not full names
const SOUTH_INDIA_STATES = [
  "Tamil Nadu", "TN",
  "Kerala", "KL",
  "Karnataka", "KA",
  "Andhra Pradesh", "AP",
  "Telangana", "TS", "TG",
];

// Fallback test IP options for development:
// - "183.82.0.0"     => Telangana (TG)
// - "49.205.77.0"    => Tamil Nadu (TN)
// - "125.17.0.0"     => Karnataka (KA)
// - "117.230.0.0"    => Kerala (KL)
// - "117.211.160.1"  => Andhra Pradesh (AP)
// - "122.170.0.0"    => Maharashtra (MH) (Non-South India)
const FALLBACK_TEST_IP = "183.82.0.0";

/**
 * Extracts the client IP from the request.
 * Handles proxied requests (X-Forwarded-For), direct connections,
 * and falls back to a known test IP when running on localhost.
 */
function getClientIp(req) {
  // Allow manual query or body parameter override for testing regions
  const testIp = req.query?.testIp || req.body?.testIp;
  if (testIp) {
    console.log(`[checkUserRegion] Overriding client IP with test IP: ${testIp}`);
    return testIp;
  }

  // Prefer X-Forwarded-For header (first entry is the original client)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (!isLocalIp(firstIp)) return firstIp;
  }

  const remoteIp = req.ip || req.connection?.remoteAddress;

  // On localhost / loopback, use fallback test IP for development
  if (!remoteIp || isLocalIp(remoteIp)) {
    console.log(
      `[checkUserRegion] Localhost detected — using fallback test IP: ${FALLBACK_TEST_IP}`
    );
    return FALLBACK_TEST_IP;
  }

  return remoteIp;
}

/**
 * Checks if an IP address is a loopback / private address.
 */
function isLocalIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, "");
  return (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp === "localhost" ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("172.")
  );
}

/**
 * Express middleware — attaches geo-location info to `req` and determines
 * whether the user is located in a South Indian state.
 *
 * After this middleware runs, the request object will have:
 *   req.geoInfo  — { ip, country, region, city, isSouthIndia }
 */
function checkUserRegion(req, res, next) {
  const ip = getClientIp(req);
  const geo = geoip.lookup(ip);

  if (!geo) {
    console.warn(`[checkUserRegion] Could not resolve geo data for IP: ${ip}`);
    req.geoInfo = {
      ip,
      country: null,
      region: null,
      city: null,
      isSouthIndia: false,
    };
    return next();
  }

  const isSouthIndia =
    geo.country === "IN" && SOUTH_INDIA_STATES.includes(geo.region);

  req.geoInfo = {
    ip,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    isSouthIndia,
  };

  console.log(
    `[checkUserRegion] IP: ${ip} | Region: ${geo.region}, ${geo.country} | South India: ${isSouthIndia}`
  );

  next();
}

export { checkUserRegion, SOUTH_INDIA_STATES };
export default checkUserRegion;
