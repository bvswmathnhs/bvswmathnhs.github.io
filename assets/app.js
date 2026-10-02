// Mobile nav toggle
document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  // Highlight current page in nav (works with or without ".html" in the URL, e.g. /events or /events.html)
  const pageName = (p) => (String(p).split(/[?#]/)[0].split("/").filter(Boolean).pop() || "index").replace(/\.html$/i, "");
  const current = pageName(location.pathname);
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (pageName(a.getAttribute("href") || "") === current) a.classList.add("active");
  });

  // Hero slider ("Upcoming")
  if (window.siteContentReady) await window.siteContentReady;
  const slides = document.querySelectorAll(".slide");
  const dotsWrap = document.querySelector(".slider-dots");
  if (slides.length) {
    let idx = 0;
    slides.forEach((s, i) => {
      const dot = document.createElement("button");
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", () => show(i));
      dotsWrap.appendChild(dot);
    });
    const dots = dotsWrap.querySelectorAll("button");

    function show(i) {
      slides[idx].classList.remove("active");
      dots[idx].classList.remove("active");
      idx = i;
      slides[idx].classList.add("active");
      dots[idx].classList.add("active");
    }

    let timer;
    const startSlider = () => {
      clearInterval(timer);
      timer = setInterval(() => show((idx + 1) % slides.length), 5000);
    };
    startSlider();
    const track = document.querySelector(".slider-track");
    if (track) {
      track.addEventListener("mouseenter", () => clearInterval(timer));
      track.addEventListener("mouseleave", startSlider);
    }
  }

  // Auto-moving photo carousels used by STEM Fair and Pi Day.
  document.querySelectorAll(".media-carousel").forEach((carousel) => {
    const mediaSlides = [...carousel.querySelectorAll(".media-slide")];
    const dotsWrap = carousel.querySelector(".media-dots");
    if (mediaSlides.length < 2 || !dotsWrap) return;
    let index = 0;
    let timer;
    const show = (nextIndex) => {
      mediaSlides[index].classList.remove("active");
      dotsWrap.children[index]?.classList.remove("active");
      index = nextIndex;
      mediaSlides[index].classList.add("active");
      dotsWrap.children[index]?.classList.add("active");
    };
    mediaSlides.forEach((_, slideIndex) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Show photo ${slideIndex + 1}`);
      if (slideIndex === 0) dot.classList.add("active");
      dot.addEventListener("click", () => show(slideIndex));
      dotsWrap.appendChild(dot);
    });
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => show((index + 1) % mediaSlides.length), Number(carousel.dataset.interval) || 4500);
    };
    start();
    carousel.addEventListener("mouseenter", () => clearInterval(timer));
    carousel.addEventListener("mouseleave", start);
  });
});
