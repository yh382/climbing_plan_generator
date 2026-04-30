import { Redirect } from "expo-router";

export default function CommunityNotificationsRedirect() {
  return <Redirect href={"/inbox?section=activity" as any} />;
}
