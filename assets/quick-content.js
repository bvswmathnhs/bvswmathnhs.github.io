(function () {
  const readyForDom = document.readyState === "loading"
    ? new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
    : Promise.resolve();

  function safeHttpsUrl(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ""));
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function setCardText(card, selector, value) {
    const element = card.querySelector(selector);
    if (element && typeof value === "string") element.textContent = value;
  }

  (async () => {
    await readyForDom;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;

    const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { data, error } = await client.from("site_content").select("poster,events_points").eq("id", 1).maybeSingle();
    if (error || !data) return;

    const cards = data.events_points && typeof data.events_points === "object" && Array.isArray(data.events_points.home_cards)
      ? data.events_points.home_cards
      : [];

    document.querySelectorAll("[data-home-card]").forEach((card, index) => {
      const item = cards[index];
      if (!item || typeof item !== "object") return;
      setCardText(card, "[data-home-card-num]", item.num);
      setCardText(card, "[data-home-card-title]", item.title);
      setCardText(card, "[data-home-card-body]", item.body);
    });

    const posterLink = document.querySelector("[data-poster-link]");
    if (posterLink) {
      const url = safeHttpsUrl(data.poster && data.poster.link_url);
      posterLink.hidden = !url;
      if (url) {
        posterLink.href = url;
        posterLink.target = "_blank";
        posterLink.rel = "noopener";
      }
    }
  })();
})();
