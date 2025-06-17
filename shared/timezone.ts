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
    
    // IMPORTANT: For scheduling to work in Shopify, we need to create a proper timezone-aware date
    // Use a simpler, more reliable approach
    
    let futureDate: Date;
    
    try {
      // Create a date object that represents the local time in the target timezone
      // This approach uses the browser's built-in timezone handling
      const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      
      if (cleanTimezone === 'UTC' || !cleanTimezone) {
        // For UTC, create directly
        futureDate = new Date(isoString + 'Z');
      } else {
        // For other timezones, we need to interpret the time as local time in that timezone
        // and convert to UTC. We'll use a different approach:
        
        // Create the date as if it were in UTC first
        const baseDate = new Date(isoString + 'Z');
        
        // Get the current offset for this timezone
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        
        // Create a date formatter for the target timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: cleanTimezone,
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        // Format the current UTC time in the target timezone
        const targetTzString = formatter.format(now);
        const [tzDate, tzTime] = targetTzString.split(', ');
        const [tzYear, tzMonth, tzDay] = tzDate.split('-').map(Number);
        const [tzHour, tzMin] = tzTime.split(':').map(Number);
        
        // Calculate the offset between UTC and target timezone
        const utcDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes());
        const tzLocalDate = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMin);
        const offsetMinutes = (utcDate.getTime() - tzLocalDate.getTime()) / 60000;
        
        // Apply this offset to our target date
        futureDate = new Date(baseDate.getTime() - (offsetMinutes * 60000));
        
        console.log(`Applied timezone offset for ${cleanTimezone}: ${offsetMinutes} minutes`);
      }
    } catch (timezoneError) {
      console.warn(`Failed to create timezone-aware date for ${cleanTimezone}, using UTC:`, timezoneError);
      futureDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
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