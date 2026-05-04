// =====================================================================
// GALLERY — editorial auto-flow grid for The Fitting Room at Gray House.
//
// Reads from window.GALLERY_ITEMS (defined in components/gallery-items.js).
// - Supports single images and before/after pairs in the same grid
// - Click any item to open a full-screen lightbox
// - Lazy-loads images so unloaded photos don't hurt initial page speed
// - Auto-hides the entire section if fewer than 4 items are configured
//   (keeps the design from looking sparse before content arrives)
// =====================================================================

const Gallery = () => {
  const { useState, useEffect } = React;
  const items = (typeof window !== "undefined" && window.GALLERY_ITEMS) || [];
  const [lightbox, setLightbox] = useState(null); // { item, side: "before"|"after"|null }

  // Auto-hide if too few items configured — design needs at least 4 to feel intentional
  if (items.length < 4) return null;

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  const openSingle = (item) => setLightbox({ item, side: null });
  const openPair = (item, side) => setLightbox({ item, side });

  return (
    <section id="gallery">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Selected Work</div>
          <h2 className="h-display">A close look<br/><em>at the work itself.</em></h2>
          <p className="lede" style={{ marginTop: 18 }}>
            A small selection of recent gowns and details from the studio. Each piece reflects
            the same patient, hands-on approach — fitted, finished, and returned to the bride.
          </p>
        </div>

        <div className="gallery-grid">
          {items.map((item, idx) => {
            if (item.type === "pair") {
              return (
                <figure key={idx} className="gallery-item gallery-pair">
                  <div className="pair-images">
                    <button
                      type="button"
                      className="pair-half pair-before"
                      onClick={() => openPair(item, "before")}
                      aria-label={`View larger: ${item.before?.alt || "before"}`}
                    >
                      <img
                        src={item.before?.src}
                        alt={item.before?.alt || "before alteration"}
                        loading="lazy"
                      />
                      <span className="pair-tag">Before</span>
                    </button>
                    <button
                      type="button"
                      className="pair-half pair-after"
                      onClick={() => openPair(item, "after")}
                      aria-label={`View larger: ${item.after?.alt || "after"}`}
                    >
                      <img
                        src={item.after?.src}
                        alt={item.after?.alt || "after alteration"}
                        loading="lazy"
                      />
                      <span className="pair-tag">After</span>
                    </button>
                  </div>
                  {item.caption && <figcaption>{item.caption}</figcaption>}
                </figure>
              );
            }
            // single
            return (
              <figure key={idx} className="gallery-item gallery-single">
                <button
                  type="button"
                  className="single-button"
                  onClick={() => openSingle(item)}
                  aria-label={`View larger: ${item.alt || "gallery image"}`}
                >
                  <img
                    src={item.src}
                    alt={item.alt || "gallery image"}
                    loading="lazy"
                  />
                </button>
                {item.caption && <figcaption>{item.caption}</figcaption>}
              </figure>
            );
          })}
        </div>
      </div>

      {lightbox && (
        <div
          className="lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ×
          </button>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {lightbox.item.type === "pair" ? (
              <React.Fragment>
                <img
                  src={lightbox.item[lightbox.side]?.src}
                  alt={lightbox.item[lightbox.side]?.alt || ""}
                />
                <div className="lightbox-caption">
                  <span className="lightbox-tag">{lightbox.side === "before" ? "Before" : "After"}</span>
                  {lightbox.item.caption && <span> · {lightbox.item.caption}</span>}
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <img
                  src={lightbox.item.src}
                  alt={lightbox.item.alt || ""}
                />
                {lightbox.item.caption && (
                  <div className="lightbox-caption">{lightbox.item.caption}</div>
                )}
              </React.Fragment>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

window.Gallery = Gallery;
