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

  const mapStatusForV2 = (status) => {
    if (status === "reviewed" || status === "unreviewed") return status;
    if (status === "cleared") return "reviewed";
    if (status === "uncleared") return "unreviewed";
    return "unreviewed";
  };

  const normalizeTransactions = (transactions, { apiBase, accountId }) => {
    const v2 = isV2Base(apiBase);
    return transactions.map((t) => {
      const tx = { ...t };
      if (v2) {
        tx.status = mapStatusForV2(tx.status);
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

    return { url, status: res.status, text };
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

    try {
      const result = await postTransactions({ transactions: normalized, token, apiBase });
      console.log("[LM importer] success", result);
      alert(`Imported ${normalized.length} transaction(s) via ${result.url}.`);
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
