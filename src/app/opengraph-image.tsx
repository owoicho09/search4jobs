import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/landing/mark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Search4Jobs — AI-matched job search";

function JobCard({ title, meta, match }: { title: string; meta: string; match: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 380,
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        background: "white",
        padding: "20px 24px",
        boxShadow: "0 8px 24px rgba(79, 70, 229, 0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#0f172a" }}>{title}</span>
        <span
          style={{
            display: "flex",
            fontSize: 15,
            fontWeight: 600,
            color: "#4f46e5",
            background: "rgba(79,70,229,0.1)",
            padding: "4px 12px",
            borderRadius: 999,
          }}
        >
          {match}
        </span>
      </div>
      <span style={{ marginTop: 6, fontSize: 16, color: "#64748b" }}>{meta}</span>
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#f8fafc",
          padding: 64,
          gap: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <BrandMark size={44} />
            <span style={{ fontSize: 28, fontWeight: 600, color: "#0f172a" }}>Search4Jobs</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#0f172a",
            }}
          >
            Find jobs that fit your skills.
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 24, color: "#475569" }}>
            Real listings. AI-powered matching. Web + Telegram.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 460, gap: 24 }}>
          <div style={{ display: "flex" }}>
            <JobCard title="Frontend Engineer" meta="Remote · Full-time" match="91% match" />
          </div>
          <div style={{ display: "flex", marginLeft: 56 }}>
            <JobCard title="Backend Engineer" meta="Hybrid · Contract" match="78% match" />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
