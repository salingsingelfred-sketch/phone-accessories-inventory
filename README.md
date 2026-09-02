# Phone Accessories Inventory System

A complete, functional, responsive inventory management system for phone accessories.
Built with HTML5, CSS3, JavaScript, Google Apps Script, and Google Sheets.

**Stack:** Vercel (frontend) → Google Apps Script (API) → Google Sheets (database)

---

## 📁 Project Files

```
Phone Accessories/
├── index.html       — Main SPA (all pages/modules)
├── style.css        — Full responsive stylesheet
├── app.js           — All frontend logic, API calls, CRUD
├── config.js        — API URL configuration ← Edit this
├── Code.gs          — Google Apps Script backend
├── README.md        — This file
└── package.json     — Project metadata
```

---

## 🚀 Step-by-Step Setup

### STEP 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new spreadsheet**.
2. Name it: `Phone Accessories Inventory DB`
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
   The ID is the long string between `/d/` and `/edit`.

---

### STEP 2 — Add Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Copy the entire content of `Code.gs` from this project
4. Paste it into the Apps Script editor
5. Replace `YOUR_GOOGLE_SPREADSHEET_ID` near the top with your actual Spreadsheet ID:
   ```js
   var SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID_HERE';
   ```
6. Click **Save** (💾)

---

### STEP 3 — Initialize the Sheets

1. In Apps Script, select the function `setupSheets` from the dropdown
2. Click **Run**
3. Approve any permissions requested (this creates all 7 sheets with correct headers)
4. Check the **Execution log** — it will show:
   ```
   Default admin created: username=admin, password=Admin@123
   Setup complete. Sheets initialized.
   ```
5. **IMPORTANT:** Change the admin password after your first login.

**Sheets created automatically:**
| Sheet | Purpose |
|-------|---------|
| Users | User accounts & roles |
| Products | Product catalog |
| StockIn | Stock-in transactions |
| StockOut | Stock-out transactions |
| Suppliers | Supplier records |
| Inventory | Live inventory calculations |
| Logs | Activity audit trail |

---

### STEP 4 — Deploy Apps Script as Web App

1. In Apps Script, click **Deploy → New deployment**
2. Click the gear icon ⚙ next to "Select type" → choose **Web app**
3. Set the following:
   - **Description:** Phone Accessories Inventory API
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. Click **Authorize access** and approve all permissions
6. Copy the **Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

---

### STEP 5 — Configure the Frontend

1. Open `config.js` in your project folder
2. Replace `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL` with your actual Web App URL:
   ```js
   const CONFIG = {
     API_URL: "https://script.google.com/macros/s/AKfycby.../exec",
     ...
   };
   ```
3. Save the file.

---

### STEP 6 — Push to GitHub

1. Create a new repository on [github.com](https://github.com)
2. Initialize and push the project:
   ```bash
   cd "Phone Accessories"
   git init
   git add index.html style.css app.js config.js README.md package.json
   # Do NOT add Code.gs to git if your API URL is sensitive
   git commit -m "Initial commit: Phone Accessories Inventory System"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

> ⚠️ **Do not commit your actual Apps Script URL** to a public GitHub repo if your sheet contains real data.

---

### STEP 7 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **Add New → Project**
3. Import your GitHub repository
4. Vercel auto-detects static HTML — no build settings needed
5. Click **Deploy**
6. Your app will be live at: `https://your-project.vercel.app`

> For updates: push to GitHub → Vercel auto-deploys.

---

### STEP 8 — First Login

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `Admin@123` |

> ⚠️ **Change this password immediately after first login** via User Management.

---

## 🧪 Testing the System

Follow this test flow to verify everything works:

1. ✅ **Login** → admin / Admin@123
2. ✅ **Dashboard** → Should show 0s initially, dynamic stats load
3. ✅ **Add Supplier** → Create at least one supplier
4. ✅ **Add Product** → Link to supplier, set reorder level
5. ✅ **Stock-In** → Add stock for the product → verify quantity increases
6. ✅ **Inventory Monitoring** → Status should show "In Stock"
7. ✅ **Stock-Out** → Remove stock → verify quantity decreases
8. ✅ **Test insufficient stock** → Try to remove more than available → error shown
9. ✅ **Edit Product** → Modify and save
10. ✅ **Delete Product** → Admin only
11. ✅ **Add Staff User** → via User Management
12. ✅ **Login as Staff** → Verify User Management is hidden
13. ✅ **Low Stock** → Set stock below reorder level → badge shows "Low Stock"
14. ✅ **Out of Stock** → Remove all stock → badge shows "Out of Stock"
15. ✅ **Logout** → Session cleared

---

## 🔐 Security Notes

- Passwords are SHA-256 hashed before storage
- Session tokens are stored server-side via Google Script Properties
- Tokens expire after 8 hours
- All sensitive actions check the user's role on the backend
- Staff users cannot access User Management (enforced on both frontend and backend)
- Admin-only actions (delete product, manage users) are validated backend-side

---

## 📱 Responsive Design

| Device | Supported |
|--------|-----------|
| Desktop (1200px+) | ✅ Full sidebar |
| Laptop (1024px) | ✅ Full sidebar |
| Tablet (768px) | ✅ Collapsible sidebar |
| Mobile (< 768px) | ✅ Hamburger menu, stacked layout |

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|---------|
| "API URL not configured" error | Update `config.js` with your Web App URL |
| Login fails | Run `setupSheets` again; check Spreadsheet ID |
| "Unauthorized" error | Token expired — log out and log in again |
| Blank dashboard | Check Apps Script permissions; redeploy as Web App |
| CORS errors | Ensure Web App is deployed with "Anyone" access |
| Sheet not found | Run `setupSheets` function in Apps Script |
| Data not saving | Check Apps Script execution logs for errors |

---

## 📌 Architecture

```
User Browser
    │
    ▼
Vercel CDN (index.html + style.css + app.js + config.js)
    │
    │  fetch() API calls
    ▼
Google Apps Script Web App (Code.gs)
    │  doGet() / doPost()
    ▼
Google Sheets (7 sheets: Users, Products, StockIn, StockOut, Suppliers, Inventory, Logs)
```

No Node.js server, no PHP, no MySQL, no Firebase required.
