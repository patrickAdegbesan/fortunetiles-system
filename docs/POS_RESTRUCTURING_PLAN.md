# Fortune Tiles — Android POS Restructuring Plan

## Executive Summary

Transform the existing Fortune Tiles Inventory Management System into a **fully offline Android POS application** targeting the **NEXGO N86 Smart POS Terminal** (and compatible devices). The app runs entirely on-device using a lightweight architecture, prints receipts via the built-in 40mm thermal printer, and is designed for future multi-POS warehouse synchronization.

---

## Hardware Target: NEXGO N86

| Specification | Value |
|--------------|-------|
| **OS** | Android 9.0 (API 28) |
| **Screen** | 720 × 1280 px, 5.5" touchscreen |
| **CPU** | ARM64 (arm64-v8a) |
| **RAM** | 1GB - 2GB |
| **Storage** | 8GB - 16GB internal |
| **Printer** | Built-in 40mm thermal printer |
| **Print Service** | XGD Print Service (`com.xgd.printservice`) |
| **Connectivity** | WiFi, 4G LTE, Bluetooth |
| **Peripherals** | Camera (barcode), NFC, fingerprint reader |

---

## Architecture Decision: Option A (Frontend-Only, Lightweight)

### Why Option A?
- **Lightweight**: No embedded Node.js server means smaller APK and lower memory usage
- **Faster**: Direct SQLite queries from JavaScript, no HTTP round-trips
- **Simpler**: Single codebase (React + SQLite plugin), easier to maintain
- **POS-appropriate**: N86 has limited RAM (1-2GB); running a full Express backend would be heavy

### Architecture Diagram

