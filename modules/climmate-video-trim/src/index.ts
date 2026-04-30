import { requireOptionalNativeModule } from "expo-modules-core";

interface ClimmateVideoTrimNative {
  /**
   * Trim a video file between startSec and endSec.
   * Returns the URI of the trimmed video in the app's temp directory.
   */
  trim(inputUri: string, startSec: number, endSec: number): Promise<string>;
}

const ClimmateVideoTrim =
  requireOptionalNativeModule<ClimmateVideoTrimNative>("ClimmateVideoTrim");

export default ClimmateVideoTrim;
