/* ============================================================
 * dmaz - Scribd Downloader (client-side URL rewriter)
 * ----------------------------------------------------------
 * Strategy: a Scribd document URL like
 *   https://www.scribd.com/document/123456/Some-Title
 * is rewritten into mirror download URLs (vdownloaders, etc).
 * All work happens in the browser; no backend required.
 * ============================================================
 */

(() => {
  "use strict";

  // ----- Mirrors (ordered: primary first) -----
  const MIRRORS = [
    {
      name: "VDownloaders",
      host: "scribd.vdownloaders.com",
      // Replaces scribd.com hostname with the mirror.
      build: ({ kind, id, slug }) =>
        `https://scribd.vdownloaders.com/${kind}/${id}${slug ? "/" + slug : ""}`,
    },
    {
      name: "DocDownloader",
      host: "docdownloader.com",
      build: ({ kind, id, slug }) =>
        `https://docdownloader.com/${kind === "presentation" ? "ppt" : "doc"}/${id}/${slug || "scribd-document"}`,
    },
    {
      name: "iLoveScribd",
      host: "ilovescribd.com",
      build: ({ id }) =>
        `https://ilovescribd.com/?docid=${encodeURIComponent(id)}`,
    },
  ];

  // ----- Supported path kinds on scribd.com -----
  const KINDS = ["document", "doc", "presentation"];

  // ----- DOM refs -----
  const $ = (id) => document.getElementById(id);
  const form = $("dl-form");
  const urlInput = $("url");
  const submitBtn = $("submit-btn");
  const pasteBtn = $("paste-btn");
  const status = $("status");
  const resultEl = $("result");
  const docMeta = $("doc-meta");
  const primaryLink = $("primary-link");
  const openBtn = $("open-btn");
  const copyBtn = $("copy-btn");
  const resetBtn = $("reset-btn");
  const mirrorList = $("mirror-list");
  const yearEl = $("year");

  yearEl.textContent = new Date().getFullYear();

  // ----- URL parsing -----
  /**
   * Parse a Scribd URL and return { kind, id, slug } or null.
   * Accepts hostnames: www.scribd.com, scribd.com, m.scribd.com.
   * Accepts path kinds: /document/, /doc/, /presentation/.
   */
  function parseScribdUrl(raw) {
    if (!raw) return null;
    let input = raw.trim();

    // Auto-prepend protocol if user pasted "scribd.com/..." or "www.scribd.com/..."
    if (/^(www\.)?(m\.)?scribd\.com\//i.test(input)) {
      input = "https://" + input;
    }

    let u;
    try {
      u = new URL(input);
    } catch {
      return null;
    }

    const host = u.hostname.toLowerCase();
    if (!/(^|\.)scribd\.com$/.test(host)) return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const kind = parts[0].toLowerCase();
    if (!KINDS.includes(kind)) return null;

    const id = parts[1];
    if (!/^\d+$/.test(id)) return null;

    const slug = parts[2] ? sanitizeSlug(parts[2]) : "";

    // Normalize "doc" -> "document" for vdownloaders compatibility,
    // but keep original kind for mirrors that need it.
    return { kind, id, slug, original: u.toString() };
  }

  function sanitizeSlug(s) {
    return s
      .replace(/[^A-Za-z0-9\-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  // ----- UI helpers -----
  function setStatus(msg, kind = "") {
    status.textContent = msg || "";
    status.className = "status" + (kind ? " " + kind : "");
  }

  function setLoading(isLoading) {
    submitBtn.classList.toggle("loading", isLoading);
    submitBtn.disabled = isLoading;
  }

  function showResult(parsed) {
    // Build mirror entries
    const entries = MIRRORS.map((m) => ({
      name: m.name,
      host: m.host,
      url: m.build(parsed),
    }));

    const primary = entries[0];

    docMeta.textContent =
      (parsed.slug ? parsed.slug.replace(/-/g, " ") : "Scribd document") +
      ` (ID: ${parsed.id})`;
    primaryLink.textContent = primary.url;
    primaryLink.href = primary.url;
    openBtn.href = primary.url;

    // Render alternate mirrors
    mirrorList.innerHTML = "";
    entries.slice(1).forEach((m) => {
      const row = document.createElement("div");
      row.className = "mirror-item";
      row.innerHTML = `
        <span class="mirror-name">${escapeHtml(m.name)}</span>
        <a href="${m.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.url)}</a>
      `;
      mirrorList.appendChild(row);
    });

    resultEl.classList.remove("hidden");
    setStatus("Link berhasil dibuat. Pilih mirror untuk membuka.", "success");

    // Scroll into view on small screens
    requestAnimationFrame(() => {
      resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function hideResult() {
    resultEl.classList.add("hidden");
    mirrorList.innerHTML = "";
    primaryLink.href = "#";
    primaryLink.textContent = "-";
    openBtn.href = "#";
    docMeta.textContent = "-";
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  // ----- Events -----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = urlInput.value;
    const parsed = parseScribdUrl(value);

    if (!parsed) {
      hideResult();
      setStatus(
        "URL tidak valid. Pastikan URL Scribd berisi /document/, /doc/, atau /presentation/.",
        "error",
      );
      urlInput.focus();
      return;
    }

    setLoading(true);
    setStatus("Memproses URL...");

    // Small delay just to give visual feedback; everything is local.
    setTimeout(() => {
      try {
        showResult(parsed);
      } catch (err) {
        console.error(err);
        setStatus("Terjadi kesalahan saat memproses URL.", "error");
      } finally {
        setLoading(false);
      }
    }, 300);
  });

  pasteBtn.addEventListener("click", async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      setStatus(
        "Browser tidak mendukung paste otomatis. Tempel manual dengan Ctrl/Cmd+V.",
        "error",
      );
      urlInput.focus();
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setStatus("Clipboard kosong.", "error");
        return;
      }
      urlInput.value = text.trim();
      setStatus("URL ditempel. Klik tombol untuk membuat link.");
      urlInput.focus();
    } catch {
      setStatus(
        "Tidak bisa membaca clipboard. Izinkan akses atau tempel manual.",
        "error",
      );
    }
  });

  copyBtn.addEventListener("click", async () => {
    const link = primaryLink.href;
    if (!link || link === "#") return;
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Link disalin ke clipboard.", "success");
    } catch {
      setStatus("Gagal menyalin link.", "error");
    }
  });

  resetBtn.addEventListener("click", () => {
    urlInput.value = "";
    hideResult();
    setStatus("");
    urlInput.focus();
  });

  // Live validation while typing (light touch)
  urlInput.addEventListener("input", () => {
    if (status.classList.contains("error")) setStatus("");
  });

  // Allow ?url=... query param (handy for share links)
  const params = new URLSearchParams(location.search);
  const preset = params.get("url");
  if (preset) {
    urlInput.value = preset;
    // Trigger submit automatically
    form.requestSubmit();
  }
})();
