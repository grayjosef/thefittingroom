// Multi-step booking flow — calendar slot, intake form, payment screen, confirmation.
// All client-side state. No real payment is processed; the payment step is a designed
// placeholder representing the Stripe / booking-vendor handoff.

const { useState, useMemo, useEffect } = React;

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

const Calendar = ({ value, onChange }) => {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const cells = useMemo(() => buildMonthDays(view.y, view.m), [view]);

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
          const sel = isSelectable(d, todayMidnight);
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

const Slots = ({ date, value, onChange }) => {
  const slots = fakeSlotsFor(date);
  if (!date) {
    return <div className="slots-empty">Select a date to view available consultation times.</div>;
  }
  if (slots.length === 0) {
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
            key={s}
            type="button"
            className={`slot ${value === s ? "is-selected" : ""}`}
            onClick={() => onChange(s)}
          >
            {s}
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
const PaymentScreen = ({ summary, agree, setAgree, onPay, paying }) => (
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
        <div><dt>Booking fee</dt><dd>$25.00</dd></div>
        <div><dt>Processing</dt><dd>$1.05</dd></div>
        <div className="pay-total"><dt>Total today</dt><dd>$26.05</dd></div>
      </dl>
      <p className="pay-fineprint">
        Your $25 booking fee reserves your appointment time and will be applied toward your final alterations bill if you choose to move forward with alterations.
      </p>
    </div>

    <div className="pay-form">
      <div className="pay-vendor">
        <span className="pay-lock">●</span>
        <span>Secure checkout · Stripe</span>
      </div>

      <Field label="Card number" span={12}>
        <input className="ipt" placeholder="1234 1234 1234 1234" />
      </Field>
      <div className="form-grid">
        <Field label="Expiry" span={6}><input className="ipt" placeholder="MM / YY" /></Field>
        <Field label="CVC" span={6}><input className="ipt" placeholder="CVC" /></Field>
        <Field label="ZIP" span={6}><input className="ipt" placeholder="54481" /></Field>
        <Field label="Country" span={6}>
          <select className="ipt"><option>United States</option></select>
        </Field>
      </div>

      <label className="agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I understand that my $25 booking fee reserves my appointment and will be applied toward my final alterations bill if I move forward with alterations. I understand the booking fee is non-refundable if I cancel, miss my appointment, or fail to reschedule at least 24 hours in advance. I may reschedule one time only if requested at least 24 hours before my appointment.
        </span>
      </label>

      <button type="button" className="btn btn-primary btn-lg" disabled={!agree || paying} onClick={onPay}>
        {paying ? "Reserving…" : "Pay $26.05 & reserve appointment"}
      </button>
      <p className="pay-note">The appointment is not confirmed until payment is complete.</p>
    </div>
  </div>
);

// ---------- confirmation ----------
const Confirmation = ({ summary, onClose }) => {
  const ref = "GH-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  return (
    <div className="confirm">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="26" fill="none" stroke="#A8A39A" strokeWidth="1" />
        <path d="M17 29 l8 8 l16 -18" fill="none" stroke="#3A4250" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3 className="confirm-title">Your consultation is reserved.</h3>
      <p className="confirm-sub">A confirmation has been sent to {summary.email || "your email"}. Catherine will reach out personally if any details need adjusting.</p>

      <div className="confirm-card">
        <div className="confirm-row"><span>Reference</span><strong>{ref}</strong></div>
        <div className="confirm-row"><span>Date</span><strong>{summary.dateLabel}</strong></div>
        <div className="confirm-row"><span>Time</span><strong>{summary.time}</strong></div>
        <div className="confirm-row"><span>Duration</span><strong>30 minutes</strong></div>
        <div className="confirm-row"><span>Studio</span><strong>By appointment · Stevens Point, WI</strong></div>
      </div>

      <div className="confirm-actions">
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" type="button" onClick={onClose}>Add to calendar</button>
      </div>
    </div>
  );
};

// ---------- main ----------
const BookingFlow = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState("");
  const [data, setData] = useState({
    name: "", email: "", phone: "", weddingDate: "",
    purchased: "", designer: "", shop: "",
    work: [], timeline: "", notes: "",
  });
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const summary = {
    dateLabel: date ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—",
    time: time || "—",
    name: data.name,
    email: data.email,
  };

  const canStep0 = date && time;
  const canStep1 = data.name && data.email && data.phone;

  const handlePay = () => {
    setPaying(true);
    setTimeout(() => { setPaying(false); setStep(3); }, 1100);
  };

  const reset = () => {
    setStep(0); setDate(null); setTime(""); setAgree(false);
    setData({ name:"", email:"", phone:"", weddingDate:"", purchased:"", designer:"", shop:"", work:[], timeline:"", notes:"" });
    onClose();
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
                <Calendar value={date} onChange={setDate} />
              </div>
              <div className="bk-col">
                <h3 className="bk-h">Choose a time</h3>
                <Slots date={date} value={time} onChange={setTime} />
                <aside className="bk-aside">
                  <div className="bk-aside-row"><span>Appointment</span><span>Bridal Consultation</span></div>
                  <div className="bk-aside-row"><span>Length</span><span>30 minutes</span></div>
                  <div className="bk-aside-row"><span>Booking fee</span><span>$25 + processing</span></div>
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
            />
          )}

          {step === 3 && <Confirmation summary={summary} onClose={reset} />}
        </div>

        {step < 3 && (
          <footer className="bk-shell-foot">
            <button className="btn btn-ghost" type="button" onClick={() => step === 0 ? reset() : setStep(step - 1)}>
              {step === 0 ? "Cancel" : "Back"}
            </button>
            {step < 2 && (
              <button
                className="btn btn-primary"
                type="button"
                disabled={(step === 0 && !canStep0) || (step === 1 && !canStep1)}
                onClick={() => setStep(step + 1)}
              >
                Continue
              </button>
            )}
            {step === 2 && (
              <span className="bk-foot-note">Payment is processed by Stripe at the next step.</span>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};

window.BookingFlow = BookingFlow;
