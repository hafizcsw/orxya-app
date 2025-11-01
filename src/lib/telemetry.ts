import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'

// Initialize Sentry (only if DSN is provided)
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (dsn) {
    try {
      Sentry.init({
        dsn,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      })
      console.log('✅ Sentry initialized')
    } catch (e) {
      console.warn('⚠️ Sentry init failed:', e)
    }
  } else {
    console.info('ℹ️ Sentry DSN not provided - skipping init')
  }
}

// Initialize PostHog (only if key is provided)
export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (key) {
    try {
      posthog.init(key, {
        api_host: 'https://app.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
      })
      console.log('✅ PostHog initialized')
    } catch (e) {
      console.warn('⚠️ PostHog init failed:', e)
    }
  } else {
    console.info('ℹ️ PostHog key not provided - skipping init')
  }
}

// Track custom events
export function trackEvent(name: string, properties?: Record<string, any>) {
  try {
    if (import.meta.env.VITE_POSTHOG_KEY) {
      posthog.capture(name, properties)
    }
  } catch (e) {
    console.warn('⚠️ Failed to track event:', name, e)
  }
}

// Track page views
export function trackPageView(path: string) {
  trackEvent('page_view', { path })
}