```
┌───────────────────────────────────────────────────────┐
│           NEXGO N86 (Android 9.0)                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Capacitor Android Shell                  │ │
│  │  ┌───────────────────────────────────────────┐  │ │
│  │  │            React 18 UI                     │  │ │
│  │  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  │  │ │
│  │  │  │  POS    │  │Back-Off │  │ Settings │  │  │ │
│  │  │  │ Screen  │  │  ice    │  │          │  │  │ │
│  │  │  └────┬────┘  └────┬────┘  └────┬─────┘  │  │ │
│  │  │       │            │            │        │  │ │
│  │  │  ┌────▼────────────▼────────────▼─────┐  │  │ │
│  │  │  │     Business Logic (JS)            │  │  │ │
│  │  │  │  • Sales processing                │  │  │ │
│  │  │  │  • Inventory mgmt                  │  │  │ │
│  │  │  │  • Returns & refunds               │  │  │ │
│  │  │  │  • Reports & analytics             │  │  │ │
│  │  │  └────┬───────────────────────────────┘  │  │ │
│  │  └───────┼──────────────────────────────────┘  │ │
│  │          │                                      │ │
│  │  ┌───────▼──────────────────────────────────┐  │ │
│  │  │    @capacitor-community/sqlite           │  │ │
│  │  │    (SQLite Native Plugin)                │  │ │
│  │  └───────┬──────────────────────────────────┘  │ │
│  │          │                                      │ │
│  │  ┌───────▼──────────────────────────────────┐  │ │
│  │  │    fortune_tiles.sqlite (Local File)     │  │ │
│  │  │    • All 12 tables + new POS tables      │  │ │
│  │  │    • FTS5 search index                   │  │ │
│  │  │    • Receipt archive                     │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  │                                                 │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │    PrintBridge (Custom Plugin)           │  │ │
│  │  │    • Text → Bitmap renderer              │  │ │
│  │  │    • Android PrintManager                │  │ │
│  │  │    • XGD Print Service                   │  │ │
│  │  └────────────────────┬─────────────────────┘  │ │
│  └───────────────────────┼────────────────────────┘ │
│                          │                          │
│               ┌──────────▼──────────┐               │
│               │ 40mm Thermal Printer│               │
│               └─────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Framework** | React 18 | Keep existing frontend, adapt for mobile |
| **Mobile Shell** | Capacitor 6 | Wrap React app as Android APK |
| **Database** | SQLite 3 (via `@capacitor-community/sqlite`) | Offline file-based storage |
| **ORM** | None — raw SQL with helper functions | Lightweight, no overhead |
| **State Management** | React Context + `useReducer` | Cart, auth, printer status |
| **Printing** | Custom PrintBridge plugin | Android PrintManager → XGD Print Service |
| **Receipt Layout** | Text → Bitmap rendering | Optimized for 40mm thermal paper |
| **Barcode Scanning** | Camera via HTML5 + ZXing or Capacitor Barcode Scanner | Product lookup |
| **Future Sync** | Capacitor HTTP + LAN discovery (mDNS) | Multi-POS sync |

---

## Database Schema (SQLite)

### Existing Tables (ported from PostgreSQL)
All 12 existing tables are preserved:
1. `users` — staff, managers, owners
2. `products` — product catalog with images (base64 stored)
3. `product_types` — tile types, units of measure
4. `categories` — product categories
5. `global_attributes` — custom product attributes
6. `locations` — single location per POS (warehouse/store)
7. `inventory` — per-location stock in sqm
8. `inventory_logs` — stock movement history
9. `sales` — transaction records
10. `sale_items` — line items per sale
11. `returns` — return/exchange records
12. `return_items` — line items per return

### New Tables
```sql
-- Printer configuration per POS
CREATE TABLE printer_config (
  id INTEGER PRIMARY KEY,
  paper_width_mm INTEGER DEFAULT 40,
  header_lines TEXT DEFAULT 'FORTUNE TILES\n123 Warehouse Rd\nLagos, Nigeria\n0800-123-4567',
  footer_lines TEXT DEFAULT 'Thank you!\nGoods sold are non-refundable.',
  auto_print INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- POS settings
CREATE TABLE pos_settings (
  id INTEGER PRIMARY KEY,
  require_customer_info INTEGER DEFAULT 0,
  default_payment_method TEXT DEFAULT 'cash',
  enable_hold_sale INTEGER DEFAULT 1,
  enable_returns INTEGER DEFAULT 1,
  tax_rate_percent REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Held (parked) sales
CREATE TABLE held_sales (
  id INTEGER PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  cart_json TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal REAL,
  discount_type TEXT,
  discount_value REAL,
  created_by_user_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Receipt archive for reprints
CREATE TABLE receipt_archive (
  id INTEGER PRIMARY KEY,
  sale_uuid TEXT UNIQUE NOT NULL,
  receipt_text TEXT NOT NULL,
  printed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 for fast product search
CREATE VIRTUAL TABLE product_search USING fts5(
  name, description, supplier_code,
  content='products', content_rowid='id'
);

-- Sync tracking (for Phase 2)
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_uuid TEXT NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  payload_json TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## UI Restructure for Mobile POS

### Screen Layout (720×1280)
```
┌─────────────────────────┐
│  [LOGO]  Fortune Tiles  │  <- Status bar (printer, battery, time)
├─────────────────────────┤
│                         │
│    MAIN CONTENT AREA    │  <- Context-dependent
│                         │
│                         │
├─────────────────────────┤
│ [POS] [Inv] [Trans] [⚙]│  <- Bottom nav (touch-friendly 60px+)
└─────────────────────────┘
```

### POS Mode (Default)
- **Product Grid**: 3-column grid, large tap targets (min 80×80px)
- **Category Tabs**: Horizontal scrollable tabs above grid
- **Search Bar**: FTS instant search with barcode input
- **Cart Drawer**: Slide-up panel from bottom (not sidebar)
- **Payment Sheet**: Full-screen modal with big numpad
- **Quick Actions**: Hold sale, apply discount, add customer

### Back-Office Mode (Admin only)
- Tabbed interface accessed via Settings
- Inventory, Products, Transactions, Returns, Reports, Users

### Auth & Security
- **PIN login**: 4-digit PIN for cashiers (faster than password)
- **Password login**: For managers/owners
- **Fingerprint**: Optional, using N86 fingerprint reader
- **Auto-lock**: Screen locks after 2 minutes of inactivity

---

## Receipt Design (40mm Paper)

### Layout (~24 chars per line)
```
    FORTUNE TILES
   123 Warehouse Rd
    Lagos, Nigeria
    0800-123-4567
------------------------
Receipt: FT-2026-000001
Date: 29/05/2026
Time: 14:32
Cashier: Admin
------------------------
Spanish Marble 60x60
 5sqm x N12,500
 =N62,500
Porcelain White
 3sqm x N8,000
 =N24,000
------------------------
Subtotal:   N86,500
Disc(5%):   -N4,325
------------------------
TOTAL:      N82,175
Payment: CASH
Tendered:   N90,000
Change:     N7,825
------------------------
  Thanks for shopping
   with Fortune Tiles!
------------------------
 [FT2026000001]
```

### Print Flow
1. Sale completed in React UI
2. `PrintBridge.printReceipt(saleData)` called
3. Java side renders text to 320px-wide bitmap
4. Bitmap wrapped in PrintDocumentAdapter
5. `PrintManager.print()` → XGD Print Service
6. XGD converts to ESC/POS and prints
7. Paper auto-cuts

---

## Implementation Roadmap

### Phase 1: Core Offline POS APK (Standalone)
**Goal**: Single N86 that boots, sells, prints receipts, manages inventory — fully offline.

#### Week 1: Foundation
- [ ] Set up Capacitor project in repo root (`pos-mobile/`)
- [ ] Install `@capacitor-community/sqlite`
- [ ] Port database schema from Sequelize to raw SQL migrations
- [ ] Create SQLite helper class (CRUD wrappers)
- [ ] Add `product_search` FTS5 table

#### Week 2: Business Logic Layer
- [ ] Port all Express route logic to JavaScript modules:
  - [ ] `sales.js` — create sale, update inventory, generate receipt
  - [ ] `inventory.js` — stock queries, adjustments, low-stock alerts
  - [ ] `products.js` — CRUD, search, categories
  - [ ] `returns.js` — process returns, restore inventory
  - [ ] `reports.js` — daily sales, inventory valuation, top products
  - [ ] `users.js` — auth, roles, PIN management
- [ ] JWT auth adapted for local storage (no server)

#### Week 3: UI Rewrite — POS Screen
- [ ] `POSPage` — product grid, category tabs, search
- [ ] `CartDrawer` — slide-up cart with qty controls
- [ ] `PaymentSheet` — numpad, payment method, tendered/change
- [ ] `ReceiptModal` — on-screen receipt preview before print
- [ ] Touch-target audit (min 56px, recommended 60px+)
- [ ] Virtual keyboard handling for barcode scanner

#### Week 4: Print Integration
- [ ] Custom Capacitor plugin: `PrintBridge`
- [ ] Text → Bitmap renderer (40mm-optimized)
- [ ] Android PrintManager integration
- [ ] Auto-print on sale completion
- [ ] Reprint from transaction history
- [ ] Printer settings page (header/footer, test print)

#### Week 5: Back-Office & Polish
- [ ] Port existing pages to mobile layout
- [ ] Inventory management
- [ ] Products CRUD
- [ ] Transactions & returns
- [ ] Reports with PDF/Excel export
- [ ] Settings (store info, users, backup/restore)
- [ ] First-boot wizard (store setup, admin creation)

#### Week 6: Hardening & Packaging
- [ ] Auto-backup SQLite to internal storage
- [ ] Export/import via JSON for data migration
- [ ] Error handling: printer offline, low paper, DB corrupt
- [ ] APK build with `capacitor build android`
- [ ] Test on N86 hardware
- [ ] Document deployment process

### Phase 2: Multi-POS Sync (Within Warehouse)
**Goal**: 2–5 N86 terminals in one warehouse sync inventory and sales.

- [ ] Add `device_id` and `sync_queue` to schema
- [ ] LAN discovery via mDNS/Bonjour (Capacitor Network plugin)
- [ ] Master-slave architecture: one POS designated as "hub"
- [ ] HTTP sync protocol over WiFi LAN
- [ ] Conflict resolution for inventory (optimistic locking)
- [ ] Sales sync (UUID-based, no collision)

### Phase 3: Super Admin Analytics
**Goal**: Central dashboard for all warehouses.

- [ ] Encrypted export from each warehouse hub
- [ ] Upload queue (works when internet available)
- [ ] Super admin React web app (hosted or on-prem)
- [ ] Cross-warehouse revenue, stock alerts, staff performance

---

## File Structure

```
fortunetiles-system/
├── pos-mobile/                    # NEW: Capacitor Android POS
│   ├── android/                   # Native Android project
│   │   ├── app/
│   │   │   ├── src/main/java/com/fortunetiles/pos/
│   │   │   │   ├── MainActivity.java
│   │   │   │   └── PrintBridge.java    # Custom print plugin
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── src/
│   │   ├── App.js                 # Mobile router
│   │   ├── index.js               # Entry point
│   │   ├── contexts/
│   │   │   ├── AuthContext.js
│   │   │   ├── POSContext.js      # Cart, held sales, printer
│   │   │   └── DBContext.js       # SQLite connection
│   │   ├── pages/
│   │   │   ├── pos/
│   │   │   │   ├── POSPage.js
│   │   │   │   ├── ProductGrid.js
│   │   │   │   ├── CartDrawer.js
│   │   │   │   ├── PaymentSheet.js
│   │   │   │   └── ReceiptPreview.js
│   │   │   ├── backoffice/
│   │   │   │   ├── DashboardPage.js
│   │   │   │   ├── InventoryPage.js
│   │   │   │   ├── ProductsPage.js
│   │   │   │   ├── TransactionsPage.js
│   │   │   │   ├── ReturnsPage.js
│   │   │   │   ├── ReportsPage.js
│   │   │   │   ├── UsersPage.js
│   │   │   │   └── SettingsPage.js
│   │   │   └── login/
│   │   │       └── LoginPage.js
│   │   ├── components/
│   │   │   ├── BottomNav.js
│   │   │   ├── TopBar.js
│   │   │   ├── Numpad.js
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── db.js              # SQLite wrapper
│   │   │   ├── sales.js           # Sale processing logic
│   │   │   ├── inventory.js       # Inventory logic
│   │   │   ├── products.js        # Product logic
│   │   │   ├── reports.js         # Report generation
│   │   │   └── printer.js         # PrintBridge wrapper
│   │   ├── utils/
│   │   │   ├── receiptFormatter.js
│   │   │   ├── formatters.js
│   │   │   └── barcodeScanner.js
│   │   └── database/
│   │       ├── migrations/        # SQL migration files
│   │       ├── seeds.js           # Default data
│   │       └── schema.sql         # Full schema
│   ├── capacitor.config.json
│   ├── package.json
│   └── README.md
│
├── frontend/                      # EXISTING: Web app (unchanged)
├── backend/                       # EXISTING: Express API (unchanged)
├── desktop-app/                   # EXISTING: Electron (unchanged)
├── docs/
│   └── POS_RESTRUCTURING_PLAN.md  # This document
└── ...
```

---

## Data Migration Path

### From Existing System to POS
1. **Export** from existing web app: Settings → Backup → Export JSON
2. **Copy** JSON file to N86 via USB/SD card
3. **Import** in POS app: Settings → Restore → Select JSON file
4. **Verify** data integrity (product count, inventory totals)

### From POS to POS
1. **Export** from source POS: Settings → Backup → Export to SD card
2. **Import** on target POS: Settings → Restore → Select backup file

---

## Success Criteria

1. ✅ POS boots to sale-ready in under 10 seconds
2. ✅ Cashier completes 3-item sale in under 20 seconds (including receipt print)
3. ✅ All operations work without any internet connection
4. ✅ Receipt prints correctly on 40mm thermal paper
5. ✅ Inventory updates in real-time after each sale/return
6. ✅ Daily Z-report generated and printed at shift end
7. ✅ Data can be backed up and restored between POS units
8. ✅ App runs stable for 7+ days without restart
9. ✅ APK size under 50MB (for 8GB internal storage)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| N86 memory constraints (1-2GB RAM) | High | Keep APK small, use SQLite efficiently, implement image compression |
| 40mm paper is very narrow | Medium | Compact receipt design, 16px font, abbreviations where needed |
| PrintManager not compatible with XGD | High | Fallback to direct ESC/POS via NEXGO native API if needed |
| SQLite corruption on power loss | High | WAL mode, daily auto-backup, transaction wrapping |
| Camera barcode scanning slow | Medium | Optimize camera preview, cache product lookups |
| Multi-POS sync conflicts | Medium | Optimistic locking, UUIDs, manual conflict resolution UI |

---

## Next Immediate Steps

1. **Test the PoC APK** on your N86 (currently building)
2. **Verify printing works** with the sample receipt
3. **Confirm paper width** (measure actual printed output)
4. If PoC succeeds → begin **Week 1: Foundation** implementation
