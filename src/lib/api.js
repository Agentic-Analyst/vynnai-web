// Central API utilities for the Stock Analysis frontend
import { API_BASE_URL } from "@/lib/apiBase";

// ---- Low-level helpers ----
const safeJson = async (resp) => {
  try { return await resp.json(); } catch { return null; }
};
const contentDispositionName = (cdHeader) => {
  if (!cdHeader) return null;
  const m = cdHeader.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

// ---- High-level API surface ----
export const api = {
  base: API_BASE_URL,

  async startAnalysis(payload) {
    const resp = await fetch(`${API_BASE_URL}/nl/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`API Error ${resp.status}: ${t}`);
    }
    return resp.json();
  },

  async getJobStatus(jobId) {
    const resp = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
      credentials: 'include',
    });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error('Status check failed');
    return resp.json();
  },

  async getDetailedStatus(jobId) {
    const resp = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/status/detailed`, {
      credentials: 'include',
    });
    if (!resp.ok) return null;
    return resp.json();
  },

  async stopJob(jobId) {
    const resp = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/stop`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Stop job failed ${resp.status}: ${t}`);
    }
    return resp.json();
  },

  async getStoppableJobs() {
    const resp = await fetch(`${API_BASE_URL}/jobs/stoppable`, {
      credentials: 'include',
    });
    if (!resp.ok) return null;
    return resp.json();
  },

  /**
   * Open the SSE stream for a job.
   * handlers: {
   *   onOpen,
   *   onStatus(payload),
   *   onLog(payload),
   *   onLogBatch(payload),
   *   onCompleted(payload),
   *   onServerError(payload),
   *   onErrorEvent()
   * }
   */
  openLogStream(jobId, handlers = {}) {
    const es = new EventSource(
     `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/logs/stream`,
     { withCredentials: true } // REQUIRED for cookie-auth over subdomain
   );
   es.onopen = () => handlers.onOpen && handlers.onOpen();

    const safeParse = (ev) => {
      try { return JSON.parse(ev.data); } catch { return null; }
    };

    const wrap = (fn) => (ev) => {
      if (!fn) return;
      const data = safeParse(ev) || {};
      fn(data);
    };

    es.addEventListener('status', wrap(handlers.onStatus));
    es.addEventListener('log', wrap(handlers.onLog));
    es.addEventListener('log_batch', wrap(handlers.onLogBatch));
    es.addEventListener('completed', wrap(handlers.onCompleted));
    es.addEventListener('error', wrap(handlers.onServerError));

    // Fallback generic message handler (typed "type" messages)
    es.onmessage = (event) => {
      const data = safeParse(event) || {};
      if (data?.type === 'status')      return handlers.onStatus && handlers.onStatus(data);
      if (data?.type === 'log')         return handlers.onLog && handlers.onLog(data);
      if (data?.type === 'log_batch')   return handlers.onLogBatch && handlers.onLogBatch(data);
      if (data?.type === 'completed')   return handlers.onCompleted && handlers.onCompleted(data);
      // otherwise ignore
    };

    es.onerror = () => handlers.onErrorEvent && handlers.onErrorEvent();

    return es;
  },
};

// ---- Download mapping utilities ----

/**
 * Build a definitive list of download entries from "files" booleans/counts.
 * Returns an object keyed by 'key' with { key, label, url, suggestedName }.
 */
export const buildDownloadEntries = (apiBase, jobId, ticker, files) => {
  const base = `${apiBase}/jobs/${encodeURIComponent(jobId)}`;
  const T = (ticker || '').toUpperCase();

  const entries = [];

  if (files?.info_log) {
    entries.push({
      key: 'info_log',
      label: 'info.log',
      url: `${base}/files/info.log`,
      suggestedName: 'info.log'
    });
  }
  if (files?.peer_financials) {
    entries.push({
      key: 'peer_financials',
      label: `${T}_peer_financials_annual.zip`,
      url: `${base}/download/peer-financials`,
      suggestedName: `${T}_peer_financials_annual.zip`
    });
  }
  if (files?.financial_model) {
    entries.push({
      key: 'financial_model',
      label: `${T}_financial_model_comprehensive_latest.xlsx`,
      url: `${base}/download/financial-model`,
      suggestedName: `${T}_financial_model_comprehensive_latest.xlsx`
    });
  }
  if (files?.financial_model_comparable) {
    entries.push({
      key: 'financial_model_comparable',
      label: `${T}_financial_model_comparable_latest.xlsx`,
      url: `${base}/download/financial-model-comparable`,
      suggestedName: `${T}_financial_model_comparable_latest.xlsx`
    });
  }
  if (files?.price_adjustment_explanation) {
    entries.push({
      key: 'price_adjustment_explanation',
      label: `${T}_price_adjustment_explanation_latest.pdf`,
      url: `${base}/download/price-adjustment-explanation`,
      suggestedName: `${T}_price_adjustment_explanation_latest.pdf`
    });
  }

  // bundle
  if (entries.length > 0) {
    entries.push({
      key: 'all_results',
      label: `${T}_complete_analysis.tar`,
      url: `${base}/download/all-results`,
      suggestedName: `${T}_complete_analysis.tar`
    });
  }

  return Object.fromEntries(entries.map(e => [e.key, e]));
};

/**
 * Perform a download for a prepared entry and return { blob, filename }.
 */
export const downloadByEntry = async (entry) => {
  const resp = await fetch(entry.url, { credentials: 'include' });
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const blob = await resp.blob();
  const cd = resp.headers.get('Content-Disposition');
  const filename = contentDispositionName(cd) || entry.suggestedName || entry.label || 'download';
  return { blob, filename };
};
