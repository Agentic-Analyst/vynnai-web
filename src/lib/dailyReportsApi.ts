import { API_BASE_URL } from './apiBase';

export interface CompanyReport {
  id: string;
  ticker: string;
  companyName: string;
  sector?: string;
  reportDate: string;
  reportType: 'daily';
  summary: string;
  status: 'available' | 'generating' | 'failed';
  fileSize?: string;
  lastUpdated: string;
  markdownContent?: string;
  filename?: string;
}

export interface SectorReport {
  id: string;
  sector: string;
  companyCount: number;
  reportDate: string;
  summary: string;
  status: 'available' | 'generating' | 'failed';
  fileSize?: string;
  lastUpdated: string;
  markdownContent?: string;
  filename?: string;
}

// New API Response Types
interface BatchJobResponse {
  batch_id: string;
  total_jobs: number;
  job_ids: string[];
  status: string;
  created_at: string;
  tickers_or_sectors: string[];
  report_type: 'company' | 'sector';
}

interface JobStatus {
  job_id: string;
  status: string;
  progress?: string;
  created_at: string;
  completed_at?: string;
  error?: string;
  ticker?: string;
  report_type?: 'company' | 'sector';
}

interface DailyReportContent {
  filename: string;
  content: string;
  type: 'company' | 'sector';
  ticker?: string;
}

interface MultiReportResponse {
  reports: DailyReportContent[];
  total: number;
  report_type: 'company' | 'sector';
}

export const dailyReportsApi = {
  // ============================================================================
  // GENERATION ENDPOINTS
  // ============================================================================
  
  /**
   * Generate daily reports for multiple companies
   */
  async generateCompanyReports(tickers: string[], timestamp: string): Promise<BatchJobResponse> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/generate/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tickers, timestamp }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate company reports');
    }
    
    return response.json();
  },

  /**
   * Generate daily reports for multiple sectors
   */
  async generateSectorReports(sectors: string[], timestamp: string): Promise<BatchJobResponse> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/generate/sector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sectors, timestamp }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate sector reports');
    }
    
    return response.json();
  },

  // ============================================================================
  // RETRIEVAL ENDPOINTS - MARKDOWN
  // ============================================================================
  
  /**
   * Get single company report markdown
   */
  async getCompanyReportMarkdown(ticker: string, timestamp: string): Promise<DailyReportContent> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/company/${ticker}/markdown?timestamp=${timestamp}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Company report not found for ${ticker}`);
      }
      throw new Error(`Failed to fetch company report: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get multiple company reports markdown
   */
  async getMultipleCompanyReportsMarkdown(tickers: string[], timestamp: string): Promise<MultiReportResponse> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/companies/markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tickers, timestamp }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({ detail: 'No reports found' }));
        throw new Error(`No company reports found for ${timestamp}. ${errorData.detail || 'Please generate reports first.'}`);
      }
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to fetch company reports: ${errorData.detail || response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get single sector report markdown
   */
  async getSectorReportMarkdown(sector: string, timestamp: string): Promise<DailyReportContent> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/sector/${sector}/markdown?timestamp=${timestamp}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Sector report not found for ${sector}`);
      }
      throw new Error(`Failed to fetch sector report: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get multiple sector reports markdown
   */
  async getMultipleSectorReportsMarkdown(sectors: string[], timestamp: string): Promise<MultiReportResponse> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/sectors/markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sectors, timestamp }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({ detail: 'No reports found' }));
        throw new Error(`No sector reports found for ${timestamp}. ${errorData.detail || 'Please generate reports first.'}`);
      }
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to fetch sector reports: ${errorData.detail || response.statusText}`);
    }
    
    return response.json();
  },

  // ============================================================================
  // PDF DOWNLOAD ENDPOINTS
  // ============================================================================
  
  /**
   * Download company report as PDF
   */
  async downloadCompanyReportPDF(ticker: string, timestamp: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/company/${ticker}/pdf?timestamp=${timestamp}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download company report PDF for ${ticker}: ${response.statusText}`);
    }
    
    return response.blob();
  },

  /**
   * Download sector report as PDF
   */
  async downloadSectorReportPDF(sector: string, timestamp: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/sector/${sector}/pdf?timestamp=${timestamp}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download sector report PDF for ${sector}: ${response.statusText}`);
    }
    
    return response.blob();
  },

  // ============================================================================
  // JOB STATUS ENDPOINTS
  // ============================================================================
  
  /**
   * Get individual job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/jobs/${jobId}/status`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch job status');
    }
    
    return response.json();
  },

  /**
   * Get batch job status
   */
  async getBatchStatus(batchId: string): Promise<BatchJobResponse> {
    const response = await fetch(`${API_BASE_URL}/api/daily-reports/batch/${batchId}/status`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch batch status');
    }
    
    return response.json();
  },

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  /**
   * Helper to format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },

  /**
   * Helper to extract sector name from ticker (for UI display)
   */
  extractSectorFromTicker(ticker: string): string {
    // This is a placeholder - you might want to maintain a ticker->sector mapping
    // or fetch this from the stock metadata
    return ticker;
  },
};

