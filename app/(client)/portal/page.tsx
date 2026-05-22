import { redirect } from "next/navigation";

export default async function PortalPage() {
  redirect("/portal/quotes");
}
