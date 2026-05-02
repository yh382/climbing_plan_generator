import { requireOptionalNativeModule } from "expo-modules-core";

export type UploadActivityStatus =
  | "compressing"
  | "uploading"
  | "success"
  | "error";

interface ClimmateUploadActivityNative {
  start: (label: string) => Promise<void>;
  update: (progress: number, status: UploadActivityStatus) => Promise<void>;
  end: (finalStatus: "success" | "error") => Promise<void>;
  endAll: () => Promise<void>;
}

const ClimmateUploadActivity =
  requireOptionalNativeModule<ClimmateUploadActivityNative>(
    "ClimmateUploadActivity",
  );

export default ClimmateUploadActivity;
