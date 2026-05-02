// System PHPicker wrapper. Replaces the custom 700-line
// device-media-picker.tsx full-screen RN picker.
//
// expo-image-picker on iOS 14+ uses PHPickerViewController under the
// hood — runs cross-process so it doesn't require photo library
// permission, and keeps user selection order via PHPicker's
// .ordered configuration (exposed as `orderedSelection: true`).

import * as ImagePicker from 'expo-image-picker';
import type { PickedMediaItem } from '@/features/community/types';

export interface PickMediaOptions {
  /** Max items user can select. Default 10. */
  maxSelect?: number;
  /** 'images' | 'videos' | 'all'. Default 'all'. */
  mediaType?: 'images' | 'videos' | 'all';
  /** Max video duration in seconds. */
  videoMaxDuration?: number;
}

export async function pickMediaFromLibrary({
  maxSelect = 10,
  mediaType = 'all',
  videoMaxDuration,
}: PickMediaOptions = {}): Promise<PickedMediaItem[]> {
  const mediaTypes: ImagePicker.MediaType[] =
    mediaType === 'images'
      ? ['images']
      : mediaType === 'videos'
      ? ['videos']
      : ['images', 'videos'];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes,
    allowsMultipleSelection: maxSelect > 1,
    selectionLimit: maxSelect,
    orderedSelection: true, // iOS 15+: preserves selection click order
    quality: 1, // R2 upload pipeline does compression downstream
    videoMaxDuration,
    exif: false,
  });

  if (result.canceled) return [];

  return result.assets.map<PickedMediaItem>((a) => ({
    id: a.assetId ?? a.uri,
    uri: a.uri,
    mediaType: a.type === 'video' ? 'video' : 'image',
    width: a.width,
    height: a.height,
    duration: a.duration ? a.duration / 1000 : undefined, // ms → seconds
  }));
}
