/* =====================================================================
 * BULL CITY SIGNATURE, BULL VARIANT (out-of-state)
 * ---------------------------------------------------------------------
 * The signature rule (Joey, 2026-10-29): Durham / North Carolina local
 * businesses carry the Durham flag signature. Anything outside North
 * Carolina carries this variant: the full Bull City Systems bull
 * (broadside, cream with the brass horn) above the "Powered by Bull
 * City Systems" tagline. Both the badge and the tagline link to
 * https://bullcitysystems.com. There is no panel or modal in this
 * variant; the badge itself is the link.
 *
 * The bull image ships with this file as bull-b3-cream.png (full size)
 * and bcs-bull-cream-512.png (web weight). Point BULL_SRC at whichever
 * copy the host site serves.
 *
 * Usage in HTML:
 *   <script type="text/babel" src="bcs-signature.jsx"></script>
 *   <div id="bcs-sig"></div>
 *   (mount <BCSignature /> into #bcs-sig)
 *
 * Usage in React/Next.js:
 *   import { BCSignature } from "./bcs-signature";
 *   <BCSignature />
 *
 * Styling: include bcs-signature.css alongside this file.
 * ===================================================================== */

const BULL_SRC = "assets/bcs-bull-cream.png";

function BCSignature() {
  return (
    <div className="bcs-sig">
      <a
        className="bcs-sig-bull"
        href="https://bullcitysystems.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bull City Systems">
        <img src={BULL_SRC} alt="" width="132" />
      </a>
      <a
        className="bcs-sig-tag"
        href="https://bullcitysystems.com"
        target="_blank"
        rel="noopener noreferrer">
        Powered by <span className="bcs-sig-mark">Bull City Systems</span>
      </a>
    </div>
  );
}

if (typeof window !== "undefined") {
  Object.assign(window, { BCSignature });
}
