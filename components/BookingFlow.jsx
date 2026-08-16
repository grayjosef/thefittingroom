// Multi-step booking flow — calendar slot, intake form, payment screen, confirmation.
//
// The layout, copy and class names here are the Claude Design export and should
// keep matching it. What has been added is data plumbing, marked GH-WIRE, which
// talks to window.GH (scripts/gh-booking.js) for real availability and payment.
//
// Every GH-WIRE block degrades: if the API isn't reachable, this falls back to
// the original designed placeholder behaviour so the export still demos alone.

const { useState, useMemo, useEffect, useRef, useCallback } = React;

// ---------- helpers ----------
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S","M","T","W","T","F","S"];

function buildMonthDays(year, monthIdx) {
  const first = new Date(year, monthIdx, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIdx, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isSelectable(date, todayMidnight) {
  if (!date) return false;
  if (date < todayMidnight) return false;
  const dow = date.getDay();
  // Catherine takes consultations Tue–Sat
  if (dow === 0 || dow === 1) return false;
  return true;
}

function fakeSlotsFor(date) {
  if (!date) return [];
  const dow = date.getDay();
  const base = ["10:00 AM","10:30 AM","11:00 AM","1:00 PM","1:30 PM","2:00 PM","3:00 PM","3:30 PM","4:00 PM"];
  // Saturdays: morning-only
  if (dow === 6) return ["9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM"];
  // Pseudorandom: mark a couple as taken using the date as a seed
  const seed = (date.getDate() * 7 + date.getMonth() * 13) % base.length;
  return base.filter((_, i) => i !== seed && i !== (seed + 3) % base.length);
}

/* GH-WIRE: local date key, matching the API's day format. */
function dayKey(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// ---------- pieces ----------
const Stepper = ({ step }) => {
  const labels = ["Select time", "Your details", "Reserve", "Confirmed"];
  return (
    <div className="bk-stepper">
      {labels.map((l, i) => (
        <React.Fragment key={l}>
          <div className={`bk-step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}>
            <span className="bk-step-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="bk-step-label">{l}</span>
          </div>
          {i < labels.length - 1 && <div className={`bk-step-rule ${i < step ? "is-done" : ""}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

const Calendar = ({ value, onChange, openDays }) => {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const cells = useMemo(() => buildMonthDays(view.y, view.m), [view]);

  /* GH-WIRE: ask the API which days in this month still have openings. */
  useEffect(() => {
    if (openDays && openDays.load) openDays.load(view.y, view.m);
  }, [view, openDays]);

  const goPrev = () => {
    const d = new Date(view.y, view.m - 1, 1);
    if (d < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const goNext = () => {
    const d = new Date(view.y, view.m + 1, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={goPrev} aria-label="Previous month">‹</button>
        <div className="cal-title">
          <span className="cal-month">{MONTH_NAMES[view.m]}</span>
          <span className="cal-year">{view.y}</span>
        </div>
        <button type="button" className="cal-nav" onClick={goNext} aria-label="Next month">›</button>
      </div>

      <div className="cal-dow">
        {DOW.map((d, i) => <div key={i} className="cal-dow-cell">{d}</div>)}
      </div>

      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell is-empty" />;
          let sel = isSelectable(d, todayMidnight);
          /* GH-WIRE: a real calendar overrides the weekday rule of thumb. */
          if (sel && openDays && openDays.days) {
            const count = openDays.days[dayKey(d)];
            if (count !== undefined) sel = count > 0;
          }
          const isSelected = value && d.getTime() === value.getTime();
          return (
            <button
              key={i}
              type="button"
              className={`cal-cell ${sel ? "is-open" : "is-closed"} ${isSelected ? "is-selected" : ""}`}
              disabled={!sel}
              onClick={() => sel && onChange(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <p className="cal-foot">Consultations are offered Tuesday through Saturday.</p>
    </div>
  );
};

const Slots = ({ date, value, onChange, slots, loading }) => {
  if (!date) {
    return <div className="slots-empty">Select a date to view available consultation times.</div>;
  }
  if (loading) {
    return <div className="slots-empty">Checking the studio calendar…</div>;
  }
  if (!slots || slots.length === 0) {
    return <div className="slots-empty">No openings on this date. Please choose another.</div>;
  }
  return (
    <div className="slots">
      <div className="slots-head">
        <span className="slots-eyebrow">Available — 30 min</span>
        <span className="slots-date">{date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
      </div>
      <div className="slots-grid">
        {slots.map(s => (
          <button
            key={s.label}
            type="button"
            className={`slot ${value === s.label ? "is-selected" : ""}`}
            onClick={() => onChange(s)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------- form ----------
const Field = ({ label, hint, children, span = 6 }) => (
  <label className={`fld fld-span-${span}`}>
    <span className="fld-label">{label}</span>
    {children}
    {hint && <span className="fld-hint">{hint}</span>}
  </label>
);

const IntakeForm = ({ data, setData }) => {
  const upd = (k) => (e) => setData({ ...data, [k]: e.target ? e.target.value : e });
  return (
    <div className="form-grid">
      <Field label="Full name" span={6}>
        <input className="ipt" value={data.name} onChange={upd("name")} placeholder="First and last" />
      </Field>
      <Field label="Email" span={6}>
        <input className="ipt" type="email" value={data.email} onChange={upd("email")} placeholder="you@email.com" />
      </Field>
      <Field label="Phone" span={6}>
        <input className="ipt" value={data.phone} onChange={upd("phone")} placeholder="(715) 000-0000" />
      </Field>
      <Field label="Wedding date" span={6}>
        <input className="ipt" type="date" value={data.weddingDate} onChange={upd("weddingDate")} />
      </Field>

      <Field label="Has the dress already been purchased?" span={6}>
        <div className="seg">
          {["Yes","No","Not yet"].map(v => (
            <button key={v} type="button" className={`seg-opt ${data.purchased === v ? "is-on" : ""}`} onClick={() => setData({ ...data, purchased: v })}>{v}</button>
          ))}
        </div>
      </Field>
      <Field label="Dress designer or shop" hint="If known" span={6}>
        <input className="ipt" value={data.designer} onChange={upd("designer")} placeholder="e.g. Monique Lhuillier, BHLDN…" />
      </Field>

      <Field label="Where was the dress purchased?" hint="Optional" span={12}>
        <input className="ipt" value={data.shop} onChange={upd("shop")} placeholder="Boutique or retailer" />
      </Field>

      <Field label="Type of work needed" span={12}>
        <div className="chips">
          {["Hemming","Bodice fitting","Taking in / letting out","Bustle","Straps & sleeves","Neckline","Repairs","Custom","Not sure yet"].map(c => {
            const on = data.work.includes(c);
            return (
              <button key={c} type="button" className={`chip ${on ? "is-on" : ""}`} onClick={() => {
                setData({ ...data, work: on ? data.work.filter(x => x !== c) : [...data.work, c] });
              }}>{c}</button>
            );
          })}
        </div>
      </Field>

      <Field label="Timeline concerns" hint="Tight schedule, travel, etc." span={12}>
        <input className="ipt" value={data.timeline} onChange={upd("timeline")} placeholder="Anything Catherine should know about timing" />
      </Field>

      <Field label="Notes for Catherine" span={12}>
        <textarea className="ipt ipt-area" rows="4" value={data.notes} onChange={upd("notes")} placeholder="Anything you'd like to share before your consultation." />
      </Field>
    </div>
  );
};

// ---------- payment screen ----------
const money = (cents) => `$${(cents / 100).toFixed(2)}`;

const PaymentScreen = ({ summary, agree, setAgree, onPay, paying, pricing, live, mountRef, error }) => (
  <div className="pay">
    <div className="pay-summary">
      <h4 className="pay-title">Reservation summary</h4>
      <dl className="pay-dl">
        <div><dt>Appointment</dt><dd>Bridal Consultation · 30 min</dd></div>
        <div><dt>With</dt><dd>Catherine Gray</dd></div>
        <div><dt>Date</dt><dd>{summary.dateLabel}</dd></div>
        <div><dt>Time</dt><dd>{summary.time}</dd></div>
        <div><dt>For</dt><dd>{summary.name || "—"}</dd></div>
      </dl>

      <div className="pay-rule" />

      <dl className="pay-dl pay-money">
        <div><dt>Booking fee</dt><dd>{money(pricing.feeCents)}</dd></div>
        <div><dt>Processing</dt><dd>{money(pricing.processingCents)}</dd></div>
        <div className="pay-total"><dt>Total today</dt><dd>{money(pricing.totalCents)}</dd></div>
      </dl>
      <p className="pay-fineprint">
        Your {money(pricing.feeCents)} booking fee reserves your appointment time and will be applied toward your final alterations bill if you choose to move forward with alterations.
      </p>
    </div>

    <div className="pay-form">
      <div className="pay-vendor">
        <span className="pay-lock">●</span>
        <span>Secure checkout · Stripe</span>
      </div>

      {/* GH-WIRE: when Stripe is configured, its Payment Element (which includes
          Link) mounts here in place of the designed placeholder inputs. */}
      {live ? (
        <div className="pay-element" ref={mountRef} />
      ) : (
        <React.Fragment>
          <Field label="Card number" span={12}>
            <input className="ipt" placeholder="1234 1234 1234 1234" disabled />
          </Field>
          <div className="form-grid">
            <Field label="Expiry" span={6}><input className="ipt" placeholder="MM / YY" disabled /></Field>
            <Field label="CVC" span={6}><input className="ipt" placeholder="CVC" disabled /></Field>
            <Field label="ZIP" span={6}><input className="ipt" placeholder="54481" disabled /></Field>
            <Field label="Country" span={6}>
              <select className="ipt" disabled><option>United States</option></select>
            </Field>
          </div>
          <p className="pay-note">Card payment isn't switched on yet — reserving will hold your time without charge.</p>
        </React.Fragment>
      )}

      <label className="agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I understand that my {money(pricing.feeCents)} booking fee reserves my appointment and will be applied toward my final alterations bill if I move forward with alterations. I understand the booking fee is non-refundable if I cancel, miss my appointment, or fail to reschedule at least 24 hours in advance. I may reschedule one time only if requested at least 24 hours before my appointment.
        </span>
      </label>

      {error && <p className="pay-error" role="alert">{error}</p>}

      <button type="button" className="btn btn-primary btn-lg" disabled={!agree || paying} onClick={onPay}>
        {paying ? "Reserving…" : live ? `Pay ${money(pricing.totalCents)} & reserve appointment` : "Reserve appointment"}
      </button>
      <p className="pay-note">The appointment is not confirmed until payment is complete.</p>
    </div>
  </div>
);

// ---------- confirmation ----------
const Confirmation = ({ summary, onClose, reference, calendarFailed, emailLive }) => {
  const ref = reference || "GH-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  /* GH-WIRE: only promise an email when one can actually be sent. */
  const sub = emailLive
    ? `A confirmation has been sent to ${summary.email || "your email"}. Catherine will reach out personally if any details need adjusting.`
    : `Catherine will be in touch personally to confirm the details with you.`;
  return (
    <div className="confirm">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="26" fill="none" stroke="#A8A39A" strokeWidth="1" />
        <path d="M17 29 l8 8 l16 -18" fill="none" stroke="#3A4250" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3 className="confirm-title">Your consultation is reserved.</h3>
      <p className="confirm-sub">{sub}</p>

      <div className="confirm-card">
        <div className="confirm-row"><span>Reference</span><strong>{ref}</strong></div>
        <div className="confirm-row"><span>Date</span><strong>{summary.dateLabel}</strong></div>
        <div className="confirm-row"><span>Time</span><strong>{summary.time}</strong></div>
        <div className="confirm-row"><span>Duration</span><strong>30 minutes</strong></div>
        <div className="confirm-row"><span>Studio</span><strong>By appointment · Stevens Point, WI</strong></div>
      </div>

      {calendarFailed && (
        <p className="confirm-sub">
          Your payment went through and your time is reserved. Catherine will confirm the
          calendar invitation with you directly.
        </p>
      )}

      <div className="confirm-actions">
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" type="button" onClick={onClose}>Done</button>
      </div>
    </div>
  );
};

// ---------- main ----------
const DEFAULT_PRICING = { feeCents: 2500, processingCents: 105, totalCents: 2605 };

const BookingFlow = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [data, setData] = useState({
    name: "", email: "", phone: "", weddingDate: "",
    purchased: "", designer: "", shop: "",
    work: [], timeline: "", notes: "",
  });
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);

  /* GH-WIRE: everything below is integration state. */
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [openDayMap, setOpenDayMap] = useState(null);
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [emailLive, setEmailLive] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const payMountRef = useRef(null);

  const api = typeof window !== "undefined" ? window.GH : null;

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* GH-WIRE: pick up the real fee from the server so the copy can't drift. */
  useEffect(() => {
    if (!open || !api) return;
    api.probe().then((health) => {
      if (!health) return;
      if (health.booking) {
        setPricing({
          feeCents: health.booking.feeCents,
          processingCents: health.booking.processingCents,
          totalCents: health.booking.totalCents,
        });
      }
      setEmailLive(Boolean(health.integrations && health.integrations.email));
    }).catch(() => {});
  }, [open, api]);

  /* GH-WIRE: month availability, used to close days the studio isn't free. */
  const loadMonth = useCallback((year, monthIdx) => {
    if (!api) return;
    api.monthAvailability(year, monthIdx).then((res) => {
      if (res && res.days) setOpenDayMap((prev) => ({ ...(prev || {}), ...res.days }));
    }).catch(() => {});
  }, [api]);

  const openDays = useMemo(() => ({ days: openDayMap, load: loadMonth }), [openDayMap, loadMonth]);

  /* GH-WIRE: real times for the chosen day, falling back to the design's. */
  useEffect(() => {
    let cancelled = false;
    if (!date) { setSlots([]); return; }

    const fallback = () => fakeSlotsFor(date).map((label) => ({ label, startIso: null }));

    if (!api) { setSlots(fallback()); return; }

    setSlotsLoading(true);
    api.slotsFor(date)
      .then((res) => {
        if (cancelled) return;
        setSlots(res === null ? fallback() : res.map((s) => ({ label: s.label, startIso: s.startIso })));
      })
      .catch(() => { if (!cancelled) setSlots(fallback()); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });

    return () => { cancelled = true; };
  }, [date, api]);

  if (!open) return null;

  const summary = {
    dateLabel: date ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—",
    time: slot ? slot.label : "—",
    name: data.name,
    email: data.email,
  };

  const canStep0 = Boolean(date && slot);
  const canStep1 = Boolean(data.name && data.email && data.phone);
  const paymentLive = Boolean(booking && booking.clientSecret && booking.publishableKey);

  /* GH-WIRE: details -> payment. Holds the slot, saves the intake, opens a
     PaymentIntent, then mounts the Payment Element. */
  const goToPayment = async () => {
    setError("");

    if (!api || !slot || !slot.startIso) {
      setStep(2);   // no backend: the design's placeholder screen
      return;
    }

    setAdvancing(true);
    try {
      const held = await api.hold(slot.startIso);
      const created = await api.createBooking({
        holdId: held && held.hold ? held.hold.id : "",
        startIso: slot.startIso,
        name: data.name,
        email: data.email,
        phone: data.phone,
        weddingDate: data.weddingDate,
        purchased: data.purchased,
        designer: data.designer,
        shop: data.shop,
        work: data.work,
        timeline: data.timeline,
        notes: data.notes,
      });

      setBooking(created);
      setStep(2);

      if (created && created.clientSecret) {
        // Wait for the step-2 markup to exist before mounting into it.
        requestAnimationFrame(() => {
          api.mountPayment(payMountRef.current, {
            clientSecret: created.clientSecret,
            publishableKey: created.publishableKey,
          }).catch(() => setError("The card form couldn't load. Please refresh and try again."));
        });
      }
    } catch (err) {
      setError(err.message || "We couldn't hold that time. Please pick another.");
    } finally {
      setAdvancing(false);
    }
  };

  /* GH-WIRE: take payment, then confirm server-side. */
  const handlePay = async () => {
    setError("");

    if (!api) {                       // design-only fallback
      setPaying(true);
      setTimeout(() => { setPaying(false); setStep(3); }, 1100);
      return;
    }

    setPaying(true);
    try {
      const result = await api.payAndFinalize(booking);
      setConfirmed(result || null);
      setStep(3);
    } catch (err) {
      setError(err.message || "That payment didn't go through. You have not been charged.");
    } finally {
      setPaying(false);
    }
  };

  const reset = () => {
    if (api) api.reset();
    setStep(0); setDate(null); setSlot(null); setAgree(false);
    setBooking(null); setConfirmed(null); setError(""); setSlots([]);
    setData({ name:"", email:"", phone:"", weddingDate:"", purchased:"", designer:"", shop:"", work:[], timeline:"", notes:"" });
    onClose();
  };

  const back = () => {
    setError("");
    if (step === 0) return reset();
    if (step === 2 && api) api.unmountPayment();
    setStep(step - 1);
  };

  return (
    <div className="bk-overlay" role="dialog" aria-modal="true" aria-label="Reserve a bridal consultation">
      <div className="bk-shell">
        <header className="bk-shell-head">
          <div className="bk-eyebrow">Reserve a Bridal Consultation</div>
          <button className="bk-close" type="button" onClick={reset} aria-label="Close">×</button>
        </header>

        <Stepper step={step} />

        <div className="bk-body">
          {step === 0 && (
            <div className="bk-twocol">
              <div className="bk-col">
                <h3 className="bk-h">Choose a date</h3>
                <Calendar value={date} onChange={setDate} openDays={openDays} />
              </div>
              <div className="bk-col">
                <h3 className="bk-h">Choose a time</h3>
                <Slots date={date} value={slot ? slot.label : ""} onChange={setSlot} slots={slots} loading={slotsLoading} />
                <aside className="bk-aside">
                  <div className="bk-aside-row"><span>Appointment</span><span>Bridal Consultation</span></div>
                  <div className="bk-aside-row"><span>Length</span><span>30 minutes</span></div>
                  <div className="bk-aside-row"><span>Booking fee</span><span>{money(pricing.feeCents)} + processing</span></div>
                  <div className="bk-aside-row"><span>Reschedule</span><span>1 allowed · 24 hr notice</span></div>
                </aside>
              </div>
            </div>
          )}

          {step === 1 && <IntakeForm data={data} setData={setData} />}

          {step === 2 && (
            <PaymentScreen
              summary={summary}
              agree={agree}
              setAgree={setAgree}
              onPay={handlePay}
              paying={paying}
              pricing={pricing}
              live={paymentLive}
              mountRef={payMountRef}
              error={error}
            />
          )}

          {step === 3 && (
            <Confirmation
              summary={summary}
              onClose={reset}
              reference={confirmed && confirmed.reference}
              calendarFailed={Boolean(confirmed && confirmed.calendarFailed)}
              emailLive={emailLive}
            />
          )}
        </div>

        {step < 3 && (
          <footer className="bk-shell-foot">
            <button className="btn btn-ghost" type="button" onClick={back}>
              {step === 0 ? "Cancel" : "Back"}
            </button>

            {step === 0 && (
              <button className="btn btn-primary" type="button" disabled={!canStep0} onClick={() => setStep(1)}>
                Continue
              </button>
            )}

            {step === 1 && (
              <button className="btn btn-primary" type="button" disabled={!canStep1 || advancing} onClick={goToPayment}>
                {advancing ? "Holding your time…" : "Continue"}
              </button>
            )}

            {step === 2 && (
              <span className="bk-foot-note">
                {error ? error : "Payment is processed by Stripe."}
              </span>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};

window.BookingFlow = BookingFlow;
