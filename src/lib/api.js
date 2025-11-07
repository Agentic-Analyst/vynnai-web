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

  async getJobLogs(jobId) {
    const resp = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/logs`, {
      credentials: 'include',
    });
    if (!resp.ok) return null;
    return resp.json();
  },

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

  async startChat(payload) {
    const resp = await fetch(`${API_BASE_URL}/chat`, {
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
    console.log('🛑 Attempting to stop job:', jobId);
    
    try {
      const resp = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('🛑 Stop job response status:', resp.status);
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        console.error('🛑 Stop job failed:', resp.status, errorText);
        
        // If job is already stopped or not found, don't throw error
        if (resp.status === 404 || resp.status === 400) {
          console.log('🛑 Job may already be stopped or not found, treating as success');
          return { status: 'already_stopped', message: 'Job was already stopped or not found' };
        }
        
        throw new Error(`Stop job failed ${resp.status}: ${errorText}`);
      }
      
      const result = await resp.json().catch(() => ({ status: 'stopped' }));
      console.log('🛑 Stop job successful:', result);
      return result;
    } catch (error) {
      console.error('🛑 Stop job error:', error);
      throw error;
    }
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
      try { 
        console.log('🔍 SSE raw event.data:', ev.data);
        return JSON.parse(ev.data); 
      } catch (e) { 
        console.error('❌ SSE parse error:', e, 'raw data:', ev.data);
        return null; 
      }
    };

    const wrap = (fn, eventName) => (ev) => {
      if (!fn) return;
      const data = safeParse(ev) || {};
      console.log(`🔍 SSE [${eventName}] received:`, data);
      fn(data);
    };

    es.addEventListener('status', wrap(handlers.onStatus, 'status'));
    es.addEventListener('log', wrap(handlers.onLog, 'log'));
    es.addEventListener('log_batch', wrap(handlers.onLogBatch, 'log_batch'));
    es.addEventListener('completed', wrap(handlers.onCompleted, 'completed'));
    es.addEventListener('error', wrap(handlers.onServerError, 'error'));

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

  if (files?.financial_model) {
    entries.push({
      key: 'financial_model',
      label: `${T} financial model.xlsx`,
      url: `${base}/download/financial-model`,
      suggestedName: `${T} financial model.xlsx`
    });
  }
  if (files?.professional_report) {
    entries.push({
      key: 'professional_report',
      label: `${T} professional report.pdf`,
      url: `${base}/download/professional-report`,
      suggestedName: `${T} professional report.pdf`
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
