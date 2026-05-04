/* =====================================================================
 * BULL CITY SIGNATURE — Durham flag badge + "Powered by" tagline
 * ---------------------------------------------------------------------
 * Drop this into any site you build. It gives you the standard Bull City
 * footer signature: clickable Durham flag (with explainer modal) above
 * a "Powered by Bull City Systems" link.
 *
 * Usage in HTML:
 *   <script type="text/babel" src="bcs-signature.jsx"></script>
 *   <script type="text/babel">
 *     ReactDOM.createRoot(document.getElementById("bcs-sig"))
 *       .render(<BCSignature />);
 *   </script>
 *   <div id="bcs-sig"></div>
 *
 * Usage in React/Next.js:
 *   import { BCSignature } from "./bcs-signature";
 *   <BCSignature />
 *
 * Styling: include bcs-signature.css alongside this file.
 * ===================================================================== */

function BCSignature() {
  const [open, setOpen] = (window.useStateW || React.useState)(false);
  return (
    <React.Fragment>
      <div className="bcs-sig">
        <button
          className="bcs-sig-flag"
          onClick={() => setOpen(true)}
          aria-label="Durham, NC flag — click for meaning"
          title="Durham, NC">
          <DurhamFlag />
        </button>
        <a
          className="bcs-sig-tag"
          href="https://bullcitysystems.com"
          target="_blank"
          rel="noopener noreferrer">
          Powered by <span className="bcs-sig-mark">Bull City Systems</span>
        </a>
      </div>

      {open && (
        <div className="bcs-flag-panel" onClick={() => setOpen(false)}>
          <div className="bcs-flag-panel-inner" onClick={(e) => e.stopPropagation()}>
            <span className="bcs-flag-eyebrow">DURHAM, NC</span>
            <DurhamFlag large />
            <ul className="bcs-flag-meaning">
              <li><span className="bcs-fm-sw" style={{ background: "#1F4A8A" }} />Royal blue — courage</li>
              <li><span className="bcs-fm-sw" style={{ background: "#B83A28" }} />Red — action &amp; progress</li>
              <li><span className="bcs-fm-sw" style={{ background: "#C8932E" }} />Gold — quality in growth</li>
              <li><span className="bcs-fm-sw" style={{ background: "#ECE5D6" }} />White — high ideals</li>
            </ul>
            <p className="bcs-flag-foot">Seven stars · The Pleiades · The New Spirit of Durham</p>
            <button className="bcs-flag-close" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function DurhamFlag({ large }) {
  const w = large ? 240 : 44;
  const h = large ? 156 : 28;
  return (
    <svg width={w} height={h} viewBox="0 0 240 156" className="bcs-flag-svg" aria-hidden="true">
      <rect x="0" y="0" width="150" height="156" fill="#1F4A8A" />
      <rect x="150" y="0"   width="90" height="52" fill="#B83A28" />
      <rect x="150" y="52"  width="90" height="52" fill="#ECE5D6" />
      <rect x="150" y="104" width="90" height="52" fill="#C8932E" />
      <g fill="#ECE5D6">
        <BCSStar cx="55"  cy="50"  r="6" />
        <BCSStar cx="90"  cy="38"  r="5" />
        <BCSStar cx="38"  cy="80"  r="4" />
        <BCSStar cx="80"  cy="78"  r="6" />
        <BCSStar cx="115" cy="68"  r="4" />
        <BCSStar cx="60"  cy="110" r="5" />
        <BCSStar cx="105" cy="115" r="4" />
      </g>
      <rect x="0.5" y="0.5" width="239" height="155" fill="none" stroke="#0B0D11" strokeWidth="1" />
    </svg>
  );
}

function BCSStar({ cx, cy, r }) {
  const CX = parseFloat(cx), CY = parseFloat(cy), R = parseFloat(r);
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : R * 0.42;
    const x = CX + Math.cos(angle) * rad;
    const y = CY + Math.sin(angle) * rad;
    points.push(x.toFixed(2) + "," + y.toFixed(2));
  }
  return <polygon points={points.join(" ")} />;
}

if (typeof window !== "undefined") {
  Object.assign(window, { BCSignature, DurhamFlag, BCSStar });
}
