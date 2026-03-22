import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

function WorkerDashboard({ flowArc, address, notify }) {
  const [employerAddr, setEmployerAddr]   = useState("");
  const [workerDetails, setWorkerDetails] = useState(null);
  const [earned, setEarned]               = useState("0");
  const [loading, setLoading]             = useState(false);
  const [claiming, setClaiming]           = useState(false);

  const loadWorkerData = useCallback(async () => {
    if (!flowArc || !employerAddr || !ethers.utils.isAddress(employerAddr)) return;
    try {
      const d = await flowArc.getWorkerDetails(employerAddr, address);
      const e = await flowArc.getEarnedAmount(employerAddr, address);
      setWorkerDetails({
        name:          d.name,
        active:        d.active,
        monthlySalary: ethers.utils.formatUnits(d.salaryPerSecond.mul(30 * 24 * 3600), 6),
        startTime:     new Date(d.startTime.toNumber() * 1000).toLocaleDateString(),
        lastClaimed:   new Date(d.lastClaimed.toNumber() * 1000).toLocaleString(),
        perSecond:     ethers.utils.formatUnits(d.salaryPerSecond, 6),
      });
      setEarned(ethers.utils.formatUnits(e, 6));
    } catch (e) { console.error(e); }
  }, [flowArc, employerAddr, address]);

  useEffect(() => {
    if (!employerAddr) return;
    loadWorkerData();
    const i = setInterval(loadWorkerData, 5000);
    return () => clearInterval(i);
  }, [loadWorkerData, employerAddr]);

  const checkEmployment = async () => {
    if (!ethers.utils.isAddress(employerAddr)) return notify("Invalid employer address", "error");
    setLoading(true);
    await loadWorkerData();
    setLoading(false);
  };

  const claimSalary = async () => {
    if (!employerAddr) return notify("Enter employer address", "error");
    setClaiming(true);
    try {
      const tx = await flowArc.claimSalary(employerAddr);
      await tx.wait();
      notify("Salary claimed! 🎉");
      loadWorkerData();
    } catch (e) { notify(e.reason || e.message, "error"); }
    setClaiming(false);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">🔍 Look Up Your Employment</div>
        <div className="card-sub">Enter your employer's wallet address to view your salary stream</div>
        <input
          className="inp"
          placeholder="Employer Wallet Address (0x...)"
          value={employerAddr}
          onChange={e => setEmployerAddr(e.target.value)}
        />
        <button className="btn-gold" onClick={checkEmployment} disabled={loading}>
          {loading ? "Loading..." : "Check Employment →"}
        </button>
      </div>

      {workerDetails && (
        <>
          <div className="earned-card">
            <div style={{position:"relative", zIndex:1}}>
              <div className="earned-label">Total Earned (Unclaimed)</div>
              <div className="earned-num">
                {parseFloat(earned).toFixed(6)}
                <span className="earned-unit">USDC</span>
              </div>
              <div className="stream-badge">
                <div className="stream-dot" />
                Streaming in real-time...
              </div>
            </div>
            <button
              className="btn-claim"
              onClick={claimSalary}
              disabled={claiming || parseFloat(earned) === 0}
            >
              {claiming ? "Claiming..." : "Claim Salary 💸"}
            </button>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <div className="info-label">👤 Name</div>
              <div className="info-value">{workerDetails.name}</div>
            </div>
            <div className="info-card">
              <div className="info-label">💵 Monthly Salary</div>
              <div className="info-value">{parseFloat(workerDetails.monthlySalary).toFixed(2)} USDC</div>
            </div>
            <div className="info-card">
              <div className="info-label">📅 Start Date</div>
              <div className="info-value">{workerDetails.startTime}</div>
            </div>
            <div className="info-card">
              <div className="info-label">🕐 Last Claimed</div>
              <div className="info-value" style={{fontSize:"13px"}}>{workerDetails.lastClaimed}</div>
            </div>
            <div className="info-card">
              <div className="info-label">📊 Status</div>
              <div className="info-value" style={{color: workerDetails.active ? "var(--success)" : "var(--danger)"}}>
                {workerDetails.active ? "✅ Active" : "❌ Inactive"}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">⏱️ Per Second</div>
              <div className="info-value" style={{fontSize:"13px"}}>{parseFloat(workerDetails.perSecond).toFixed(8)} USDC</div>
            </div>
          </div>
        </>
      )}

      {!workerDetails && (
        <div style={{textAlign:"center", padding:"64px 20px"}}>
          <div style={{fontSize:"44px", marginBottom:"14px"}}>👷</div>
          <p style={{color:"var(--muted)", fontSize:"16px"}}>Enter your employer's address above to view your salary stream</p>
        </div>
      )}
    </div>
  );
}

export default WorkerDashboard;
