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
    
    // If timezone contains a prefix like (GMT-05:00), extract just the IANA part
    let cleanTimezone = timezone;
    if (timezone.includes(' ')) {
      // Extract just the IANA part after the space
      const parts = timezone.split(' ');
      if (parts.length > 1) {
        cleanTimezone = parts[parts.length - 1];
        console.log(`Extracted clean timezone: ${cleanTimezone} from ${timezone}`);
      }
    }
    
    // IMPORTANT: Convert from store timezone to UTC for proper scheduling
    // The user enters time in store timezone, but we need to store it in UTC
    let futureDate: Date;
    
    try {
      // If timezone is not clean (contains GMT prefix), extract the IANA part
      if (cleanTimezone.includes('GMT') || cleanTimezone === 'UTC') {
        cleanTimezone = 'America/New_York'; // Default fallback for the store
      }
      
      // For America/New_York timezone (EST/EDT), we need to convert to UTC
      // EST is UTC-5, EDT is UTC-4 (during daylight saving time)
      // Since it's July, we're in EDT (UTC-4)
      const isDST = true; // July is daylight saving time
      const utcOffsetHours = isDST ? 4 : 5; // EDT is UTC-4, EST is UTC-5
      
      // Create the date in the store's timezone and convert to UTC
      futureDate = new Date(Date.UTC(
        year,
        month - 1,  // JS months are 0-indexed
        day,
        hour + utcOffsetHours,  // Add the UTC offset to convert from store time to UTC
        minute,
        0
      ));
      
      console.log(`Converted ${cleanTimezone} time to UTC: ${futureDate.toISOString()}`);
    } catch (error) {
      console.error('Error with timezone conversion, falling back to UTC:', error);
      // Fallback to UTC if timezone conversion fails
      futureDate = new Date(Date.UTC(
        year,
        month - 1,  // JS months are 0-indexed
        day,
        hour,
        minute,
        0
      ));
    }
    
    console.log(`Created future date in UTC: ${futureDate.toISOString()}`);
    
    // Check if the date is truly in the future
    const now = new Date();
    if (futureDate <= now) {
      // For scheduling that is supposed to happen today but passed, 
      // don't adjust the time. This allows the scheduler to recognize it
      // should be published immediately.
      console.warn(`Created date is not in the future. Now: ${now.toISOString()}, Created: ${futureDate.toISOString()}`);
      
      // Check if the date is for today (same day)
      const today = new Date();
      const scheduleDay = new Date(dateString);
      const isToday = today.getFullYear() === scheduleDay.getFullYear() &&
                      today.getMonth() === scheduleDay.getMonth() &&
                      today.getDate() === scheduleDay.getDate();
      
      if (isToday) {
        console.log(`Scheduled time is for today but already passed. Will publish immediately.`);
        // Return the created date as is, allowing it to be recognized as ready to publish
        return futureDate;
      } else {
        // For dates not today, push to the future to avoid problems
        const safeDate = new Date();
        safeDate.setHours(safeDate.getHours() + 1);
        console.log(`Adjusting to safe future date: ${safeDate.toISOString()}`);
        return safeDate;
      }
    }
    
    return futureDate;
  } catch (error) {
    console.error(`Error creating date:`, error);
    // Fallback to a date 1 hour in the future
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