// Security utilities for input validation and sanitization
export class SecurityUtils {
  /**
   * Sanitize text content to prevent XSS
   * @param {string} text - Text to sanitize
   * @returns {string} - Sanitized text
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Validate numeric input within specified bounds
   * @param {number} value - Value to validate
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @param {number} defaultValue - Default value if validation fails
   * @returns {number} - Validated number
   */
  static validateNumber(value, min, max, defaultValue) {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  /**
   * Rate limiting for user actions
   */
  static createRateLimiter(maxCalls, timeWindow) {
    const calls = [];

    return function() {
      const now = Date.now();
      // Remove calls outside the time window
      while (calls.length > 0 && calls[0] < now - timeWindow) {
        calls.shift();
      }

      if (calls.length >= maxCalls) {
        return false; // Rate limit exceeded
      }

      calls.push(now);
      return true; // Action allowed
    };
  }
}

// Create rate limiters for user actions
export const inputRateLimiter = SecurityUtils.createRateLimiter(100, 1000); // 100 calls per second
export const fullscreenRateLimiter = SecurityUtils.createRateLimiter(5, 1000); // 5 fullscreen toggles per second
