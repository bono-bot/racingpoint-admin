import { toast as sonnerToast } from 'sonner';

/**
 * Backward-compatible wrapper around sonner.
 * Existing pages use: const { toast } = useToast(); toast('msg', 'success');
 * This shim maps that to sonner's API.
 * New code should import { toast } from 'sonner' directly.
 */
export function useToast() {
  return {
    toast: (message: string, type?: 'success' | 'error' | 'info') => {
      switch (type) {
        case 'success':
          sonnerToast.success(message);
          break;
        case 'error':
          sonnerToast.error(message);
          break;
        default:
          sonnerToast.info(message);
          break;
      }
    },
  };
}
