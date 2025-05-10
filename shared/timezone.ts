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
  // Log input parameters
  console.log(`Creating date in timezone: ${timezone} with date: ${dateString} and time: ${timeString}`);
  
  // Parse the date and time components
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  
  console.log(`Parsed components: year=${year}, month=${month}, day=${day}, hour=${hour}, minute=${minute}`);
  
  try {
    // Create an ISO 8601 string that can be parsed to a Date
    // This format works universally across browsers: YYYY-MM-DDTHH:MM:SS
    // We manually zero-pad single-digit months/days/hours/minutes
    const isoDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    console.log(`ISO date string: ${isoDateString}`);
    
    // Create a Date object from the ISO string
    // This will be in local time by default
    const dateObj = new Date(isoDateString);
    
    // For logging/display purposes only
    // Format the date according to the target timezone
    try {
      const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', formatOptions);
      console.log(`Date in ${timezone}: ${formatter.format(dateObj)}`);
      console.log(`Date as ISO string: ${dateObj.toISOString()}`);
    } catch (formatError) {
      console.warn(`Error formatting in timezone ${timezone}:`, formatError);
    }
    
    return dateObj;
  } catch (error) {
    console.error(`Error creating date in timezone ${timezone}:`, error);
    // Fallback to a simpler approach
    const fallbackDate = new Date(year, month - 1, day, hour, minute, 0);
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