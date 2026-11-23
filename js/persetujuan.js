// Modul Digital Approval & Workflow (PIC: Izzudin Ahmad Yasin)
// US-02 Eksekusi keputusan pembiayaan: A-01 Antrean persetujuan.
(function () {
  const { $, $$, rupiahSpaced, esc, toast, checkIcon } = App;

  const ROLE = "Komite Pembiayaan";
  const DEMO_PIN = "123456";

  const items = [
    { id: "PB-0142", nama: "Bpk. Slamet Riyadi", usaha: "Warung Sembako A", sub: "Warung Sembako A · skor 72", nominal: 15000000, akad: "Murabahah",
      posisi: "Keputusan komite", pj: "Komite Pembiayaan", risiko: "Risiko sedang · 72", status: "menunggu",
      timeline: [
        ["Pengajuan dibuat", "Analis Kredit · 26/09/2026 09.10"],
        ["Verifikasi berkas", "Admin Verifikasi · 26/09/2026 09.25"],
        ["Analisis & scoring", "Skor 72 · Analis Kredit · 26/09/2026 09.42"],
        ["Keputusan komite", "Menunggu keputusan Anda"],
        ["Pencairan", "Setelah disetujui"],
      ], current: 3, log: [] },
    { id: "PB-0136", nama: "H. Ahmad", sub: "Pasar Besar", nominal: 25000000, posisi: "Approval manajer", pj: "Manajer Cabang", status: "menunggu", current: 3 },
    { id: "PB-0135", nama: "Siti Nurhaliza", sub: "Pasar Dinoyo", nominal: 15750000, posisi: "Verifikasi admin", pj: "Admin Verifikasi", status: "menunggu", current: 1 },
    { id: "PB-0134", nama: "Budi Santoso", sub: "Pasar Besar", nominal: 50000000, posisi: "Approval direktur", pj: "Direktur", status: "menunggu", current: 3 },
    { id: "PB-0133", nama: "Dewi Lestari", sub: "Pasar Dinoyo", nominal: 12500000, posisi: "Approval manajer", pj: "Manajer Cabang", status: "menunggu", current: 3 },
  ];

  const posBadge = (p) => ({ "Keputusan komite": "badge-amber", "Verifikasi admin": "badge-grey", Disetujui: "badge-green", Ditolak: "badge-red", "Dikembalikan ke analis": "badge-grey" }[p] || "badge-blue");

  const filters = [
    { key: "menunggu", label: "Menunggu keputusan" },
    { key: "semua", label: "Semua" },
    { key: "disetujui", label: "Disetujui" },
    { key: "ditolak", label: "Ditolak" },
  ];
  let filter = "menunggu";
  let selected = "PB-0142";
  let pinFails = 0;
  let pinLocked = false;

  function count(k) { return k === "semua" ? items.length : items.filter((i) => i.status === k).length; }

  function renderFilters() {
    $("#filterSeg").innerHTML = filters.map((f) =>
      `<button type="button" aria-pressed="${f.key === filter}" data-f="${f.key}">${f.label}<span class="count">${count(f.key)}</span></button>`).join("");
  }
  $("#filterSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    filter = b.dataset.f;
    renderFilters();
    renderQueue();
  });

  function visible() { return filter === "semua" ? items : items.filter((i) => i.status === filter); }

  function renderQueue() {
    const rows = visible();
    if (!rows.length) {
      $("#queue").innerHTML = `<div style="padding:20px"><div class="state"><h3>Tidak ada pengajuan di daftar ini</h3>
        <p>Belum ada pengajuan dengan status tersebut. Pilih saringan lain untuk melihat antrean.</p>
        <button class="btn btn-secondary" type="button" data-all>Tampilkan semua</button></div></div>`;
      return;
    }
    $("#queue").innerHTML = `<div class="table-wrap"><table><caption class="sr-only">Antrean pengajuan pembiayaan</caption>
      <thead><tr><th>ID</th><th>Anggota / usaha</th><th>Nominal</th><th>Posisi</th><th>Penanggung jawab</th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="${r.id === selected ? "is-selected" : ""}" data-row="${r.id}">
        <td><button type="button" class="row-select" data-sel="${r.id}" aria-pressed="${r.id === selected}">${r.id}<span class="sr-only">, lihat rincian</span></button></td>
        <td>${esc(r.nama)}<span class="sub">${esc(r.sub)}</span></td>
        <td class="num">${rupiahSpaced(r.nominal)}</td>
        <td><span class="badge ${posBadge(r.posisi)}">${r.posisi}</span></td>
        <td>${r.pj}</td></tr>`).join("")}</tbody></table></div>
      <p class="field-hint" style="padding:12px 16px">Baris yang dipilih tampil rinciannya di panel kanan.</p>`;
  }
  $("#queue").addEventListener("click", (e) => {
    if (e.target.closest("[data-all]")) { filter = "semua"; renderFilters(); renderQueue(); return; }
    const row = e.target.closest("[data-row]");
    if (!row) return;
    selected = row.dataset.row;
    renderQueue();
    renderDetail();
    if (window.matchMedia("(max-width: 980px)").matches) $("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function timelineOf(it) {
    if (it.timeline) return it.timeline;
    return [
      ["Pengajuan dibuat", ""], ["Verifikasi berkas", ""], ["Analisis & scoring", ""],
      [it.posisi.startsWith("Approval") ? it.posisi.replace("Approval", "Approval") : "Keputusan", it.current === 3 ? `Menunggu ${it.pj}` : ""],
      ["Pencairan", ""],
    ];
  }

  function renderDetail() {
    const it = items.find((i) => i.id === selected);
    const tl = timelineOf(it);
    const canDecide = it.pj === ROLE && it.status === "menunggu";
    const rows = [["Anggota", it.nama], it.usaha ? ["Usaha", it.usaha] : null, ["Nominal", rupiahSpaced(it.nominal)], it.akad ? ["Akad", it.akad] : null].filter(Boolean);
    $("#detail").innerHTML = `
      <div class="card-head"><h2>${it.id}</h2>${it.risiko ? `<span class="badge badge-amber">${it.risiko}</span>` : ""}</div>
      <dl style="margin:0 0 18px">${rows.map(([k, v]) => `<div class="kv"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      <h3 style="margin-bottom:12px">Jalur persetujuan</h3>
      <ol class="track-v">${tl.map(([t, s], i) => {
        const cls = i < it.current ? "done" : i === it.current ? "current" : "";
        return `<li class="${cls}"><span class="dot" aria-hidden="true">${i < it.current ? checkIcon : ""}</span>
          <div><div class="t">${t}<span class="sr-only">${i < it.current ? " (selesai)" : i === it.current ? " (posisi sekarang)" : ""}</span></div>${s ? `<div class="s">${esc(s)}</div>` : ""}</div></li>`;
      }).join("")}</ol>
      ${it.timeline ? "" : '<p class="field-hint">Waktu dan pelaksana tiap tahap belum ada di data contoh untuk pengajuan ini.</p>'}
      <p class="field-hint" style="margin:6px 0 16px">Jejak audit tidak bisa diubah. Setiap keputusan tercatat dengan peran dan waktu.</p>
      ${it.log && it.log.length ? `<h3 style="margin-bottom:6px">Jejak audit</h3>${it.log.map((l) =>
        `<div class="list-row"><div><strong>${l.aksi}</strong><span class="sub">${l.peran} · ${l.waktu}</span>${l.catatan ? `<span class="sub">Catatan: ${esc(l.catatan)}</span>` : ""}</div></div>`).join("")}` : ""}
      ${canDecide ? `
        <form id="decisionForm" novalidate>
          <div class="field">
            <label for="notes">Catatan keputusan (wajib bila menolak atau mengembalikan)</label>
            <textarea class="textarea" id="notes" placeholder="Tulis alasan atau syarat persetujuan"></textarea>
          </div>
          ${pinLocked ? '<p class="notice notice-red" style="margin-top:12px">PIN salah 3 kali. Aksi persetujuan diblokir sementara dan peringatan keamanan dicatat.</p>' : ""}
          <div class="actions" style="justify-content:space-between">
            <button type="button" class="btn btn-danger" data-d="tolak">Tolak</button>
            <span style="display:flex;gap:10px;flex-wrap:wrap">
              <button type="button" class="btn btn-secondary" data-d="kembali">Kembalikan</button>
              <button type="button" class="btn btn-primary" data-d="setuju" ${pinLocked ? "disabled" : ""}>Setujui</button>
            </span>
          </div>
        </form>`
      : `<p class="notice ${it.status === "menunggu" ? "notice-amber" : "notice-green"}">${it.status === "menunggu"
          ? `Keputusan tahap ini ada pada ${it.pj}. Anda bisa memantau posisinya, tetapi tidak bisa memutuskan.`
          : `Keputusan sudah tercatat: ${it.posisi}.`}</p>`}`;
  }

  // ---------- Keputusan ----------
  let pending = null;
  $("#detail").addEventListener("click", (e) => {
    const b = e.target.closest("[data-d]");
    if (!b) return;
    const it = items.find((i) => i.id === selected);
    const notes = $("#notes");
    const text = notes.value.trim();
    if ((b.dataset.d === "tolak" || b.dataset.d === "kembali") && !text) {
      App.setFieldError(notes, "Catatan wajib diisi sebelum menolak atau mengembalikan pengajuan.");
      notes.focus();
      return;
    }
    App.setFieldError(notes, "");
    pending = { it, act: b.dataset.d, text };
    const label = { tolak: "menolak", kembali: "mengembalikan ke analis", setuju: "menyetujui" }[b.dataset.d];
    $("#pinSub").textContent = `Anda akan ${label} ${it.id} (${rupiahSpaced(it.nominal)}). Keputusan tercatat permanen di jejak audit.`;
    $("#pinInput").value = "";
    $("#pinErr").textContent = "";
    $("#pinDialog").showModal();
  });

  $("#pinCancel").addEventListener("click", () => $("#pinDialog").close());
  $("#pinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#pinInput").value;
    if (!/^\d{6}$/.test(v)) { $("#pinErr").textContent = "PIN harus 6 digit angka."; return; }
    if (v !== DEMO_PIN) {
      pinFails++;
      if (pinFails >= 3) {
        pinLocked = true;
        $("#pinDialog").close();
        toast("PIN salah 3 kali. Aksi persetujuan diblokir sementara.");
        renderDetail();
        return;
      }
      $("#pinErr").textContent = `PIN otorisasi tidak cocok. Sisa percobaan ${3 - pinFails}.`;
      return;
    }
    pinFails = 0;
    $("#pinDialog").close();
    applyDecision();
  });

  function applyDecision() {
    const { it, act, text } = pending;
    const waktu = App.nowStamp();
    if (act === "setuju") {
      it.status = "disetujui"; it.posisi = "Disetujui"; it.current = 4;
      it.timeline[3] = ["Keputusan komite", `Disetujui · ${ROLE} · ${waktu}`];
      it.timeline[4] = ["Pencairan", "Siap dicairkan teller (READY_TO_DISBURSE)"];
      it.pj = "Teller";
      toast(`${it.id} disetujui dan diteruskan ke tahap pencairan.`);
    } else if (act === "tolak") {
      it.status = "ditolak"; it.posisi = "Ditolak"; it.current = 4;
      it.timeline[3] = ["Keputusan komite", `Ditolak · ${ROLE} · ${waktu}`];
      it.timeline[4] = ["Pencairan", "Tidak dilanjutkan"];
      toast(`${it.id} ditolak. Alasannya tercatat di jejak audit.`);
    } else {
      it.status = "dikembalikan"; it.posisi = "Dikembalikan ke analis"; it.current = 2; it.pj = "Analis Kredit";
      it.timeline[2] = ["Analisis & scoring", "Dikembalikan untuk revisi analis"];
      it.timeline[3] = ["Keputusan komite", "Menunggu revisi"];
      toast(`${it.id} dikembalikan ke analis beserta catatan.`);
    }
    it.log.push({ aksi: { setuju: "APPROVE", tolak: "REJECT", kembali: "REVISE" }[act], peran: ROLE, waktu, catatan: text });
    renderFilters();
    renderQueue();
    renderDetail();
  }

  renderFilters();
  renderQueue();
  renderDetail();
})();
