// Module-level callback for passing attachment selection back from
// select-session/select-plan pages to create.tsx via router.back()

type WidgetItem = {
  id: string;
  type: 'plan' | 'session' | 'log';
  title: string;
  subtitle: string;
};

let _callback: ((item: WidgetItem) => void) | null = null;

export function setAttachmentCallback(cb: ((item: WidgetItem) => void) | null) {
  _callback = cb;
}

export function fireAttachmentCallback(item: WidgetItem) {
  _callback?.(item);
  _callback = null;
}
