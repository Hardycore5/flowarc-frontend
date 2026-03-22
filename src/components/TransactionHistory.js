import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { FLOWARC_ADDRESS, FLOWARC_ABI } from "../contracts/abis";

function TransactionHistory({ address, notify }) {
  const [txs, setTxs]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  const loadHistory = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(FLOWARC_ADDRESS, FLOWARC_ABI, provider);
      const block    = await provider.getBlockNumber();

      // Use smaller chunks to avoid RPC limits
      const chunkSize = 2000;
      const startBlock = Math.max(0, block - 10000);
      let allEvents = [];

      for (let from = startBlock; from < block; from += chunkSize) {
        const to = Math.min(from + chunkSize - 1, block);
        try {
          const [deposits, withdrawals, claims, workerClaims, workers] = await Promise.all([
            contract.queryFilter(contract.filters.FundsDeposited(address), from, to),
            contract.queryFilter(contract.filters.FundsWithdrawn(address), from, to),
            contract.queryFilter(contract.filters.SalaryClaimed(address), from, to),
            contract.queryFilter(contract.filters.SalaryClaimed(null, address), from, to),
            contract.queryFilter(contract.filters.WorkerAdded(address), from, to),
          ]);

          allEvents = [
            ...allEvents,
            ...deposits.map(e => ({
              type: "deposit", hash: e.transactionHash,
              amount: ethers.utils.formatUnits(e.args.amount, 6),
              block: e.blockNumber, icon: "💰", label: "Deposit",
              color: "var(--success)"
            })),
            ...withdrawals.map(e => ({
              type: "withdrawal", hash: e.transactionHash,
              amount: ethers.utils.formatUnits(e.args.amount, 6),
              block: e.blockNumber, icon: "🏦", label: "Withdrawal",
              color: "var(--danger)"
            })),
            ...claims.map(e => ({
              type: "claim_sent", hash: e.transactionHash,
              amount: ethers.utils.formatUnits(e.args.amount, 6),
              block: e.blockNumber, icon: "💸", label: "Salary Paid",
              color: "#F0C060"
            })),
            ...workerClaims.map(e => ({
              type: "claim_received", hash: e.transactionHash,
              amount: ethers.utils.formatUnits(e.args.amount, 6),
              block: e.blockNumber, icon: "🎉", label: "Salary Received",
              color: "var(--success)"
            })),
            ...workers.map(e => ({
              type: "worker_added", hash: e.transactionHash,
              amount: null, block: e.blockNumber,
              icon: "👷", label: `Added ${e.args.name}`,
              color: "#818CF8"
            })),
          ];
        } catch (chunkErr) {
          console.warn(`Chunk ${from}-${to} failed:`, chunkErr.message);
        }
      }

      allEvents.sort((a, b) => (b.block || 0) - (a.block || 0));
      setTxs(allEvents);

      if (allEvents.length === 0) {
        notify("No transactions found in last 10,000 blocks", "error");
      }
    } catch (e) {
      console.error("TX History Error:", e);
      notify("Failed to load history: " + e.message, "error");
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const filtered = filter === "all" ? txs : txs.filter(t =>
    t.type === filter ||
    (filter === "claims" && (t.type === "claim_sent" || t.type === "claim_received"))
  );

  const shortHash = (h) => h ? `${h.slice(0, 8)}...${h.slice(-6)}` : "";

  return (
    <div>
      <style>{`
        .tx-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .tx-filter-btn { padding: 7px 16px; border-radius: 20px; border: 1px solid var(--border);
          background: transparent; color: var(--muted); font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
          text-transform: uppercase; letter-spacing: 0.5px; }
        .tx-filter-btn:hover { border-color: var(--border-hover); color: var(--text); }
        .tx-filter-btn.active { background: var(--gold-dim); border-color: var(--gold); color: var(--gold); }
        .tx-row { display: flex; align-items: center; gap: 16px; padding: 16px 20px;
          background: var(--dark); border: 1px solid var(--border); border-radius: 14px;
          margin-bottom: 10px; transition: border-color 0.2s; }
        .tx-row:hover { border-color: var(--border-hover); }
        .tx-icon-wrap { width: 44px; height: 44px; border-radius: 12px; background: var(--dark2);
          border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0; }
        .tx-info { flex: 1; min-width: 0; }
        .tx-label { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .tx-meta { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .tx-hash { font-family: monospace; }
        .tx-copy { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 11px; transition: color 0.2s; padding: 0; }
        .tx-copy:hover { color: var(--gold); }
        .tx-amount { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; text-align: right; white-space: nowrap; }
        .tx-block { font-size: 11px; color: var(--muted); text-align: right; margin-top: 4px; }
        .tx-explorer { display: inline-flex; align-items: center; gap: 4px; font-size: 11px;
          color: var(--gold); font-weight: 600; cursor: pointer; background: none; border: none;
          font-family: 'DM Sans', sans-serif; padding: 0; transition: opacity 0.2s; }
        .tx-explorer:hover { opacity: 0.7; }
        .tx-skeleton { height: 76px; border-radius: 14px;
          background: linear-gradient(90deg, #131325 25%, #1a1a35 50%, #131325 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite; margin-bottom: 10px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .tx-empty { text-align: center; padding: 48px 20px; }
        .tx-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .tx-empty-text { color: var(--muted); font-size: 14px; }
        .tx-stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .tx-stat { flex: 1; min-width: 120px; background: var(--dark2); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
        .tx-stat-num { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: var(--gold); }
        .tx-stat-label { font-size: 11px; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
      `}</style>

      {/* STATS */}
      <div className="tx-stats">
        <div className="tx-stat">
          <div className="tx-stat-num">{txs.length}</div>
          <div className="tx-stat-label">Total Transactions</div>
        </div>
        <div className="tx-stat">
          <div className="tx-stat-num">
            {txs.filter(t => t.type === "deposit").reduce((s, t) => s + parseFloat(t.amount || 0), 0).toFixed(2)}
          </div>
          <div className="tx-stat-label">Total Deposited (USDC)</div>
        </div>
        <div className="tx-stat">
          <div className="tx-stat-num">
            {txs.filter(t => t.type === "claim_received").reduce((s, t) => s + parseFloat(t.amount || 0), 0).toFixed(2)}
          </div>
          <div className="tx-stat-label">Total Claimed (USDC)</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="tx-filters">
        {[
          { key: "all",          label: "All" },
          { key: "deposit",      label: "Deposits" },
          { key: "withdrawal",   label: "Withdrawals" },
          { key: "claims",       label: "Salary" },
          { key: "worker_added", label: "Workers" },
        ].map(f => (
          <button key={f.key} className={`tx-filter-btn ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
        <button className="tx-filter-btn" onClick={loadHistory} style={{marginLeft:"auto"}}>
          🔄 Refresh
        </button>
      </div>

      {/* LOADING */}
      {loading && [1,2,3,4].map(i => <div key={i} className="tx-skeleton" />)}

      {/* EMPTY */}
      {!loading && filtered.length === 0 && (
        <div className="tx-empty">
          <div className="tx-empty-icon">📊</div>
          <p className="tx-empty-text">No transactions found</p>
        </div>
      )}

      {/* TX LIST */}
      {!loading && filtered.map((tx, i) => (
        <div key={i} className="tx-row">
          <div className="tx-icon-wrap">{tx.icon}</div>
          <div className="tx-info">
            <div className="tx-label" style={{color: tx.color}}>{tx.label}</div>
            <div className="tx-meta">
              <span className="tx-hash">{shortHash(tx.hash)}</span>
              <button className="tx-copy" onClick={() => { navigator.clipboard.writeText(tx.hash); notify("Hash copied!"); }}>📋</button>
              <button className="tx-explorer" onClick={() => window.open(`https://testnet.arcscan.app/tx/${tx.hash}`, "_blank")}>
                View on Explorer ↗
              </button>
            </div>
          </div>
          <div style={{textAlign:"right", flexShrink:0}}>
            {tx.amount && (
              <div className="tx-amount" style={{color: tx.color}}>
                {tx.type === "withdrawal" || tx.type === "claim_sent" ? "-" : "+"}
                {parseFloat(tx.amount).toFixed(4)} USDC
              </div>
            )}
            <div className="tx-block">Block {tx.block}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TransactionHistory;
