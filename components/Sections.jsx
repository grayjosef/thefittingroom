// All landing-page sections live here, broken into small components.
// They share the BookingFlow modal via a callback passed from main.

// Helper: do we have enough gallery items to expose nav links to it?
const hasGallery = () => {
  const items = (typeof window !== "undefined" && window.GALLERY_ITEMS) || [];
  return items.length >= 4;
};

const Header = ({ onBook, onMenu }) => (
  <header className="site-header">
    <div className="site-header-inner">
      <div className="nav-brand">
        <a href="#top" aria-label="The Fitting Room at Gray House — Home">
          <LogoImg width={240} />
        </a>
      </div>
      <nav className="nav-primary" aria-label="Primary">
        <a href="#services">Services</a>
        <a href="#about">About</a>
        {hasGallery() && <a href="#gallery">Gallery</a>}
        <a href="#policies">Policies</a>
        <a href="#contact">Contact</a>
      </nav>
      <div className="nav-actions">
        <button className="btn" type="button" onClick={onBook}>Book Consultation</button>
        <button className="mobile-toggle" type="button" aria-label="Open menu" onClick={onMenu}>
          <span /><span /><span />
        </button>
      </div>
    </div>
  </header>
);

const Hero = ({ onBook }) => (
  <section className="hero" id="top">
    <div className="wrap">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="hero-eyebrow eyebrow reveal-up" style={{animationDelay:'40ms'}}><span className="dot" />Stevens Point, Wisconsin · Appointment Only</div>
          <h1 className="h-display hero-h1 reveal-up" style={{animationDelay:'180ms'}}>
            Bridal alterations with the care, precision,<br/>
            <em>and quiet confidence your gown deserves.</em>
          </h1>
          <p className="lede reveal-up" style={{animationDelay:'360ms'}}>
            Private wedding gown fittings and custom sewing by Catherine Gray. Each consultation is
            unhurried, focused, and tailored to the garment in front of us.
          </p>
          <div className="hero-ctas reveal-up" style={{animationDelay:'520ms'}}>
            <button className="btn" type="button" onClick={onBook}>Book a Bridal Consultation</button>
            <a href="#services" className="btn btn-ghost">View Services</a>
          </div>
          <div className="hero-meta reveal-up" style={{animationDelay:'680ms'}}>
            <span>Est. Practice · Forty Years</span>
            <span className="meta-dot">·</span>
            <span>By Appointment</span>
            <span className="meta-dot">·</span>
            <span>Bridal · Custom · Repair</span>
          </div>
        </div>
        <figure className="hero-photo reveal-img">
          <img src="assets/atelier-detail.png" alt="Catherine pinning a wedding gown at the dress form" />
          <figcaption>The Studio · Stevens Point</figcaption>
        </figure>
      </div>
    </div>
  </section>
);

const NowAccepting = () => (
  <section className="accepting">
    <div className="wrap">
      <div className="accepting-card">
        <div className="accepting-eyebrow">
          <span className="dot" />
          <span>Now Accepting · 2026 Season</span>
          <span className="dot" />
        </div>
        <p className="accepting-line">
          The studio is currently accepting <em>bridal gowns</em>, <em>mother of the bride</em>,
          <em> bridesmaid</em>, <em>quinceañera</em>, <em>prom</em>, and other formalwear alterations.
        </p>
        <p className="accepting-foot">
          For all formalwear, please reserve a consultation. Custom sewing inquiries are taken case by case.
        </p>
      </div>
    </div>
  </section>
);

const Trust = () => (
  <section className="trust">
    <div className="wrap">
      <div className="trust-row">
        <div><strong>40+</strong>Years at the Needle</div>
        <div><strong>1:1</strong>Private Fittings</div>
        <div><strong>30 min</strong>Consultations</div>
        <div><strong>By&nbsp;Appt.</strong>Studio Hours</div>
      </div>
    </div>
  </section>
);

