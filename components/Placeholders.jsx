// Refined striped placeholder blocks (no fake bridal stock photos).
// Monospace caption explains what would go there in production.

const Placeholder = ({ label = "imagery", ratio = "4 / 5", tone = "ivory", caption }) => {
  const tones = {
    ivory:    { bg: "#EFE9DF", stripe: "#E4DCCE", text: "#7A7167" },
    silver:   { bg: "#E2DED6", stripe: "#D4CFC4", text: "#6E6A62" },
    slate:    { bg: "#3A4250", stripe: "#434B59", text: "#C9C4BC" },
    taupe:    { bg: "#CFC6B7", stripe: "#C2B8A8", text: "#5C5346" },
  };
  const t = tones[tone] || tones.ivory;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        background: `repeating-linear-gradient(135deg, ${t.bg}, ${t.bg} 14px, ${t.stripe} 14px, ${t.stripe} 15px)`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{
        position: "absolute", inset: 14,
        border: `1px solid ${t.stripe}`,
      }} />
      <div style={{
        textAlign: "center",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: 1.4,
        color: t.text,
        textTransform: "uppercase",
        padding: "0 24px",
        lineHeight: 1.6,
      }}>
        <div>{label}</div>
        {caption && <div style={{ marginTop: 6, opacity: 0.7, textTransform: "none", letterSpacing: 0.2, fontSize: 10 }}>{caption}</div>}
      </div>
    </div>
  );
};

window.Placeholder = Placeholder;
