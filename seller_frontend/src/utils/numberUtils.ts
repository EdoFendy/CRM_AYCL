/**
 * Safely converts any value to a number, handling various edge cases
 * @param value - The value to convert to a number
 * @returns A valid number (0 if conversion fails)
 */
export function safeToNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  
  if (typeof value === 'string') {
    // Handle empty string
    if (value.trim() === '') {
      return 0;
    }
    
    // Remove any non-numeric characters except decimal point and minus
    const cleaned = value.replace(/[^\d.-]/g, '');
    
    // Handle empty result after cleaning
    if (cleaned === '' || cleaned === '-') {
      return 0;
    }
    
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  
  // For other types, try direct conversion
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Safely sums an array of values, converting each to a number
 * @param values - Array of values to sum
 * @returns The sum of all valid numbers
 */
export function safeSum(values: unknown[]): number {
  return values.reduce((sum, value) => sum + safeToNumber(value), 0);
}

/**
 * Formats a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: 'EUR')
 * @param locale - The locale (default: 'it-IT')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number, 
  currency: string = 'EUR', 
  locale: string = 'it-IT'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
