import { toast } from 'sonner';

/* Hook-friendly API using sonner */
export function useNotify() {
  return {
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    info: (msg: string) => toast.info(msg),
  };
}
