(function () {
  const setTheme = (theme) => {
    try { localStorage.setItem("tecrod_theme", theme); } catch(e) {}
  };

  const applyTheme = (theme) => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);

    const logo = document.querySelector(".brand__logo");
    if (logo) {
      const lightSrc = logo.getAttribute("data-logo-light");
      const darkSrc = logo.getAttribute("data-logo-dark");
      logo.src = theme === "light" ? lightSrc : darkSrc;
    }

    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-theme-toggle") === theme);
    });
  };

  const setLang = (lang) => {
    try { localStorage.setItem("tecrod_lang", lang); } catch(e) {}
  };

  const detectTheme = () => {
    try {
      const saved = localStorage.getItem("tecrod_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch(e) {}
    return "dark";
  };

  const langButtons = document.querySelectorAll("[data-lang]");
  langButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      setLang(lang);
      const explicitTarget = btn.getAttribute("data-lang-target");
      if (explicitTarget) {
        window.location.href = explicitTarget;
        return;
      }
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

  const initialTheme = detectTheme();
  applyTheme(initialTheme);

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.getAttribute("data-theme-toggle");
      setTheme(theme);
      applyTheme(theme);
    });
  });

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
