"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>
      {/* Header fixo no topo com z-index alto */}
      <Header />

      {/* Estrutura inferior posicionada abaixo do Header */}
      <div style={{ display: "flex", flex: 1, marginTop: "60px", width: "100%" }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: "270px",
            width: "calc(100% - 270px)",
            padding: "1.5rem",
            boxSizing: "border-box",
            minHeight: "calc(100vh - 60px)",
            backgroundColor: "var(--bg-main, #f8fafc)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}