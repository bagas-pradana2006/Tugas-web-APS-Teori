// Modul Digital Credit Assessment (PIC: Ibrahim Bagas Pradana)
// US-04 Hitung credit score otomatis: S-01..S-04 dan US04-01..US04-06.
(function () {
  const { $, $$, rupiah, rupiahSpaced, parseRupiah, esc, toast, wait, renderTrack, setFieldError } = App;

  const STEPS = ["Draft", "Data lengkap", "Terskor", "Review analis", "Diajukan ke komite"];
  const FACTORS = [
    { name: "Histori simpanan", short: "Histori simpanan", src: "Riwayat_Keuangan" },
    { name: "Histori pembiayaan (kolektibilitas)", short: "Histori pembiayaan", src: "Riwayat_Keuangan" },
    { name: "Karakteristik dan kapasitas usaha", short: "Kapasitas usaha", src: "Data_Usaha" },
    { name: "Rasio pengajuan terhadap kapasitas bayar dan agunan", short: "Rasio pengajuan", src: "Pengajuan, Data_Usaha" },
  ];

  // Data contoh dari Figma "HIFI Bagas" dan laporan kelompok.
  const MEMBERS = {
    "ANG-MLG-042": {
      nama: "Bpk. Slamet Riyadi", inisial: "SR", pasar: "Pasar Besar Malang", status: "Aktif",
      simpanan: 12400000, pembiayaanLalu: "2 kali", kolek: "Lancar",
      riwayat: [
        ["22/09/2026", "Simpanan", 200000, ""],
        ["15/09/2026", "Angsuran", 1250000, "Lancar"],
        ["08/09/2026", "Simpanan", 200000, ""],
        ["15/08/2026", "Angsuran", 1250000, "Lancar"],
        ["01/08/2026", "Simpanan", 300000, ""],
      ],
    },
    "ANG-MLG-077": { nama: "Ibu Siti Aminah", inisial: "SA", pasar: "", status: "Aktif", riwayat: null },
  };

  const CASES = {
    "PB-0142": {
      id: "ANG-MLG-042", usaha: "Warung Sembako A", jumlah: 15000000, akad: "Murabahah", tujuan: "Modal kerja",
      jenis: "Warung sembako", lama: 5, omzet: 20000000, kapasitas: 3000000, agunan: "BPKB motor",
      ratio: [21 / 25, 20 / 25, 18 / 30, 13 / 20], waktu: "26/09/2026 09.42",
    },
    "PB-0157": {
      id: "ANG-MLG-077", usaha: "Toko Kelontong B", jumlah: 25000000, akad: "Murabahah", tujuan: "Modal kerja",
      jenis: "Toko kelontong", lama: 1, omzet: 9000000, kapasitas: 1500000, agunan: "Surat keterangan usaha",
      ratio: [12 / 25, 14 / 25, 15 / 30, 13 / 20], waktu: "26/09/2026 10.15",
    },
  };

  const versions = [
    { v: 1, date: "01/05/2026", w: [25, 25, 25, 25] },
    { v: 2, date: "01/07/2026", w: [20, 30, 30, 20] },
    { v: 3, date: "01/09/2026", w: [25, 25, 30, 20] },
  ];
  let activeVersion = versions[2];

  const history = [
    { id: "PB-0142", tgl: "2026-09-26", usaha: "Warung Sembako A", ang: "ANG-MLG-042", skor: 72, kat: "Sedang", status: "Review analis", analis: "Analis 17" },
    { id: "PB-0141", tgl: "2026-09-25", usaha: "Pedagang Buah B", ang: "ANG-MLG-031", skor: 85, kat: "Rendah", status: "Diajukan ke komite", analis: "Analis 17" },
    { id: "PB-0140", tgl: "2026-09-24", usaha: "Kios Pulsa C", ang: "ANG-MLG-108", skor: 54, kat: "Tinggi", status: "Survei lanjutan", analis: "Analis 22" },
    { id: "PB-0139", tgl: "2026-09-23", usaha: "Toko Kelontong D", ang: "ANG-MLG-076", skor: 91, kat: "Rendah", status: "Diajukan ke komite", analis: "Analis 22" },
    { id: "PB-0138", tgl: "2026-09-22", usaha: "Lapak Sayur E", ang: "ANG-MLG-019", skor: 63, kat: "Sedang", status: "Diajukan ke komite", analis: "Analis 17" },
    { id: "PB-0137", tgl: "2026-09-21", usaha: "Warung Makan F", ang: "ANG-MLG-089", skor: 47, kat: "Tinggi", status: "Survei lanjutan", analis: "Analis 22" },
  ];

  const state = {
    caseId: "PB-0142",
    memberOk: false,
    files: [],
    results: {},      // caseId -> hasil penilaian
    shown: null,      // caseId yang tampil di tab hasil
    attempted: false,
    cbsFailed: false,
  };

  const statusBadge = (s) => ({
    "Review analis": "badge-blue", "Survei lanjutan": "badge-amber", "Diajukan ke komite": "badge-green",
  }[s] || "badge-grey");
  const katBadge = (k) => ({ Rendah: "badge-green", Sedang: "badge-amber", Tinggi: "badge-red" }[k]);
  const fmtDate = (iso) => iso.split("-").reverse().join("/");

  // ---------- Tab ----------
  const tabCtl = App.tabs($("#subTabs"), (hash) => {
    $("#roleChip").innerHTML = '<span class="sr-only">Masuk sebagai: </span>' +
      (hash === "parameter" ? "Admin Scoring · Kantor Pusat" : "Analis Kredit");
  });

  // ---------- Formulir ----------
  const form = $("#appForm");
  const required = ["fJumlah", "fAkad", "fTujuan", "fJenis", "fLama", "fOmzet", "fKapasitas", "fAgunan"].map((id) => $("#" + id));
  $$("[data-rupiah]", form).forEach(App.bindRupiahInput);

  function loadCase(caseId) {
    const c = CASES[caseId];
    state.caseId = caseId;
    state.attempted = false;
    state.cbsFailed = false;
    $("#fId").value = c.id;
    $("#fJumlah").value = rupiahSpaced(c.jumlah);
    $("#fAkad").value = c.akad;
    $("#fTujuan").value = c.tujuan;
    $("#fJenis").value = c.jenis;
    $("#fLama").value = c.lama;
    $("#fOmzet").value = rupiahSpaced(c.omzet);
    $("#fKapasitas").value = rupiahSpaced(c.kapasitas);
    $("#fAgunan").value = c.agunan;
    lookupMember(false);
    [$("#fId"), ...required].forEach((f) => setFieldError(f, ""));
    $("#formAlert").hidden = true;
    $("#btnHitung").textContent = "Hitung skor";
    refreshForm();
  }

  function lookupMember(announce) {
    const id = $("#fId").value.trim().toUpperCase();
    $("#fId").value = id;
    const m = MEMBERS[id];
    if (!id) {
      state.memberOk = false;
      $("#fNama").value = "";
      setFieldError($("#fId"), announce ? "ID anggota wajib diisi" : "");
    } else if (!m) {
      state.memberOk = false;
      $("#fNama").value = "";
      setFieldError($("#fId"), "ID anggota tidak ditemukan di sistem inti");
    } else {
      state.memberOk = true;
      $("#fNama").value = m.nama;
      setFieldError($("#fId"), "");
      if (announce) toast(`Anggota ${id} ditemukan. Riwayat diambil dari sistem inti.`);
    }
    renderMember();
    refreshForm();
  }

  function renderMember() {
    const box = $("#memberBox");
    const id = $("#fId").value.trim();
    const m = state.memberOk ? MEMBERS[id] : null;
    if (!m) {
      box.innerHTML = `<div class="state"><h3>Belum ada anggota dipilih</h3><p>Isi ID anggota lalu tekan Cari untuk membaca riwayat dari sistem inti BMT.</p></div>`;
      return;
    }
    let html = `<div class="member-head"><span class="avatar-initial" aria-hidden="true">${m.inisial}</span>
      <div><div class="name">${esc(m.nama)}</div><div class="meta">${esc(id)}${m.pasar ? " · " + esc(m.pasar) : ""}</div></div>
      <span class="badge badge-green">${m.status}</span></div>`;
    if (!m.riwayat) {
      html += `<div class="state"><h3>Riwayat belum tersedia di data contoh</h3><p>Laporan kelompok hanya memuat riwayat untuk ANG-MLG-042. Pada sistem asli, riwayat dibaca dari sistem inti BMT.</p></div>`;
    } else {
      html += `<div class="minis">
        <div class="mini"><span>Total simpanan</span><strong>${rupiahSpaced(m.simpanan)}</strong></div>
        <div class="mini"><span>Pembiayaan lalu</span><strong>${m.pembiayaanLalu}</strong></div>
        <div class="mini"><span>Kolektibilitas</span><strong>${m.kolek}</strong></div></div>
        <h3 style="font-size:.9rem;margin-bottom:8px">Simpanan dan angsuran (5 terakhir)</h3>
        <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Kolekt.</th></tr></thead><tbody>
        ${m.riwayat.map((r) => `<tr><td class="num">${r[0]}</td><td>${r[1]}</td><td class="num">${rupiahSpaced(r[2])}</td><td>${r[3] ? `<span class="badge badge-green">${r[3]}</span>` : '<span aria-label="tidak ada">-</span>'}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="footnote" style="margin-top:10px">Dibaca dari sistem inti BMT, hanya bisa dilihat.</p>`;
    }
    box.innerHTML = html;
  }

  function fieldEmpty(f) {
    if (f.dataset.rupiah !== undefined) return parseRupiah(f.value) <= 0;
    if (f.type === "number") return !(Number(f.value) > 0);
    return !f.value.trim();
  }

  function missingFields() {
    const miss = required.filter(fieldEmpty);
    if (!state.memberOk) miss.unshift($("#fId"));
    return miss;
  }

  function errorText(f) {
    if (f.id === "fId") return $("#fId").value.trim() ? "Tekan Cari untuk memastikan anggota terdaftar" : "ID anggota wajib diisi";
    if (f.id === "fAkad") return "Akad wajib dipilih";
    return f.dataset.label + " wajib diisi";
  }

  function refreshForm() {
    const complete = missingFields().length === 0;
    const c = CASES[state.caseId];
    renderTrack($("#formTrack"), STEPS, complete ? 1 : 0);
    $("#formTitle").textContent = complete ? "Detail pengajuan" : "Pengajuan pembiayaan baru";
    $("#formSub").textContent = complete
      ? `${state.caseId} · ${c.usaha} · semua kolom wajib terisi. Tekan Hitung skor untuk menilai kelayakan secara otomatis.`
      : "Isi data pengajuan dan usaha anggota, lalu hitung skor kelayakan secara otomatis.";
    if (state.attempted) {
      required.forEach((f) => setFieldError(f, fieldEmpty(f) ? errorText(f) : ""));
      const miss = missingFields();
      if (miss.length) showAlert(`${miss.length} kolom wajib belum diisi. Status pengajuan tetap Draft dan skor belum bisa dihitung.`);
      else if (!state.cbsFailed) $("#formAlert").hidden = true;
    }
  }

  function showAlert(msg) {
    const a = $("#formAlert");
    a.textContent = msg;
    a.hidden = false;
  }

  form.addEventListener("input", (e) => {
    if (e.target.id === "fId") { state.memberOk = false; $("#fNama").value = ""; renderMember(); }
    refreshForm();
  });
  form.addEventListener("change", refreshForm);
  $("#btnCari").addEventListener("click", () => lookupMember(true));
  $("#fId").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); lookupMember(true); } });

  $("#btnDraft").addEventListener("click", () => {
    toast(`Draft ${state.caseId} disimpan. Pengajuan bisa dilanjutkan nanti dari Riwayat.`);
  });

  // ---------- Unggah berkas ----------
  const MAX = 5 * 1024 * 1024;
  const OK_TYPES = /\.(pdf|jpe?g|png)$/i;
  function addFiles(list) {
    const errs = [];
    Array.from(list).forEach((f) => {
      if (!OK_TYPES.test(f.name)) errs.push(`${f.name}: format harus PDF, JPG, atau PNG`);
      else if (f.size > MAX) errs.push(`${f.name}: lebih dari 5 MB`);
      else if (!state.files.some((x) => x.name === f.name)) state.files.push({ name: f.name, size: f.size });
    });
    $("#fileErr").textContent = errs.join(". ");
    renderFiles();
    if (list.length && !errs.length) toast(`${list.length} berkas ditambahkan ke pengajuan ${state.caseId}.`);
  }
  function renderFiles() {
    $("#fileChips").innerHTML = state.files.map((f, i) =>
      `<li class="chip">${esc(f.name)} <button type="button" data-rm="${i}" aria-label="Hapus ${esc(f.name)}">×</button></li>`).join("");
  }
  $("#fFiles").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
  $("#fileChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (!b) return;
    const [f] = state.files.splice(Number(b.dataset.rm), 1);
    renderFiles();
    toast(`${f.name} dihapus dari daftar berkas.`);
  });
  const dz = $("#dropzone");
  dz.tabIndex = 0;
  dz.setAttribute("role", "button");
  dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#fFiles").click(); } });
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("is-over"); }));
  dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  // ---------- Hitung skor ----------
  const dlg = $("#scoreDialog");
  let cancelled = false;
  $("#scoreCancel").addEventListener("click", () => { cancelled = true; dlg.close(); });
  dlg.addEventListener("cancel", () => { cancelled = true; });

  function compute(caseId, version) {
    const c = CASES[caseId];
    const parts = c.ratio.map((r, i) => ({ ...FACTORS[i], max: version.w[i], val: Math.round(r * version.w[i]) }));
    const skor = parts.reduce((s, p) => s + p.val, 0);
    const kat = skor < 60 ? "Tinggi" : skor < 80 ? "Sedang" : "Rendah";
    const weakest = parts.reduce((a, b) => (a.val / a.max <= b.val / b.max ? a : b));
    return { caseId, skor, kat, parts, weakest, version: version.v, waktu: c.waktu, status: "Review analis", step: 3 };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    state.attempted = true;
    const miss = missingFields();
    if (miss.length) {
      setFieldError($("#fId"), state.memberOk ? "" : errorText($("#fId")));
      refreshForm();
      miss[0].focus();
      return;
    }
    state.cbsFailed = false;
    $("#formAlert").hidden = true;
    const c = CASES[state.caseId];
    const steps = [
      "Memeriksa kelengkapan data wajib",
      "Mengambil riwayat keuangan dari Sistem Inti BMT",
      `Menghitung skor dengan bobot v${activeVersion.v} (aktif)`,
      "Menentukan kategori risiko dan faktor terlemah",
    ];
    $("#scoreDlgSub").textContent = `${state.caseId} · ${c.usaha}. Mohon tunggu, maksimal 3 detik.`;
    const list = $("#scoreSteps");
    list.innerHTML = steps.map((s) => `<li class="wait">${s}</li>`).join("");
    cancelled = false;
    dlg.showModal();
    const items = $$("li", list);
    for (let i = 0; i < items.length; i++) {
      await wait(550);
      if (cancelled) { toast("Perhitungan skor dibatalkan. Status tetap Data lengkap."); return; }
      if (i === 1 && $("#simCbsDown").checked) {
        dlg.close();
        state.cbsFailed = true;
        showAlert("Riwayat keuangan gagal diambil dari Sistem Inti BMT (waktu habis). Skor belum dihitung dan status tetap Data lengkap. Silakan coba lagi.");
        $("#btnHitung").textContent = "Coba lagi";
        $("#formAlert").focus?.();
        return;
      }
      items[i].className = "ok";
    }
    await wait(300);
    dlg.close();
    $("#btnHitung").textContent = "Hitung skor";
    // Tanggal penilaian mengikuti data contoh (September 2026) agar konsisten dengan filter riwayat.
    const res = compute(state.caseId, activeVersion);
    state.results[state.caseId] = res;
    upsertHistory(res);
    state.shown = state.caseId;
    renderHasil();
    tabCtl.select("hasil");
    toast(`Skor ${state.caseId} selesai dihitung: ${res.skor}/100.`);
  });

  function upsertHistory(res) {
    const c = CASES[res.caseId];
    const row = history.find((h) => h.id === res.caseId);
    const [d, m, y] = res.waktu.split(" ")[0].split("/");
    const data = { id: res.caseId, tgl: `${y}-${m}-${d}`, usaha: c.usaha, ang: c.id, skor: res.skor, kat: res.kat, status: res.status, analis: "Analis Kredit" };
    if (row) Object.assign(row, data); else history.unshift(data);
    renderHistory();
  }

  // ---------- Hasil assessment ----------
  function renderHasil() {
    const body = $("#hasilBody");
    const res = state.shown && state.results[state.shown];
    if (!res) {
      $("#hasilSub").textContent = "Belum ada pengajuan yang dinilai.";
      body.innerHTML = `<div class="card"><div class="state"><h3>Belum ada hasil assessment</h3>
        <p>Lengkapi data pengajuan lalu tekan Hitung skor, atau buka hasil lama dari Riwayat assessment.</p>
        <button type="button" class="btn btn-secondary" data-goto="baru">Buka pengajuan</button></div></div>`;
      return;
    }
    const c = CASES[res.caseId];
    const m = MEMBERS[c.id];
    $("#hasilSub").textContent = `${res.caseId} · ${c.usaha} · ${c.id} ${m.nama}`;
    const rec = { Rendah: "layak diajukan", Sedang: "layak dengan catatan", Tinggi: "perlu survei lanjutan" }[res.kat];
    const w = res.weakest;
    const note = res.kat === "Tinggi"
      ? `Skor ${res.skor} termasuk risiko tinggi. ${w.short} paling lemah (${w.val}/${w.max}). Lakukan survei lanjutan sebelum pengajuan diproses.`
      : res.kat === "Sedang"
        ? `Faktor ${w.short.toLowerCase()} masih lemah (${w.val}/${w.max}). Pertimbangkan survei lanjutan sebelum diajukan ke komite.`
        : `Semua faktor kuat. Faktor terendah: ${w.short.toLowerCase()} (${w.val}/${w.max}).`;
    const high = res.kat === "Tinggi";
    const decided = res.step === 4 || res.status === "Survei lanjutan";

    body.innerHTML = `
      <div class="card" style="margin-bottom:22px"><h2 class="sr-only">Jalur status pengajuan</h2><ol class="track" id="hasilTrack"></ol></div>
      <div class="layout-2">
        <section class="card" aria-labelledby="skorTitle">
          <h2 id="skorTitle">Skor kelayakan pembiayaan</h2>
          <div class="score-top">
            <div>
              <div class="score-num">${res.skor} <small>/100</small></div>
              <div class="score-rec"><span class="badge ${katBadge(res.kat)}">Risiko ${res.kat.toLowerCase()}</span> Rekomendasi sistem: ${rec}</div>
            </div>
            <div>
              <div class="scale-head"><strong>Skala risiko</strong><span>Skor ${res.skor} berada di rentang ${res.kat.toLowerCase()}</span></div>
              <div class="scale" role="img" aria-label="Skor ${res.skor} pada skala 0 sampai 100">
                <span></span><span></span><span></span><i class="marker" style="left:${res.skor}%"></i>
              </div>
              <div class="legend"><span><i style="background:var(--red)"></i>Tinggi &lt;60</span><span><i style="background:#8a5a00"></i>Sedang 60–79</span><span><i style="background:var(--brand-700)"></i>Rendah 80+</span></div>
            </div>
          </div>
          <h3 style="color:var(--brand-700);margin-bottom:4px">Faktor yang memengaruhi skor</h3>
          ${res.parts.map((p) => {
            const weak = p === w && res.kat !== "Rendah";
            return `<div class="factor${weak ? " weak" : ""}"><div class="factor-head"><span>${p.name} ${weak ? '<span class="badge badge-amber">Lemah</span>' : ""}</span><strong>${p.val} / ${p.max}</strong></div>
              <div class="bar${weak ? " weak" : ""}" role="img" aria-label="${p.val} dari ${p.max}"><span style="width:${(p.val / p.max) * 100}%"></span></div></div>`;
          }).join("")}
          <p class="notice notice-amber" style="margin-top:14px">${note}</p>
          <div class="actions" id="hasilActions">
            ${decided
              ? `<p class="field-hint">Status saat ini: <span class="badge ${statusBadge(res.status)}">${res.status}</span></p>`
              : high
                ? `<button class="btn btn-primary" data-act="survei">Minta survei lanjutan</button>
                   <button class="btn btn-secondary" disabled aria-describedby="komiteNote">Ajukan ke komite</button>
                   <span class="sr-only" id="komiteNote">Tidak tersedia untuk risiko tinggi sebelum survei lanjutan</span>`
                : `<button class="btn btn-secondary" data-act="survei">Minta survei lanjutan</button>
                   <button class="btn btn-primary" data-act="komite">Ajukan ke komite</button>`}
          </div>
        </section>
        <div class="stack">
          <section class="card"><h2>Ringkasan pengajuan</h2><dl style="margin:0">
            ${[["Jumlah pembiayaan", rupiahSpaced(c.jumlah)], ["Akad", c.akad], ["Tujuan", c.tujuan], ["Jenis usaha", c.jenis], ["Lama usaha", c.lama + " tahun"],
               ["Omzet bulanan", rupiahSpaced(c.omzet)], ["Kapasitas bayar", rupiahSpaced(c.kapasitas)], ["Agunan", c.agunan]]
               .map(([k, v]) => `<div class="kv"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
          </dl></section>
          <section class="card"><h2>Detail penilaian</h2><dl style="margin:0">
            <div class="kv"><dt>Versi bobot</dt><dd>v${res.version}${res.version === activeVersion.v ? " (aktif)" : ""}</dd></div>
            <div class="kv"><dt>Dinilai oleh</dt><dd>Analis Kredit</dd></div>
            <div class="kv"><dt>Waktu penilaian</dt><dd>${res.waktu}</dd></div>
            <div class="kv"><dt>Status</dt><dd><span class="badge ${statusBadge(res.status)}">${res.status}</span></dd></div>
          </dl><p class="footnote" style="margin-top:10px">Hasil lama tetap memakai versi bobot yang berlaku saat dinilai.</p></section>
        </div>
      </div>`;
    renderTrack($("#hasilTrack"), STEPS, res.step);
  }

  $("#hasilBody").addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto]");
    if (go) { tabCtl.select(go.dataset.goto); return; }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const res = state.results[state.shown];
    if (b.dataset.act === "komite") {
      res.step = 4; res.status = "Diajukan ke komite";
      toast(`${res.caseId} diajukan ke komite dan masuk antrean persetujuan.`);
    } else {
      res.status = "Survei lanjutan";
      toast(`Permintaan survei lanjutan untuk ${res.caseId} dikirim ke petugas lapangan.`);
    }
    const row = history.find((h) => h.id === res.caseId);
    if (row) row.status = res.status;
    renderHasil();
    renderHistory();
  });

  // ---------- Riwayat ----------
  const hf = { from: "2026-09-01", to: "2026-09-29", kat: "", status: "" };
  function renderHistory() {
    const rows = history.filter((h) => (!hf.from || h.tgl >= hf.from) && (!hf.to || h.tgl <= hf.to) &&
      (!hf.kat || h.kat === hf.kat) && (!hf.status || h.status === hf.status));
    const body = $("#histBody");
    if (!rows.length) {
      body.innerHTML = `<div style="padding:20px"><div class="state"><h3>Tidak ada assessment yang cocok</h3>
        <p>Ubah rentang tanggal atau kategori risiko, atau kembalikan filter ke semula.</p>
        <button type="button" class="btn btn-secondary" data-reset>Reset filter</button></div></div>`;
      return;
    }
    body.innerHTML = `<div class="table-wrap"><table><caption class="sr-only">Riwayat assessment</caption>
      <thead><tr><th>ID</th><th>Tanggal</th><th>Nama usaha</th><th>Anggota</th><th>Skor</th><th>Kategori</th><th>Status</th><th>Analis</th><th>Aksi</th></tr></thead>
      <tbody>${rows.map((h) => `<tr><td><strong>${h.id}</strong></td><td class="num">${fmtDate(h.tgl)}</td><td>${esc(h.usaha)}</td>
        <td style="color:var(--muted)">${h.ang}</td><td><strong>${h.skor}</strong></td><td><span class="badge ${katBadge(h.kat)}">${h.kat}</span></td>
        <td><span class="badge ${statusBadge(h.status)}">${h.status}</span></td><td>${h.analis}</td>
        <td><button type="button" class="btn-link" data-detail="${h.id}">Lihat detail<span class="sr-only"> ${h.id}</span></button></td></tr>`).join("")}</tbody></table></div>
      <p class="field-hint" style="padding:14px 18px">Menampilkan ${rows.length} hasil dari data contoh.</p>`;
  }
  $("#histFilter").addEventListener("submit", (e) => {
    e.preventDefault();
    const from = $("#hFrom").value, to = $("#hTo").value;
    if (from && to && from > to) { $("#hErr").textContent = "Tanggal dari tidak boleh setelah tanggal sampai."; return; }
    $("#hErr").textContent = "";
    Object.assign(hf, { from, to, kat: $("#hKat").value, status: $("#hStatus").value });
    renderHistory();
    toast("Filter diterapkan pada data contoh.");
  });
  function resetHist() {
    $("#hFrom").value = "2026-09-01"; $("#hTo").value = "2026-09-29"; $("#hKat").value = ""; $("#hStatus").value = "";
    $("#hErr").textContent = "";
    Object.assign(hf, { from: "2026-09-01", to: "2026-09-29", kat: "", status: "" });
    renderHistory();
    toast("Filter dikembalikan ke semula.");
  }
  $("#hReset").addEventListener("click", resetHist);
  $("#histBody").addEventListener("click", (e) => {
    if (e.target.closest("[data-reset]")) return resetHist();
    const b = e.target.closest("[data-detail]");
    if (!b) return;
    const id = b.dataset.detail;
    if (!CASES[id]) { toast("Rincian contoh di prototype ini hanya tersedia untuk PB-0142 dan PB-0157."); return; }
    if (!state.results[id]) {
      const row = history.find((h) => h.id === id);
      const r = compute(id, versions.find((v) => v.v === 3));
      r.status = row.status;
      if (row.status === "Diajukan ke komite") r.step = 4;
      state.results[id] = r;
    }
    state.shown = id;
    renderHasil();
    tabCtl.select("hasil");
  });

  // ---------- Parameter scoring ----------
  function renderWeights(w) {
    $("#weightRows").innerHTML = FACTORS.map((f, i) => `
      <div class="weight-row">
        <div><label for="w${i}" style="font-weight:600">${f.name}</label><p class="src">Sumber: ${f.src}</p>
          <div class="bar" aria-hidden="true"><span id="wb${i}" style="width:${w[i] * 2}%"></span></div></div>
        <div class="pct"><input class="input" id="w${i}" type="number" min="0" max="100" inputmode="numeric" value="${w[i]}"></div>
      </div>`).join("");
    checkWeights();
  }
  function currentWeights() { return FACTORS.map((_, i) => Number($("#w" + i).value) || 0); }
  function checkWeights() {
    const w = currentWeights();
    const total = w.reduce((a, b) => a + b, 0);
    w.forEach((v, i) => { $("#wb" + i).style.width = Math.min(100, v * 2) + "%"; });
    $("#weightTotal").textContent = total + "%";
    const ok = total === 100;
    const v = $("#weightValid");
    v.textContent = ok ? "Valid" : "Belum 100%";
    v.className = "badge " + (ok ? "badge-green" : "badge-red");
    const changed = w.join() !== activeVersion.w.join();
    $("#wSave").disabled = !(ok && changed);
  }
  $("#weightRows").addEventListener("input", checkWeights);
  $("#wCancel").addEventListener("click", () => { renderWeights(activeVersion.w); toast("Perubahan bobot dibatalkan."); });
  $("#weightForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const w = currentWeights();
    const nv = { v: versions.length + 1, date: App.nowStamp().split(" ")[0], w };
    versions.push(nv);
    const prev = activeVersion.v;
    activeVersion = nv;
    renderVersions();
    $("#activeVerBadge").textContent = "Versi aktif v" + nv.v;
    checkWeights();
    toast(`Versi bobot v${nv.v} disimpan dan langsung aktif. Hasil lama tetap memakai v${prev}.`);
  });
  function renderVersions() {
    $("#versionList").innerHTML = versions.slice().reverse().map((v) => {
      const on = v === activeVersion;
      return `<div class="version${on ? " active" : ""}"><div class="vh"><strong>v${v.v}</strong><span class="badge ${on ? "badge-green" : "badge-grey"}">${on ? "Aktif" : "Nonaktif"}</span></div>
        <p>Berlaku sejak ${v.date} · oleh Admin Scoring</p><p class="w">Simpanan / pembiayaan / usaha / rasio: ${v.w.join(" / ")}</p></div>`;
    }).join("");
  }

  // ---------- Panel uji ----------
  $("#simCase").addEventListener("change", (e) => { loadCase(e.target.value); toast(`Data contoh ${e.target.value} dimuat ke formulir.`); });

  // ---------- Mulai ----------
  loadCase("PB-0142");
  renderHasil();
  renderHistory();
  renderWeights(activeVersion.w);
  renderVersions();
})();
