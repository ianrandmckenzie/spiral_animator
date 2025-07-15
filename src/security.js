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
   * Validate and sanitize CSS property values
   * @param {string} property - CSS property name
   * @param {string} value - CSS property value
   * @returns {string|null} - Validated CSS value or null if invalid
   */
  static validateCSSValue(property, value) {
    // Whitelist of allowed CSS properties and safe patterns
    const allowedProperties = new Map([
      ['transform', /^(rotate|scale|translate|skew)\([^)]{1,50}\)(\s+(rotate|scale|translate|skew)\([^)]{1,50}\)){0,3}$/],
      ['opacity', /^[0-9]{1,3}\.?[0-9]{0,3}$/],
      ['left', /^-?[0-9]{1,6}\.?[0-9]{0,3}(px|%|em|rem)$/],
      ['top', /^-?[0-9]{1,6}\.?[0-9]{0,3}(px|%|em|rem)$/],
      ['width', /^[0-9]{1,6}\.?[0-9]{0,3}(px|%|em|rem)$/],
      ['height', /^[0-9]{1,6}\.?[0-9]{0,3}(px|%|em|rem)$/]
    ]);

    const pattern = allowedProperties.get(property);
    if (!pattern) {
      return null;
    }

    if (!pattern.test(value)) {
      return null;
    }

    return value;
  }

  /**
   * Validate URL to ensure it's safe
   * @param {string} url - URL to validate
   * @returns {boolean} - True if URL is safe
   */
  static validateURL(url) {
    try {
      const urlObj = new URL(url);
      // Only allow https and data protocols
      return urlObj.protocol === 'https:' || urlObj.protocol === 'data:';
    } catch {
      return false;
    }
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

// Enhanced error handling for security
class SecureErrorHandler {
  static handle(error, context = 'Unknown') {
    // Log error details for debugging (but not sensitive info)
    console.error(`[${context}] Error occurred:`, {
      message: error.message,
      timestamp: new Date().toISOString(),
      context: context
    });

    // Don't expose internal error details to users
    const userMessage = this.getSafeErrorMessage(error, context);

    // Show user-friendly error message
    this.showUserError(userMessage);
  }

  static getSafeErrorMessage(error, context) {
    // Map internal errors to safe user messages using Map for security
    const errorMap = new Map([
      ['fullscreen', 'Unable to enter fullscreen mode. Please try again.'],
      ['input', 'Invalid input value. Please check your entry.'],
      ['animation', 'Animation error occurred. Resetting to defaults.'],
      ['storage', 'Unable to save preferences. Settings will not persist.'],
      ['default', 'An unexpected error occurred. Please refresh the page.']
    ]);

    return errorMap.get(context) || errorMap.get('default');
  }

  static showUserError(message) {
    // Create a safe error display
    const toast = document.getElementById('fullscreenToast');
    if (toast) {
      toast.textContent = SecurityUtils.sanitizeText(message);
      toast.classList.add('show', 'error');

      setTimeout(() => {
        toast.classList.remove('show', 'error');
      }, 5000);
    }
  }
}

// Export for use in main.js
window.SecureErrorHandler = SecureErrorHandler;
