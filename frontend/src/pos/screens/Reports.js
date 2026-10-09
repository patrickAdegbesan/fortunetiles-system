import React, { useEffect, useState } from 'react';
import { FaChartBar } from 'react-icons/fa';
import { Screen, Card, Segmented, Empty, Loading, ErrorNote, money } from '../ui';
import { useCatalog } from '../store';
import { fetchSalesDailyReport, fetchTopProductsReport, fetchInventoryValuationReport, fetchLowStockItems } from '../../services/api';

const iso = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const rangeFor = (key) => {
  const end = new Date();
  const start = new Date();
  if (key === '7') start.setDate(end.getDate() - 6);
  if (key === '30') start.setDate(end.getDate() - 29);
  return { startDate: iso(start), endDate: iso(end) };
};

export default function Reports() {
  const { location } = useCatalog();
  const [range, setRange] = useState('0');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    const params = rangeFor(range);
    Promise.all([fetchSalesDailyReport(params), fetchTopProductsReport({ ...params, limit: 5 }), fetchInventoryValuationReport(), fetchLowStockItems(10)])
      .then(([sales, top, stock, low]) => { if (alive) setData({ sales: sales.data, top: top.data, stock: stock.data, low: low.items || [] }); })
      .catch((e) => { if (alive) setError((e && (e.message || e.error)) || 'Could not load the report'); });
    return () => { alive = false; };
  }, [range]);

  const s = data && data.sales && data.sales.summary;
  const top = data && data.top && (data.top.topProductsByRevenue || data.top.topProductsByQuantity || []).slice(0, 5);

  return (
    <Screen title="Reports" top={<Segmented value={range} onChange={setRange} options={[{ value: '0', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} />}>
      {error && <ErrorNote message={error} />}
      {!data && !error && <Loading text="Working it out…" />}
      {data && (
        <>
          <div className="pos-row2">
            <Card><div className="pos-row-sub">Sales</div><strong style={{ fontSize: 22 }}>{s ? s.totalTransactions : 0}</strong></Card>
            <Card><div className="pos-row-sub">Revenue</div><strong style={{ fontSize: 22 }}>{money(s ? s.totalRevenue : 0)}</strong></Card>
          </div>
          <div className="pos-row2">
            <Card><div className="pos-row-sub">Average sale</div><strong style={{ fontSize: 18 }}>{money(s ? s.averageOrderValue : 0)}</strong></Card>
            <Card><div className="pos-row-sub">Discounts given</div><strong style={{ fontSize: 18 }}>{money(s ? s.totalDiscount : 0)}</strong></Card>
          </div>
          <Card>
            <h2>Best sellers</h2>
            {(!top || top.length === 0) && <div className="pos-row-sub">No sales in this period.</div>}
            {(top || []).map((p, i) => (
              <div className="pos-kv" key={p.productId}><span style={{ color: 'var(--ink)' }}>{i + 1}. {p.productName}<small style={{ color: 'var(--muted)' }}> × {p.totalQuantitySold}</small></span><strong>{money(p.totalRevenue)}</strong></div>
            ))}
          </Card>
          <Card>
            <h2>Stock</h2>
            <div className="pos-kv"><span>Stock value</span><strong>{money(data.stock && data.stock.summary ? data.stock.summary.totalValuation : 0)}</strong></div>
            <div className="pos-kv"><span>Products</span><strong>{data.stock && data.stock.summary ? data.stock.summary.activeProducts : 0}</strong></div>
          </Card>
          <Card>
            <h2>Running low (10 or fewer)</h2>
            {data.low.length === 0 && <div className="pos-row-sub">Nothing is running low.</div>}
            {data.low.slice(0, 8).map((i) => <div className="pos-kv" key={i.id}><span style={{ color: 'var(--ink)' }}>{i.productName}<small style={{ color: 'var(--muted)' }}> · {i.location}</small></span><strong>{Number(i.quantitySqm)}</strong></div>)}
          </Card>
          {location && <div className="pos-row-sub" style={{ textAlign: 'center' }}>All locations combined</div>}
        </>
      )}
      {data && !s && <Empty icon={<FaChartBar aria-hidden="true" />} title="No data yet" />}
    </Screen>
  );
}
