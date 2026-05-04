// Real logo, used directly. The PNG comes with its own ivory plate + dark ink.
// On a SLATE background we invert the PNG so the ink becomes ivory and the
// plate dissolves via screen blend.

const LogoImg = ({ width = 780, alt = "The Fitting Room at Gray House — Bridal Alterations & Custom Sewing", style = {} }) => (
  <img
    src="assets/gray-house-logo-ivory.png"
    alt={alt}
    style={{
      display: "block",
      width: width,
      maxWidth: "100%",
      height: "auto",
      ...style,
    }}
  />
);

// Same — for footer / dark-on-dark contexts (kept for API compatibility)
const LogoImgInverted = LogoImg;

window.LogoImg = LogoImg;
window.LogoImgInverted = LogoImgInverted;
window.Logo = LogoImg;
window.LogoMark = LogoImg;

