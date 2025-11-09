import { toast } from 'sonner';

/**
 * Centralized error handling utility
 */

export interface ErrorContext {
  operation: string;
  userId?: string;
  details?: any;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * User-friendly error messages in Arabic
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication
  'auth/invalid-credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'auth/user-not-found': 'المستخدم غير موجود',
  'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
  'auth/weak-password': 'كلمة المرور ضعيفة جداً',
  'auth/invalid-email': 'البريد الإلكتروني غير صالح',
  'auth/too-many-requests': 'محاولات كثيرة جداً. حاول لاحقاً',
  'auth/network-error': 'خطأ في الاتصال. تحقق من الإنترنت',
  
  // Database
  'db/connection-failed': 'فشل الاتصال بقاعدة البيانات',
  'db/query-failed': 'فشل تنفيذ العملية',
  'db/not-found': 'البيانات غير موجودة',
  'db/duplicate': 'البيانات موجودة مسبقاً',
  
  // Network
  'network/timeout': 'انتهت مهلة الاتصال',
  'network/offline': 'لا يوجد اتصال بالإنترنت',
  'network/server-error': 'خطأ في الخادم. حاول لاحقاً',
  
  // Validation
  'validation/required': 'هذا الحقل مطلوب',
  'validation/invalid-format': 'التنسيق غير صحيح',
  'validation/too-short': 'القيمة قصيرة جداً',
  'validation/too-long': 'القيمة طويلة جداً',
  
  // File Operations
  'file/upload-failed': 'فشل رفع الملف',
  'file/too-large': 'حجم الملف كبير جداً',
  'file/invalid-type': 'نوع الملف غير مدعوم',
  
  // Generic
  'unknown': 'حدث خطأ غير متوقع',
  'permission-denied': 'ليس لديك صلاحية لهذه العملية',
  'rate-limit': 'تم تجاوز الحد المسموح. حاول لاحقاً',
};

/**
 * Handle errors with user-friendly messages
 */
export function handleError(error: any, context?: ErrorContext): string {
  console.error('[Error Handler]', {
    error,
    context,
    stack: error?.stack,
  });

  // Log to external service (PostHog, Sentry, etc.) if available
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('app_error', {
      error: error?.message,
      code: error?.code,
      context,
      stack: error?.stack,
    });
  }

  // Determine error message
  let userMessage = ERROR_MESSAGES['unknown'];

  if (error?.code && ERROR_MESSAGES[error.code]) {
    userMessage = ERROR_MESSAGES[error.code];
  } else if (error?.message) {
    // Try to extract known error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('password')) {
      userMessage = ERROR_MESSAGES['auth/weak-password'];
    } else if (message.includes('email')) {
      userMessage = ERROR_MESSAGES['auth/invalid-email'];
    } else if (message.includes('network') || message.includes('fetch')) {
      userMessage = ERROR_MESSAGES['network/offline'];
    } else if (message.includes('timeout')) {
      userMessage = ERROR_MESSAGES['network/timeout'];
    } else if (message.includes('not found')) {
      userMessage = ERROR_MESSAGES['db/not-found'];
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      userMessage = ERROR_MESSAGES['permission-denied'];
    }
  }

  return userMessage;
}

/**
 * Show error toast with proper formatting
 */
export function showErrorToast(error: any, context?: ErrorContext) {
  const message = handleError(error, context);
  
  toast.error(message, {
    description: context?.operation ? `العملية: ${context.operation}` : undefined,
    duration: 5000,
  });
}

/**
 * Async operation wrapper with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const errorMessage = handleError(error, context);
    showErrorToast(error, context);
    return { data: null, error: errorMessage };
  }
}

/**
 * Retry logic for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.log(`[Retry] Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}
