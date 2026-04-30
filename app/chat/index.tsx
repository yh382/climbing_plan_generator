import { Redirect } from "expo-router";

export default function ChatIndexRedirect() {
  return <Redirect href={"/inbox?section=conversations" as any} />;
}
