// Modul Aplikasi Anggota BMT Pasra Mobile (PIC: R. Ahmad Syarif Hidayatullah)
// P-01 s.d. P-06 dan US-03 Notifikasi transaksi real-time (S1 push, S2 inbox, S3 detail).
(function () {
  const { $, $$, rupiah, rupiahSpaced, parseRupiah, esc, toast, wait, setFieldError } = App;

  const PIN = "123456";
  const REK = "••••4821";
  const state = {
    pin: "", fails: 0, lockedUntil: 0, loggedIn: false,
    saldo: 1750000, sisa: 4200000, updated: "29/09/2026 10.12",
    mf: "", nf: "all", submitted: false,
    tx: [
      { t: "Setoran simpanan", d: "29/09", by: "Petugas lapangan", ref: "TRX-260929-0412", amt: 250000, kind: "Simpanan" },
      { t: "Angsuran pembiayaan", d: "26/09", by: "Petugas lapangan", amt: -120000, kind: "Pembiayaan" },
      { t: "Setoran simpanan", d: "22/09", by: "Kantor cabang", amt: 200000, kind: "Simpanan" },
      { t: "Penarikan simpanan", d: "15/09", by: "Kantor cabang", amt: -150000, kind: "Simpanan" },
    ],
    notif: [
      { id: 1, title: "Setoran masuk Rp250.000", body: "Saldo simpanan kini Rp1.750.000. Resi TRX-260929-0412.", time: "29/09/2026 10.12", status: "TERKIRIM", jenis: "Setoran masuk", amt: 250000, saldo: 1750000 },
      { id: 2, title: "Angsuran diterima Rp120.000", body: "Sisa pembiayaan kini Rp4.200.000.", time: "26/09/2026 09.40", status: "DIBACA", jenis: "Angsuran keluar", amt: -120000, saldo: null },
      { id: 3, title: "Setoran masuk Rp200.000", body: "Saldo simpanan kini Rp1.500.000.", time: "22/09/2026 11.05", status: "DIBACA", jenis: "Setoran masuk", amt: 200000, saldo: 1500000 },
      { id: 4, title: "Penarikan Rp150.000", body: "Saldo simpanan kini Rp1.300.000.", time: "15/09/2026 13.20", status: "DIBACA", jenis: "Penarikan", amt: -150000, saldo: 1300000 },
    ],
  };
  let nid = 5;

  // ---------- Navigasi ----------
  const TAB_OF = { p02: "p02", p06: "p02", p03: "p03", p04: "p04", p05: "p05", p05d: "p05" };
  function show(id) {
    if (id !== "p01" && !state.loggedIn) { toast("Masukkan PIN dulu untuk membuka aplikasi."); id = "p01"; }
    $$(".phone-screen").forEach((s) => { s.hidden = s.id !== id; });
    $("#tabbar").hidden = id === "p01";
    $$("#tabbar [data-tab]").forEach((b) => {
      if (b.dataset.tab === TAB_OF[id]) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $$("#jump [data-jump]").forEach((b) => b.setAttribute("aria-current", b.dataset.jump === id ? "true" : "false"));
    render();
    const scr = $("#" + id);
    scr.scrollTop = 0;
    const h = scr.querySelector("h2");
    if (h && document.activeElement !== document.body) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  $("#tabbar").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) show(b.dataset.tab); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) show(b.dataset.go); });
  $("#jump").addEventListener("click", (e) => {
    const b = e.target.closest("[data-jump]");
    if (!b) return;
    if (b.dataset.jump !== "p01") state.loggedIn = true;
    else logout("");
    show(b.dataset.jump);
  });

  // ---------- P-01 PIN ----------
  function renderPin() {
    $$("#pinDots i").forEach((d, i) => d.classList.toggle("on", i < state.pin.length));
    $("#pinSr").textContent = `${state.pin.length} dari 6 digit terisi`;
  }
  $("#keypad").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    const k = b.dataset.k;
    if (Date.now() < state.lockedUntil) return;
    if (k === "bio") { toast("Sidik jari tidak tersedia di prototype web. Gunakan PIN."); return; }
    if (k === "del") { state.pin = state.pin.slice(0, -1); renderPin(); toast("Satu digit PIN dihapus."); return; }
    if (state.pin.length >= 6) return;
    state.pin += k;
    $("#pinErr").textContent = "";
    renderPin();
    if (state.pin.length === 6) checkPin();
  });
  function checkPin() {
    if (state.pin === PIN) {
      state.fails = 0; state.pin = ""; state.loggedIn = true; renderPin();
      armIdle();
      show("p02");
      return;
    }
    state.fails++;
    state.pin = ""; renderPin();
    if (state.fails >= 3) {
      state.lockedUntil = Date.now() + 30000;
      $$("#keypad button").forEach((b) => { b.disabled = true; });
      $("#pinErr").textContent = "PIN salah 3 kali. Coba lagi dalam 30 detik atau pakai Lupa PIN.";
      setTimeout(() => { state.fails = 0; $$("#keypad button").forEach((b) => { b.disabled = false; }); $("#pinErr").textContent = ""; }, 30000);
    } else {
      $("#pinErr").textContent = `PIN salah. Sisa percobaan ${3 - state.fails}.`;
    }
  }
  $("#btnForgot").addEventListener("click", () => toast("Atur ulang PIN lewat kode OTP yang dikirim ke nomor HP terdaftar."));

  // Keluar otomatis setelah 3 menit tanpa aktivitas.
  let idleTimer;
  function armIdle() {
    clearTimeout(idleTimer);
    if (state.loggedIn) idleTimer = setTimeout(() => logout("Aplikasi dikunci karena 3 menit tidak dipakai."), 180000);
  }
  ["click", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, armIdle, { passive: true }));
  function logout(msg) {
    state.loggedIn = false; state.pin = ""; renderPin();
    clearTimeout(idleTimer);
    if (msg) { show("p01"); $("#pinErr").textContent = msg; }
  }

  // ---------- Render data ----------
  function txHtml(t) {
    return `<div class="tx"><div><div class="n">${t.t}</div><div class="m">${t.d} · ${t.by}${t.ref ? " · " + t.ref : ""}</div>
      ${t.kind === "Pembiayaan" ? '<span class="badge badge-blue" style="margin-top:4px">Pembiayaan</span>' : ""}</div>
      <div class="${t.amt > 0 ? "plus" : "minus"}">${t.amt > 0 ? "+" : t.kind === "Pembiayaan" ? "" : "-"}${rupiah(Math.abs(t.amt))}</div></div>`;
  }
  function render() {
    $("#saldoBig").textContent = rupiah(state.saldo);
    $("#saldoUpd").textContent = "Diperbarui " + state.updated;
    $("#sisaBig").textContent = rupiah(state.sisa);
    $("#recentTx").innerHTML = state.tx.slice(0, 2).map(txHtml).join("");

    const list = state.tx.filter((t) => !state.mf || t.kind === state.mf);
    $("#mutasiList").innerHTML = list.length ? list.map(txHtml).join("") : '<div class="state"><h3>Belum ada mutasi</h3><p>Tidak ada transaksi jenis ini di bulan September 2026.</p></div>';
    const simp = state.tx.filter((t) => t.kind === "Simpanan");
    const masuk = simp.filter((t) => t.amt > 0).reduce((a, t) => a + t.amt, 0);
    const keluar = simp.filter((t) => t.amt < 0).reduce((a, t) => a - t.amt, 0);
    $("#saldoAkhir").textContent = rupiah(state.saldo);
    $("#mutasiSum").textContent = `Masuk ${rupiah(masuk)} · Keluar ${rupiah(keluar)}`;

    const unread = state.notif.filter((n) => n.status !== "DIBACA");
    const nlist = state.nf === "unread" ? unread : state.notif;
    $("#notifList").innerHTML = nlist.length ? nlist.map((n) => `
      <button type="button" class="notif${n.status !== "DIBACA" ? " unread" : ""}" data-n="${n.id}">
        <strong>${esc(n.title)}<span class="sr-only">${n.status !== "DIBACA" ? ", belum dibaca" : ""}</span></strong><span>${esc(n.body)}</span><span>${n.time}</span></button>`).join("")
      : '<div class="state" style="margin:10px 0"><h3>Semua notifikasi sudah dibaca</h3><p>Notifikasi transaksi baru akan muncul di sini.</p></div>';
    $$("#notifFilter button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.nf === state.nf));
      if (b.dataset.nf === "unread") b.textContent = `Belum dibaca (${unread.length})`;
    });
    const uc = $("#unreadCount");
    uc.textContent = unread.length || "";
    uc.hidden = !unread.length;
    uc.setAttribute("aria-label", unread.length ? `${unread.length} belum dibaca` : "");
  }

  $("#mutasiFilter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mf]");
    if (!b) return;
    state.mf = b.dataset.mf;
    $$("#mutasiFilter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  $("#notifFilter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nf]");
    if (b) { state.nf = b.dataset.nf; render(); }
  });

  // ---------- Notifikasi & detail ----------
  function openNotif(id) {
    const n = state.notif.find((x) => x.id === id);
    n.status = "DIBACA";
    $("#notifDetail").innerHTML = `
      <div class="m-card" style="text-align:center;margin-top:8px"><p class="m-note">${n.jenis}</p>
        <strong style="font-size:1.8rem;color:${n.amt > 0 ? "var(--brand-700)" : "var(--text)"}">${n.amt > 0 ? "+" : "-"} ${rupiahSpaced(Math.abs(n.amt))}</strong></div>
      <div class="m-card">
        <div class="m-row"><span>Jenis</span><strong>${n.jenis}</strong></div>
        <div class="m-row"><span>Rekening</span><strong>${REK}</strong></div>
        <div class="m-row"><span>Waktu</span><strong>${n.time}</strong></div>
        ${n.saldo != null ? `<div class="m-row"><span>Saldo akhir</span><strong>${rupiahSpaced(n.saldo)}</strong></div>` : ""}
        <div class="m-row"><span>Status notifikasi</span><span class="badge badge-green">${n.status}</span></div>
      </div>
      <p class="m-note">Nomor rekening disamarkan. Notifikasi hanya tampil di akun pemilik rekening.</p>`;
    show("p05d");
  }
  $("#notifList").addEventListener("click", (e) => { const b = e.target.closest("[data-n]"); if (b) openNotif(Number(b.dataset.n)); });

  // Event transaksi terkonfirmasi dari server -> notifikasi PENDING -> push FCM -> TERKIRIM.
  async function simulate(amt) {
    const masuk = amt > 0;
    state.saldo += amt;
    state.updated = App.nowStamp();
    const n = {
      id: nid++, title: `${masuk ? "Setoran masuk" : "Penarikan"} ${rupiah(Math.abs(amt))}`,
      body: `Saldo simpanan kini ${rupiah(state.saldo)}.`, time: state.updated, status: "PENDING",
      jenis: masuk ? "Setoran masuk" : "Penarikan", amt, saldo: state.saldo,
    };
    state.notif.unshift(n);
    state.tx.unshift({ t: masuk ? "Setoran simpanan" : "Penarikan simpanan", d: state.updated.slice(0, 5), by: "Kantor cabang", amt, kind: "Simpanan" });
    await wait(700);
    n.status = "TERKIRIM";
    render();
    const slot = $("#pushSlot");
    slot.innerHTML = `<button type="button" class="push" data-push="${n.id}">
      <small>BMT Pasra · sekarang</small><strong>${n.title}</strong><span>Rek. ${REK} · Saldo ${rupiah(state.saldo)}</span></button>`;
    setTimeout(() => { if (slot.querySelector(`[data-push="${n.id}"]`)) slot.innerHTML = ""; }, 8000);
  }
  $("#pushSlot").addEventListener("click", (e) => {
    const b = e.target.closest("[data-push]");
    if (!b) return;
    $("#pushSlot").innerHTML = "";
    if (!state.loggedIn) { toast("Masukkan PIN dulu. Notifikasi tetap tersimpan di inbox."); return; }
    openNotif(Number(b.dataset.push));
  });
  $("#simIn").addEventListener("click", () => simulate(500000));
  $("#simOut").addEventListener("click", () => {
    if (state.saldo < 100000) { toast("Saldo contoh tidak cukup untuk simulasi penarikan."); return; }
    simulate(-100000);
  });

  // ---------- P-04 Ajukan ----------
  const AJU = ["Isi data", "Penilaian", "Komite", "Pencairan"];
  function renderAju(cur) {
    $("#ajuTrack").innerHTML = AJU.map((l, i) => `<li class="${i < cur ? "done" : i === cur ? "current" : ""}"><span class="d" aria-hidden="true"></span>${l}</li>`).join("");
  }
  App.bindRupiahInput($("#aJumlah"));
  $("#ajuForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.submitted) return;
    const j = parseRupiah($("#aJumlah").value);
    setFieldError($("#aJumlah"), j ? (j < 1000000 ? "Minimal Rp1.000.000" : "") : "Jumlah pembiayaan wajib diisi");
    setFieldError($("#aAkad"), $("#aAkad").value ? "" : "Akad wajib dipilih");
    setFieldError($("#aTujuan"), $("#aTujuan").value.trim() ? "" : "Tujuan pembiayaan wajib diisi");
    const consent = $("#aConsent").checked;
    setFieldError($("#aConsent"), consent ? "" : "Persetujuan wajib dicentang sebelum pengajuan bisa dikirim.");
    const bad = $("#ajuForm [aria-invalid=true]");
    if (bad) { bad.focus(); return; }
    state.submitted = true;
    renderAju(1);
    $$("#ajuForm input, #ajuForm select").forEach((el) => { el.disabled = true; });
    $("#aSubmit").disabled = true;
    $("#aSubmit").textContent = "Pengajuan terkirim";
    state.notif.unshift({ id: nid++, title: `Pengajuan ${rupiah(j)} diterima`, body: "Analis kredit cabang sedang menilai pengajuan Anda.", time: App.nowStamp(), status: "TERKIRIM", jenis: "Pengajuan pembiayaan", amt: j, saldo: null });
    render();
    toast("Pengajuan terkirim ke analis kredit cabang. Kabar berikutnya muncul di Notifikasi.");
  });

  // ---------- QR penanda (bukan kode asli) ----------
  (function drawQr() {
    const svg = $("#qrSvg");
    let s = 4312, cells = "";
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#17201c"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#17201c"/>`;
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
      if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
      s = (s * 9301 + 49297) % 233280;
      if (s / 233280 > 0.5) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#17201c"/>`;
    }
    svg.innerHTML = `<rect width="21" height="21" fill="#fff"/>${finder(0, 0)}${finder(14, 0)}${finder(0, 14)}${cells}`;
  })();

  renderPin();
  renderAju(0);
  show("p01");
})();
