(() => {
  const KEYS = {
    token: "lm_import_token",
    apiBase: "lm_import_api_base",
    v1AccountId: "lm_import_v1_account_id",
    v2ManualAccountId: "lm_import_v2_manual_account_id",
  };

  const getOrPrompt = (key, message, defaultValue = "") => {
    const current = localStorage.getItem(key) || defaultValue;
    const value = prompt(message, current) || "";
    if (value) localStorage.setItem(key, value);
    return value;
  };

  const isV2Base = (apiBase) => /\/v2(?:$|\/)/.test(apiBase);

  const summarizeExternalIds = (transactions) => {
    let missing = 0;
    const seen = new Set();
    const dupes = new Set();

    for (const t of transactions) {
      const id = String(t?.external_id || "").trim();
      if (!id) {
        missing += 1;
        continue;
      }
      if (seen.has(id)) dupes.add(id);
      seen.add(id);
    }

    return { missing, duplicates: [...dupes] };
  };

  const normalizeTransactions = (transactions, { apiBase, accountId }) => {
    const v2 = isV2Base(apiBase);
    return transactions.map((t) => {
      const tx = { ...t };
      if (v2) {
        tx.status = "unreviewed";
        tx.manual_account_id = Number(accountId);
        delete tx.account_id;
      } else {
        tx.account_id = Number(accountId);
      }
      return tx;
    });
  };

  const readFileText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsText(file);
    });

  const pickJsonFile = () =>
    new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.style.position = "fixed";
      input.style.left = "-9999px";

      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) {
          reject(new Error("No file selected"));
          return;
        }
        resolve(file);
      });

      document.body.appendChild(input);
      input.click();
    });

  const getRawJson = async () => {
    alert(`Please select the JSON file created by the exporter.

If no file dialog appears, click this bookmark again and try once more.`);

    try {
      const file = await pickJsonFile();
      return await readFileText(file);
    } catch (pickerError) {
      throw new Error(
        `${pickerError?.message || pickerError}. If no file dialog appeared, click this bookmark again and retry.`
      );
    }
  };

  const postTransactions = async ({ transactions, token, apiBase }) => {
    const url = `${apiBase.replace(/\/+$/, "")}/transactions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactions }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${url}: ${text.slice(0, 1200)}`);
    }

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      // Some environments may return non-JSON text despite success.
    }

    return { url, status: res.status, text, data };
  };

  const run = async () => {
    if (!/lunchmoney/i.test(location.hostname)) {
      alert("Run this bookmarklet on a Lunch Money page.");
      return;
    }

    let raw;
    try {
      raw = await getRawJson();
    } catch (e) {
      alert(`Could not read JSON input: ${e?.message || e}`);
      return;
    }

    const apiBase = getOrPrompt(
      KEYS.apiBase,
      "Lunch Money API base URL",
      "https://api.lunchmoney.dev/v2"
    );
    const v2 = isV2Base(apiBase);

    const accountId = getOrPrompt(
      v2 ? KEYS.v2ManualAccountId : KEYS.v1AccountId,
      v2
        ? "Lunch Money manual_account_id for imported transactions"
        : "Lunch Money account_id for imported transactions"
    );

    if (!accountId) {
      alert(v2 ? "Import cancelled: manual_account_id is required." : "Import cancelled: account_id is required.");
      return;
    }

    const token = getOrPrompt(KEYS.token, "Lunch Money API token (Bearer)");
    if (!token) {
      alert("Import cancelled: API token is required.");
      return;
    }

    let transactions;
    try {
      transactions = JSON.parse(raw);
    } catch (_) {
      alert("Input is not valid JSON.");
      return;
    }

    if (!Array.isArray(transactions)) {
      alert("JSON must be an array of transaction objects.");
      return;
    }

    const normalized = normalizeTransactions(transactions, { apiBase, accountId });
    const ext = summarizeExternalIds(normalized);
    if (ext.missing || ext.duplicates.length) {
      const lines = [];
      if (ext.missing) lines.push(`- Missing external_id: ${ext.missing}`);
      if (ext.duplicates.length) lines.push(`- Duplicate external_id in file: ${ext.duplicates.slice(0, 10).join(", ")}`);
      console.warn("[LM importer] external_id issues", ext);
      alert(`Warning: external_id quality issues detected before import:\n${lines.join("\n")}`);
    }

    try {
      const result = await postTransactions({ transactions: normalized, token, apiBase });
      const importedCount = Array.isArray(result.data?.transactions)
        ? result.data.transactions.length
        : normalized.length;
      const skippedDuplicatesCount = Array.isArray(result.data?.skipped_duplicates)
        ? result.data.skipped_duplicates.length
        : 0;
      console.log("[LM importer] success", result);
      alert(
        `Import completed via ${result.url}.\nImported: ${importedCount}\nSkipped duplicates: ${skippedDuplicatesCount}`
      );
    } catch (e) {
      console.error("[LM importer] failed", e);
      alert(`Import failed: ${e?.message || e}`);
    }
  };

  run().catch((e) => {
    console.error("[LM importer] fatal", e);
    alert(`Importer error: ${e?.message || e}`);
  });
})();
