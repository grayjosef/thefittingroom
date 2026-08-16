// Studio — private client records for The Fitting Room at Gray House.
//
// One shared password, a roster on the left, one client's whole history on the
// right. The thing it is actually for: coming back to a gown after three months
// and knowing immediately where you left off.

const { useState, useEffect, useMemo, useCallback } = React;

// ---------- api ----------
async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  const type = res.headers.get("content-type") || "";
  if (type.indexOf("application/json") === -1) {
    throw new Error("The studio API isn't responding. Is the site deployed with Functions?");
  }
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || "Something went wrong.");
  return data;
}

// ---------- small pieces ----------
const Chip = ({ type }) => (
  <span className={`st-chip is-${type || "person"}`}>{type || "person"}</span>
);

function quietLabel(days) {
  if (days === null || days === undefined) return "";
  if (days <= 0) return "today";
  if (days === 1) return "1 day quiet";
  if (days < 30) return `${days} days quiet`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month quiet" : `${months} months quiet`;
}

function quietClass(days) {
  if (days === null || days === undefined) return "";
  if (days >= 60) return "is-cold";
  if (days >= 21) return "is-warm";
  return "";
}

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ---------- login ----------
const Login = ({ onIn }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/studio/login", { method: "POST", body: { password } });
      onIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="st-login" onSubmit={submit}>
      <h1>The Studio</h1>
      <p style={{ color: "var(--taupe)", fontSize: 14, margin: 0 }}>
        Private client records for The Fitting Room at Gray House.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        autoComplete="current-password"
      />
      {error && <div className="st-error">{error}</div>}
      <button className="st-btn is-primary" type="submit" disabled={busy || !password}>
        {busy ? "Checking…" : "Enter"}
      </button>
    </form>
  );
};

