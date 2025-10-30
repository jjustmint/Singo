type PreviewListener = (payload?: { source?: string }) => void;

class PreviewBus {
  private listeners = new Set<PreviewListener>();

  emit(payload?: { source?: string }) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.warn('previewBus listener error', err);
      }
    });
  }

  addListener(listener: PreviewListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const previewBus = new PreviewBus();
