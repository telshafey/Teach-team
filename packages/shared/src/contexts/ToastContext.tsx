import { useToastStore, Toast, ToastType } from "../stores/toastStore";

export type { Toast, ToastType };

export interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
}

export const useToast = (): ToastContextType => {
  const store = useToastStore();
  return store;
};

