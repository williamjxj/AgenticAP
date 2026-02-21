# 📸 Screenshot Update Guide

This guide helps you update the README screenshots to reflect the latest improvements.

## Prerequisites

1. **Start the application:**
   ```bash
   # Terminal 1: Start Dashboard
   streamlit run interface/dashboard/app.py
   
   # Open in browser: http://localhost:8501
   ```

2. **Install screenshot tool (choose one):**
   - **GoFullPage Chrome Extension**: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl)
   - **Firefox Built-in**: Right-click → "Take a Screenshot" → Save full page
   - **macOS Built-in**: `Cmd+Shift+4` (select area) or `Cmd+Shift+3` (full screen)

## Priority Screenshots to Update

### 1. Invoice List with Confidence (assets/2.png)

**What to show:**
- Main dashboard table with confidence column showing **80%-100%** (not 0.8%-1.0%)
- Progress bars correctly filled
- Multiple invoices visible

**Steps:**
1. Go to main dashboard: http://localhost:8501
2. Ensure some invoices are loaded (run `python scripts/process_invoices.py` if empty)
3. Scroll to show the confidence column clearly
4. Take screenshot (GoFullPage or Cmd+Shift+4)
5. Save as `assets/2.png`

**Expected view:**
- Confidence column shows "90.0%", "100.0%", "80.0%" (not "0.9%", "1.0%", "0.8%")
- Progress bars match the percentages (90% full, not nearly empty)

---

### 2. Chatbot with Vendor Search (assets/6.png)

**What to show:**
- Chatbot successfully finding invoices for "Moore-Miller" vendor
- Shows query and results

**Steps:**
1. Click "💬 Chat" tab in dashboard
2. Type query: `invoices from Moore-Miller`
3. Wait for response showing the invoice
4. Take screenshot showing both query and result
5. Save as `assets/6.png`

**Expected view:**
- Query: "invoices from Moore-Miller"
- Response showing invoice details (vendor: Moore-Miller, invoice number, amount)
- No "no results found" message

---

### 3. Quality Dashboard (assets/7.png)

**What to show:**
- Quality metrics with confidence displayed as percentages (0-100%)
- Bar charts showing 80%, 90%, 100% labels

**Steps:**
1. Click "📊 Quality" tab in dashboard
2. View the confidence distribution charts
3. Ensure charts show percentages (80%-100% range, not 0.8-1.0)
4. Take full page screenshot (use GoFullPage for scrolling content)
5. Save as `assets/7.png`

**Expected view:**
- Y-axis labeled "0-100%" (not "0-1")
- Bar labels show "90.0%", "100.0%" (not "0.90", "1.00")
- Data table shows confidence columns as percentages

---

## Quick Screenshot Commands

### Using GoFullPage Extension:
1. Click the GoFullPage icon in Chrome toolbar
2. Click "Full Page" or "Visible Area"
3. Wait for capture to complete
4. Download PNG
5. Rename and move to `assets/` directory

### Using macOS Built-in:
```bash
# Option 1: Select area (interactive)
Cmd+Shift+4
# Then drag to select area
# File saved to ~/Desktop/Screenshot*.png

# Option 2: Full screen
Cmd+Shift+3
# File saved to ~/Desktop/Screenshot*.png

# Move to project
mv ~/Desktop/Screenshot*.png assets/2.png
```

### Using Firefox:
1. Right-click anywhere on page
2. Select "Take a Screenshot"
3. Choose "Save full page" or "Save visible area"
4. Download
5. Move to `assets/` directory

---

## After Updating Screenshots

```bash
# Add to git
git add assets/*.png README.md

# Commit
git commit -m "docs: update screenshots to reflect confidence display fixes"

# Push
git push origin main
```

---

## Screenshot Specifications

- **Format**: PNG (preferred for UI screenshots)
- **Size**: Full page or 1200-1600px width (readable on GitHub)
- **Quality**: High resolution, clear text
- **Content**: Show typical data, no sensitive information

---

## Optional: Additional Screenshots

If you want to showcase more features:

### assets/9.png - File Preview with Field Confidence
- Click on an invoice to view details
- Show the right panel with extracted data and confidence badges (🟢 🟡 🔴)
- Capture the field-level confidence indicators

### assets/10.png - Aggregate Dashboard Metrics
- Show the metrics at the top: "Avg Confidence: 88.7%"
- Include status distribution cards

---

## Automation Idea (Future)

If you want to automate screenshot capture, consider:

```bash
# Using Playwright (requires installation)
pip install playwright
playwright install chromium

# Then create a script to:
# 1. Start the app
# 2. Navigate to each page
# 3. Take screenshots
# 4. Save to assets/
```

Example script location: `scripts/capture_screenshots.py`
