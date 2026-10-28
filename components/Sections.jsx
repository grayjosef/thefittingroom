// All landing-page sections live here, broken into small components.
// They share the BookingFlow modal via a callback passed from main.

// Helper: do we have enough gallery items to expose nav links to it?
const hasGallery = () => {
  const items = (typeof window !== "undefined" && window.GALLERY_ITEMS) || [];
  return items.length >= 4;
};

const NeedleIcon = ({ open }) => (
  <svg className="needle-ico" width="44" height="26" viewBox="0 0 44 26" fill="none" aria-hidden="true">
    <path d="M7 20.5 L34 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <ellipse cx="32.2" cy="6.5" rx="2.6" ry="1.05" transform="rotate(-29 32.2 6.5)" stroke="currentColor" strokeWidth="1" />
    <path className="needle-thread" d={open ? "M32.6 6.8 C 37 9, 38 13, 33 15.5 S 18 17, 4 15.5" : "M32.6 6.8 C 40 11, 36 18, 28 18.5 S 12 15, 4 23"} stroke="var(--blush)" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const Header = ({ onBook, onMenu, menuOpen }) => (
  <header className="site-header">
    <div className="site-header-inner">
      <div className="nav-brand">
        <a href="#top" aria-label="The Fitting Room at Gray House, home">
          <LogoImg width={240} />
        </a>
      </div>
      <div />
      <div className="nav-actions">
        <button className="btn" type="button" onClick={onBook}>Book Consultation</button>
        <button
          className={`needle-btn ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen ? "true" : "false"}
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
        >
          <NeedleIcon open={menuOpen} />
          <span className="needle-lbl">{menuOpen ? "Close" : "Menu"}</span>
        </button>
      </div>
    </div>
  </header>
);

const Hero = ({ onBook }) => (
  <section className="hero bleed bleed-left" id="top">
    <figure className="bleed-art reveal-img">
      <img src="assets/atelier-detail.png" alt="Catherine pinning a wedding gown at the dress form" />
    </figure>
    <div className="wrap">
      <div className="bleed-copy hero-copy">
        <div className="hero-eyebrow eyebrow reveal-up" style={{animationDelay:'40ms'}}><span className="dot" />Stevens Point, Wisconsin · Appointment Only</div>
        <h1 className="h-display hero-h1 reveal-up" style={{animationDelay:'180ms'}}>
          Bridal alterations with the care, precision,
          <em> and quiet confidence your gown deserves.</em>
        </h1>
        <div className="dot-rule reveal-up" style={{animationDelay:'300ms'}} />
        <p className="lede reveal-up" style={{animationDelay:'380ms'}}>
          Private wedding gown fittings and custom sewing by Catherine Gray. Each consultation is
          unhurried, focused, and tailored to the garment in front of us.
        </p>
        <div className="hero-ctas reveal-up" style={{animationDelay:'520ms'}}>
          <button className="btn" type="button" onClick={onBook}>Book a Bridal Consultation</button>
          <a href="#services" className="btn btn-ghost">View Services</a>
        </div>
        <p className="hero-accepting reveal-up" style={{animationDelay:'640ms'}}>
          <span className="eyebrow">Now accepting</span>
          Bridal gowns, mother of the bride, bridesmaid, quinceañera, prom, and other formalwear.
        </p>
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
  <section id="quiet" className="bleed bleed-right">
    <figure className="bleed-art">
      <img src="assets/studio-detail.png" alt="Studio detail: linen, pins, and spring branches" loading="lazy" />
    </figure>
    <div className="wrap">
      <div className="bleed-copy quiet-copy">
        <div className="eyebrow">At Gray House</div>
        <h2 className="h-display quiet-h">
          Quietly refined.
          <span className="quiet-h-soft">Carefully fitted.</span>
        </h2>
        <div className="dot-rule" />
        <p className="lede">
          Your wedding gown does not need noise. It needs skill, patience, and a fitting experience
          that feels calm from the first appointment.
        </p>
        <p>
          Catherine Gray brings forty years of sewing experience to every gown she touches. From hems
          and bustles to detailed fitting adjustments, each consultation is private, focused, and
          tailored to the garment in front of us.
        </p>
      </div>
    </div>
  </section>
);

const SERVICES = [
  { n: "02", title: "Hemming",
    body: "Careful length adjustments based on your gown, your shoes, your venue, and how you will move through the day." },
  { n: "03", title: "Bodice",
    body: "Refined fitting through the bodice and waist so the gown feels secure, flattering, and comfortable from ceremony to last dance." },
  { n: "04", title: "Bustle",
    body: "A custom bustle planned around the shape of your gown, the weight of the train, and comfort at the reception." },
  { n: "05", title: "Adjustments",
    body: "Taking in or letting out, plus straps, sleeves, and neckline. Every change respects the structure of the garment." },
  { n: "06", title: "Repairs & Finishing",
    body: "Loose seams, closures, buttons, hooks, beadwork, and the final details that make a gown feel complete." },
  { n: "07", title: "Sewing by Fiat",
    body: "Custom sewing that begins with an idea. Catherine takes on a small number of these commissions by inquiry, based on availability and timeline." },
];

const Services = ({ onBook }) => {
  const [open, setOpen] = React.useState(0);
  return (
    <section id="services">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Services</div>
          <h2 className="h-display">A studio practice <em>built around the gown.</em></h2>
          <p>
            Every dress carries its own structure, fabric, timeline, and story. The work is
            chosen to suit your gown, never the other way around.
          </p>
        </div>

        <div className="svc-layout">
          <article className="svc-feature">
            <div className="svc-num">01</div>
            <h3 className="h-display">Bridal Consultation</h3>
            <p>
              A private 30-minute appointment to review your gown, discuss fit, evaluate the work
              needed, and plan your alteration timeline.
            </p>
            <dl className="svc-feature-dl">
              <div><dt>Length</dt><dd>30 minutes</dd></div>
              <div><dt>Booking fee</dt><dd>$25, applied to your alterations</dd></div>
            </dl>
            <button className="btn" type="button" onClick={onBook}>Reserve a Consultation</button>
          </article>

          <div className="svc-acc">
            {SERVICES.map((s, i) => {
              const isOpen = open === i;
              return (
                <div key={s.n} className={`svc-item ${isOpen ? "is-open" : ""}`}>
                  <button type="button" className="svc-item-btn" aria-expanded={isOpen ? "true" : "false"} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span className="n">{s.n}</span>
                    <span className="t">{s.title}</span>
                    <span className="svc-plus" aria-hidden="true" />
                  </button>
                  <div className="svc-item-body"><div><p>{s.body}</p></div></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const About = () => (
  <section id="about" className="bleed bleed-left">
    <figure className="bleed-art">
      <img src="assets/catherine-headshot.jpg" alt="Catherine Gray, founder of The Fitting Room at Gray House" loading="lazy" />
    </figure>
    <div className="wrap">
      <div className="bleed-copy about-copy">
        <div className="eyebrow">About Catherine</div>
        <h2 className="h-display">Decades of skill. <em>One gown at a time.</em></h2>
        <div className="dot-rule" />
        <p className="subhead">Catherine Gray has spent decades working with fabric, fit, and form.</p>
        <p>
          Her experience spans bridal alterations, handmade garments, detailed repairs, knitting,
          crochet, and custom sewing. At The Fitting Room at Gray House, each appointment is
          personal, careful, and focused on helping each bride feel confident in the gown she chose.
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
          <div className="eyebrow">How it works</div>
          <ol className="book-steps">
            <li><span className="book-step-n">01</span><span>Choose a date and time that suits you.</span></li>
            <li><span className="book-step-n">02</span><span>Share a few details about your gown and your wedding date.</span></li>
            <li><span className="book-step-n">03</span><span>Reserve with the $25 booking fee. Confirmation arrives by email with a calendar invite.</span></li>
          </ol>
          <div className="book-actions">
            <button className="btn" type="button" onClick={onBook}>Book Your Consultation</button>
            <a href="#policies" className="btn-link">Review booking policy</a>
          </div>
          <p className="book-secure">Secure checkout by Stripe.</p>
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
          <p className="book-note">Online booking is for new bridal consultations only.</p>
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
  /* GH-WIRE: real delivery via /api/contact, with the designed success state
     preserved. Falls back to the original optimistic behaviour offline. */
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSendError("");
    const api = typeof window !== "undefined" ? window.GH : null;
    if (!api) { setSendError("Our form isn't reaching us right now. Please email inquiry@thefittingroom-gh.com directly."); return; }

    setSending(true);
    try {
      const res = await api.sendInquiry(form);
      if (res === null) {
        setSendError("Our form isn't reaching us right now. Please email inquiry@thefittingroom-gh.com directly.");
      } else {
        setSent(true);
      }
    } catch (err) {
      setSendError(err.message || "That didn't send. Please email inquiry@thefittingroom-gh.com.");
    } finally {
      setSending(false);
    }
  };

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
            <img
              src="assets/contact-bride.jpg"
              alt="A bride in soft window light on her wedding day"
              loading="lazy"
              onError={(e) => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = "1"; e.currentTarget.src = "assets/studio-detail.png"; } }}
            />
          </div>
          <figcaption className="contact-banner-cap">
            <div className="eyebrow">The Studio</div>
            <p className="contact-banner-quote">
              <span className="open-quote">&ldquo;</span>
              The dress brings its own story.<br/>
              My work is to listen, then <em>fit it gently</em> to yours.
              <span className="close-quote">&rdquo;</span>
            </p>
            <div className="contact-banner-sig">Catherine Gray</div>
          </figcaption>
        </figure>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-row"><div className="lbl">Studio</div><div className="val">Stevens Point, Wisconsin<br/><span style={{ color: "var(--taupe)" }}>Appointment-only address shared at confirmation</span></div></div>
            <div className="contact-row"><div className="lbl">Email</div><div className="val">inquiry@thefittingroom-gh.com</div></div>
            <div className="contact-row"><div className="lbl">Hours</div><div className="val">Tue - Sat · By appointment</div></div>
            <div className="contact-row"><div className="lbl">Service area</div><div className="val">Stevens Point · Central Wisconsin</div></div>
          </div>

          <div className="contact-card">
            <div className="eyebrow">Inquiries</div>
            <h3 className="h-display contact-form-h">Send a note</h3>
            {sent ? (
              <div style={{ padding: "32px 0", textAlign: "center", fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--slate)" }}>
                Thank you. Catherine will respond personally within two business days.
              </div>
            ) : (
              <form className="contact-form" onSubmit={submit}>
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
                {/* Honeypot , hidden from people, irresistible to bots. */}
                <input
                  type="text" name="company" tabIndex="-1" autoComplete="off"
                  value={form.company || ""} onChange={(e) => setForm({...form, company: e.target.value })}
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                  aria-hidden="true"
                />
                {sendError && <p className="contact-error" role="alert">{sendError}</p>}
                <button className="btn" type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send Inquiry"}
                </button>
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
          <a href="https://maps.app.goo.gl/mRDyFrcpMZS1H8BP9"
             target="_blank" rel="noopener noreferrer" className="foot-google">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            Find us on Google
          </a>
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

    {/* Bull City Systems signature, under everything */}
    <div className="bcs-sig-light" style={{ borderTop: "1px solid rgba(58, 66, 80, 0.12)", marginTop: 12 }}>
      <BCSignature />
    </div>
  </footer>
);

const MobileDrawer = ({ open, onClose, onBook }) => {
  const close = () => onClose();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <aside className={`m-drawer ${open ? "is-open" : ""}`} aria-hidden={open ? "false" : "true"} aria-label="Site menu">
      <div className="m-seam" aria-hidden="true">
        <span className="m-seam-stitch" />
        <span className="m-seam-needle">
          <svg width="12" height="46" viewBox="0 0 12 46" fill="none"><path d="M6 44 L6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><ellipse cx="6" cy="6.5" rx="1.1" ry="3" stroke="currentColor" strokeWidth="1" /></svg>
        </span>
      </div>
      <div className="m-drawer-head">
        <span className="m-drawer-title">Menu</span>
        <button className="m-drawer-close" type="button" onClick={close} aria-label="Close menu">×</button>
      </div>
      <nav className="m-drawer-nav">
        <a href="#services" onClick={close}>Services</a>
        <a href="#about" onClick={close}>About</a>
        {hasGallery() && <a href="#gallery" onClick={close}>Gallery</a>}
        <a href="#book" onClick={close}>Booking</a>
        <a href="#policies" onClick={close}>Policies</a>
        <a href="#contact" onClick={close}>Contact</a>
      </nav>
      <div className="m-drawer-foot">
        <button className="btn" type="button" onClick={() => { close(); onBook(); }}>Reserve Appointment</button>
        <div className="m-drawer-inq">
          <span className="eyebrow">Inquiries</span>
          <a className="m-drawer-mail" href="mailto:inquiry@thefittingroom-gh.com">inquiry@thefittingroom-gh.com</a>
        </div>
      </div>
    </aside>
  );
};

Object.assign(window, { Header, Hero, NowAccepting, Trust, Quiet, Services, About, Booking, Policies, Contact, Footer, MobileDrawer });
