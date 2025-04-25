// DNS server configuration
export const SERVER_HOST = "127.0.0.1";
export const SERVER_PORT = 53;

// Upstream DNS servers
export const PRIMARY_DNS_SERVER = "8.8.8.8";     // Google DNS
export const SECONDARY_DNS_SERVER = "1.1.1.1";   // Cloudflare DNS
export const UPSTREAM_DNS_PORT = 53;

// Timeouts
export const REQUEST_TIMEOUT = 10000; // 10 seconds timeout for forwarding requests
export const RETRY_TIMEOUT = REQUEST_TIMEOUT / 2; // 5 seconds before retry

// Cleanup interval
export const CLEANUP_INTERVAL = REQUEST_TIMEOUT; // Run cleanup every 10 seconds