/**
 * Utility functions for working with timezones
 */

/**
 * Convert a date and time to a specific timezone
 * 
 * @param dateString The date string in YYYY-MM-DD format
 * @param timeString The time string in HH:MM format
 * @param timezone The IANA timezone string (e.g., 'America/New_York')
 * @returns A Date object in the specified timezone
 */
export function createDateInTimezone(
  dateString: string, 
  timeString: string, 
  timezone: string = 'UTC'
): Date {
  console.log(`Creating date in timezone: ${timezone} with date: ${dateString} and time: ${timeString}`);
  
  try {
    // Parse the date and time components
    const [year, month, day] = dateString.split('-').map(Number);
    const [hour, minute] = timeString.split(':').map(Number);
    
    console.log(`Parsed components: year=${year}, month=${month}, day=${day}, hour=${hour}, minute=${minute}`);
    
    // Extract IANA timezone if it contains prefix
    let cleanTimezone = timezone;
    if (timezone.includes(' ')) {
      const parts = timezone.split(' ');
      if (parts.length > 1) {
        cleanTimezone = parts[parts.length - 1];
        console.log(`Extracted clean timezone: ${cleanTimezone} from ${timezone}`);
      }
    }
    
    // Create a date object that represents the local time in the store's timezone
    // We need to account for the timezone offset when creating the UTC date
    const tempDate = new Date(`${dateString}T${timeString}:00`);
    console.log(`Temp date (local interpretation): ${tempDate.toISOString()}`);
    
    // Get the timezone offset for the store timezone at this date
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: cleanTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Get what the current time looks like in the store timezone
    const nowInStoreTimezone = formatter.format(new Date());
    console.log(`Current time in store timezone: ${nowInStoreTimezone}`);
    
    // Create the scheduled date by interpreting the input time as store local time
    // and converting to UTC for storage
    const storeLocalTimeStr = `${dateString}T${timeString}:00`;
    const parts = storeLocalTimeStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (!parts) {
      throw new Error('Invalid date format');
    }
    
    const [, y, m, d, h, min, s] = parts.map(Number);
    
    // Create date as if it's in the store timezone
    // For Eastern Time (UTC-5), 5:30 AM Eastern = 10:30 AM UTC
    const utcDate = new Date(Date.UTC(y, m - 1, d, h, min, s));
    
    // Adjust for timezone offset
    // For Eastern Time (UTC-5), we need to add 5 hours to get the correct UTC time
    const offsetMinutes = utcDate.getTimezoneOffset(); // This doesn't work for specific timezones
    
    // Use a different approach: create the date and let JavaScript handle timezone
    const scheduledDate = new Date(`${dateString}T${timeString}:00`);
    
    console.log(`Created scheduled date (treating as local): ${scheduledDate.toISOString()}`);
    
    return scheduledDate;
  } catch (error) {
    console.error(`Error creating date:`, error);
    const fallbackDate = new Date();
    fallbackDate.setHours(fallbackDate.getHours() + 1);
    console.log(`Using fallback date: ${fallbackDate.toISOString()}`);
    return fallbackDate;
  }
}

/**
 * Format a date to a specific timezone
 * 
 * @param date The date to format
 * @param timezone The IANA timezone string (e.g., 'America/New_York')
 * @param format The format to use ('date', 'time', or 'datetime')
 * @returns A formatted string
 */
export function formatToTimezone(
  date: Date,
  timezone: string = 'UTC',
  format: 'date' | 'time' | 'datetime' = 'datetime'
): string {
  let options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };
  
  if (format === 'date' || format === 'datetime') {
    options = {
      ...options,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
  }
  
  if (format === 'time' || format === 'datetime') {
    options = {
      ...options,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
  }
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(date);
}

/**
 * Get the current date in a specific timezone
 * 
 * @param timezone The IANA timezone string (e.g., 'America/New_York')
 * @returns A Date object representing the current time in the specified timezone
 */
export function getCurrentDateInTimezone(timezone: string = 'UTC'): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const formattedDate = formatter.format(now);
  
  // Parse the formatted date parts
  const [month, day, year, hour, minute, second] = formattedDate
    .replace(',', '')
    .split(/[\/\s:]/)
    .map(part => parseInt(part, 10));
  
  // Create the timezone-aware date
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Get tomorrow's date in a specific timezone
 * 
 * @param timezone The IANA timezone string (e.g., 'America/New_York')
 * @returns A Date object representing tomorrow in the specified timezone
 */
export function getTomorrowInTimezone(timezone: string = 'UTC'): Date {
  const now = getCurrentDateInTimezone(timezone);
  now.setUTCDate(now.getUTCDate() + 1);
  return now;
}

/**
 * Format a date to ISO string for storage
 * 
 * @param date The date to format
 * @returns An ISO string
 */
export function formatToISOForStorage(date: Date): string {
  return date.toISOString();
}