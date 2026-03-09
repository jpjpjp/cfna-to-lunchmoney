#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = __dirname;

const toBookmarklet = (source) => {
  const oneLine = source
    .replace(/\/\*[^]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return `javascript:${oneLine}`;
};

const loaderSource = ({ storageKey, displayName, expectedFileName }) => `(() => {
  const key = "${storageKey}";
  const name = "${displayName}";

  const runScript = (script) => {
    try {
      (0, eval)(script);
    } catch (e) {
      console.error("[loader] script failed", e);
      alert(name + " failed: " + (e && e.message ? e.message : e));
    }
  };

  const existing = localStorage.getItem(key);
  if (existing) {
    runScript(existing);
    return;
  }

  const shouldLoad = confirm(
    "Install ${displayName} in this browser now?\\n\\n" +
      "Click OK to choose the local .js file.\\n" +
      "Expected file: ${expectedFileName}\\n\\n" +
      "If no file picker appears, click this bookmark again once."
  );
  if (!shouldLoad) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".js,text/javascript";
  input.style.position = "fixed";
  input.style.left = "-9999px";

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) {
      input.remove();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const script = String(reader.result || "");
      localStorage.setItem(key, script);
      input.remove();
      alert(name + " installed. Running now.");
      runScript(script);
    };
    reader.onerror = () => {
      input.remove();
      alert("Failed to read selected file.");
    };
    reader.readAsText(file);
  });

  document.body.appendChild(input);
  input.click();
})();`;

const resetLoaderSource = `(() => {
  ["lm_bookmarklet_cfna_exporter_src", "lm_bookmarklet_lm_importer_src"].forEach((k) => localStorage.removeItem(k));
  alert("Cleared loader cache for CFNA Exporter and Lunch Money Importer.");
})();`;

const resetImportSettingsSource = `(() => {
  ["lm_import_token", "lm_import_api_base", "lm_import_v1_account_id", "lm_import_v2_manual_account_id"].forEach((k) => localStorage.removeItem(k));
  alert("Cleared saved LM importer settings (token, API base, account IDs).");
})();`;

const build = (sourceFile, outFile) => {
  const source = fs.readFileSync(path.join(root, sourceFile), "utf8");
  const bookmarklet = toBookmarklet(source);
  const outPath = path.join(root, outFile);
  fs.writeFileSync(outPath, bookmarklet + "\n");
  console.log(`Wrote ${outPath} (length ${bookmarklet.length})`);
};

const buildLoader = (opts, outFile) => {
  const bookmarklet = toBookmarklet(loaderSource(opts));
  const outPath = path.join(root, outFile);
  fs.writeFileSync(outPath, bookmarklet + "\n");
  console.log(`Wrote ${outPath} (length ${bookmarklet.length})`);
};

const buildInline = (source, outFile) => {
  const bookmarklet = toBookmarklet(source);
  const outPath = path.join(root, outFile);
  fs.writeFileSync(outPath, bookmarklet + "\n");
  console.log(`Wrote ${outPath} (length ${bookmarklet.length})`);
};

build("cfna-exporter.js", "cfna-exporter.bookmarklet.txt");
build("lm-importer.js", "lm-importer.bookmarklet.txt");

buildLoader(
  { storageKey: "lm_bookmarklet_cfna_exporter_src", displayName: "CFNA Exporter", expectedFileName: "cfna-exporter.js" },
  "cfna-exporter.loader.bookmarklet.txt"
);
buildLoader(
  { storageKey: "lm_bookmarklet_lm_importer_src", displayName: "Lunch Money Importer", expectedFileName: "lm-importer.js" },
  "lm-importer.loader.bookmarklet.txt"
);

buildInline(resetLoaderSource, "loader-reset.bookmarklet.txt");
buildInline(resetImportSettingsSource, "import-settings-reset.bookmarklet.txt");
