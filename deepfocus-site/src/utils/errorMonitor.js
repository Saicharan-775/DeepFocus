// DeepFocus Web App Error Monitoring & Metrics Framework
// Configuration entry points for Sentry, Logtail, or PostHog integration

const IS_PRODUCTION = false;

const errorMonitor = {
  logError: (error, context = {}) => {
    const errorDetails = {
      message: error?.message || String(error),
      stack: error?.stack || '',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        environment: IS_PRODUCTION ? 'production' : 'development',
        platform: 'web-app'
      }
    };

    console.error("[DeepFocus Web Error]", errorDetails);

    if (IS_PRODUCTION) {
      // Connect to Sentry or Better Stack Logtail here:
      // Sentry.captureException(error, { extra: context });
    }
  },

  logMetric: (metricName, value = 1, tags = {}) => {
    const metricPayload = {
      metric: metricName,
      value,
      tags: {
        ...tags,
        timestamp: new Date().toISOString(),
        environment: IS_PRODUCTION ? 'production' : 'development'
      }
    };

    console.info(`[DeepFocus Web Metric] ${metricName}:`, metricPayload);

    if (IS_PRODUCTION) {
      // Dispatch telemetry payload to PostHog or custom API endpoints:
      // postHog.capture(metricName, metricPayload);
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorMonitor.logError(event.error || event.message, { type: 'unhandled_error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorMonitor.logError(event.reason, { type: 'unhandled_rejection' });
  });
}

export default errorMonitor;
