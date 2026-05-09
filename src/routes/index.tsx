import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * HealthBridge AI lives as a self-contained static site under /public.
 * The TanStack route simply hands off to the static HTML so the live
 * preview shows the real app, and the same files can be uploaded as a
 * standalone HTML/CSS/JS project to GitHub.
 */
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/index.html");
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
      <p>Loading HealthBridge AI…</p>
    </div>
  );
}
