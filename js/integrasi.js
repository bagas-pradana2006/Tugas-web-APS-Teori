// Modul Integrasi CBS (PIC: R. Ahmad Syarif Hidayatullah)
// I-01 Monitor integrasi CBS.
(function () {
  const { $, rupiahSpaced, toast, wait, toCSV, download } = App;

  const log = [
    { waktu: "28/09/2026 11.20.15", modul: "Mobile Collector", ref: "TRX-MC-2026-001", nominal: 500000, status: "200 OK" },
    { waktu: "28/09/2026 11.20.12", modul: "Digital Approval", ref: "APP-REQ-2026-88", nominal: 25000000, status: "200 OK" },
    { waktu: "28/09/2026 11.19.50", modul: "Branch Teller", ref: "TRX-TL-2026-901", nominal: 1200000, status: "200 OK" },
    { waktu: "28/09/2026 11.18.02", modul: "Branch Teller", ref: "TRX-TL-2026-897", nominal: 750000, status: "Timeout, diulang 1/3" },
  ];
  let retrying = false;

  const failed = () => log.filter((l) => !l.status.startsWith("200"));

  function render() {
    const f = failed();
    $("#content").innerHTML = `
      <div class="kpi-strip" aria-label="Ringkasan gateway">
        <div class="kpi"><span>Status gateway</span><span class="badge badge-green" style="display:inline-block">Online</span> <strong style="font-size:1rem">uptime 99,9%</strong></div>
        <div class="kpi"><span>Koneksi aktif</span><strong>128 sesi</strong></div>
        <div class="kpi"><span>Hit hari ini</span><strong>45.210 transaksi</strong></div>
        <div class="kpi"><span>Rata-rata respons</span><strong>120 ms</strong></div>
      </div>
      <div class="layout-2">
        <section class="card" aria-labelledby="modTitle">
          <h2 id="modTitle">Integrasi per modul</h2>
          <div class="list-row"><div><strong>Mobile Collector</strong><span class="sub">12.450 hit · 100% sukses, sinkron real-time</span></div><span class="badge badge-green">Normal</span></div>
          <div class="list-row"><div><strong>Digital Approval</strong><span class="sub">850 hit · 100% sukses, sinkron real-time</span></div><span class="badge badge-green">Normal</span></div>
          <div class="list-row"><div><strong>Branch Teller</strong><span class="sub">31.910 hit · 99,9% sukses, ${f.length ? f.length + " transaksi menunggu ulang" : "semua transaksi terkirim"}</span></div>
            <span class="badge ${f.length ? "badge-amber" : "badge-green"}">${f.length ? f.length + " diulang" : "Normal"}</span></div>
        </section>
        <section class="card" aria-labelledby="qTitle">
          <h2 id="qTitle">Beban antrean</h2>
          <div class="factor-head"><span>Kapasitas terpakai</span><strong>42%</strong></div>
          <div class="bar" role="img" aria-label="42 persen kapasitas antrean terpakai"><span style="width:42%"></span></div>
          <p class="field-hint" style="margin-top:12px">Persentase kapasitas antrean pesan gateway yang sedang terpakai.</p>
        </section>
      </div>
      <section class="card" style="margin-top:22px" aria-labelledby="logTitle">
        <div class="card-head"><h2 id="logTitle">Log posting real-time</h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="button" class="btn btn-danger" id="btnRetryFail" ${f.length && !retrying ? "" : "disabled"}>${retrying ? "Mengirim ulang…" : "Ulangi transaksi gagal"}</button>
            <button type="button" class="btn btn-secondary" id="btnAudit">Unduh laporan audit</button>
          </div></div>
        <div class="table-wrap"><table><caption class="sr-only">Log posting ke CBS</caption>
          <thead><tr><th>Waktu</th><th>Modul sumber</th><th>No. referensi</th><th>Nominal</th><th>Status</th></tr></thead>
          <tbody>${log.map((l) => `<tr><td class="num">${l.waktu}</td><td>${l.modul}</td><td class="num">${l.ref}</td><td class="num">${rupiahSpaced(l.nominal)}</td>
            <td><span class="badge ${l.status.startsWith("200") ? "badge-green" : "badge-amber"}">${l.status}</span></td></tr>`).join("")}</tbody></table></div>
        ${f.length ? "" : '<p class="field-hint" style="margin-top:10px">Tidak ada transaksi gagal. Tombol ulangi aktif lagi bila ada posting yang timeout.</p>'}
      </section>`;
  }

  async function load() {
    $("#content").innerHTML = `<div class="card" aria-busy="true"><div class="state"><div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
      <h3>Memuat status gateway CBS</h3><p>Biasanya selesai dalam beberapa detik.</p></div></div>`;
    await wait(600);
    if ($("#simConn").value === "down") {
      $("#content").innerHTML = `<div class="card"><div class="state error" role="alert"><h3>Data belum bisa dimuat</h3>
        <p>Koneksi ke gateway CBS terputus. Coba lagi, atau periksa layanan integrasi bila masih gagal.</p>
        <button type="button" class="btn btn-danger" id="btnReload">Coba lagi</button></div></div>`;
      return;
    }
    render();
  }

  document.addEventListener("click", async (e) => {
    if (e.target.closest("#btnReload")) return load();
    if (e.target.closest("#btnRetryFail")) {
      const f = failed();
      retrying = true; render();
      await wait(1000);
      f.forEach((l) => { l.status = "200 OK"; });
      retrying = false; render();
      toast(`${f.length} transaksi gagal dikirim ulang ke CBS.`);
    }
    if (e.target.closest("#btnAudit")) {
      download("laporan-audit-cbs.csv", toCSV([["Waktu", "Modul sumber", "No. referensi", "Nominal", "Status"], ...log.map((l) => [l.waktu, l.modul, l.ref, l.nominal, l.status])]));
      toast("Laporan audit diunduh sebagai CSV.");
    }
  });
  $("#simConn").addEventListener("change", load);

  load();
})();