const Quiet = () => (
  <section id="quiet">
    <div className="wrap">
      <div className="quiet-head">
        <div className="eyebrow">At Gray House</div>
        <h2 className="h-display quiet-h">
          Quietly refined.<br/>
          <span className="quiet-h-soft">Carefully fitted.</span>
        </h2>
        <p className="lede">
          Your wedding gown does not need noise. It needs skill, patience, and a fitting experience
          that feels calm from the first appointment. At The Fitting Room at Gray House, each
          consultation is private, focused, and tailored to the garment in front of us.
        </p>
      </div>

      <div className="split">
        <div>
          <div className="eyebrow">A trusted hand</div>
          <h3 className="h-display" style={{ marginTop: 14 }}>
            Catherine Gray brings forty years of sewing experience to every gown she touches.
          </h3>
          <p>
            From hems and bustles to detailed fitting adjustments, The Fitting Room at Gray House
            offers private bridal alterations with a steady hand, refined eye, and a deep respect
            for the dress.
          </p>
          <p>
            Brides bring valuable, sentimental garments into this studio. Catherine treats them
            accordingly — with patience, precision, and a quiet confidence earned over decades.
          </p>
        </div>
        <div className="split-art">
          <figure className="atelier-frame">
            <img src="assets/studio-detail.png" alt="Studio detail — linen, pins, and spring branches" />
          </figure>
        </div>
      </div>
    </div>
  </section>
);

const SERVICES = [
  {
    n: "01", title: "Bridal Consultation", feature: true,
    body: "Reserve a private 30-minute consultation to review your gown, discuss fit, evaluate the work needed, and plan your alteration timeline. A $25 booking fee is required and will be applied toward your alterations if you move forward.",
    meta: "30 minutes · $25 booking fee",
  },
  { n: "02", title: "Wedding Dress Hemming",
    body: "Careful length adjustments based on your gown, shoes, venue, and movement needs.",
    meta: "By the gown" },
  { n: "03", title: "Bodice Fitting",
    body: "Refined adjustments through the bodice, waist, straps, or neckline to help your gown feel secure, flattering, and comfortable.",
    meta: "Custom" },
  { n: "04", title: "Taking In · Letting Out",
    body: "Thoughtful fit adjustments to help your gown sit properly while respecting the structure of the garment.",
    meta: "Structural" },
  { n: "05", title: "Bustle Creation",
    body: "Custom bustle planning for movement, reception comfort, and the shape of your gown.",
    meta: "Hand-set" },
  { n: "06", title: "Strap, Sleeve & Neckline",
    body: "Detail-focused adjustments that improve comfort, support, and proportion.",
    meta: "Detail work" },
  { n: "07", title: "Repairs & Finishing Touches",
    body: "Support for loose seams, closures, buttons, hooks, beadwork, and final gown details.",
    meta: "Restorative" },
  { n: "08", title: "Custom Sewing by Request",
    body: "Additional sewing projects may be accepted based on availability and timeline.",
    meta: "By inquiry" },
];

