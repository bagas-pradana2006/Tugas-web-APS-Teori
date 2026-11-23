// Modul Dashboard Monitoring (PIC: Adli Sejati)
// D-01 Monitoring anggota & pembiayaan + US-06 Ekspor laporan (QUEUED -> PROSES -> SELESAI / GAGAL).
(function () {
  const { $, rupiahSpaced, esc, toast, wait, toCSV, download } = App;

  const members = [
    { id: "ANG-MLG-012", nama: "H. Ahmad", wilayah: "Pasar Besar", jenis: "Murabahah", pokok: 15000000, dpd: 0, status: "Lancar" },
    { id: "ANG-MLG-089", nama: "Bpk. Sugeng", wilayah: "Pasar Dinoyo", jenis: "Modal kerja", pokok: 8500000, dpd: 35, status: "Menunggak" },
    { id: "ANG-MLG-104", nama: "Ibu Siti", wilayah: "Pasar Besar", jenis: "Musyarakah", pokok: 12000000, dpd: 62, status: "Menunggak" },
    { id: "ANG-MLG-117", nama: "Bpk. Rahman", wilayah: "Pasar Dinoyo", jenis: "Murabahah", pokok: 6750000, dpd: 12, status: "Dalam perhatian" },
  ];
  const badge = (s) => ({ Lancar: "badge-green", Menunggak: "badge-amber", "Dalam perhatian": "badge-blue", Macet: "badge-red" }[s]);
  const distrib = [["Lancar", 980, "var(--brand-700)"], ["Dalam perhatian", 170, "var(--blue)"], ["Menunggak", 75, "#8a5a00"], ["Macet", 25, "var(--red)"]];
  const totalDist = distrib.reduce((a, d) => a + d[1], 0);

  let applied = { wilayah: "", kolek: "", jenis: "", from: "2026-09-01", to: "2026-09-28" };
  const fmt = (iso) => iso.split("-").reverse().join("/");

  function filtered() {
    return members.filter((m) => (!applied.wilayah || m.wilayah === applied.wilayah) &&
      (!applied.kolek || m.status === applied.kolek) && (!applied.jenis || m.jenis === applied.jenis));
  }

  function renderLoading() {
    $("#content").innerHTML = `<div class="card" aria-busy="true"><div class="state"><div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
      <h3>Memuat watchlist dari sistem inti BMT</h3><p>Biasanya selesai dalam beberapa detik. Filter tetap bisa diubah selama data dimuat.</p></div></div>`;
  }
  function renderError() {
    $("#content").innerHTML = `<div class="card"><div class="state error" role="alert"><h3>Data belum bisa dimuat</h3>
      <p>Koneksi ke sistem inti BMT terputus. Coba lagi, atau hubungi Admin IT bila masih gagal.</p>
      <button type="button" class="btn btn-danger" id="btnRetry">Coba lagi</button></div></div>`;
  }

  function render() {
    const rows = filtered();
    const watch = rows.filter((m) => m.dpd >= 31 && m.dpd <= 90);
    const empty = (title) => `<div class="state"><h3>${title}</h3><p>Ubah filter wilayah, kolektibilitas, atau jenis pembiayaan, atau kembalikan ke semula.</p>
      <button type="button" class="btn btn-secondary" data-reset>Reset filter</button></div>`;
    $("#content").innerHTML = `
      <div class="kpi-strip" aria-label="Ringkasan cabang">
        <div class="kpi"><span>Total kas simpanan</span><strong>Rp 4.250.000.000</strong></div>
        <div class="kpi"><span>Pembiayaan aktif</span><strong>Rp 2.800.000.000</strong></div>
        <div class="kpi"><span>Anggota aktif</span><strong>1.250 anggota</strong></div>
        <div class="kpi"><span>Rasio NPL cabang</span><strong class="red">2,1%</strong> <span class="badge badge-red" style="display:inline-block">Di atas ambang</span></div>
      </div>
      <div class="layout-2">
        <section class="card" aria-labelledby="wlTitle">
          <div class="card-head"><h2 id="wlTitle">Pembiayaan yang perlu ditindaklanjuti</h2><span class="badge badge-red">${watch.length} pembiayaan</span></div>
          <p class="field-hint" style="margin:-6px 0 12px">Masuk watchlist bila hari menunggak (DPD) 31 sampai 90 hari; lebih dari 90 hari dikategorikan macet/NPL.</p>
          ${watch.length ? `<div class="table-wrap"><table><thead><tr><th>Anggota</th><th>Wilayah</th><th>Sisa pokok</th><th>DPD</th><th>Status</th></tr></thead><tbody>
            ${watch.map((m) => `<tr><td><strong>${esc(m.nama)}</strong></td><td>${m.wilayah}</td><td class="num">${rupiahSpaced(m.pokok)}</td><td class="num">${m.dpd} hari</td><td><span class="badge ${badge(m.status)}">${m.status}</span></td></tr>`).join("")}
            </tbody></table></div>` : empty("Tidak ada pembiayaan di watchlist untuk filter ini")}
        </section>
        <section class="card" aria-labelledby="distTitle">
          <h2 id="distTitle">Distribusi kolektibilitas</h2>
          ${distrib.map(([n, v, c]) => `<div class="factor"><div class="factor-head"><span>${n}</span><strong>${v} anggota</strong></div>
            <div class="bar" role="img" aria-label="${n}: ${v} dari ${totalDist} anggota"><span style="width:${(v / totalDist) * 100}%;background:${c}"></span></div></div>`).join("")}
          <p class="notice notice-red" style="margin-top:12px">Rasio NPL 2,1% melewati ambang cabang. Mulai dari pembiayaan di watchlist.</p>
        </section>
      </div>
      <section class="card" style="margin-top:22px" aria-labelledby="tblTitle">
        <div class="card-head"><h2 id="tblTitle">Data anggota &amp; pembiayaan</h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary" data-export="Excel">Ekspor Excel</button>
            <button type="button" class="btn btn-secondary" data-export="PDF">Ekspor PDF</button>
          </div></div>
        ${rows.length ? `<div class="table-wrap"><table><caption class="sr-only">Data anggota dan pembiayaan</caption><thead><tr><th>ID anggota</th><th>Nama anggota</th><th>Wilayah pasar</th><th>Jenis pembiayaan</th><th>Sisa pokok</th><th>Hari menunggak</th><th>Status</th></tr></thead><tbody>
          ${rows.map((m) => `<tr><td>${m.id}</td><td>${esc(m.nama)}</td><td>${m.wilayah}</td><td>${m.jenis}</td><td class="num">${rupiahSpaced(m.pokok)}</td><td class="num">${m.dpd} hari</td><td><span class="badge ${badge(m.status)}">${m.status}</span></td></tr>`).join("")}
          </tbody></table></div><p class="field-hint" style="margin-top:10px">Menampilkan ${rows.length} anggota dari data contoh.</p>` : empty("Tidak ada anggota yang cocok dengan filter")}
      </section>`;
  }

  async function load() {
    renderLoading();
    await wait(700);
    if ($("#simConn").value === "down") renderError(); else render();
  }

  $("#filterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const from = $("#fFrom").value, to = $("#fTo").value;
    if (from && to && from > to) { $("#dateErr").textContent = "Periode tidak valid: tanggal dari setelah tanggal sampai."; return; }
    $("#dateErr").textContent = "";
    applied = { wilayah: $("#fWilayah").value, kolek: $("#fKolek").value, jenis: $("#fJenis").value, from, to };
    $("#rangeText").textContent = `Cabang Malang Utama · rentang ${fmt(from)} sampai ${fmt(to)}`;
    load();
    toast("Filter diterapkan pada data contoh.");
  });
  function reset() {
    $("#filterForm").reset();
    $("#fFrom").value = "2026-09-01"; $("#fTo").value = "2026-09-28";
    $("#dateErr").textContent = "";
    applied = { wilayah: "", kolek: "", jenis: "", from: "2026-09-01", to: "2026-09-28" };
    $("#rangeText").textContent = "Cabang Malang Utama · rentang 01/09/2026 sampai 28/09/2026";
    load();
    toast("Filter dikembalikan ke semula.");
  }
  $("#btnReset").addEventListener("click", reset);
  $("#simConn").addEventListener("change", load);

  // ---------- Ekspor (US-06) ----------
  const jobs = [];
  let seq = 1;
  const stBadge = { QUEUED: "badge-grey", PROSES: "badge-blue", SELESAI: "badge-green", GAGAL: "badge-red" };

  function renderJobs() {
    $("#exportCard").hidden = jobs.length === 0;
    $("#jobs").innerHTML = jobs.slice().reverse().map((j) => `
      <div class="list-row">
        <div><strong>${j.id} · ${j.format}</strong><span class="sub">Periode ${fmt(j.from)} sampai ${fmt(j.to)} · ${j.rows.length} baris${j.attempt ? ` · percobaan ${j.attempt}/3` : ""}</span></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <span class="badge ${stBadge[j.status]}">${j.status}</span>
          ${j.status === "GAGAL"
            ? `<button type="button" class="btn btn-secondary" data-retry="${j.id}">Ajukan ulang</button>`
            : `<button type="button" class="btn btn-primary" data-dl="${j.id}" ${j.status === "SELESAI" ? "" : 'disabled aria-describedby="dlNote"'}>Unduh</button>`}
        </div>
      </div>`).join("") + '<p class="field-hint" id="dlNote" style="margin-top:10px">Unduhan aktif setelah status SELESAI dan hanya untuk pengguna yang mengajukan.</p>';
  }

  async function runJob(job) {
    job.status = "QUEUED"; job.attempt = 0; renderJobs();
    await wait(900);
    const willFail = $("#simExport").value === "fail";
    for (let a = 1; a <= 3; a++) {
      job.status = "PROSES"; job.attempt = a; renderJobs();
      await wait(900);
      if (!willFail) { job.status = "SELESAI"; renderJobs(); toast(`${job.id} selesai. Laporan ${job.format} siap diunduh.`); return; }
    }
    job.status = "GAGAL"; renderJobs();
    toast(`${job.id} gagal dibuat setelah 3 percobaan. Ajukan ulang atau hubungi Admin IT.`);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-reset]")) return reset();
    if (e.target.closest("#btnRetry")) return load();
    const ex = e.target.closest("[data-export]");
    if (ex) {
      const from = $("#fFrom").value, to = $("#fTo").value;
      if (!from || !to || from > to) { $("#dateErr").textContent = "Periode tidak valid. Perbaiki rentang tanggal sebelum ekspor."; $("#fFrom").focus(); return; }
      const job = { id: "JOB-" + String(seq++).padStart(4, "0"), format: ex.dataset.export, from, to, rows: filtered() };
      jobs.push(job);
      toast(`Permintaan diterima (${job.id}). Laporan dibuat di latar belakang dan akan muncul di status ekspor.`);
      runJob(job);
      return;
    }
    const rt = e.target.closest("[data-retry]");
    if (rt) { runJob(jobs.find((j) => j.id === rt.dataset.retry)); return; }
    const dl = e.target.closest("[data-dl]");
    if (dl) {
      const j = jobs.find((x) => x.id === dl.dataset.dl);
      if (j.format === "Excel") {
        const head = ["ID anggota", "Nama anggota", "Wilayah pasar", "Jenis pembiayaan", "Sisa pokok", "Hari menunggak", "Status"];
        const body = j.rows.map((m) => [m.id, m.nama, m.wilayah, m.jenis, m.pokok, m.dpd, m.status]);
        download(`laporan-${j.id}.csv`, toCSV([head, ...body]));
        toast(`${j.id} diunduh sebagai CSV (dibuka di Excel).`);
      } else {
        toast("Dialog cetak dibuka. Pilih Simpan sebagai PDF.");
        setTimeout(() => window.print(), 300);
      }
    }
  });

  load();
})();
