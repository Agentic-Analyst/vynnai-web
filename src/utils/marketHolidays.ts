/**
 * US Stock Market Holidays
 * This includes NYSE and NASDAQ holidays
 * 
 * Note: These are the standard market holidays. Some holidays that fall on
 * weekends are observed on the nearest weekday.
 */

export interface MarketHoliday {
  date: string; // Format: 'YYYY-MM-DD'
  name: string;
}

/**
 * Get US market holidays for a given year
 * Returns dates in 'YYYY-MM-DD' format
 */
export function getMarketHolidays(year: number): MarketHoliday[] {
  const holidays: MarketHoliday[] = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-07-04`, name: "Independence Day" },
    { date: `${year}-12-25`, name: "Christmas Day" },
  ];

  // Martin Luther King Jr. Day (3rd Monday in January)
  holidays.push({
    date: getNthWeekdayOfMonth(year, 0, 1, 3), // 0 = January, 1 = Monday, 3rd occurrence
    name: "Martin Luther King Jr. Day"
  });

  // Presidents' Day (3rd Monday in February)
  holidays.push({
    date: getNthWeekdayOfMonth(year, 1, 1, 3),
    name: "Presidents' Day"
  });

  // Good Friday (Friday before Easter)
  const easter = getEasterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    date: formatDate(goodFriday),
    name: "Good Friday"
  });

  // Memorial Day (Last Monday in May)
  holidays.push({
    date: getLastWeekdayOfMonth(year, 4, 1), // 4 = May, 1 = Monday
    name: "Memorial Day"
  });

  // Juneteenth (June 19th, observed on nearest weekday if weekend)
  holidays.push({
    date: getObservedHoliday(year, 5, 19), // 5 = June, 19th
    name: "Juneteenth"
  });

  // Labor Day (1st Monday in September)
  holidays.push({
    date: getNthWeekdayOfMonth(year, 8, 1, 1), // 8 = September, 1 = Monday, 1st occurrence
    name: "Labor Day"
  });

  // Thanksgiving Day (4th Thursday in November)
  holidays.push({
    date: getNthWeekdayOfMonth(year, 10, 4, 4), // 10 = November, 4 = Thursday, 4th occurrence
    name: "Thanksgiving Day"
  });

  // Adjust fixed holidays if they fall on weekends
  const adjustedHolidays = holidays.map(holiday => {
    const date = new Date(holiday.date + 'T00:00:00');
    const dayOfWeek = date.getDay();
    
    // If holiday falls on Saturday, observe on Friday
    if (dayOfWeek === 6) {
      date.setDate(date.getDate() - 1);
      return { ...holiday, date: formatDate(date) };
    }
    
    // If holiday falls on Sunday, observe on Monday
    if (dayOfWeek === 0) {
      date.setDate(date.getDate() + 1);
      return { ...holiday, date: formatDate(date) };
    }
    
    return holiday;
  });

  return adjustedHolidays;
}

/**
 * Check if a given date is a market holiday
 */
export function isMarketHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const dateString = formatDate(date);
  const holidays = getMarketHolidays(year);
  
  return holidays.some(holiday => holiday.date === dateString);
}

/**
 * Get the nth occurrence of a weekday in a month
 * @param year - Year
 * @param month - Month (0-11)
 * @param weekday - Day of week (0=Sunday, 1=Monday, etc.)
 * @param n - Nth occurrence (1=first, 2=second, etc.)
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  const date = new Date(year, month, 1);
  let count = 0;
  
  while (date.getMonth() === month) {
    if (date.getDay() === weekday) {
      count++;
      if (count === n) {
        return formatDate(date);
      }
    }
    date.setDate(date.getDate() + 1);
  }
  
  return formatDate(date);
}

/**
 * Get the last occurrence of a weekday in a month
 */
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const date = new Date(year, month + 1, 0); // Last day of month
  
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }
  
  return formatDate(date);
}

/**
 * Calculate Easter Sunday using the Anonymous Gregorian algorithm
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month, day);
}

/**
 * Get observed holiday date (adjust for weekends)
 */
function getObservedHoliday(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  
  // If Saturday, observe on Friday
  if (dayOfWeek === 6) {
    date.setDate(date.getDate() - 1);
  }
  // If Sunday, observe on Monday
  else if (dayOfWeek === 0) {
    date.setDate(date.getDate() + 1);
  }
  
  return formatDate(date);
}

/**
 * Format date as 'YYYY-MM-DD'
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
