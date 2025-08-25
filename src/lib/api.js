// Modern Stock Analysis API Client
const DEFAULT_API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_RUNNER_URL
    ? import.meta.env.VITE_RUNNER_URL
    : 'http://localhost:8080';

export const getApiBaseUrl = () => {
  // Priority: localStorage override -> Vite env -> default
  const fromStorage = localStorage.getItem('stock_api_base_url');
  if (fromStorage) return fromStorage;
  return DEFAULT_API_BASE_URL;
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem('stock_api_base_url', url);
};

// API Types
export const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  COMPLETED_WITH_WARNINGS: 'completed_with_warnings',
  FAILED: 'failed',
  LLM_TIMEOUT: 'llm_timeout'
};

export const SSEMessageTypes = {
  CONNECTION: 'connection',
  STATUS: 'status',
  LOG: 'log',
  LATEST: 'latest',
  FINAL: 'final',
  ERROR: 'error'
};

// API Client Class
export class StockAnalysisAPI {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl || getApiBaseUrl();
  }

  /**
   * Start a new stock analysis job
   */
  async startAnalysis(request) {
    try {
      const response = await fetch(`${this.baseUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: request.ticker.toUpperCase(),
          company: request.company,
          query: request.query,
          pipeline: request.pipeline,
          model: request.model,
          years: request.years,
          max_articles: request.max_articles,
          min_score: request.min_score,
          max_filtered: request.max_filtered,
          min_confidence: request.min_confidence,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to start analysis:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Get basic job status
   */
  async getJobStatus(jobId) {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Job not found: ${jobId}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get job status for ${jobId}:`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Get detailed job status with file availability and progress metrics
   */
  async getDetailedJobStatus(jobId) {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}/status/detailed`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Job not found: ${jobId}`);
      }

      const data = await response.json();
      console.log('🔍 Raw API response for detailed status:', data);
      
      // Handle potential field name variations from backend
      if (data.files_available) {
        const files = data.files_available;
        
        // Map potential field name variations
        if (files.searched_articles_count !== undefined && files.searched_articles === undefined) {
          files.searched_articles = files.searched_articles_count;
        }
        
        if (files.filtered_articles_count !== undefined && files.filtered_articles === undefined) {
          files.filtered_articles = files.filtered_articles_count;
        }
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to get detailed status for ${jobId}:`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Monitor job progress with Server-Sent Events (SSE)
   */
  monitorJob(jobId, callbacks = {}) {
    const streamUrl = `${this.baseUrl}/jobs/${jobId}/logs/stream`;
    console.log('🔌 Creating SSE connection to:', streamUrl);
    
    const eventSource = new EventSource(streamUrl);
    
    eventSource.onopen = (_event) => {
      console.log('✅ SSE connection opened successfully:', {
        url: streamUrl,
        readyState: eventSource.readyState,
        timestamp: new Date().toISOString()
      });
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('✅ Parsed SSE message:', data);
        
        switch (data.type) {
          case SSEMessageTypes.CONNECTION:
            callbacks.onConnection?.(data);
            break;
          case SSEMessageTypes.STATUS:
            callbacks.onStatus?.(data);
            break;
          case SSEMessageTypes.LOG:
            callbacks.onLog?.(data);
            break;
          case SSEMessageTypes.LATEST:
            callbacks.onLatest?.(data);
            break;
          case SSEMessageTypes.FINAL:
            callbacks.onFinal?.(data);
            eventSource.close();
            break;
          case SSEMessageTypes.ERROR:
            callbacks.onError?.(new Event('error'));
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error('❌ Error parsing SSE message:', {
          error: error,
          rawData: event.data,
          url: streamUrl
        });
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', {
        error: error,
        readyState: eventSource.readyState,
        readyStateText: ['CONNECTING', 'OPEN', 'CLOSED'][eventSource.readyState],
        url: streamUrl,
        timestamp: new Date().toISOString()
      });
      callbacks.onError?.(error);
    };
    
    return eventSource;
  }

  /**
   * Download a specific file type
   */
  async downloadFile(jobId, fileType, customFileName = null) {
    try {
      const downloadUrl = `${this.baseUrl}/jobs/${jobId}/download/${fileType}`;
      console.log('🔽 Starting download request:', {
        jobId,
        fileType,
        url: downloadUrl
      });
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to download ${fileType}`);
      }

      // Extract filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = customFileName || `${jobId}_${fileType}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Download triggered successfully');
      
    } catch (error) {
      console.error(`❌ Download failed for ${fileType} (${jobId}):`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Check API health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      console.warn('Health check failed:', error);
      throw this.formatError(error);
    }
  }

  /**
   * List all jobs
   */
  async listJobs() {
    try {
      const response = await fetch(`${this.baseUrl}/jobs`);
      
      if (!response.ok) {
        throw new Error('Failed to list jobs');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list jobs:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Get complete info.log content
   */
  async getInfoLog(jobId) {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}/info-log`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to get info.log for ${jobId}`);
      }

      const data = await response.json();
      return data.log_content;
    } catch (error) {
      console.error(`Failed to get info.log for ${jobId}:`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Format error messages consistently
   */
  formatError(error) {
    if (error instanceof Error) {
      return {
        message: error.message,
        status: error.status || 0
      };
    }
    
    if (typeof error === 'string') {
      return { message: error, status: 0 };
    }
    
    return {
      message: error.message || 'An unknown error occurred',
      status: error.status || 0
    };
  }
}

// Default API instance
export const api = new StockAnalysisAPI();

// Utility functions
export const parseCommand = (input) => {
  const trimmed = input.trim().toUpperCase();
  
  // Simple ticker only
  if (/^[A-Z]{1,5}$/.test(trimmed)) {
    return { ticker: trimmed };
  }
  
  // Ticker with company and/or query
  const parts = input.trim().split(' ');
  if (parts.length >= 2) {
    const ticker = parts[0].toUpperCase();
    const remaining = parts.slice(1).join(' ');
    
    // Try to separate company name from query
    const companyIndicators = ['Inc', 'Corp', 'Corporation', 'Company', 'Ltd', 'Limited', 'Group', 'Holdings', 'Technologies', 'Systems'];
    const hasCompanyIndicator = companyIndicators.some(indicator => 
      remaining.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (hasCompanyIndicator) {
      // Find where company name might end
      let companyEnd = -1;
      for (const indicator of companyIndicators) {
        const index = remaining.toLowerCase().indexOf(indicator.toLowerCase());
        if (index !== -1) {
          companyEnd = Math.max(companyEnd, index + indicator.length);
        }
      }
      
      if (companyEnd !== -1) {
        const company = remaining.slice(0, companyEnd).trim();
        const query = remaining.slice(companyEnd).trim();
        
        return {
          ticker,
          company: company || undefined,
          query: query || undefined
        };
      }
      
      return { ticker, company: remaining };
    }
    
    // Assume it's a query without explicit company name
    return { ticker, query: remaining };
  }
  
  return null;
};

export const getProgressPercentage = (status, progress) => {
  if (status === JobStatus.COMPLETED) return 100;
  if (status === JobStatus.FAILED) return 0;
  if (status === JobStatus.PENDING) return 5;
  if (status === JobStatus.LLM_TIMEOUT) return 75;
  
  // Map progress messages to percentages
  const progressMap = [
    { keywords: ['pipeline', 'initialized'], percentage: 10 },
    { keywords: ['stage: article scraping', 'scraping'], percentage: 25 },
    { keywords: ['stage: article filtering', 'filtering'], percentage: 50 },
    { keywords: ['stage: llm analysis', 'llm analysis', 'analyzing'], percentage: 75 },
    { keywords: ['generating', 'report', 'screening'], percentage: 90 },
    { keywords: ['pipeline session completed', 'completed', 'session', 'finished'], percentage: 100 },
  ];
  
  const lowerProgress = progress?.toLowerCase() || '';
  for (const { keywords, percentage } of progressMap) {
    if (keywords.some(keyword => lowerProgress.includes(keyword))) {
      return percentage;
    }
  }
  
  return status === JobStatus.RUNNING ? 20 : 10;
};

export const getErrorMessage = (error) => {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};
