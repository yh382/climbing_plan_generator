// Simple module-level bridge to pass selected image URI
// from library.tsx back to EditProfileView without navigation params.

type PendingImage = { uri: string; target: "avatar" | "cover" } | null;

let _pending: PendingImage = null;

export const setPendingImage = (img: PendingImage) => {
  _pending = img;
};

export const consumePendingImage = () => {
  const result = _pending;
  _pending = null;
  return result;
};
