// Modul Mobile Collector Real-Time, sisi kasir (PIC: Muhammad Rafi Fadillah)
// W-01 Rekonsiliasi kas shift.
(function () {
  const { $, rupiahSpaced, parseRupiah, esc, toast, renderTrack, setFieldError } = App;

  const STEPS = ["Shift berjalan", "Setoran petugas masuk", "Pencocokan kas", "Shift dikunci"];
  const petugas = [
    { id: "COL-01", nama: "Budi", rute: "Rute Pasar Besar", trx: 45, total: 12500000, fisik: null, note: "", done: false,
      tx: [
        { resi: "TRX-260929-0398", ang: "04120", jenis: "Simpanan", nominal: 300000 },
        { resi: "TRX-260929-0396", ang: "04288", jenis: "Angsuran", nominal: 450000 },
        { resi: "TRX-260929-0391", ang: "04102", jenis: "Simpanan", nominal: 150000 },
      ] },
    { id: "COL-02", nama: "Sari", rute: "Rute Pasar Dinoyo", trx: 38, total: 9800000, fisik: null, note: "", done: false, tx: null },
  ];
  let sel = 0;
  let locked = false;

  function statusOf(p, i) {
    if (p.done) return p.fisik === p.total ? ["Cocok", "badge-green"] : ["Selisih tercatat", "badge-amber"];
    return i === sel ? ["Sedang dicocokkan", "badge-blue"] : ["Belum dicocokkan", "badge-grey"];
  }

  function renderPetugas() {
    const sum = petugas.reduce((a, p) => a + p.total, 0);
    const trx = petugas.reduce((a, p) => a + p.trx, 0);
    $("#petugasTable").innerHTML = `<div class="table-wrap"><table><thead><tr><th>Petugas</th><th>Transaksi</th><th>Total digital</th><th>Status</th></tr></thead><tbody>
      ${petugas.map((p, i) => { const [s, b] = statusOf(p, i); return `<tr class="${i === sel ? "is-selected" : ""}" data-row="${i}">
        <td><button type="button" class="row-select" data-sel="${i}" aria-pressed="${i === sel}">${p.id} · ${p.nama}</button><span class="sub">${p.rute}</span></td>
        <td>${p.trx} transaksi</td><td class="num"><strong>${rupiahSpaced(p.total)}</strong></td><td><span class="badge ${b}">${s}</span></td></tr>`; }).join("")}
      </tbody></table></div>
      <div class="list-row" style="border:0"><span>Total shift (${petugas.length} petugas)</span><strong class="num">${rupiahSpaced(sum)} · ${trx} transaksi</strong></div>`;
  }

  function renderTx() {
    const p = petugas[sel];
    $("#trxTitle").textContent = `Transaksi terakhir ${p.id}`;
    if (!p.tx) {
      $("#trxTable").innerHTML = `<div class="state"><h3>Rincian transaksi ${p.id} belum ada di data contoh</h3><p>Laporan kelompok hanya memuat contoh transaksi untuk COL-01. Total digital tetap dipakai untuk pencocokan.</p></div>`;
      return;
    }
    $("#trxTable").innerHTML = `<div class="table-wrap"><table><thead><tr><th>No. resi</th><th>Anggota</th><th>Jenis</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>
      ${p.tx.map((t, i) => `<tr><td class="num">${t.resi}</td><td>${t.ang}</td><td>${t.jenis}</td><td class="num">${rupiahSpaced(t.nominal)}</td>
        <td>${t.void ? `<span class="badge badge-grey">Dibatalkan</span>` : `<button type="button" class="btn-link danger" data-void="${i}">Batalkan<span class="sr-only"> ${t.resi}</span></button>`}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="field-hint" style="margin-top:10px">Pembatalan membuat transaksi pembalik dengan alasan wajib. Transaksi asli tetap tersimpan.</p>`;
  }

  function renderMatch() {
    const p = petugas[sel];
    $("#matchTitle").textContent = `Pencocokan kas ${p.id}`;
    $("#digitalTotal").textContent = rupiahSpaced(p.total);
    const fisik = $("#fisik");
    fisik.value = p.fisik != null ? rupiahSpaced(p.fisik) : "";
    $("#catatan").value = p.note;
    updateDiff();
    const next = petugas.findIndex((x, i) => i !== sel && !x.done);
    $("#btnNext").textContent = next >= 0 ? `Lanjut ke ${petugas[next].id}` : "Semua petugas sudah dicocokkan";
    $("#btnNext").disabled = locked || next < 0;
    [fisik, $("#catatan"), $("#btnLock")].forEach((el) => { el.disabled = locked; });
    if (locked) $("#btnLock").textContent = "Shift dikunci";
  }

  function updateDiff() {
    const p = petugas[sel];
    const raw = $("#fisik").value.trim();
    const box = $("#diffBox");
    if (!raw) { box.className = "diff"; box.style.background = "var(--surface-2)"; box.innerHTML = "<span>Isi uang fisik untuk melihat selisih</span>"; return; }
    box.style.background = "";
    const d = parseRupiah(raw) - p.total;
    const ok = d === 0;
    box.className = "diff " + (ok ? "ok" : "bad");
    box.innerHTML = `<span>Selisih ${d < 0 ? "-" : ""}${rupiahSpaced(Math.abs(d))}</span><span>${ok ? "Cocok (MATCH)" : "Tidak cocok"}</span>`;
  }

  // Simpan hasil pencocokan petugas yang sedang dipilih. Mengembalikan false bila belum valid.
  function commitCurrent() {
    const p = petugas[sel];
    const raw = $("#fisik").value.trim();
    setFieldError($("#fisik"), raw ? "" : "Uang fisik wajib diisi");
    if (!raw) { $("#fisik").focus(); return false; }
    const v = parseRupiah(raw);
    const note = $("#catatan").value.trim();
    if (v !== p.total && !note) { setFieldError($("#catatan"), "Catatan wajib diisi karena kas tidak cocok"); $("#catatan").focus(); return false; }
    setFieldError($("#catatan"), "");
    p.fisik = v; p.note = note; p.done = true;
    return true;
  }

  function selectPetugas(i) {
    sel = i;
    setFieldError($("#fisik"), ""); setFieldError($("#catatan"), "");
    renderPetugas(); renderTx(); renderMatch();
  }

  App.bindRupiahInput($("#fisik"));
  $("#fisik").addEventListener("input", () => { petugas[sel].done = false; updateDiff(); renderPetugas(); });
  $("#catatan").addEventListener("input", () => { petugas[sel].done = false; });

  $("#petugasTable").addEventListener("click", (e) => {
    const r = e.target.closest("[data-row]");
    if (r) selectPetugas(Number(r.dataset.row));
  });

  $("#btnNext").addEventListener("click", () => {
    if (!commitCurrent()) return;
    const next = petugas.findIndex((x) => !x.done);
    renderPetugas();
    if (next >= 0) { selectPetugas(next); toast(`${petugas[next].id} dipilih. Pencocokan memakai panel yang sama.`); }
  });

  $("#matchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!commitCurrent()) return;
    renderPetugas();
    const pend = petugas.filter((p) => !p.done);
    if (pend.length) {
      toast(`${pend.map((p) => p.id).join(", ")} belum dicocokkan. Cocokkan semua petugas sebelum mengunci shift.`);
      selectPetugas(petugas.indexOf(pend[0]));
      return;
    }
    const sum = petugas.reduce((a, p) => a + p.total, 0);
    const fis = petugas.reduce((a, p) => a + p.fisik, 0);
    $("#lockSub").textContent = `Total digital ${rupiahSpaced(sum)}, uang fisik ${rupiahSpaced(fis)}. Setelah dikunci, shift tidak bisa diubah.`;
    $("#lockDialog").showModal();
  });

  $("#lockConfirm").addEventListener("click", () => {
    locked = true;
    $("#lockDialog").close();
    renderTrack($("#shiftTrack"), STEPS, STEPS.length);
    renderMatch();
    toast("Shift 29/09/2026 dikunci. Hasil rekonsiliasi tersimpan.");
  });

  // Pembatalan transaksi
  let voidIdx = null;
  $("#trxTable").addEventListener("click", (e) => {
    const b = e.target.closest("[data-void]");
    if (!b) return;
    voidIdx = Number(b.dataset.void);
    const t = petugas[sel].tx[voidIdx];
    $("#voidSub").textContent = `${t.resi} · anggota ${t.ang} · ${t.jenis} ${rupiahSpaced(t.nominal)}. Sistem membuat transaksi pembalik tanpa menghapus transaksi asli.`;
    $("#voidReason").value = "";
    setFieldError($("#voidReason"), "");
    $("#voidDialog").showModal();
  });
  $("#voidForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const reason = $("#voidReason").value.trim();
    if (!reason) { setFieldError($("#voidReason"), "Alasan pembatalan wajib diisi"); return; }
    const p = petugas[sel];
    const t = p.tx[voidIdx];
    t.void = true; t.reason = reason;
    if (!locked) { p.total -= t.nominal; p.trx -= 1; p.done = false; }
    $("#voidDialog").close();
    renderPetugas(); renderTx(); renderMatch();
    toast(`Transaksi pembalik untuk ${t.resi} dibuat.${locked ? "" : " Total digital " + p.id + " diperbarui, cocokkan ulang."}`);
  });
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

  renderTrack($("#shiftTrack"), STEPS, 2);
  selectPetugas(0);
})();
