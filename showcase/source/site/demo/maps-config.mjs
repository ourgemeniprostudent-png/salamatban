/** This is a public endpoint, never a provider credential. Read only the named
 * value; do not serialize process.env into a browser build. */
export function mapsGatewayUrl(value) {
  if (value === undefined || value === '') return null;
  let url;
  try { url = new URL(value); } catch { throw new Error('SALAMATBAN_MAPS_GATEWAY_URL must be a public HTTPS API URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/api/maps/hospitals' || ['api.geoapify.com','api.neshan.org'].includes(url.hostname)) {
    throw new Error('SALAMATBAN_MAPS_GATEWAY_URL must be https://<gateway-host>/api/maps/hospitals without credentials, query or fragment.');
  }
  return url.href;
}
