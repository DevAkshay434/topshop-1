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
      // Use date-fns-tz for proper timezone conversion regardless of store timezone
      const { zonedTimeToUtc } = require('date-fns-tz');
      
      // Create a date string in ISO format for the store timezone
      const dateTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      console.log(`Creating datetime string: ${dateTimeString} in timezone: ${cleanTimezone}`);
      
      // Convert from store timezone to UTC
      futureDate = zonedTimeToUtc(dateTimeString, cleanTimezone);
      console.log(`Converted ${cleanTimezone} time to UTC: ${futureDate.toISOString()}`);
      
      // Fallback using manual UTC offset calculation if date-fns-tz fails
    } catch (error) {
      console.warn(`Failed to use date-fns-tz for timezone conversion: ${error.message}`);
      console.log(`Falling back to manual timezone offset calculation`);
      
      // If date-fns-tz fails, use Intl.DateTimeFormat for timezone offset
      const timeZoneOffset = getTimezoneOffset(cleanTimezone);
      
      futureDate = new Date(Date.UTC(
        year,
        month - 1,  // JS months are 0-indexed
        day,
        hour + timeZoneOffset,  // Add the UTC offset to convert from store time to UTC
        minute,
        0
      ));
      
      console.log(`Converted ${cleanTimezone} time to UTC using offset ${timeZoneOffset}: ${futureDate.toISOString()}`);
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

/**
 * Get the timezone offset in hours for a given IANA timezone
 * 
 * @param timezone The IANA timezone string (e.g., 'America/New_York')
 * @returns The offset in hours to add to local time to get UTC
 */
export function getTimezoneOffset(timezone: string): number {
  try {
    // Create a date object for the current time in the specified timezone
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    
    // Get the time in the specified timezone
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
    
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    
    // Create a date object from the timezone-specific components
    const localTime = new Date(year, month - 1, day, hour, minute, second);
    
    // Calculate the offset in hours
    const offset = (utcTime - localTime.getTime()) / (1000 * 60 * 60);
    
    console.log(`Timezone ${timezone} offset: ${offset} hours`);
    return Math.round(offset);
  } catch (error) {
    console.error(`Error calculating timezone offset for ${timezone}:`, error);
    return 0; // Fallback to UTC if calculation fails
  }
}