// ---------- add client ----------
const AddClient = ({ onAdded, onCancel }) => {
  const [form, setForm] = useState({ name: "", type: "business", org: "", email: "", phone: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api("/api/studio/clients", { method: "POST", body: form });
      onAdded(res.client);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="st-panel" onSubmit={submit} style={{ marginBottom: 20 }}>
      <div className="st-panel-head"><span className="st-eyebrow">New record</span></div>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="st-search" style={{ maxWidth: "none" }} placeholder="Name" value={form.name} onChange={set("name")} autoFocus />
        <select className="st-select" value={form.type} onChange={set("type")}>
          <option value="bride">Bride</option>
          <option value="person">Person</option>
          <option value="business">Business</option>
          <option value="boutique">Boutique</option>
          <option value="vendor">Vendor</option>
        </select>
        <input className="st-search" style={{ maxWidth: "none" }} placeholder="Company or shop (optional)" value={form.org} onChange={set("org")} />
        <input className="st-search" style={{ maxWidth: "none" }} placeholder="Email" value={form.email} onChange={set("email")} />
        <input className="st-search" style={{ maxWidth: "none" }} placeholder="Phone" value={form.phone} onChange={set("phone")} />
      </div>
      {error && <div className="st-error" style={{ marginTop: 12 }}>{error}</div>}
      <div className="st-inline">
        <button className="st-btn is-primary" type="submit" disabled={busy || !form.name}>
          {busy ? "Saving…" : "Add"}
        </button>
        <button className="st-btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

// ---------- dossier ----------
const Dossier = ({ clientId, onChanged }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [savedAt, setSavedAt] = useState(false);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("general");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setData(null);
    try {
      const res = await api(`/api/studio/client?id=${encodeURIComponent(clientId)}`);
      setData(res);
      setSummary(res.client.summary || "");
    } catch (err) {
      setError(err.message);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const saveSummary = async () => {
    try {
      await api(`/api/studio/client?id=${encodeURIComponent(clientId)}`, {
        method: "PATCH",
        body: { summary },
      });
      setSavedAt(true);
      setTimeout(() => setSavedAt(false), 2200);
      onChanged && onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setPosting(true);
    try {
      await api("/api/studio/note", { method: "POST", body: { clientId, body: note, kind } });
      setNote("");
      await load();
      onChanged && onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  if (error) return <div className="st-error">{error}</div>;
  if (!data) return <div className="st-empty">Opening…</div>;

  const { client, appointments, intake, notes } = data;
  const latestIntake = intake && intake[0];

  return (
    <div className="st-dossier">
      <div className="st-panel">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 className="st-name">{client.name}</h2>
            <p className="st-sub">
              {client.org ? `${client.org} · ` : ""}
              {client.email || "no email"}
              {client.phone ? ` · ${client.phone}` : ""}
            </p>
          </div>
          <Chip type={client.type} />
        </div>

        <dl className="st-facts">
          <div className="st-fact"><dt>Wedding</dt><dd>{latestIntake?.weddingDate || "—"}</dd></div>
          <div className="st-fact"><dt>Dress</dt><dd>{latestIntake?.designer || "—"}</dd></div>
          <div className="st-fact"><dt>Bought at</dt><dd>{latestIntake?.shop || latestIntake?.purchased || "—"}</dd></div>
          <div className="st-fact"><dt>Consultations</dt><dd>{appointments.length}</dd></div>
        </dl>
      </div>

      {/* The standing summary — what you read first when you come back cold. */}
      <div className="st-panel">
        <div className="st-panel-head"><span className="st-eyebrow">Where we left off</span></div>
        <textarea
          className="st-area"
          rows="4"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="The one paragraph you'd want to read before picking this back up. Where the gown is, what's left, what you promised."
        />
        <div className="st-inline">
          <button className="st-btn is-primary" type="button" onClick={saveSummary}>Save</button>
          {savedAt && <span className="st-saved">Saved</span>}
        </div>
      </div>

      {latestIntake && (
        <div className="st-panel">
          <div className="st-panel-head"><span className="st-eyebrow">What she told us</span></div>
          {latestIntake.work && latestIntake.work.length > 0 && (
            <p style={{ margin: "0 0 10px", color: "var(--slate-deep)", fontSize: 14.5 }}>
              <strong style={{ color: "var(--charcoal)" }}>Work needed:</strong> {latestIntake.work.join(", ")}
            </p>
          )}
          {latestIntake.timeline && (
            <p style={{ margin: "0 0 10px", color: "var(--slate)", fontSize: 14.5 }}>
              <strong style={{ color: "var(--charcoal)" }}>Timeline:</strong> {latestIntake.timeline}
            </p>
          )}
          {latestIntake.notes && (
            <p style={{ margin: 0, color: "var(--slate-deep)", fontSize: 14.5, whiteSpace: "pre-wrap" }}>
              {latestIntake.notes}
            </p>
          )}
        </div>
      )}

      <div className="st-panel">
        <div className="st-panel-head">
          <span className="st-eyebrow">Appointments</span>
          <span className="st-count">{appointments.length}</span>
        </div>
        {appointments.length === 0 && <div className="st-empty">No appointments yet.</div>}
        {appointments.map((a) => (
          <div key={a.id} className="st-appt">
            <span className="st-appt-when">{a.dateLabel} · {a.timeLabel}</span>
            <span className={`st-appt-meta ${a.needsManualCalendarEntry ? "is-alert" : ""}`}>
              {a.needsManualCalendarEntry ? "add to calendar by hand" : `${a.status} · ${a.paymentStatus} · ${a.reference}`}
            </span>
          </div>
        ))}
      </div>

      <div className="st-panel">
        <div className="st-panel-head">
          <span className="st-eyebrow">Notes</span>
          <span className="st-count">{notes.length}</span>
        </div>

        <form onSubmit={addNote} style={{ marginBottom: 22 }}>
          <textarea
            className="st-area"
            rows="3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened, what you measured, what you promised."
          />
          <div className="st-inline">
            <select className="st-select" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="general">General</option>
              <option value="call">Call</option>
              <option value="fitting">Fitting</option>
              <option value="measurement">Measurement</option>
              <option value="payment">Payment</option>
              <option value="timeline">Timeline</option>
            </select>
            <button className="st-btn is-primary" type="submit" disabled={posting || !note.trim()}>
              {posting ? "Saving…" : "Add note"}
            </button>
          </div>
        </form>

        {notes.length === 0 && <div className="st-empty">Nothing recorded yet.</div>}
        <div className="st-timeline">
          {notes.map((n) => (
            <div key={n.id} className="st-note">
              <div className="st-note-head">
                <span>{formatWhen(n.created)}</span>
                <span>·</span>
                <span>{n.kind}</span>
                {n.followUpDate && <span>· follow up {n.followUpDate}</span>}
              </div>
              <p className="st-note-body">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- app ----------
const App = () => {
  const [signedIn, setSignedIn] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [clients, setClients] = useState([]);
  const [stub, setStub] = useState(false);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api("/api/studio/session")
      .then((res) => { setSignedIn(res.signedIn); setConfigured(res.configured); })
      .catch((err) => { setError(err.message); setSignedIn(false); });
  }, []);

  const loadClients = useCallback(() => {
    api("/api/studio/clients")
      .then((res) => { setClients(res.clients || []); setStub(Boolean(res.stub)); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { if (signedIn) loadClients(); }, [signedIn, loadClients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.org, c.email, c.phone, c.tags, c.summary]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [clients, query]);

  const signOut = async () => {
    await api("/api/studio/session", { method: "POST" }).catch(() => {});
    setSignedIn(false);
    setSelected(null);
  };

  if (signedIn === null) return <div className="st-empty">Loading…</div>;

  if (!configured) {
    return (
      <div className="st-wrap">
        <div className="st-login">
          <h1>Not set up yet</h1>
          <div className="st-banner">
            Add <code>STUDIO_PASSWORD</code> and <code>STUDIO_SESSION_SECRET</code> to the
            Cloudflare environment, then redeploy.
          </div>
        </div>
      </div>
    );
  }

  if (!signedIn) return <div className="st-wrap"><Login onIn={() => setSignedIn(true)} /></div>;

  return (
    <React.Fragment>
      <div className="st-top">
        <div className="st-wrap st-top-inner">
          <div className="st-brand">
            Gray House
            <small>Studio Records</small>
          </div>
          <input
            className="st-search"
            placeholder="Search name, email, notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="st-spacer" />
          <button className="st-btn" type="button" onClick={() => setAdding((v) => !v)}>
            {adding ? "Close" : "Add record"}
          </button>
          <button className="st-btn" type="button" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="st-wrap st-main">
        {error && <div className="st-error" style={{ marginBottom: 20 }}>{error}</div>}

        {stub && (
          <div className="st-banner">
            Client records aren't connected yet. Add <code>GOOGLE_SHEET_ID</code> and the Google
            credentials, then redeploy — bookings will start filing themselves here.
          </div>
        )}

        {adding && (
          <AddClient
            onAdded={(client) => { setAdding(false); loadClients(); setSelected(client.id); }}
            onCancel={() => setAdding(false)}
          />
        )}

        <div className="st-cols">
          <div className="st-panel">
            <div className="st-panel-head">
              <span className="st-eyebrow">Clients</span>
              <span className="st-count">{filtered.length}</span>
            </div>

            {filtered.length === 0 && (
              <div className="st-empty">{query ? "Nothing matches that." : "No records yet."}</div>
            )}

            <div className="st-roster">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`st-row ${selected === c.id ? "is-active" : ""}`}
                  onClick={() => setSelected(c.id)}
                >
                  <div className="st-row-top">
                    <span className="st-row-name">{c.name}</span>
                    <Chip type={c.type} />
                    <span className={`st-quiet ${quietClass(c.daysQuiet)}`}>{quietLabel(c.daysQuiet)}</span>
                  </div>
                  <div className="st-row-meta">
                    {c.org && <span>{c.org}</span>}
                    {c.email && <span>{c.email}</span>}
                    {c.noteCount > 0 && <span>{c.noteCount} note{c.noteCount === 1 ? "" : "s"}</span>}
                  </div>
                  {c.nextAppointment && (
                    <div className="st-next">Next · {c.nextAppointment.dateLabel} at {c.nextAppointment.timeLabel}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            {selected
              ? <Dossier clientId={selected} onChanged={loadClients} />
              : <div className="st-panel"><div className="st-empty">Choose someone to see their history.</div></div>}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
