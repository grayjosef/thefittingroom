const { useState, useEffect } = React;

const App = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Reveal on scroll for sections with .in-view-up
    const els = document.querySelectorAll(".in-view-up, .reveal, .section-head, .svc-card, .policy-cell, .about-card, .book-card, .book-embed, .contact-card, .atelier-frame, .policy-text, .contact-banner, .accepting-card");
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const openBooking = () => setBookingOpen(true);

  return (
    <React.Fragment>
      <Header onBook={openBooking} onMenu={() => setDrawerOpen(true)} />
      <main>
        <Hero onBook={openBooking} />
        <NowAccepting />
        <Trust />
        <Quiet />
        <Services onBook={openBooking} />
        <About />
        <Gallery />
        <Booking onBook={openBooking} />
        <Policies />
        <Contact />
      </main>
      <Footer />

      <div className="mobile-cta-bar">
        <button className="btn" type="button" onClick={openBooking}>Book a Bridal Consultation</button>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onBook={openBooking} />
      <BookingFlow open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </React.Fragment>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
