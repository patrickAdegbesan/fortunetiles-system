const KEY = 'ims_outbox_v1';

export const getOutbox = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const setOutbox = (items) => {
  localStorage.setItem(KEY, JSON.stringify(items));
};

export const enqueue = (req) => {
  const items = getOutbox();
  items.push({ ...req, enqueuedAt: Date.now(), conflict: false });
  setOutbox(items);
};

export const clear = () => setOutbox([]);

export const replayOutbox = async (axiosInstance) => {
  const items = getOutbox();
  if (!items.length) return { replayed: 0, remaining: 0 };
  let success = 0;
  const remaining = [];
  for (const item of items) {
    try {
      await axiosInstance.request(item);
      success++;
    } catch (e) {
      // Keep it if still offline/network error; drop 4xx validation errors
      if (e.code === 'ERR_NETWORK' || !e.response || (e.response && e.response.status >= 500)) {
        remaining.push(item);
      } else if (e.response?.status === 409) {
        // Conflict: keep for manual resolution by user
        remaining.push({ ...item, conflict: true, lastError: { status: 409, message: e.response?.data?.message } });
      }
    }
  }
  setOutbox(remaining);
  return { replayed: success, remaining: remaining.length };
};

export const listConflicts = () => getOutbox().filter(i => i.conflict);
export const removeFromOutbox = (predicate) => {
  const items = getOutbox();
  const filtered = items.filter((it, idx) => !predicate(it, idx));
  setOutbox(filtered);
  return { removed: items.length - filtered.length, remaining: filtered.length };
};
