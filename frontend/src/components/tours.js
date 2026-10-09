// Content of the guided tours.
//
// A tour is { reset, steps, cleanup }. Each step points at part of the screen with a CSS selector (optionally narrowed
// with `match`, a regular expression tested against the element's text, and `closest`, a selector for an ancestor to
// highlight instead). Before a step is shown, its `ensure` actions are performed on the real screen - clicking buttons,
// typing into fields - so people watch exactly what happens. Nothing is ever saved: the tour stops short of every
// submit button, and `cleanup` puts the screen back the way it was.
//
// Actions: click | type | select | wait | waitFor | demo
//   click/type/select: { selector, match?, closest?, label?, once?, unless?, ifPresent?, value? }
//   `once` runs an action a single time per tour; `unless` skips it when that selector is already on screen;
//   `ifPresent` runs it only when that selector is on screen.
// A step with `modal: 'name'` keeps that overlay open; `reset` closers for every other name run first, so any step can
// be reached from any other (Back, Next) without leftovers on screen.
const click = (selector, o = {}) => ({ do: 'click', selector, ...o });
const type = (selector, value, o = {}) => ({ do: 'type', selector, value, ...o });
const select = (selector, value, o = {}) => ({ do: 'select', selector, value, ...o });
const wait = (ms) => ({ do: 'wait', ms });
const waitFor = (selector) => ({ do: 'waitFor', selector });
const demo = (value) => ({ do: 'demo', value });

const nav = (name) => `.sidebar-container .collapsed-nav-item[href$="/${name}"]`;
const MENU = { selector: '.sidebar-container .collapsed-nav', title: 'Main menu', text: 'This bar on the left is how you move around. Click the three-line icon at its top to open it and see the names next to the icons.', placement: 'right' };
const firstWord = (sel) => () => {
  const el = document.querySelector(sel);
  const w = el ? (el.textContent || '').trim().split(/\s+/)[0] : '';
  return w || '';
};
const NEXT_REMINDER = 'You can open this guide again at any time with the ? button in the menu.';

/* ------------------------------------------------------------------ dashboard */
const DASHBOARD = {
  steps: [
    { title: 'Welcome to Fortune Tiles', text: `This guide walks through every part of the system and shows what each button does. Press Next to continue, Back to go over a step again, or Skip to leave. ${NEXT_REMINDER}` },
    MENU,
    { selector: nav('dashboard'), title: 'Dashboard', text: 'Your overview: sales, revenue, stock value and anything that needs attention, all on one page.', placement: 'right' },
    { selector: nav('sales'), title: 'Sales', text: 'The point of sale. Pick products, take payment and print the receipt.', placement: 'right' },
    { selector: nav('transactions'), title: 'Transactions', text: 'Every completed sale. Reprint a receipt, search for an order, and handle returns and exchanges.', placement: 'right' },
    { selector: nav('products'), title: 'Products', text: 'Your product catalogue and stock levels. Add new products, change prices, and update stock.', placement: 'right' },
    { selector: nav('reports'), title: 'Reports', text: 'Daily sales, inventory value, profit and best-selling products, with PDF and Excel export.', placement: 'right' },
    { selector: nav('settings'), title: 'Settings', text: 'Locations, staff accounts, the price-edit PIN and other system options. Only owners and managers see everything here.', placement: 'right' },
    { selector: '.sidebar-container .collapsed-user-profile', title: 'Your account', text: 'Shows who is signed in. Open the menu to find Logout. Always log out when you leave the counter.', placement: 'right' },
    { selector: '.sync-bar .sync-pill', title: 'Sync button', text: 'Always visible at the top. Syncing happens by itself, so you never have to press this. Green means this computer is up to date with the cloud, amber shows how many changes are waiting (they go out on their own), grey means there is no internet right now, and red means something needs attention. Click it only if you want to sync immediately.', placement: 'bottom' },
    { selector: '.top-header .page-title', title: 'Page title', text: 'Tells you which page you are on. The welcome message beside it shows your name.' },
    { selector: '.dashboard-filters', title: 'Filters', text: 'Choose a location and a date range. Every figure on this page follows the filters, so you can look at one shop or all of them, today or any period.' },
    { selector: '.reset-filters-btn', title: 'Reset Filters', text: 'Returns the location and date range to their defaults (all locations, today).' },
    { selector: '.stats-grid .stat-card:nth-child(1)', title: 'Total Sales', text: 'How many sales were completed in the chosen period.' },
    { selector: '.stats-grid .stat-card:nth-child(2)', title: 'Total Revenue', text: 'The money earned from those sales, after discounts.' },
    { selector: '.stats-grid .stat-card:nth-child(3)', title: 'Stock Value', text: 'What the stock you currently hold is worth at your selling prices.' },
    { selector: '.stats-grid .stat-card:nth-child(4)', title: 'Low Stock Items', text: 'How many products are close to running out and need restocking.' },
    { selector: '.low-stock-section', title: 'Low Stock Alerts', text: 'The products that are running out, with how many are left. Items marked CRITICAL need restocking first.' },
    { selector: '.inventory-form-section', title: 'Update Inventory', text: 'Use this when stock arrives or is lost. Choose the location and the product, enter the quantity and a note, then press Update Inventory. The change shows immediately in Current Inventory Levels and in the Products page.' },
    { selector: '.current-inventory-section', title: 'Current Inventory Levels', text: 'The quantity on hand for each product at the chosen location. Use the search box to find one quickly.' },
    { title: 'You are ready', text: `That is the whole dashboard. Open any other page to see its own guide. ${NEXT_REMINDER}` },
  ],
  cleanup: [],
};

