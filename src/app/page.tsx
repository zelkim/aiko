import { ChatLayout } from "@/components/chat/ChatLayout";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="h-screen overflow-hidden">
      <ChatLayout
        user={{ name: session.user.name, image: session.user.image }}
      />
    </main>
  );
}
