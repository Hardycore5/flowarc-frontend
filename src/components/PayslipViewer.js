import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

function PayslipViewer({ payslipNFT, address, notify }) {
  const [payslips, setPayslips]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [totalSupply, setTotalSupply] = useState("0");

  const loadPayslips = useCallback(async () => {
    if (!payslipNFT || !address) return;
    setLoading(true);
    try {
      const ids    = await payslipNFT.getWorkerPayslips(address);
      const supply = await payslipNFT.totalSupply();
      setTotalSupply(supply.toString());
      const data = await Promise.all(ids.map(async (id) => {
        const p = await payslipNFT.getPayslip(id);
        return {
          tokenId:     id.toString(),
          employer:    p.employer,
          worker:      p.worker,
          amount:      ethers.utils.formatUnits(p.amount, 6),
          timestamp:   new Date(p.timestamp.toNumber() * 1000).toLocaleString(),
          companyName: p.companyName,
        };
      }));
      setPayslips(data.reverse());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [payslipNFT, address]);

  useEffect(() => { loadPayslips(); }, [loadPayslips]);

  const totalEarned = payslips.reduce((s, p) => s + parseFloat(p.amount), 0).toFixed(4);

  return (
    <div>
      {/* STATS HEADER */}
      <div className="balance-card" style={{marginBottom:"24px"}}>
        <div className="bal-item">
          <div className="bal-label">My Payslips</div>
          <div className="bal-num">{payslips.length}</div>
        </div>
        <div className="bal-divider" />
        <div className="bal-item">
          <div className="bal-label">Total Minted</div>
          <div className="bal-num">{totalSupply}</div>
        </div>
        <div className="bal-divider" />
        <div className="bal-item">
          <div className="bal-label">Total Earned</div>
          <div className="bal-num">{totalEarned}<span className="bal-unit">USDC</span></div>
        </div>
      </div>

      {loading && <div className="empty">Loading your payslips...</div>}

      {!loading && payslips.length === 0 && (
        <div style={{textAlign:"center", padding:"64px 20px"}}>
          <div style={{fontSize:"48px", marginBottom:"16px"}}>🎫</div>
          <p style={{color:"var(--text)", fontSize:"18px", fontWeight:"700", fontFamily:"'Syne', sans-serif", marginBottom:"8px"}}>No payslips yet</p>
          <p style={{color:"var(--muted)", fontSize:"14px"}}>Claim your salary to mint your first payslip NFT</p>
        </div>
      )}

      <div className="payslip-grid">
        {payslips.map((p) => (
          <div key={p.tokenId} className="payslip-card">
            <div className="payslip-top">
              <div className="nft-tag">NFT #{p.tokenId}</div>
              <div className="soul-tag">🔒 Soulbound</div>
            </div>
            <div className="payslip-body">
              <div className="payslip-co">{p.companyName || "Unknown Company"}</div>
              <div className="payslip-amt-box">
                <div className="payslip-amt-label">Amount Paid</div>
                <div className="payslip-amt">
                  {parseFloat(p.amount).toFixed(4)}
                  <span className="unit">USDC</span>
                </div>
              </div>
              <div>
                <div className="d-row">
                  <span className="d-key">📅 Date</span>
                  <span className="d-val">{p.timestamp}</span>
                </div>
                <div className="d-row">
                  <span className="d-key">🏢 Employer</span>
                  <span className="d-val">{p.employer.slice(0,8)}...{p.employer.slice(-6)}</span>
                </div>
                <div className="d-row">
                  <span className="d-key">👷 Worker</span>
                  <span className="d-val">{p.worker.slice(0,8)}...{p.worker.slice(-6)}</span>
                </div>
              </div>
            </div>
            <div className="payslip-foot">
              <span className="v-badge">✅ Verified Onchain</span>
              <button className="exp-btn" onClick={() => window.open("https://testnet.arcscan.app","_blank")}>
                View on Explorer →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PayslipViewer;
