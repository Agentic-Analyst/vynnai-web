// Seed alert examples derived from `alert_example.md` attachment
// These are dev-only example alerts for local/demo usage.
export const alertExamples = [
  {
    id: 'example-robinhood-2025-10-29',
    type: 'critical',
    title: 'Robinhood stock falls after earnings top forecast, company announces CFO transition',
    message: 'Robinhood shares dropped 7% despite beating Q3 earnings and revenue forecasts. EPS $0.61 vs $0.53 forecast; revenue rose 100% YoY to $1.27B driven by crypto. Company announced CFO transition effective Q1 2026.',
    affectedSymbols: ['HOOD'],
    timestamp: '2025-10-29T09:30:00.000Z',
    impact: 'high',
    category: 'Earnings',
    read: false,
    sourceUrl: 'https://finance.yahoo.com/news/robinhood-stock-falls-after-earnings-top-forecast-company-announces-cfo-transition-150601973.html'
  },

  {
    id: 'example-apple-m5-2025-10',
    type: 'info',
    title: 'Apple unleashes M5, the next big leap in AI performance for Apple silicon',
    message: 'Apple introduced the M5 chip with significant GPU AI compute improvements (4× vs M4) and up to 45% better graphics. Targeted for MacBook Pro, iPad Pro and Apple Vision Pro, with emphasis on energy efficiency.',
    affectedSymbols: ['AAPL'],
    timestamp: '2025-10-15T12:00:00.000Z',
    impact: 'low',
    category: 'Product',
    read: false,
    sourceUrl: 'https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/'
  },

  {
    id: 'example-reddit-2025-10',
    type: 'warning',
    title: 'Reddit stock tumbles on concerns over declining user engagement',
    message: 'Reddit shares fell 11% after data showed declining DAUs and reduced ChatGPT citations; indexing changes by Google also reduced visibility for Reddit content.',
    affectedSymbols: ['RDDT'],
    timestamp: '2025-10-20T08:00:00.000Z',
    impact: 'medium',
    category: 'User Engagement',
    read: false,
    sourceUrl: 'https://finance.yahoo.com/news/cramer-believes-reddit-valuable-institution-093404773.html'
  },

  {
    id: 'example-openai-nvidia-2025',
    type: 'critical',
    title: 'OpenAI and NVIDIA announce strategic partnership to deploy 10 gigawatts of NVIDIA systems',
    message: 'OpenAI and NVIDIA announced a partnership to deploy 10GW of NVIDIA systems across AI data centers, with large hardware investments and joint optimizations for next-gen model scaling.',
    affectedSymbols: ['NVDA', 'MSFT', 'ORCL'],
    timestamp: '2025-10-05T10:00:00.000Z',
    impact: 'high',
    category: 'Infrastructure',
    read: false,
    sourceUrl: 'https://nvidianews.nvidia.com/news/openai-and-nvidia-announce-strategic-partnership-to-deploy-10gw-of-nvidia-systems'
  },

  {
    id: 'example-fed-rate-2025-10-29',
    type: 'warning',
    title: 'Fed cuts rates again, but Powell raises doubts about easing at next meeting',
    message: 'The Fed reduced the federal funds rate and ended QT, but Chair Powell cautioned that a December cut is not guaranteed; inflation remains above target at 3%.',
    affectedSymbols: [],
    timestamp: '2025-10-29T14:00:00.000Z',
    impact: 'medium',
    category: 'Macro',
    read: false,
    sourceUrl: 'https://www.cnbc.com/2025/10/29/fed-rate-decision-october-2025.html'
  }
];

export default alertExamples;
