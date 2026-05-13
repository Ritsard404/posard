import { ImageResponse } from "next/og";

export const alt = "POSard POS system for checkout, inventory, purchasing, expenses, permissions, and reports";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#071a3d",
          color: "#f8fafc",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: 42,
              fontWeight: 800,
              gap: "18px",
              letterSpacing: 0,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#ffffff",
                borderRadius: 18,
                color: "#1447e6",
                display: "flex",
                height: 64,
                justifyContent: "center",
                width: 64,
              }}
            >
              P
            </div>
            POSard
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 1.02,
              maxWidth: 680,
            }}
          >
            POSard retail POS system
          </div>
          <div
            style={{
              color: "#cbd5e1",
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 680,
            }}
          >
            Checkout, inventory, purchasing, expenses, permissions, and reports for
            Philippine stores, cafes, and service businesses.
          </div>
        </div>
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 34,
            boxShadow: "0 34px 90px rgba(20, 71, 230, 0.28)",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            height: 390,
            padding: 30,
            width: 350,
          }}
        >
          {["Checkout", "Inventory", "Reports"].map((label, index) => (
            <div
              key={label}
              style={{
                alignItems: "center",
                background: index === 0 ? "#dbeafe" : "#e2e8f0",
                borderRadius: 18,
                color: "#0f172a",
                display: "flex",
                fontSize: 28,
                fontWeight: 800,
                height: 86,
                justifyContent: "space-between",
                padding: "0 24px",
              }}
            >
              <span>{label}</span>
              <span style={{ color: "#1447e6" }}>Ready</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