const Services = ({ onBook }) => (
  <section id="services">
    <div className="wrap">
      <div className="section-head">
        <div className="eyebrow">Services</div>
        <h2 className="h-display">A studio practice<br/><em>built around the gown.</em></h2>
        <p>
          Every dress carries its own structure, fabric, timeline, and story. The work below is
          chosen to suit your gown — never the other way around.
        </p>
      </div>

      <div className="svc-grid">
        {SERVICES.map(s => (
          <article key={s.n} className={`svc-card ${s.feature ? "is-feature" : ""}`}>
            <div className="svc-num">{s.n}</div>
            <h3 className="h-display">{s.title}</h3>
            <p>{s.body}</p>
            <div className="svc-meta">{s.meta}</div>
          </article>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 56 }}>
        <button className="btn" type="button" onClick={onBook}>Reserve a Bridal Consultation</button>
      </div>
    </div>
  </section>
);

const About = () => (
  <section id="about">
    <div className="wrap">
      <div className="section-head">
        <div className="eyebrow">About Catherine</div>
        <h2 className="h-display">Decades of skill.<br/><em>One gown at a time.</em></h2>
      </div>

      <div className="about-card">
        <figure className="catherine-portrait">
          <img
            src="assets/catherine-headshot.jpg"
            alt="Catherine Gray, founder of The Fitting Room at Gray House"
            loading="lazy"
          />
        </figure>
        <div>
          <p className="subhead">
            Catherine Gray has spent decades working with fabric, fit, and form.
          </p>
          <p style={{ marginTop: 18 }}>
            Her experience spans bridal alterations, handmade garments, detailed repairs, knitting,
            crochet, and custom sewing. At The Fitting Room at Gray House, each appointment is
            personal, careful, and focused on helping each bride feel confident in the gown they chose.
          </p>
          <p>
            This is patient, hands-on work. Every gown carries its own structure, fabric, timeline,
            and story. Catherine's role is to help the dress fit the bride, not the other way around.
          </p>
          <div className="about-tags">
            <span>Bridal</span><span>Custom Sewing</span><span>Repairs</span><span>Bustles</span><span>Hand-finishing</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Booking = ({ onBook }) => (
  <section className="book" id="book">
    <div className="wrap">
      <div className="section-head">
        <div className="eyebrow">Booking</div>
        <h2 className="h-display">Reserve Your<br/><em>Bridal Consultation</em></h2>
        <p>
          Your consultation reserves private time with Catherine to review your gown, discuss fit,
          evaluate the work needed, and plan your alteration timeline. A $25 booking fee is required
          to hold your appointment and will be applied toward your final alterations bill if you
          choose to move forward with alterations.
        </p>
      </div>

      <div className="book-grid">
        <div className="book-embed">
          <div className="eyebrow">Secure Booking</div>
          <h3 className="stub-h">Calendar &amp; payment open in a private window.</h3>
          <p>Choose your time, share a few details about your gown, and reserve with the $25 booking fee.</p>
          <button className="btn" type="button" onClick={onBook} style={{ marginTop: 12 }}>Book Your Consultation</button>
          <a href="#policies" className="btn-link" style={{ marginTop: 6 }}>Review Booking Policy</a>
          <div className="vendor-row">
            <span>Powered by</span>
            <span className="v-dot" />
            <span>Google Calendar</span>
            <span className="v-dot" />
            <span>Stripe</span>
          </div>
        </div>

        <div className="book-card">
          <div className="eyebrow">Appointment</div>
          <h3 className="h-display" style={{ marginTop: 6 }}>Bridal Consultation</h3>
          <p style={{ marginTop: 12, color: "var(--slate)" }}>
            A private 30-minute appointment with Catherine in the Stevens Point studio.
          </p>
          <ul className="book-list">
            <li><span className="lbl">Length</span><span className="val">30 minutes</span></li>
            <li><span className="lbl">Booking fee</span><span className="val">$25 · plus processing</span></li>
            <li><span className="lbl">Applied toward</span><span className="val">Your final alterations bill</span></li>
            <li><span className="lbl">Reschedule</span><span className="val">One allowed · 24 hr notice</span></li>
            <li><span className="lbl">Confirmation</span><span className="val">Email & calendar invite</span></li>
          </ul>
          <button className="btn" type="button" onClick={onBook} style={{ marginTop: 24, width: "100%" }}>
            Reserve Appointment
          </button>
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--taupe)", letterSpacing: 1.2, marginTop: 14, textAlign: "center" }}>
            Online booking is for new bridal consultations only.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const POLICY_BULLETS = [
  { n: "i.",   t: "$25 booking fee is required to reserve your consultation." },
  { n: "ii.",  t: "Applied toward your final alterations bill if you move forward." },
  { n: "iii.", t: "One reschedule allowed when requested at least 24 hours in advance." },
  { n: "iv.",  t: "Cancellations, missed appointments, or late changes forfeit the fee." },
  { n: "v.",   t: "The appointment is not confirmed until payment is complete." },
];

const Policies = () => (
  <section id="policies">
    <div className="wrap">
      <div className="section-head">
        <div className="eyebrow">Booking Policy</div>
        <h2 className="h-display">Considered, clear,<br/><em>and reserved.</em></h2>
        <p>
          To give each bride focused, private appointment time, consultations are reserved with a
          $25 booking fee.
        </p>
      </div>

      <div className="policy-grid">
        {POLICY_BULLETS.map(b => (
          <div key={b.n} className="policy-cell">
            <div className="num">{b.n}</div>
            <p>{b.t}</p>
          </div>
        ))}
      </div>

      <div className="policy-text">
        <div>
          <div className="eyebrow">Full Policy</div>
          <h3 className="h-display" style={{ marginTop: 10 }}>The fine print, gently.</h3>
          <p style={{ marginTop: 14, color: "var(--taupe)", fontSize: 14 }}>
            Catherine may make exceptions for genuine emergencies at her discretion. The public-facing
            policy below remains the standard.
          </p>
        </div>
        <div className="body">
          <p>
            A $25 booking fee is required to reserve your bridal consultation at The Fitting Room at
            Gray House. This fee holds your appointment time and compensates the studio for reserved
            availability.
          </p>
          <p>
            If you choose to move forward with alterations, your $25 booking fee will be applied
            toward your final alterations bill.
          </p>
          <p>
            Each consultation may be rescheduled one time only. Reschedule requests must be made at
            least 24 hours before the scheduled appointment.
          </p>
          <p>
            Cancellations, missed appointments, dress changes, scheduling conflicts, and reschedule
            requests made within 24 hours of the appointment will result in forfeiture of the booking
            fee. A new booking fee will be required to schedule another consultation.
          </p>
          <p style={{ fontStyle: "italic", color: "var(--slate)" }}>
            By booking an appointment, you acknowledge and agree to this policy.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const Contact = () => {
  const [form, setForm] = React.useState({ name: "", email: "", message: "" });
  const [sent, setSent] = React.useState(false);
  return (
    <section id="contact">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Contact</div>
          <h2 className="h-display">By appointment.<br/><em>By referral.</em></h2>
          <p>
            The Fitting Room at Gray House is available by appointment for bridal consultations and
            custom sewing inquiries in Stevens Point, Wisconsin.
          </p>
        </div>

        <figure className="contact-banner">
          <div className="contact-banner-img">
            <img src="assets/atelier-detail.png" alt="A bridal gown being carefully pinned by hand at the dress form" />
          </div>
          <figcaption className="contact-banner-cap">
            <div className="eyebrow">The Studio</div>
            <p className="contact-banner-quote">
              <span className="open-quote">&ldquo;</span>
              The dress brings its own story.<br/>
              My work is to listen, then <em>fit it gently</em> to yours.
              <span className="close-quote">&rdquo;</span>
            </p>
            <div className="contact-banner-sig">— Catherine Gray</div>
          </figcaption>
        </figure>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-row"><div className="lbl">Studio</div><div className="val">Stevens Point, Wisconsin<br/><span style={{ color: "var(--taupe)" }}>Appointment-only address shared at confirmation</span></div></div>
            <div className="contact-row"><div className="lbl">Email</div><div className="val">inquiry@thefittingroom-gh.com</div></div>
            <div className="contact-row"><div className="lbl">Hours</div><div className="val">Tue – Sat · By appointment</div></div>
            <div className="contact-row"><div className="lbl">Service area</div><div className="val">Stevens Point · Central Wisconsin</div></div>
          </div>

          <div className="contact-card">
            <div className="eyebrow">Inquiries</div>
            <h3 className="h-display" style={{ margin: "8px 0 18px", fontStyle: "italic", fontSize: 26 }}>Send a note</h3>
            {sent ? (
              <div style={{ padding: "32px 0", textAlign: "center", fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--slate)" }}>
                Thank you. Catherine will respond personally within two business days.
              </div>
            ) : (
              <form className="contact-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <label className="fld">
                  <span className="fld-label">Name</span>
                  <input className="ipt" value={form.name} onChange={(e) => setForm({...form, name: e.target.value })} required />
                </label>
                <label className="fld">
                  <span className="fld-label">Email</span>
                  <input className="ipt" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value })} required />
                </label>
                <label className="fld">
                  <span className="fld-label">Message</span>
                  <textarea className="ipt ipt-area" rows="4" value={form.message} onChange={(e) => setForm({...form, message: e.target.value })} required />
                </label>
                <button className="btn" type="submit">Send Inquiry</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="site-footer">
    <div className="wrap foot-top">
      <div className="foot-brand">
        <LogoImgInverted width={220} />
        <div className="signature">Bridal Alterations &amp; Custom Sewing<br/>by Catherine Gray</div>
        <div className="foot-contact">
          <a href="mailto:inquiry@thefittingroom-gh.com" className="foot-email">inquiry@thefittingroom-gh.com</a>
          <div className="foot-loc">Stevens Point, Wisconsin · By appointment</div>
        </div>
      </div>

      <div className="foot-cols">
        <div className="foot-col">
          <h4>Studio</h4>
          <ul>
            <li><a href="#services">Services</a></li>
            <li><a href="#about">About</a></li>
            {hasGallery() && <li><a href="#gallery">Gallery</a></li>}
            <li><a href="#book">Book</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>Policies</h4>
          <ul>
            <li><a href="#policies">Booking Policy</a></li>
            <li><a href="legal/refund.html">Refund &amp; Cancellation</a></li>
            <li><a href="legal/acceptable-use.html">Acceptable Use</a></li>
            <li><a href="legal/accessibility.html">Accessibility</a></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="legal/terms.html">Terms of Service</a></li>
            <li><a href="legal/privacy.html">Privacy Policy</a></li>
            <li><a href="legal/cookies.html">Cookie Notice</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div className="wrap">
      <div className="foot-base">
        <span>© {new Date().getFullYear()} The Fitting Room at Gray House</span>
        <span className="foot-dot" />
        <span>www.thefittingroom-gh.com</span>
        <span className="foot-spacer" />
        <span className="foot-secure">Payments secured by <em>Stripe</em></span>
      </div>
    </div>

    {/* Bull City Systems signature — under everything */}
    <div className="bcs-sig-light" style={{ borderTop: "1px solid rgba(58, 66, 80, 0.12)", marginTop: 12 }}>
      <BCSignature />
    </div>
  </footer>
);

const MobileDrawer = ({ open, onClose, onBook }) => {
  if (!open) return null;
  const close = () => onClose();
  return (
    <div className="m-drawer" onClick={close}>
      <div className="m-drawer-inner" onClick={(e) => e.stopPropagation()}>
        <button className="m-drawer-close" onClick={close} aria-label="Close menu">×</button>
        <a href="#services" onClick={close}>Services</a>
        <a href="#about" onClick={close}>About</a>
        {hasGallery() && <a href="#gallery" onClick={close}>Gallery</a>}
        <a href="#book" onClick={close}>Book Consultation</a>
        <a href="#policies" onClick={close}>Policies</a>
        <a href="#contact" onClick={close}>Contact</a>
        <button className="btn" type="button" onClick={() => { close(); onBook(); }} style={{ marginTop: 12 }}>Reserve Appointment</button>
      </div>
    </div>
  );
};

Object.assign(window, { Header, Hero, NowAccepting, Trust, Quiet, Services, About, Booking, Policies, Contact, Footer, MobileDrawer });
