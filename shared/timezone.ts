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

    // Modern approach: Use a proper timezone-aware date creation
    // Create a date in the store's local timezone and convert to UTC properly
    
    // Step 1: Create a "fake" UTC date with the local time components
    const localTimeAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    
    // Step 2: Find out what time this would be displayed as in the target timezone
    const timeInTargetZone = new Intl.DateTimeFormat('en-CA', {
      timeZone: cleanTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(localTimeAsUTC);
    
    // Step 3: Find what time this same moment would be in UTC
    const timeInUTC = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(localTimeAsUTC);
    
    console.log(`Target timezone time: ${timeInTargetZone}`);
    console.log(`UTC time: ${timeInUTC}`);
    
    // Step 4: Calculate the difference and adjust
    const targetMatch = timeInTargetZone.match(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/);
    const utcMatch = timeInUTC.match(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/);
    
    if (targetMatch && utcMatch) {
      // Parse target timezone time
      const targetTime = new Date(`${targetMatch[1]}-${targetMatch[2]}-${targetMatch[3]}T${targetMatch[4]}:${targetMatch[5]}:${targetMatch[6]}Z`);
      // Parse UTC time  
      const utcTime = new Date(`${utcMatch[1]}-${utcMatch[2]}-${utcMatch[3]}T${utcMatch[4]}:${utcMatch[5]}:${utcMatch[6]}Z`);
      
      // Calculate the timezone offset
      const offsetMs = utcTime.getTime() - targetTime.getTime();
      
      // Apply offset to get the correct UTC time for the desired local time
      const correctUTCTime = new Date(localTimeAsUTC.getTime() - offsetMs);
      
      console.log(`Created scheduled date (timezone corrected): ${correctUTCTime.toISOString()}`);
      return correctUTCTime;
    }
    
    // Fallback: treat input as UTC
    console.log(`Created scheduled date (UTC fallback): ${localTimeAsUTC.toISOString()}`);
    return localTimeAsUTC;
    
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