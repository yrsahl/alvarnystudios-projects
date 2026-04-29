import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("project/:slug", "routes/project.tsx"),
  route("admin", "routes/admin/layout.tsx", [
    index("routes/admin/index.tsx"),
    route("new", "routes/admin/new.tsx"),
  ]),
  route("admin-login", "routes/admin-login.tsx"),
  route("auth/logout", "routes/auth/logout.tsx"),
] satisfies RouteConfig;
