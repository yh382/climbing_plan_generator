import React from "react";
import { Stack } from "expo-router";
import EditProfileView from "src/features/profile/components/EditProfileView";

export default function EditProfileRoute() {
  return (
    <>
      {/* 关闭系统 header，避免与你 EditProfileView 自带 header 冲突 */}
      <Stack.Screen options={{ headerShown: false }} />
      <EditProfileView />
    </>
  );
}
