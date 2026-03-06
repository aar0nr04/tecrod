(function () {
  const setLang = (lang) => {
    try { localStorage.setItem("tecrod_lang", lang); } catch(e) {}
  };

  const langButtons = document.querySelectorAll("[data-lang]");
  langButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      setLang(lang);
      const target = (lang === "es") ? "/es/" : "/en/";
      const parts = window.location.pathname.split("/").filter(Boolean);
      const first = parts.length ? parts[0] : "";
      const basePath = (first && first !== "en" && first !== "es") ? ("/" + first) : "";
      window.location.href = basePath + target;
    });
  });

  const htmlLang = document.documentElement.lang || "en";
  langButtons.forEach(btn => {
    if (btn.getAttribute("data-lang") === htmlLang) btn.classList.add("active");
  });

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
