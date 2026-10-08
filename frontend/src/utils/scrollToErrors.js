// When a form is submitted with a missing or invalid field, or an error message appears somewhere
// off-screen, scroll to it so the user sees what needs fixing. Works for every form in the app
// because they all mark bad fields with class "error" and show messages in the shared banner classes.
const FIELD = 'input.error, select.error, textarea.error';
const BANNER = '.form-error-message, .error-message, .success-message';

const handled = new Set();

const isVisible = (el) => el.isConnected && el.offsetParent !== null;

function prune() {
  handled.forEach((el) => {
    if (!el.isConnected || !el.matches(`${FIELD}, ${BANNER}`)) handled.delete(el);
  });
}

function reveal(force) {
  prune();
  const fields = [...document.querySelectorAll(FIELD)].filter(isVisible);
  const banners = [...document.querySelectorAll(BANNER)].filter(isVisible);
  const newFields = fields.filter((el) => !handled.has(el));
  const newBanners = banners.filter((el) => !handled.has(el));
  [...fields, ...banners].forEach((el) => handled.add(el));

  // Prefer the first problem field; on an explicit submit, jump to it even if it was already marked.
  const field = newFields[0] || (force ? fields[0] : null);
  const target = field || newBanners[0];
  if (!target) return;

  target.scrollIntoView({ block: 'center' });
  if (field && typeof field.focus === 'function') field.focus({ preventScroll: true });
}

export function installScrollToErrors() {
  let timer = null;
  const schedule = (force) => {
    clearTimeout(timer);
    timer = setTimeout(() => reveal(force), 60);
  };

  new MutationObserver(() => schedule(false)).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  // After a submit, validation runs and React re-renders; check again once it has.
  document.addEventListener('submit', () => setTimeout(() => reveal(true), 150), true);
}
