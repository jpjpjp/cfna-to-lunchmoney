# CFNA (Firestone Branded Credit Card) -> Lunch Money Bookmarklets

This project provides a browser workflow for importing transactions from CFNA into Lunch Money.

- Export transactions from CFNA to JSON.
- Import that JSON into Lunch Money.

Direct API calls from `cfna.com` to Lunch Money are blocked, so this is intentionally a two-step process.

Need Help?
- Join the conversation in the [Lunch Money Bookmarklets Channel on Discord](https://discord.com/channels/842337014556262411/1480708918391996588)


## Recommended Setup (No Clone)

### Option A: Loader flow (recommended)

This is the most reliable setup and the one used in testing.

1. Open these two files in GitHub (no clone needed) and click **Raw**:
- [`cfna-exporter.loader.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/cfna-exporter.loader.bookmarklet.txt)
- [`lm-importer.loader.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/lm-importer.loader.bookmarklet.txt)
2. Copy each full line and save as a bookmark:
- `CFNA Export (Loader)`
- `LM Import (Loader)`
3. Optional but useful: add these reset bookmarks too:
- [`loader-reset.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/loader-reset.bookmarklet.txt) → `LM Loader Reset`
- [`import-settings-reset.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/import-settings-reset.bookmarklet.txt) → `LM Import Settings Reset`
4. On CFNA (`/cardholder/transaction-history`), run `CFNA Export (Loader)` and save the JSON file.
5. On Lunch Money, run `LM Import (Loader)`.
6. When prompted, choose `lm-importer.js`.
7. Use the file picker to pick the exported JSON file.
8. Enter:
- API base URL (default: `https://api.lunchmoney.dev/v2`)
- API token
- Manual account ID
9. Import.

If the file picker does not open on the first click, run `LM Import (Loader)` again.

### Option B: Direct bookmarklets (advanced)

These are single bookmarklets with no loader:

- [`cfna-exporter.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/cfna-exporter.bookmarklet.txt)
- [`lm-importer.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/lm-importer.bookmarklet.txt)

They are shorter but can fail in some browsers when bookmarklet strings are truncated or edited.
Use Option A if import reliability is your priority.

### Practical limit note

There is no single universal browser limit for bookmarklet length.
Behavior varies by browser/version/OS and the page used to copy/paste the URL.
That variability is why this project ships loader versions.

## Loader bookmark setup

### 1) CFNA Export (Loader)

1. Create bookmark `CFNA Export (Loader)`.
2. Paste contents of [`cfna-exporter.loader.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/cfna-exporter.loader.bookmarklet.txt) as the URL.
3. Open CFNA (`/cardholder` or `/cardholder/transaction-history`).
4. Click the bookmark.
5. If prompted, install [`cfna-exporter.js`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/cfna-exporter.js).

### 2) LM Import (Loader)

1. Create bookmark `LM Import (Loader)`.
2. Paste contents of [`lm-importer.loader.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/lm-importer.loader.bookmarklet.txt) as the URL.
3. Open any Lunch Money page.
4. Click the bookmark.
5. If prompted, install [`lm-importer.js`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/lm-importer.js).

### 3) LM Loader Reset

1. Create bookmark `LM Loader Reset`.
2. Paste contents of [`loader-reset.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/loader-reset.bookmarklet.txt) as URL.
3. Use this after updating `.js` files.

### 4) LM Import Settings Reset

1. Create bookmark `LM Import Settings Reset`.
2. Paste contents of [`import-settings-reset.bookmarklet.txt`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/import-settings-reset.bookmarklet.txt) as URL.
3. Use this to clear saved credentials while keeping loaders installed.

## Normal usage flow

1. On CFNA, click `CFNA Export (Loader)`.
2. Save exported JSON file.
3. On Lunch Money, click `LM Import (Loader)`.
4. Use the file picker and select the JSON file.
5. Enter:
- API base URL (default: `https://api.lunchmoney.dev/v2`)
- API token
- manual account ID (for v2)

## Troubleshooting

### File picker does not open (Chrome/Brave)

- Click `LM Import (Loader)` a second time.
- Keep DevTools closed while testing.

### File picker opens but cannot be controlled (Brave)

Allow popups/redirects for Lunch Money:

1. Open `brave://settings/content/popups`
2. Add `https://my.lunchmoney.app` to Allowed
3. Reload and retry

### Loader install prompt appears but no picker

Use this console fallback to install importer source manually:

```js
(() => {
  const key = "lm_bookmarklet_lm_importer_src";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".js,text/javascript";
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return alert("No file selected.");
    const r = new FileReader();
    r.onload = () => {
      localStorage.setItem(key, String(r.result || ""));
      alert("LM importer script installed.");
    };
    r.onerror = () => alert("Failed to read file.");
    r.readAsText(file);
  };
  input.click();
})();
```

Then choose [`lm-importer.js`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/lm-importer.js) and retry `LM Import (Loader)`.

## Advanced (maintainers)

Edit these source files:

- [`cfna-exporter.js`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/cfna-exporter.js)
- [`lm-importer.js`](/Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets/lm-importer.js)

Rebuild generated bookmarklet files:

```bash
cd /Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets
node make-bookmarklet.js
```

No manual minification is required; `make-bookmarklet.js` generates all `*.bookmarklet.txt` files.

Optional CLI import:

```bash
cd /Users/jpshipherd/MEGA/dev/lunchmoney/bookmarklets
LM_TOKEN='YOUR_TOKEN' LM_MANUAL_ACCOUNT_ID='123456' LM_BASE='https://api.lunchmoney.dev/v2' node import-lunchmoney.js ~/Downloads/cfna-lunchmoney-YYYY-MM-DD.json
```

## Reset behavior

- `LM Loader Reset` clears cached loader source only:
  - `lm_bookmarklet_cfna_exporter_src`
  - `lm_bookmarklet_lm_importer_src`
- `LM Import Settings Reset` clears saved importer settings only:
  - `lm_import_token`
  - `lm_import_api_base`
  - `lm_import_v1_account_id`
  - `lm_import_v2_manual_account_id`
