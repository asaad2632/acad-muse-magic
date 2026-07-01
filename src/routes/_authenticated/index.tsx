import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import App from "../../App.jsx";

function ClientApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "#f8fafc" }} />;
  return <App />;
}

export const Route = createFileRoute("/_authenticated/")({
  component: ClientApp,
});