/* ---------------------------------------------------------------------- sales */
const SALES_RESET = [
  { name: 'pin', selector: '.pin-dialog .btn-cancel', ifPresent: '.pin-dialog' },
  { name: 'receipt', do: 'demo', value: 'none' },
];
const SALES = {
  reset: SALES_RESET,
  steps: [
    { title: 'Making a sale', text: 'This page is the point of sale. Products are on the left and the shopping cart is on the right. We will now add a product and go through a whole sale, from the first click to the printed receipt. Nothing here is saved.' },
    { selector: '.header-location', title: 'Location', text: 'Choose the shop or warehouse you are selling from. Only the stock at that location can be sold, and the sale reduces that stock. Selling from the warehouse is a different location from the shop, so check this before you start.' },
    { selector: '.enhanced-search-input', title: 'Search', ensure: [type('.enhanced-search-input', firstWord('.sale-product-card [class*="name"], .sale-product-card h3, .sale-product-card h4'))], text: 'Type a product name or any attribute to find it fast. We typed the first word of a product, and the list narrowed to match.' },
    { selector: '.view-controls', title: 'Grid or List', ensure: [type('.enhanced-search-input', ''), click('.view-controls .view-btn', { match: /List/ , unless: '.table-view-container' })], text: 'Switch between large product cards with photos (Grid) and a compact table (List). We switched to List, which fits more products on screen.' },
    { selector: '.compact-stats', title: 'Quick count', ensure: [click('.view-controls .view-btn', { match: /Grid/, unless: '.products-grid' })], text: 'How many products are showing, and how many items and what total are in the cart right now.' },
    { selector: '.sale-product-card', title: 'A product card', text: 'Each card shows the photo, price and how much is in stock. Products that are out of stock cannot be added. The eye button opens a quick look at the details.' },
    { selector: '.sale-product-card .add-btn', title: 'Add to Cart', text: 'Pressing this adds one of the product to the cart. Watch the cart on the right...' },
    { selector: '.cart-item-enhanced', title: 'The product is in the cart', ensure: [click('.sale-product-card .add-btn', { unless: '.cart-item-enhanced' }), waitFor('.cart-item-enhanced')], text: 'There it is. Each cart line shows the product, its unit price, the quantity and the line total. The cart count and the total at the top of the page updated too.', placement: 'left' },
    { selector: '.cart-item-enhanced .unit-toggle', title: 'Sell by carton or by square metre', text: 'A tile can be sold either way. Press carton or sqm to choose: the amount stays the same and is converted for you, for example 2.5 cartons is 3.60 sqm at 1.44 sqm a carton. The price per sqm and the price per carton are both shown. This switch only appears for tiles that have a carton size.', placement: 'left' },
    { selector: '.qty-controls', title: 'Quantity', ensure: [click('.qty-btn.increase', { once: 'qty' })], text: 'Use plus and minus to change the quantity, or type it, decimals included (2.50 is fine). We pressed plus, so the line total went up. You cannot add more than is in stock.', placement: 'left' },
    { selector: '.remove-btn', title: 'Remove a line', text: 'The red bin removes this product from the cart. It does not affect your stock because nothing has been sold yet.', placement: 'left' },
    { selector: '.markup-editor', title: 'Editing the price (markup)', text: 'Sometimes you need to charge more than the listed price. Markup adds an amount on top of the unit price for this sale only. Owners and managers can type it directly. Other staff see an Unlock button and need the PIN the owner set in Settings, which stops anyone changing prices without permission.', placement: 'left' },
    { selector: '.pin-dialog', modal: 'pin', title: 'The PIN window', ensure: [click('.markup-unlock-btn', { ifPresent: '.markup-unlock-btn', unless: '.pin-dialog' })], text: 'This is what staff see after pressing Unlock. They enter the 4-digit PIN and press Unlock. It stays unlocked for a limited time. (If you are the owner, you do not need it, so this window may not appear for you.)' },
    { selector: '.cart-summary .total-section', title: 'Totals', text: 'Subtotal, any discount, and the final total the customer pays.', placement: 'left' },
    { selector: '.customer-form-enhanced .form-group-enhanced:nth-child(1)', title: 'Customer name (optional)', ensure: [type('.customer-form-enhanced input[placeholder*="name"]', 'Ada Okafor')], text: 'Type the customer name if you want it on the receipt. We typed a sample name. Leave it empty for a walk-in customer.', placement: 'left' },
    { selector: '.customer-form-enhanced .form-group-enhanced:nth-child(2)', title: 'Phone number (optional)', ensure: [type('.customer-form-enhanced input[placeholder*="phone"]', '0801 234 5678')], text: 'Useful if the customer asks for a follow-up or a return later. You can search for orders by phone number in Transactions.', placement: 'left' },
    { selector: '.customer-form-enhanced .form-group-enhanced:nth-child(3)', title: 'Payment method', ensure: [select('.customer-form-enhanced select.enhanced-select', 'bank_transfer')], text: 'Choose how the customer is paying: cash, card, bank transfer or POS terminal. This is required before you can complete the sale. We picked bank transfer as an example, and the receipt will then show your bank details.', placement: 'left' },
    { selector: '.bank-picker', title: 'Choose the bank account', ensure: [click('.bank-option input', { once: 'bankpick', unless: '.bank-option.on' })], text: 'When the customer pays by bank transfer, tick the account they will pay into. You can tick more than one. Only the accounts you tick are printed on the receipt, so the customer sees exactly where to send the money. The list comes from Settings, where the owner can add, change or hide accounts. The sale cannot be completed until an account is chosen.', placement: 'left' },
    { selector: '.discount-input-group', title: 'Discount', ensure: [select('.discount-type-select', 'percentage'), type('.discount-value-input', '10')], text: 'Give a discount either as a fixed amount or a percentage. We chose 10 percent, and the preview and the totals updated at once. The discount appears on the receipt.', placement: 'left' },
    { selector: '.complete-sale-btn', title: 'Complete the sale', text: 'This is the button that finishes the sale. It saves the order, reduces the stock at this location and opens the receipt. We will not press it now so that no real sale is recorded.', placement: 'left' },
    { selector: '.receipt-container', modal: 'receipt', title: 'The receipt', ensure: [demo('receipt'), waitFor('.receipt-container')], text: 'After a sale this is what opens. It shows the business details, the receipt number, date, customer, every item with its price, the discount and the total. This one uses sample data.' },
    { selector: '.receipt-header .print-btn', modal: 'receipt', title: 'Printing the receipt', ensure: [demo('receipt'), waitFor('.receipt-container')], text: 'Press Print to send the receipt to your printer. The normal Windows print window opens: choose your printer, for example an HP DeskJet, and print. You can reprint any receipt later from the Transactions page.' },
    { title: 'That is a complete sale', text: `Add products, set the quantity, add optional customer details, choose payment, apply a discount if needed, complete the sale and print. ${NEXT_REMINDER}` },
  ],
  cleanup: [
    ...SALES_RESET,
    { name: 'banks', selector: '.bank-option.on input', repeat: true, ifPresent: '.bank-option.on' },
    { name: 'cart', selector: '.cart-item-enhanced .remove-btn', repeat: true, ifPresent: '.cart-item-enhanced' },
    type('.customer-form-enhanced input[placeholder*="name"]', ''),
    type('.customer-form-enhanced input[placeholder*="phone"]', ''),
    select('.customer-form-enhanced select.enhanced-select', ''),
    type('.enhanced-search-input', ''),
  ],
};

