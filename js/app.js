// Utilitas bersama untuk semua halaman prototype.
(function () {
  const App = {};

  App.$ = (sel, root = document) => root.querySelector(sel);
  App.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  App.rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
  App.rupiahSpaced = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
  App.parseRupiah = (s) => {
    const digits = String(s || "").replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };

  // Format isian rupiah saat diketik: "15000000" -> "Rp 15.000.000".
  App.bindRupiahInput = (input) => {
    input.addEventListener("input", () => {
      const n = App.parseRupiah(input.value);
      input.value = n ? App.rupiahSpaced(n) : "";
    });
  };

  App.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  App.toast = (msg) => {
    let region = App.$(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    region.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  };

  App.wait = (ms) => new Promise((r) => setTimeout(r, ms));

  App.checkIcon = '<svg class="check-svg" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>';

  // Jalur status horizontal. steps: array label, current: indeks posisi sekarang (bisa = length untuk selesai semua).
  App.renderTrack = (el, steps, current) => {
    el.innerHTML = steps.map((label, i) => {
      const cls = i < current ? "done" : i === current ? "current" : "";
      const dot = i < current ? App.checkIcon : String(i + 1);
      const now = i === current ? '<span class="now"><span class="badge badge-amber">Posisi sekarang</span></span>' : "";
      const sr = i < current ? " (selesai)" : i === current ? " (posisi sekarang)" : "";
      return `<li class="${cls}"><span class="dot" aria-hidden="true">${dot}</span><span class="step-label">${label}<span class="sr-only">${sr}</span></span>${now}</li>`;
    }).join("");
  };

  // Tab dengan role="tab". Menyimpan tab aktif di hash agar bisa dibuka langsung.
  App.tabs = (tablist, onChange) => {
    const tabs = App.$$('[role="tab"]', tablist);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      history.replaceState(null, "", "#" + tab.dataset.hash);
      if (onChange) onChange(tab.dataset.hash);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          select(next, true);
        }
      });
    });
    const fromHash = tabs.find((t) => "#" + t.dataset.hash === location.hash);
    select(fromHash || tabs[0]);
    return { select: (hash) => select(tabs.find((t) => t.dataset.hash === hash)) };
  };

  App.setFieldError = (field, msg) => {
    const wrap = field.closest(".field");
    if (!wrap) return;
    let err = wrap.querySelector(".field-error");
    if (!err) {
      err = document.createElement("span");
      err.className = "field-error";
      err.id = (field.id || "f" + Math.random().toString(36).slice(2)) + "-err";
      wrap.appendChild(err);
    }
    wrap.classList.toggle("has-error", !!msg);
    err.textContent = msg || "";
    if (msg) {
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", err.id);
    } else {
      field.removeAttribute("aria-invalid");
    }
  };

  App.download = (filename, text, type = "text/csv;charset=utf-8") => {
    const blob = new Blob(["﻿" + text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  App.toCSV = (rows) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");

  App.nowStamp = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}.${p(d.getMinutes())}`;
  };

  // Ukuran layar HP (halaman petugas & anggota). Layar memakai ukuran piksel asli,
  // lalu seluruh bingkai diperkecil dengan transform bila tidak muat di jendela browser.
  App.initPhoneSize = () => {
    const sel = document.getElementById("sizeSel");
    const phone = document.querySelector(".phone");
    const wrap = document.querySelector(".phone-wrap");
    if (!sel || !phone || !wrap) return;
    const KEY = "bmt-phone-size";
    try { const saved = localStorage.getItem(KEY); if (saved && sel.querySelector(`option[value="${saved}"]`)) sel.value = saved; } catch (e) { /* penyimpanan tidak tersedia */ }

    const apply = () => {
      const [w, h] = sel.value.split("x").map(Number);
      const classic = h <= 667; // iPhone tanpa notch: bezel atas-bawah tebal, tanpa dynamic island
      phone.classList.toggle("classic", classic);
      const fw = w + (classic ? 24 : 22);
      const fh = h + (classic ? 116 : 22);
      if (window.matchMedia("(max-width: 640px)").matches) {
        phone.style.cssText = ""; wrap.style.cssText = "";
        return;
      }
      const stacked = window.matchMedia("(max-width: 980px)").matches;
      const fit = Math.min(1, (window.innerHeight - 100) / fh, stacked ? (window.innerWidth - 48) / fw : 1);
      phone.style.width = fw + "px";
      phone.style.height = fh + "px";
      phone.style.transform = fit < 1 ? `scale(${fit})` : "";
      wrap.style.width = fw * fit + "px";
      wrap.style.height = fh * fit + "px";
      const note = document.getElementById("sizeNote");
      if (note) note.textContent = fit < 1
        ? `Layar ${w} × ${h} px, diperkecil ${Math.round(fit * 100)}% agar muat di jendela.`
        : `Layar ${w} × ${h} px, ukuran asli.`;
    };
    sel.addEventListener("change", () => {
      try { localStorage.setItem(KEY, sel.value); } catch (e) { /* abaikan */ }
      apply();
    });
    window.addEventListener("resize", apply);
    apply();
  };

  window.App = App;
  document.addEventListener("DOMContentLoaded", App.initPhoneSize);
})();
