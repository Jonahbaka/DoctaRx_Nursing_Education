const { normalizeSearchResponse, parseDailyMedLabel } = require('./dailyMedParser');

const DAILYMED_ORIGIN = 'https://dailymed.nlm.nih.gov';
const DAILYMED_BASE_URL = `${DAILYMED_ORIGIN}/dailymed/services/v2/`;
const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const SET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEARCH_TYPES = new Set(['generic', 'brand', 'ingredient']);

class DailyMedServiceError extends Error {
  constructor(message, { code = 'DAILYMED_ERROR', statusCode = 502, retryAfterSeconds = null } = {}) {
    super(message);
    this.name = 'DailyMedServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanSearchQuery(value) {
  const query = String(value || '').replace(/\s+/g, ' ').trim();
  if (query.length < 2 || query.length > 100 || /[\u0000-\u001f\u007f]/.test(query)) {
    throw new DailyMedServiceError('Enter a medication name containing 2 to 100 characters', {
      code: 'DAILYMED_INVALID_QUERY',
      statusCode: 400,
    });
  }
  return query;
}

function validateSetId(value) {
  const setId = String(value || '').trim().toLowerCase();
  if (!SET_ID_PATTERN.test(setId)) {
    throw new DailyMedServiceError('A valid DailyMed set ID is required', {
      code: 'DAILYMED_INVALID_SET_ID',
      statusCode: 400,
    });
  }
  return setId;
}

function retryAfterSeconds(response) {
  const raw = response.headers.get('retry-after');
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60, Math.ceil(seconds));
  const date = Date.parse(raw);
  if (!Number.isFinite(date)) return null;
  return Math.min(60, Math.max(0, Math.ceil((date - Date.now()) / 1000)));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createDailyMedClient({
  fetchImpl = globalThis.fetch,
  baseUrl = DAILYMED_BASE_URL,
  timeoutMs = Number(process.env.DAILYMED_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  cacheTtlMs = Number(process.env.DAILYMED_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS),
  retryDelayMs = Number(process.env.DAILYMED_RETRY_DELAY_MS || 350),
  maxRetries = 2,
  now = () => Date.now(),
  logger = console,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const allowedBase = new URL(baseUrl);
  const cache = new Map();
  const pending = new Map();

  function logWarning(event, details) {
    if (process.env.NODE_ENV === 'test' || typeof logger?.warn !== 'function') return;
    logger.warn(`[DailyMed] ${event}`, details);
  }

  function pruneCache() {
    const currentTime = now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= currentTime) cache.delete(key);
    }
    while (cache.size > 250) cache.delete(cache.keys().next().value);
  }

  async function fetchResource(path, { accept = 'application/json' } = {}) {
    const url = new URL(path, allowedBase);
    if (url.origin !== allowedBase.origin || !url.pathname.startsWith(allowedBase.pathname)) {
      throw new DailyMedServiceError('DailyMed request path was rejected', {
        code: 'DAILYMED_INVALID_PATH',
        statusCode: 400,
      });
    }

    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: accept,
            'User-Agent': 'DoctaRx-Nursing-Education/1.0',
          },
          signal: controller.signal,
        });
        const retryAfter = retryAfterSeconds(response);
        if (response.status === 404) {
          throw new DailyMedServiceError('DailyMed did not return a matching medication label', {
            code: 'DAILYMED_NOT_FOUND',
            statusCode: 404,
          });
        }
        if (response.status === 429 || response.status >= 500) {
          lastError = new DailyMedServiceError(
            response.status === 429
              ? 'DailyMed is receiving too many requests. Please retry shortly.'
              : 'DailyMed is temporarily unavailable. Please retry.',
            {
              code: response.status === 429 ? 'DAILYMED_RATE_LIMITED' : 'DAILYMED_UPSTREAM_ERROR',
              statusCode: response.status === 429 ? 503 : 502,
              retryAfterSeconds: retryAfter,
            }
          );
          if (attempt < maxRetries) {
            const delay = retryAfter ? retryAfter * 1000 : retryDelayMs * (2 ** attempt);
            logWarning('upstream retry', {
              path: url.pathname,
              status: response.status,
              attempt: attempt + 1,
              delayMs: Math.min(delay, 3000),
            });
            await wait(Math.min(delay, 3000));
            continue;
          }
          logWarning('upstream request failed', {
            path: url.pathname,
            status: response.status,
            attempts: attempt + 1,
          });
          throw lastError;
        }
        if (!response.ok) {
          throw new DailyMedServiceError('DailyMed could not complete the medication request', {
            code: 'DAILYMED_UPSTREAM_ERROR',
            statusCode: 502,
          });
        }

        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > MAX_RESPONSE_BYTES) {
          throw new DailyMedServiceError('DailyMed returned a label that exceeds the supported size', {
            code: 'DAILYMED_RESPONSE_TOO_LARGE',
            statusCode: 502,
          });
        }
        const body = await response.text();
        if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) {
          throw new DailyMedServiceError('DailyMed returned a label that exceeds the supported size', {
            code: 'DAILYMED_RESPONSE_TOO_LARGE',
            statusCode: 502,
          });
        }
        return body;
      } catch (error) {
        if (error instanceof DailyMedServiceError) throw error;
        if (error?.name === 'AbortError') {
          lastError = new DailyMedServiceError('DailyMed took too long to respond. Please retry.', {
            code: 'DAILYMED_TIMEOUT',
            statusCode: 504,
          });
        } else {
          lastError = new DailyMedServiceError('DailyMed could not be reached. Check the connection and retry.', {
            code: 'DAILYMED_NETWORK_ERROR',
            statusCode: 502,
          });
        }
        if (attempt < maxRetries) {
          const delay = Math.min(retryDelayMs * (2 ** attempt), 3000);
          logWarning('network retry', {
            path: url.pathname,
            code: lastError.code,
            attempt: attempt + 1,
            delayMs: delay,
          });
          await wait(delay);
          continue;
        }
        logWarning('network request failed', {
          path: url.pathname,
          code: lastError.code,
          attempts: attempt + 1,
        });
        throw lastError;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError;
  }

  async function cached(key, ttlMs, loader) {
    pruneCache();
    const existing = cache.get(key);
    if (existing && existing.expiresAt > now()) return clone(existing.value);
    if (pending.has(key)) return clone(await pending.get(key));
    const operation = Promise.resolve().then(loader);
    pending.set(key, operation);
    try {
      const value = await operation;
      cache.set(key, { value: clone(value), expiresAt: now() + ttlMs });
      return clone(value);
    } finally {
      pending.delete(key);
    }
  }

  async function fetchJson(path) {
    const text = await fetchResource(path, { accept: 'application/json' });
    try {
      const payload = JSON.parse(text);
      if (!payload || typeof payload !== 'object') throw new Error('Invalid JSON payload');
      return payload;
    } catch {
      throw new DailyMedServiceError('DailyMed returned an unreadable response', {
        code: 'DAILYMED_INVALID_RESPONSE',
        statusCode: 502,
      });
    }
  }

  async function searchMedications({ query, searchBy = 'generic', page = 1, pageSize = 12 } = {}) {
    const cleanQuery = cleanSearchQuery(query);
    const mode = SEARCH_TYPES.has(searchBy) ? searchBy : 'generic';
    const currentPage = Math.min(5000, Math.max(1, Number(page) || 1));
    const size = Math.min(24, Math.max(6, Number(pageSize) || 12));
    const nameType = mode === 'brand' ? 'brand' : 'generic';
    const params = new URLSearchParams({
      drug_name: cleanQuery,
      name_type: nameType,
      pagesize: String(size),
      page: String(currentPage),
    });
    const key = `search:${mode}:${cleanQuery.toLowerCase()}:${currentPage}:${size}`;
    return cached(key, Math.min(cacheTtlMs, SEARCH_CACHE_TTL_MS), async () => {
      const normalized = normalizeSearchResponse(await fetchJson(`spls.json?${params}`));
      return { ...normalized, query: cleanQuery, searchBy: mode };
    });
  }

  async function suggestMedicationNames({ query, searchBy = 'generic', limit = 8 } = {}) {
    const cleanQuery = cleanSearchQuery(query);
    const mode = SEARCH_TYPES.has(searchBy) ? searchBy : 'generic';
    const nameType = mode === 'brand' ? 'brand' : 'generic';
    const size = Math.min(20, Math.max(5, Number(limit) || 8));
    const params = new URLSearchParams({
      drug_name: cleanQuery,
      name_type: nameType,
      pagesize: String(size),
      page: '1',
    });
    const key = `suggest:${mode}:${cleanQuery.toLowerCase()}:${size}`;
    return cached(key, Math.min(cacheTtlMs, SEARCH_CACHE_TTL_MS), async () => {
      const payload = await fetchJson(`drugnames.json?${params}`);
      const names = Array.isArray(payload.data)
        ? payload.data.map((item) => String(item?.drug_name || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
        : [];
      const lowerQuery = cleanQuery.toLowerCase();
      return [...new Set(names)]
        .sort((left, right) => {
          const leftStarts = left.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
          const rightStarts = right.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
          return leftStarts - rightStarts || left.localeCompare(right);
        })
        .slice(0, size);
    });
  }

  async function getMedicationLabel(setIdValue) {
    const setId = validateSetId(setIdValue);
    return cached(`label:${setId}`, cacheTtlMs, async () => {
      // DailyMed selects SPL XML by the file extension and returns 406 for
      // explicit XML Accept headers, so keep content negotiation permissive.
      const xml = await fetchResource(`spls/${encodeURIComponent(setId)}.xml`, { accept: '*/*' });
      try {
        return parseDailyMedLabel(xml, setId);
      } catch (error) {
        if (error instanceof DailyMedServiceError) throw error;
        throw new DailyMedServiceError('DailyMed returned a drug label that could not be processed', {
          code: error.code || 'DAILYMED_INVALID_LABEL',
          statusCode: 502,
        });
      }
    });
  }

  return {
    clearCache: () => cache.clear(),
    getMedicationLabel,
    searchMedications,
    suggestMedicationNames,
    validateSetId,
  };
}

const dailyMedClient = createDailyMedClient();

module.exports = {
  DAILYMED_BASE_URL,
  DailyMedServiceError,
  SET_ID_PATTERN,
  createDailyMedClient,
  dailyMedClient,
};
