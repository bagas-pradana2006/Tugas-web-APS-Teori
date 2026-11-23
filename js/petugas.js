// Modul Mobile Collector Real-Time (PIC: Muhammad Rafi Fadillah)
// M-01 s.d. M-05 aplikasi petugas lapangan.
(function () {
  const { $, $$, rupiah, rupiahSpaced, parseRupiah, toast, wait, setFieldError } = App;

  const MEMBERS = {
    "04312": { nama: "H. Ahmad", pasar: "Pasar Dinoyo", aktif: true, saldo: 1500000, sisa: 4200000 },
    "04377": { nama: "Anggota 04377", pasar: "", aktif: false },
  };
  const MIN = 10000, MAX = 5000000;

  const state = {
    online: true,
    member: null,
    jenis: "Simpanan",
    resiSeq: 412,
    last: null,
    hist: [
      { ang: "04312", jenis: "Simpanan", nominal: 250000, status: "sync" },
      { ang: "04355", jenis: "Angsuran", nominal: 120000, status: "pending" },
      { ang: "04390", jenis: "Simpanan", nominal: 75000, status: "pending" },
      { ang: "04401", jenis: "Angsuran", nominal: 900000, status: "rejected", why: "Ditolak server: nominal di luar batas cabang" },
    ],
    syncedNow: 0,
  };

  // ---------- Navigasi layar ----------
  function show(id) {
    $$(".phone-screen").forEach((s) => { s.hidden = s.id !== id; });
    $("#tabbar").hidden = id === "m01";
    $$("#tabbar [data-tab]").forEach((b) => {
      const on = (b.dataset.tab === "m04") === (id === "m04");
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $("#jumpSel").value = id;
    if (id === "m04") renderHist();
    const scr = $("#" + id);
    scr.scrollTop = 0;
    const h = scr.querySelector("h2");
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  $("#tabbar").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) show(b.dataset.tab); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) show(b.dataset.go); });

  // ---------- Jaringan ----------
  function renderNet() {
    $$("[data-net]").forEach((b) => {
      b.textContent = state.online ? "Online" : "Offline";
      b.setAttribute("aria-pressed", String(state.online));
      b.setAttribute("aria-label", `Status jaringan ${state.online ? "online" : "offline"}. Ketuk untuk simulasi ${state.online ? "offline" : "online"}`);
    });
  }
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-net]")) return;
    state.online = !state.online;
    renderNet();
    renderHist();
    if (state.online && pending().length) {
      toast("Sinyal kembali. Transaksi tertunda dikirim otomatis.");
      await wait(800);
      syncNow();
    } else if (!state.online) {
      toast("Mode offline. Setoran tetap tersimpan di HP dan ditandai belum tersinkron.");
    }
  });

  // ---------- M-01 Login ----------
  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("#lgId").value.trim(), pw = $("#lgPw").value;
    setFieldError($("#lgId"), id ? "" : "ID petugas wajib diisi");
    setFieldError($("#lgPw"), pw.length >= 6 ? "" : "Kata sandi minimal 6 karakter");
    if (!id || pw.length < 6) return;
    toast(`Masuk sebagai ${id}. Data anggota rute Pasar Dinoyo diunduh.`);
    show("m02");
  });

  // ---------- M-02 Validasi anggota ----------
  function pickMember(id) {
    const m = MEMBERS[id];
    const card = $("#memberCard");
    state.member = null;
    if (!m) {
      card.innerHTML = `<div class="m-card" style="border:1.5px solid var(--red)"><strong>ID ${id} tidak ditemukan</strong>
        <p style="color:var(--red);font-size:.82rem;margin-top:6px">Anggota tidak ada di data rute hari ini. Periksa kembali ID di kartu anggota.</p></div>`;
    } else if (!m.aktif) {
      card.innerHTML = `<div class="m-card" style="border:1.5px solid var(--red)" role="alert">
        <div class="m-row" style="padding:0"><div><strong>Anggota ${id}</strong><div class="m-note">Hasil pindai QR</div></div><span class="badge badge-red">Nonaktif</span></div>
        <p style="color:var(--red);font-size:.82rem;margin-top:10px;border-top:1px solid var(--line);padding-top:10px">Status keanggotaan nonaktif, jadi setoran tidak bisa diproses. Arahkan anggota ke kantor cabang untuk aktivasi.</p></div>`;
    } else {
      state.member = { id, ...m };
      card.innerHTML = `<div class="m-card">
        <div class="m-row" style="padding:0 0 8px;border-bottom:1px solid var(--line)"><div><strong>${m.nama}</strong><div class="m-note">ID ${id} · ${m.pasar}</div></div><span class="badge badge-green">Aktif</span></div>
        <div class="m-row"><span>Saldo simpanan</span><strong>${rupiah(m.saldo)}</strong></div>
        <div class="m-row"><span>Sisa pembiayaan</span><strong>${rupiah(m.sisa)}</strong></div></div>`;
    }
    const btn = $("#btnToInput");
    btn.disabled = !state.member;
    btn.textContent = m && !m.aktif ? "Lanjut ke setoran (tidak tersedia)" : "Lanjut ke setoran";
  }
  $("#btnScan").addEventListener("click", () => pickMember("04312"));
  $("#btnShowSearch").addEventListener("click", (e) => {
    const box = $("#searchBox");
    box.hidden = !box.hidden;
    e.currentTarget.setAttribute("aria-expanded", String(!box.hidden));
    if (!box.hidden) $("#srcId").focus();
  });
  $("#searchBox").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("#srcId").value.trim();
    if (!/^\d{5}$/.test(id)) { setFieldError($("#srcId"), "ID anggota terdiri dari 5 digit angka"); return; }
    setFieldError($("#srcId"), "");
    pickMember(id);
  });
  $("#btnToInput").addEventListener("click", () => {
    const m = state.member;
    $("#inMember").textContent = `${m.nama} · ${m.id}`;
    $("#inSaldo").textContent = `Saldo ${rupiah(m.saldo)}`;
    $("#nominal").value = "";
    setFieldError($("#nominal"), "");
    show("m03");
  });

  // ---------- M-03 Input setoran ----------
  App.bindRupiahInput($("#nominal"));
  $$("[data-jenis]").forEach((b) => b.addEventListener("click", () => {
    state.jenis = b.dataset.jenis;
    $$("[data-jenis]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (state.jenis === "Angsuran") toast(`Angsuran ditautkan ke pembiayaan aktif ${state.member.nama} (sisa ${rupiah(state.member.sisa)}).`);
  }));
  $("#depositForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = parseRupiah($("#nominal").value);
    const m = state.member;
    let err = "";
    if (!n) err = "Nominal setoran wajib diisi";
    else if (n < MIN || n > MAX) err = "Nominal di luar batas cabang Rp10.000 sampai Rp5.000.000";
    else if (state.jenis === "Angsuran" && n > m.sisa) err = `Angsuran melebihi sisa pembiayaan ${rupiah(m.sisa)}`;
    setFieldError($("#nominal"), err);
    if (err) { $("#nominal").focus(); return; }

    const resi = `TRX-260929-${String(state.resiSeq++).padStart(4, "0")}`;
    const tx = { ang: m.id, jenis: state.jenis, nominal: n, status: "pending", resi };
    state.hist.unshift(tx);
    if (state.jenis === "Simpanan") m.saldo += n; else m.sisa -= n;
    MEMBERS[m.id].saldo = m.saldo; MEMBERS[m.id].sisa = m.sisa;
    state.last = tx;
    renderResi(0);
    show("m05");
    if (state.online) {
      await wait(500); renderResi(1);
      await wait(600); tx.status = "sync"; renderResi(2);
      toast(`Resi ${resi} tercetak. Notifikasi dikirim ke anggota.`);
    } else {
      toast(`Resi ${resi} tercetak dengan tanda "belum tersinkron".`);
    }
    updateCount();
  });

  function renderResi(step) {
    const tx = state.last, m = state.member;
    const done = step === 2;
    $("#m05t").textContent = done ? "Setoran tercatat di server" : state.online ? "Mengirim ke server…" : "Setoran tersimpan di HP";
    $("#resiNo").textContent = "No. resi " + tx.resi;
    const labels = ["Disimpan di HP", "Dikirim", "Tercatat server"];
    $("#syncTrack").innerHTML = labels.map((l, i) => `<li class="${i < step || done ? "done" : i === step ? "current" : ""}"><span class="d" aria-hidden="true"></span>${l}</li>`).join("");
    $("#resiBody").innerHTML = `
      <div class="m-row"><span>Nama</span><strong>${m.nama}</strong></div>
      <div class="m-row"><span>Jenis</span><strong>${tx.jenis === "Simpanan" ? "Simpanan tunai" : "Angsuran pembiayaan"}</strong></div>
      <div class="m-row"><span>Nominal</span><strong>${rupiah(tx.nominal)}</strong></div>
      <div class="m-row" style="border-top:1px solid var(--line);margin-top:4px;padding-top:10px">
        <strong>${tx.jenis === "Simpanan" ? "Saldo baru" : "Sisa pembiayaan baru"}</strong><strong>${rupiah(tx.jenis === "Simpanan" ? m.saldo : m.sisa)}</strong></div>
      <div class="m-row"><span>Status server</span><span class="badge ${done ? "badge-green" : "badge-amber"}">${done ? "Tersinkron" : "Belum tersinkron"}</span></div>`;
    $("#resiNote").textContent = done
      ? "Notifikasi WhatsApp terkirim ke nomor anggota setelah server mengonfirmasi."
      : state.online ? "Menunggu konfirmasi server." : "HP sedang offline. Transaksi dikirim otomatis begitu sinyal kembali.";
  }
  $("#btnReprint").addEventListener("click", () => toast(`Resi ${state.last.resi} dikirim ulang ke printer. Transaksi tidak diproses dua kali.`));
  $("#btnDone").addEventListener("click", () => {
    state.member = null;
    $("#memberCard").innerHTML = "";
    $("#btnToInput").disabled = true;
    show("m02");
  });

  // ---------- M-04 Riwayat ----------
  const pending = () => state.hist.filter((h) => h.status === "pending");
  function updateCount() {
    const n = pending().length;
    $("#pendCount").textContent = n ? n : "";
    $("#pendCount").hidden = !n;
    $("#pendCount").setAttribute("aria-label", n ? `${n} menunggu sinkron` : "");
  }
  function renderHist() {
    const p = pending().length;
    const rej = state.hist.filter((h) => h.status === "rejected").length;
    let banner;
    if (p) banner = `<div class="notice notice-amber" style="margin-bottom:12px"><strong>${p} transaksi menunggu sinkron</strong><br><span style="font-weight:400;font-size:.82rem">${state.online ? "Tekan Sinkronkan sekarang untuk mengirim." : "Dikirim otomatis begitu sinyal kembali. Resinya sudah ditandai \"belum tersinkron\"."}</span></div>`;
    else if (state.syncedNow) banner = `<div class="notice notice-green" style="margin-bottom:12px"><strong>Sinkronisasi selesai${rej ? ` · ${rej} ditolak server` : ""}</strong><br><span style="font-weight:400;font-size:.82rem">${state.syncedNow} resi tercatat di server.${rej ? " Transaksi yang ditolak perlu dicek kasir." : ""}</span></div>`;
    else banner = "";
    $("#syncBanner").innerHTML = banner;

    $("#histList").innerHTML = state.hist.length ? state.hist.map((h) => {
      const b = { sync: ["Tersinkron", "badge-green"], pending: ["Belum tersinkron", "badge-amber"], rejected: ["Ditolak", "badge-red"] }[h.status];
      return `<div class="hist-item"><div class="top"><span>${h.ang} · ${h.jenis}</span><span class="num">${rupiah(h.nominal)}</span></div>
        <div class="bottom"><span>${h.status === "rejected" ? "Perlu dicek kasir" : "Resi tercetak"}</span><span class="badge ${b[1]}">${b[0]}</span></div>
        ${h.why ? `<div class="why">${h.why}</div>` : ""}</div>`;
    }).join("") : `<div class="state"><h3>Belum ada setoran hari ini</h3><p>Setoran yang dicatat akan muncul di sini.</p></div>`;

    const btn = $("#btnSync");
    if (p) {
      btn.textContent = "Sinkronkan sekarang";
      btn.className = "btn btn-secondary btn-block";
      btn.disabled = !state.online;
      btn.dataset.mode = "sync";
    } else {
      btn.textContent = "Kembali ke scan";
      btn.className = "btn btn-primary btn-block";
      btn.disabled = false;
      btn.dataset.mode = "back";
    }
    updateCount();
  }
  async function syncNow() {
    const p = pending();
    if (!p.length) return;
    const btn = $("#btnSync");
    btn.disabled = true; btn.textContent = "Mengirim…";
    await wait(900);
    p.forEach((h) => { h.status = "sync"; });
    state.syncedNow += p.length;
    renderHist();
    toast(`Mengirim ${p.length} transaksi tertunda. Semua tercatat di server.`);
  }
  $("#btnSync").addEventListener("click", (e) => {
    if (e.currentTarget.dataset.mode === "back") show("m02"); else syncNow();
  });

  // ---------- Lompat layar (panel samping) ----------
  $("#jumpSel").addEventListener("change", (e) => {
    const j = e.target.value;
    if (j === "m02b") { show("m02"); pickMember("04377"); $("#jumpSel").value = "m02b"; return; }
    if (j === "m02") { show("m02"); pickMember("04312"); return; }
    if (j === "m03") { pickMember("04312"); $("#btnToInput").click(); return; }
    show(j);
  });

  renderNet();
  updateCount();
  show("m01");
  // Fokus awal jangan dicuri dari skip link saat halaman dibuka.
  document.activeElement.blur();
})();
