# SNAP BILL

Make professional **invoices, receipts, quotations and waybills** in seconds.
No account, no server, no database. Everything runs in the browser and nothing you type is sent anywhere.

- Three templates for every document: Classic Corporate, Modern Minimal, Bold Business
- Real A4 PDF download (text, not a screenshot), print, and WhatsApp sharing
- Naira (₦) by default, plus other currencies
- Built with React, TypeScript and Vite. PDFs are drawn with jsPDF.

## Put it online (GitHub + Vercel, free)

You need two free accounts: **github.com** and **vercel.com** (sign up to Vercel with the "Continue with GitHub" button).

### Step 1: put the project on GitHub
1. On GitHub tap **+** then **New repository**. Name it `snap-bill`. Leave everything else as it is and tap **Create repository**.
2. Unzip the project on a computer. Open the new `snap-bill` folder.
3. On the repository page click **uploading an existing file**. Drag in **everything inside** the folder
   (`src`, `public`, `index.html`, `package.json`, `vercel.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `README.md`).
   Do not upload a `node_modules` folder if you have one.
4. Click **Commit changes**.

(Comfortable with a terminal? Inside the folder run: `git init`, `git add .`, `git commit -m "SNAP BILL"`, `git branch -M main`,
`git remote add origin https://github.com/YOUR-NAME/snap-bill.git`, `git push -u origin main`.)

### Step 2: deploy on Vercel
1. On vercel.com click **Add New**, then **Project**.
2. Pick the `snap-bill` repository and click **Import**.
3. Vercel detects Vite by itself (the settings come from `vercel.json`). Do not change anything. Click **Deploy**.
4. Wait about a minute. You get a link like `snap-bill.vercel.app`. That is your website.

Every time you change a file on GitHub, Vercel updates the website automatically.

### After it is live, test once
Open the link on your phone and on a computer. For **each** of Invoice, Receipt, Quotation and Waybill:
press **Fill with sample**, press **Generate**, then **Download PDF**, **Print** and **WhatsApp**.
If anything fails, open the Vercel project, click the failed deployment and copy the build log.

## Run it on your own computer
Needs Node 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production site in /dist
npm run typecheck  # TypeScript check
```

## What is where

| Path | What it does |
| --- | --- |
| `src/components/Home.tsx` | Homepage, How It Works, footer, document switcher |
| `src/components/Editor.tsx` | The form for all four documents, live preview, buttons |
| `src/components/InvoiceDocument.tsx` + `src/styles/doc.css` | The document itself (3 templates), also used for printing |
| `src/pdf/buildPdf.ts` | PDF engine: A4, repeated table headings, multi-page, keeps totals and signatures together |
| `src/lib/docModel.ts`, `src/lib/kinds.ts` | What goes on each document type, and its wording |
| `src/lib/calc.ts` | All money maths, done in whole kobo/cents |
| `src/lib/validate.ts` | Required-field and number checks |
| `public/fonts` | Fonts for screen, print and PDF (include the Naira sign) |
| `vercel.json` | Vercel settings |

## Privacy
No login, no tracking, no network calls for document data. A draft is kept only in your own browser (localStorage)
so you do not lose work if you close the tab. Logos are processed on your device.