/* --------------------------------------------------------------- transactions */
const TRANSACTIONS_RESET = [
  { name: 'receipt', selector: '.receipt-overlay .close-btn', ifPresent: '.receipt-overlay' },
  { name: 'return', selector: '.return-modal .btn-secondary', ifPresent: '.return-modal' },
];
const FIRST_ORDER_ID = () => { const c = document.querySelector('.transactions-table tbody tr td'); return c ? c.textContent.replace(/[^0-9]/g, '') : ''; };
const TRANSACTIONS = {
  reset: TRANSACTIONS_RESET,
  steps: [
    { title: 'Transactions', text: 'Every sale ever made is listed here. Use this page to find an order, look at its receipt, reprint it, or process a return or exchange.' },
    { selector: '.page-header .header-stats', title: 'Summary', text: 'Total orders, completed orders, returns and total sales at a glance.' },
    { selector: '.tabs', title: 'Orders and Returns', ensure: [click('.tabs .tab', { match: /Orders/ })], text: 'Orders lists the sales. The Returns tab lists goods that customers brought back. Press Returns to see it.' },
    { selector: '.tabs', title: 'The Returns tab', ensure: [click('.tabs .tab', { match: /Returns/ })], text: 'Here each return shows the order it came from, the reason and the refund. Owners and managers review them here.' },
    { selector: '.search-input', title: 'Search', ensure: [click('.tabs .tab', { match: /Orders/ }), waitFor('.transactions-table'), type('.transactions-table-container ~ * .search-input, .search-filters .search-input', FIRST_ORDER_ID)], text: 'Find an order by its number, the customer name or the phone number. We typed an order number, and the table narrowed to that one order.' },
    { selector: '.filter-select', title: 'Status filter', ensure: [type('.search-filters .search-input', '')], text: 'Show only completed orders, or only those with another status.' },
    { selector: '.refresh-btn', title: 'Refresh', text: 'Reloads the list so it includes sales made a moment ago.' },
    { selector: '.transactions-table', title: 'The order list', text: 'One row per sale: who bought, what, the amounts before and after markup and discount, how it was paid and when.', placement: 'top' },
    { selector: '.transactions-table tbody tr:first-child .action-btn:nth-child(1)', title: 'Receipt button', text: 'This opens the receipt for the sale. Watch what happens when we press it...', placement: 'left' },
    { selector: '.receipt-container', modal: 'receipt', title: 'The order card (receipt)', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(1)', { unless: '.receipt-overlay' }), waitFor('.receipt-container')], text: 'This is the full record of the order: customer, items with their quantities and prices, discount, total and payment method. If the order had a return, it is listed at the bottom.' },
    { selector: '.receipt-header .print-btn', modal: 'receipt', title: 'Reprint', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(1)', { unless: '.receipt-overlay' }), waitFor('.receipt-container')], text: 'Press Print to print the receipt again, for example when a customer lost theirs. The normal print window opens so you can choose your printer. The X closes the receipt.' },
    { selector: '.transactions-table tbody tr:first-child .action-btn:nth-child(2)', title: 'Return button', text: 'Use this when a customer brings goods back. We will open it now...', placement: 'left' },
    { selector: '.return-modal', modal: 'return', title: 'The return form', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(2)', { unless: '.return-modal' }), waitFor('.return-modal')], text: 'This form handles everything about a return. It starts with the order you chose.' },
    { selector: '.return-modal .order-summary', modal: 'return', title: 'Order summary', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(2)', { unless: '.return-modal' }), waitFor('.return-modal')], text: 'Confirms which order and customer you are working on, so a return is never recorded against the wrong sale.' },
    { selector: '.return-modal .return-items-section', modal: 'return', title: 'Items and quantities', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(2)', { unless: '.return-modal' }), waitFor('.return-modal'), type('.return-quantity-input', '1', { once: 'rq' })], text: 'Every item on the order is listed. Enter how many of each is being returned. We entered 1, and the refund amount beside it updated. Leave a quantity at 0 for items the customer keeps.' },
    { selector: '.return-modal .return-reason-section', modal: 'return', title: 'Reason', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(2)', { unless: '.return-modal' }), waitFor('.return-modal'), type('.return-reason-input', 'Wrong size ordered', { once: 'rr' })], text: 'Write why the goods came back, for example damaged, wrong size or changed mind. This is kept with the record so you can review returns later.' },
    { selector: '.return-modal .return-summary', modal: 'return', title: 'Refund amount', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(2)', { unless: '.return-modal' }), waitFor('.return-modal')], text: 'The total to refund, worked out from the quantities you entered and the price the customer actually paid, including any discount.' },
    { selector: '.return-modal .modal-footer', modal: 'return', title: 'Process or cancel', ensure: [click('.transactions-table tbody tr:first-child .action-btn:nth-child(2)', { unless: '.return-modal' }), waitFor('.return-modal')], text: 'Process Return saves it and puts the goods back into stock. Cancel closes the form with nothing saved, which is what we will do now.' },
    { title: 'Editing or deleting an order', text: 'A completed order cannot be edited or deleted. This keeps your sales records trustworthy, so nobody can quietly change history. If something went wrong, process a return (this page) and ring up the correct sale again. To charge a different price, set it in the cart before completing the sale, using the markup PIN.' },
    { title: 'That is the Transactions page', text: `Search for an order, view or reprint its receipt, and process returns. ${NEXT_REMINDER}` },
  ],
  cleanup: [...TRANSACTIONS_RESET, type('.search-filters .search-input', '')],
};

/* ------------------------------------------------------------------- products */
const PRODUCTS_RESET = [
  { name: 'editor', selector: '.pe-dialog .pe-actions button[type="button"]', ifPresent: '.pe-overlay' },
  { name: 'quick', selector: '.quickview-close-footer-btn', ifPresent: '.quickview-overlay' },
  { name: 'delete', selector: '.delete-cancel-btn', ifPresent: '.delete-modal-overlay' },
];
const section = (title) => ({ selector: '.pe-dialog h3', match: new RegExp(title), closest: '.pe-section' });
const openAdd = click('button', { match: /Add Product/, unless: '.pe-overlay' });
const openEdit = click('.sale-product-card .edit-btn', { unless: '.pe-overlay' });
const peField = (n) => `.pe-dialog .pe-grid3 .pe-field:nth-child(${n}) input`;
const PRODUCTS = {
  reset: PRODUCTS_RESET,
  steps: [
    { title: 'Product management', text: 'Your whole catalogue lives here. You can add products, correct prices, look at details and see what is in stock at each location.' },
    { selector: '.header-stats', title: 'Catalogue summary', text: 'Total products, number of categories, how many are in stock and how many are low.' },
    { selector: '.enhanced-search-input', title: 'Search', text: 'Find products by name, category or attribute.' },
    { selector: '.enhanced-select', title: 'Category filter', text: 'Show only one category, for example marble or porcelain.' },
    { selector: '.enhanced-location-select', title: 'Location filter', text: 'See the stock at one location instead of all of them.' },
    { selector: '.filter-controls input[type="checkbox"]', title: 'In stock only', text: 'Hide products that are out of stock.' },
    { selector: '.view-controls', title: 'Grid or Table', ensure: [click('.view-controls .view-btn', { match: /Table/ })], text: 'Cards with photos, or a compact table that fits more products on screen. We switched to Table.' },
    { selector: '.sort-controls', title: 'Sorting', ensure: [click('.view-controls .view-btn', { match: /Grid/ })], text: 'Sort by name, price or stock, and use the arrow button beside it to flip the order.' },
    { selector: 'button.action-btn', match: /Export/i, title: 'Export', text: 'Downloads the product list as a file so you can keep it or open it in Excel.' },
    { selector: 'button', match: /Add Product/, title: 'Add Product', text: 'Press this to add a new tile. We will open the form now...' },
    { selector: '.pe-dialog .pe-header', modal: 'editor', title: 'The Add Item form', ensure: [openAdd, waitFor('.pe-dialog')], text: 'Everything about a new tile is on this one form. Nothing is saved until you press Add item.' },
    { selector: '.pe-dialog .pe-kind', modal: 'editor', title: 'Tile or other product', ensure: [openAdd, waitFor('.pe-dialog')], text: 'Tiles come first because they are what you sell most: this tab asks for the size, the pieces in a carton and the price per square metre. Choose Other product for anything else, such as adhesive, grout or tools. That tab is simpler: a name, how it is sold (piece, bag, box, kilogram...), a price and the stock.' },
    { selector: '.pe-dialog .pe-top', modal: 'editor', title: 'Name and photo', ensure: [openAdd, waitFor('.pe-dialog'), type('.pe-dialog .pe-name input', 'Calacatta Gold Polished', { once: 'pn' })], text: 'Give the tile its name, as customers will know it. Press the Photo box to choose a picture from the computer, so the tile is easy to recognise when selling. We typed a sample name.' },
    { ...section('Size and carton'), modal: 'editor', title: 'Size and carton', ensure: [openAdd, waitFor('.pe-dialog'), type(peField(1), '60', { once: 'l1' }), type(peField(2), '60', { once: 'l2' }), type(peField(3), '4', { once: 'l3' })], text: 'Enter the tile size in centimetres and how many pieces are in a carton. The system works out the square metres in one carton by itself: here 60 x 60 cm is 0.36 sqm a piece, so 4 pieces make 1.44 sqm. That is how it can sell the same tile by the sqm or by the carton. You can also type the carton\'s square metres from its label, and pick the finish.' },
    { ...section('Price'), modal: 'editor', title: 'Price', ensure: [openAdd, waitFor('.pe-dialog'), type('.pe-dialog .pe-grid2:nth-of-type(1) input[placeholder="0.00"], .pe-dialog input[placeholder="0.00"]', '5250', { once: 'pr' })], text: 'Type the price of one square metre. The price of a whole carton is calculated for you from the carton size (here 5,250 x 1.44 = 7,560), so a customer can be charged by either.' },
    { ...section('Stock you have now'), modal: 'editor', title: 'Starting stock', ensure: [openAdd, waitFor('.pe-dialog')], text: 'How much of this tile you have, counted in cartons or in square metres, and where it is kept. Cartons are turned into square metres for you. Later changes to stock are made from the Dashboard.' },
    { selector: '.pe-dialog .pe-more', modal: 'editor', title: 'More options', ensure: [openAdd, waitFor('.pe-dialog')], text: 'Everything you do not need for a normal tile is tucked away here: an optional product type, a supplier code, notes and extra details such as Brand or Colour. Leave it closed unless you need it.' },
    { ...section('Category'), modal: 'editor', title: 'Category', ensure: [openAdd, waitFor('.pe-dialog')], text: 'Tick the categories that fit, for example Marble or Porcelain, so you can filter and report on them. New categories can be added right here.' },
    { selector: '.pe-dialog .pe-actions', modal: 'editor', title: 'Add item or cancel', ensure: [openAdd, waitFor('.pe-dialog')], text: 'Add item saves it. Cancel closes the form without saving anything, which is what we will do now.' },
    { selector: '.sale-product-card .edit-btn', title: 'Edit', text: 'Edit opens the same form with the product already filled in, so you can correct the name, price, photo or categories. We will open it...', placement: 'top' },
    { selector: '.pe-dialog .pe-header', modal: 'editor', title: 'Editing a tile', ensure: [openEdit, waitFor('.pe-dialog')], text: 'The form is filled with the current details. Change what you need and press Save changes. A price change applies to future sales only, so past receipts stay correct. Stock is not changed here; use the Dashboard for that.' },
    { selector: '.sale-product-card button', match: /View/, title: 'View', text: 'View gives a quick read-only look at a product. We will open it...', placement: 'top' },
    { selector: '.quickview-modal', modal: 'quick', title: 'Quick view', ensure: [click('.sale-product-card button', { match: /View/, unless: '.quickview-modal' }), waitFor('.quickview-modal')], text: 'The photo, price, category, attributes and the stock held at every location, without any risk of changing anything.' },
    { selector: '.sale-product-card .delete-btn', title: 'Delete (archive)', text: 'Delete removes a product from selling and from the lists. It is archived rather than erased, so past sales keep its name and your history stays correct. We will open the confirmation...', placement: 'top' },
    { selector: '.delete-modal', modal: 'delete', title: 'Confirm before archiving', ensure: [click('.sale-product-card .delete-btn', { unless: '.delete-modal' }), waitFor('.delete-modal')], text: 'You are always asked to confirm, and may have to type the product name, so a product can never be removed by accident. Cancel leaves it untouched.' },
    { title: 'That is Products', text: `Search and filter, add a product, edit or view it, and archive it when it is no longer sold. ${NEXT_REMINDER}` },
  ],
  cleanup: PRODUCTS_RESET,
};

/* -------------------------------------------------------------------- reports */
const reportTab = (name) => click('.report-tabs .tab-btn', { match: new RegExp(name) });
const REPORTS = {
  reset: [],
  steps: [
    { title: 'Business reports', text: 'See how the business is doing and take the figures out as a file. We will look at each report in turn.' },
    { selector: '.export-btn', title: 'Export PDF / Excel', text: 'Downloads the report you are looking at, as a PDF to print or an Excel sheet to work on. We will not press it now.', placement: 'left' },
    { selector: '.report-tabs', title: 'Choose a report', text: 'Four reports, each answering a different question: Daily Sales, Inventory Value, Profit Analysis and Top Products.' },
    { selector: '.report-filters', title: 'Dates', text: 'Pick a start and end date, or use the shortcuts: last 7 days, 30 days, 3 months or a year.' },
    { selector: '.quick-btn', match: /Last 7 Days/, title: 'Quick range', ensure: [click('.quick-btn', { match: /Last 7 Days/, once: 'q7' })], text: 'We pressed Last 7 Days. The dates changed and the figures and the chart below were recalculated for that week.' },
    { selector: '.location-filter', title: 'Location', text: 'Report on one shop or warehouse, or on all of them together.' },
    { selector: '.summary-cards', title: 'Daily Sales: key figures', ensure: [reportTab('Daily Sales')], text: 'The Daily Sales report totals the period: revenue, discounts given, number of sales, and the average and biggest sale.' },
    { selector: '.chart-container', title: 'Daily Sales: chart', text: 'The same story as a picture, so busy and quiet days are easy to spot.', placement: 'top' },
    { selector: '.report-section', title: 'Inventory Value', ensure: [reportTab('Inventory Value')], text: 'What the stock you hold is worth, by product and category. Useful for stock-taking and for knowing how much money is tied up in tiles.' },
    { selector: '.report-section', title: 'Profit Analysis', ensure: [reportTab('Profit Analysis')], text: 'Compares what products sold for against what they cost, so you can see which ones actually make money.' },
    { selector: '.report-section', title: 'Top Products', ensure: [reportTab('Top Products')], text: 'The best sellers for the period, by quantity and by revenue. Use it to decide what to restock first.' },
    { title: 'That is Reports', text: `Pick a report, set the dates and location, read the figures and export if you need a copy. ${NEXT_REMINDER}` },
  ],
  cleanup: [reportTab('Daily Sales')],
};

/* ------------------------------------------------------------------- settings */
const SETTINGS_RESET = [
  { name: 'location', selector: '.modal-actions .secondary-button', ifPresent: '.modal-overlay' },
  { name: 'user', selector: '.user-editor-overlay .cancel-btn', ifPresent: '.user-editor-overlay' },
];
const tab = (name) => click('.settings-tabs .tab-button', { match: new RegExp(name) });
const openAddLocation = click('.locations-tab .tab-header .primary-button', { unless: '.modal-overlay' });
const openAddUser = click('.users-tab .tab-header .primary-button', { unless: '.user-editor-overlay' });
const openEditUser = click('.users-table tbody tr:first-child .action-btn.edit', { unless: '.user-editor-overlay' });
const uSection = (title) => ({ selector: '.user-editor-overlay h3', match: new RegExp(title), closest: '.form-section, .editor-section, div' });
const SETTINGS = {
  reset: SETTINGS_RESET,
  steps: [
    { title: 'Settings', text: 'Everything that controls how the system works is here. Some parts are only for owners and managers. We will go through each section and show how to add and edit things.' },
    { selector: '.settings-tabs', title: 'Sections', ensure: [tab('Overview')], text: 'Overview shows everything at a glance. Locations is for shops and warehouses. Users is for staff accounts. Admin Settings holds categories, product types and attributes.' },
    { selector: '.overview-card:nth-child(1)', title: 'Locations summary', text: 'How many shops and warehouses you have and how many hold stock.' },
    { selector: '.overview-card:nth-child(2)', title: 'Users summary', text: 'How many people can sign in and how many are active.' },
    { selector: '.overview-card:nth-child(3)', title: 'System configuration', text: 'Product types, categories and global attributes used when you add items.' },
    { selector: '.pin-setup-section', title: 'Markup PIN', text: 'Set a 4-digit PIN here. Staff enter it at the till to unlock price changes on a sale. Anyone who does not know it can only sell at the listed price. Type it twice to confirm and press Set PIN.' },
    { selector: '.bank-card', title: 'Bank Accounts', text: 'The shop\'s bank accounts. At checkout, when someone pays by transfer, the cashier ticks the account to use and only that account is printed on the receipt. Add an account, edit its name or number, hide it from checkout, or remove it. Receipts already printed keep the details they had.' },
    { selector: '.sync-card', title: 'Cloud Sync', text: 'Sync needs no setup and nothing to type. The first time this computer has internet it links itself to the shop\'s cloud, and from then on it shares products, stock, sales and users with the POS terminal automatically, and keeps working normally when the internet is down. This card shows how it is going. Sync now is only for when you are impatient, and if this computer and the cloud both already hold data, this is where the owner is asked which to keep.' },
    { selector: '.actions-grid', title: 'Quick actions', text: 'Shortcuts for the jobs you do most.' },

    { selector: '.locations-tab .tab-header', title: 'Locations', ensure: [tab('Locations')], text: 'This is where shops and warehouses are managed. Every product\'s stock is held at a location, and every sale is made from one.' },
    { selector: '.locations-tab .tab-header .primary-button', title: 'Add Location', text: 'Press this to add a new shop or warehouse. We will open the form...', placement: 'left' },
    { selector: '.modal-content', modal: 'location', title: 'The Add Location form', ensure: [tab('Locations'), openAddLocation, waitFor('.modal-content'), type('.modal-content input', 'Ikeja Showroom', { once: 'ln' })], text: 'Enter the location name, which is required, and optionally its address. We typed a sample name. Press Save to create it, or Cancel to close without saving.' },
    { selector: '.locations-tab .location-card:first-child .action-btn.edit', title: 'Edit a location', ensure: [tab('Locations')], text: 'The pencil opens the same form filled in so you can rename a location or change its address. The eye shows its stock and the red bin deletes it (you will be asked to confirm, and it cannot be undone).', placement: 'top' },

    { selector: '.users-tab .tab-header', title: 'Users', ensure: [tab('Users')], text: 'Staff accounts live here. Only the owner can see and change them.' },
    { selector: '.users-filters', title: 'Find a user', text: 'Search by name or username, or filter by role and by active or inactive.' },
    { selector: '.users-tab .tab-header .primary-button', title: 'Add User', text: 'Press this to create an account for a new staff member. We will open the form...', placement: 'left' },
    { selector: '.user-editor-overlay .editor-header', modal: 'user', title: 'The Add User form', ensure: [tab('Users'), openAddUser, waitFor('.user-editor-overlay')], text: 'Everything needed to give someone access. Nothing is saved until you press Save.' },
    { ...uSection('Personal Information'), modal: 'user', title: 'Personal information', ensure: [tab('Users'), openAddUser, waitFor('.user-editor-overlay'), type('.user-editor-overlay input', 'Chidi', { once: 'uf' })], text: 'First name, last name, the username they will type to sign in (no spaces), an optional email, and a password of at least 6 characters. Tell the person their username and password and ask them to keep the password private.' },
    { ...uSection('Role & Permissions'), modal: 'user', title: 'Role and location', ensure: [tab('Users'), openAddUser, waitFor('.user-editor-overlay')], text: 'The role decides what the person can do. Choose the location they work at, and untick Active if the account should not be able to sign in.' },
    { ...uSection('Role Permissions'), modal: 'user', title: 'What each role can do', ensure: [tab('Users'), openAddUser, waitFor('.user-editor-overlay')], text: 'This panel lists the permissions that come with the role you picked, so you know exactly what you are granting before you save.' },
    { selector: '.user-editor-overlay .editor-actions', modal: 'user', title: 'Save or cancel', ensure: [tab('Users'), openAddUser, waitFor('.user-editor-overlay')], text: 'Save creates the account. Cancel closes the form without saving, which we will do now.' },
    { selector: '.users-table tbody tr:first-child .action-btn.edit', title: 'Edit a user', text: 'The pencil opens the same form filled in. We will open it...', placement: 'left' },
    { selector: '.user-editor-overlay .editor-header', modal: 'user', title: 'Editing a user', ensure: [tab('Users'), openEditUser, waitFor('.user-editor-overlay')], text: 'Change the name, username, role or location here. To reset a forgotten password, type a new one in the password box. If you leave it blank, the current password is kept.' },
    { selector: '.users-table tbody tr:first-child td:last-child', title: 'Other user actions', ensure: [tab('Users')], text: 'Beside the pencil there is a button to deactivate or reactivate an account, which stops someone signing in without losing their sales history, and a red bin that permanently deletes it after a confirmation. You cannot delete your own account.', placement: 'left' },

    { selector: '.admin-sections', title: 'Admin Settings', ensure: [tab('Admin')], text: 'The building blocks used when items are added. Each block works the same way: type a name, press Add, and use the pencil and bin on an entry to rename or remove it.' },
    { selector: '.admin-section:nth-child(1)', title: 'Product types', text: 'Optional groups of similar items, used in reports. Tiles do not need one.' },
    { selector: '.admin-section:nth-child(2)', title: 'Global categories', text: 'The categories offered when you add or filter items, for example Marble, Porcelain or Granite.' },
    { selector: '.admin-section:nth-child(3)', title: 'Global attributes', text: 'Extra details an item can carry, such as Brand or Colour.' },
    { title: 'That is Settings', text: `Locations, users, the price PIN and the item building blocks. ${NEXT_REMINDER}` },
  ],
  cleanup: [...SETTINGS_RESET, tab('Overview')],
};

const GENERIC = {
  reset: [],
  steps: [
    { title: 'Help', text: 'Use the main menu on the left to move between Dashboard, Sales, Transactions, Products, Reports and Settings. Each of those pages has its own guide behind the ? button in the menu.' },
    MENU,
  ],
  cleanup: [],
};

const TOURS = {
  '/dashboard': DASHBOARD,
  '/sales': SALES,
  '/transactions': TRANSACTIONS,
  '/products': PRODUCTS,
  '/reports': REPORTS,
  '/settings': SETTINGS,
};

export const tourFor = (pathname) => TOURS[pathname] || GENERIC;
export const tourKey = (pathname) => (TOURS[pathname] ? pathname : null);
