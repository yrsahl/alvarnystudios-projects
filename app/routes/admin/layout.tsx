import { Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { requireAdmin } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

export default function AdminLayout() {
  return <Outlet />;
}
