import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { getSession, destroySession } from "~/lib/session.server";

export async function loader() {
  return redirect("/");
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/admin-login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
