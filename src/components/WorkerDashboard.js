import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";

function WorkerDashboard({ flowArc, address, notify }) {
  const [employerAddr, setEmployerAddr] = useState("");
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [autoLoading, setAutoLoading] = useState(true);
  const [manualResult, setManualResult] = useState(null);
  const [manualErr, setManualErr] = useState("");
  const streamsRef = useRef([]);

  // Load all active salary streams for connected wallet
  const loadAllStreams = useCallback(async () => {
    if (!flowArc || !address) return;
    try {
      // Scan WorkerAdded events where worker == connected wallet
      const filter = flowArc.filters.WorkerAdded(null, address);
      const events = await flowArc.queryFilter(filter);

      // Deduplicate employer addresses
      const employerSet = [...new Set(events.map((e) => e.args.employer))];

      if (employerSet.length === 0) {
        setStreams([]);
        streamsRef.current = [];
        setAutoLoading(false);
        return;
      }

      const data = await Promise.all(
        employerSet.map(async (emp) => {
          try {
            const d = await flowArc.getWorkerDetails(emp, address);
            const empData = await flowArc.employers(emp);
            const earned = await flowArc.getEarnedAmount(emp, address);

            // Skip workers with no name or zero salary — invalid entries
            if (!d.name || d.salaryPerSecond.eq(0)) return null;

            return {
              employerAddress: emp,
              companyName: empData.companyName || "Unknown Company",
              name: d.name,
              active: d.active,
              monthlySalary: ethers.utils.formatUnits(
                d.salaryPerSecond.mul(30 * 24 * 3600),
                6,
              ),
              startTime: new Date(
                d.startTime.toNumber() * 1000,
              ).toLocaleDateString(),
              lastClaimed: new Date(
                d.lastClaimed.toNumber() * 1000,
              ).toLocaleString(),
              perSecond: ethers.utils.formatUnits(d.salaryPerSecond, 6),
              earned: ethers.utils.formatUnits(earned, 6),
            };
          } catch {
            return null;
          }
        }),
      );

      // Filter out nulls and inactive workers with zero salary
      const valid = data.filter(Boolean);
      setStreams(valid);
      streamsRef.current = valid;
    } catch (e) {
      console.error(e);
    }
    setAutoLoading(false);
  }, [flowArc, address]);

  // Refresh earned amounts every 5 seconds without full reload
  const refreshEarned = useCallback(async () => {
    if (!flowArc || !address || streamsRef.current.length === 0) return;
    try {
      const updated = await Promise.all(
        streamsRef.current.map(async (s) => {
          try {
            const earned = await flowArc.getEarnedAmount(
              s.employerAddress,
              address,
            );
            const d = await flowArc.getWorkerDetails(
              s.employerAddress,
              address,
            );
            return {
              ...s,
              active: d.active,
              earned: ethers.utils.formatUnits(earned, 6),
              lastClaimed: new Date(
                d.lastClaimed.toNumber() * 1000,
              ).toLocaleString(),
            };
          } catch {
            return s;
          }
        }),
      );
      // Remove permanently inactive workers with zero salary
      const valid = updated.filter((s) => s.active || parseFloat(s.earned) > 0);
      setStreams(valid);
      streamsRef.current = valid;
    } catch (e) {
      console.error(e);
    }
  }, [flowArc, address]);

  useEffect(() => {
    loadAllStreams();
  }, [loadAllStreams]);

  useEffect(() => {
    const i = setInterval(refreshEarned, 5000);
    return () => clearInterval(i);
  }, [refreshEarned]);

  // Manual employer lookup
  const checkEmployment = async () => {
    setManualErr("");
    setManualResult(null);
    if (!ethers.utils.isAddress(employerAddr)) {
      setManualErr("Invalid wallet address");
      return;
    }
    setLoading(true);
    try {
      const d = await flowArc.getWorkerDetails(employerAddr, address);
      const empData = await flowArc.employers(employerAddr);
      const earned = await flowArc.getEarnedAmount(employerAddr, address);

      if (!d.name || d.salaryPerSecond.eq(0)) {
        setManualErr("You are not registered under this employer.");
        setLoading(false);
        return;
      }

      setManualResult({
        employerAddress: employerAddr,
        companyName: empData.companyName || "Unknown Company",
        name: d.name,
        active: d.active,
        monthlySalary: ethers.utils.formatUnits(
          d.salaryPerSecond.mul(30 * 24 * 3600),
          6,
        ),
        startTime: new Date(d.startTime.toNumber() * 1000).toLocaleDateString(),
        lastClaimed: new Date(d.lastClaimed.toNumber() * 1000).toLocaleString(),
        perSecond: ethers.utils.formatUnits(d.salaryPerSecond, 6),
        earned: ethers.utils.formatUnits(earned, 6),
      });
    } catch (e) {
      setManualErr("No employment record found for this address.");
    }
    setLoading(false);
  };

  const claimSalary = async (employerAddress, companyName) => {
    setClaiming(employerAddress);
    try {
      const tx = await flowArc.claimSalary(employerAddress);
      await tx.wait();
      notify(`Salary claimed from ${companyName}! 🎉`);
      await loadAllStreams();
      setManualResult(null);
    } catch (e) {
      notify(e.reason || e.message, "error");
    }
    setClaiming(null);
  };

  const totalEarned = streams.reduce(
    (sum, s) => sum + parseFloat(s.earned || 0),
    0,
  );
  const activeStreams = streams.filter((s) => s.active);

  const StreamCard = ({ stream }) => (
    <div
      style={{
        background: "var(--dark)",
        border: `1px solid ${stream.active ? "rgba(74,222,128,0.2)" : "rgba(100,100,120,0.2)"}`,
        borderRadius: "20px",
        padding: "24px",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "17px",
              fontWeight: 800,
              marginBottom: "4px",
            }}
          >
            🏢 {stream.companyName}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              fontFamily: "monospace",
            }}
          >
            {stream.employerAddress.slice(0, 14)}...
            {stream.employerAddress.slice(-6)}
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: "12px",
                padding: "0 4px",
              }}
              onClick={() => {
                navigator.clipboard.writeText(stream.employerAddress);
                notify("Address copied!");
              }}
            >
              📋
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 700,
            background: stream.active
              ? "rgba(74,222,128,0.1)"
              : "rgba(248,113,113,0.1)",
            color: stream.active ? "var(--success)" : "var(--danger)",
            border: `1px solid ${stream.active ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: stream.active ? "var(--success)" : "var(--danger)",
              boxShadow: stream.active
                ? "0 0 8px rgba(74,222,128,0.6)"
                : "none",
              animation: stream.active ? "blink 1.5s infinite" : "none",
            }}
          />
          {stream.active ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Earned + Claim */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #08160F, #0B1820)",
          border: "1px solid rgba(74,222,128,0.15)",
          borderRadius: "14px",
          padding: "18px 22px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            Unclaimed Earnings
          </div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--success)",
              lineHeight: 1,
            }}
          >
            {parseFloat(stream.earned).toFixed(6)}{" "}
            <span
              style={{
                fontSize: "14px",
                color: "var(--muted)",
                fontWeight: 400,
              }}
            >
              USDC
            </span>
          </div>
          {stream.active && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "8px",
                fontSize: "11px",
                color: "var(--success)",
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--success)",
                  animation: "blink 1.5s infinite",
                }}
              />
              Streaming live...
            </div>
          )}
        </div>
        <button
          onClick={() =>
            claimSalary(stream.employerAddress, stream.companyName)
          }
          disabled={
            claiming === stream.employerAddress ||
            parseFloat(stream.earned) === 0 ||
            !stream.active
          }
          style={{
            background:
              parseFloat(stream.earned) > 0 && stream.active
                ? "linear-gradient(135deg, #4ADE80, #16A34A)"
                : "rgba(74,222,128,0.1)",
            color:
              parseFloat(stream.earned) > 0 && stream.active
                ? "#fff"
                : "var(--muted)",
            border: "none",
            borderRadius: "12px",
            padding: "14px 22px",
            fontSize: "14px",
            fontWeight: 700,
            cursor:
              parseFloat(stream.earned) > 0 && stream.active
                ? "pointer"
                : "not-allowed",
            transition: "all 0.2s",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            opacity: claiming === stream.employerAddress ? 0.6 : 1,
          }}
        >
          {claiming === stream.employerAddress ? "Claiming..." : "Claim 💸"}
        </button>
      </div>

      {/* Details Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
        }}
      >
        {[
          { label: "👤 Worker Name", value: stream.name },
          {
            label: "💵 Monthly Salary",
            value: `${parseFloat(stream.monthlySalary).toFixed(2)} USDC`,
          },
          {
            label: "⏱️ Per Second",
            value: `${parseFloat(stream.perSecond).toFixed(8)} USDC`,
          },
          { label: "📅 Start Date", value: stream.startTime },
          { label: "🕐 Last Claimed", value: stream.lastClaimed },
          {
            label: "📊 Employment",
            value: stream.active ? "✅ Active" : "❌ Inactive",
          },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              background: "var(--dark2)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 700,
                marginBottom: "6px",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: item.label.includes("Employment")
                  ? stream.active
                    ? "var(--success)"
                    : "var(--danger)"
                  : "var(--text)",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* TOTAL SUMMARY */}
      {streams.length > 0 && (
        <div className="balance-card" style={{ marginBottom: "22px" }}>
          <div className="bal-item">
            <div className="bal-label">Total Unclaimed</div>
            <div className="bal-num">
              {totalEarned.toFixed(4)}
              <span className="bal-unit">USDC</span>
            </div>
          </div>
          <div className="bal-divider" />
          <div className="bal-item">
            <div className="bal-label">Active Streams</div>
            <div className="bal-num">{activeStreams.length}</div>
          </div>
          <div className="bal-divider" />
          <div className="bal-item">
            <div className="bal-label">Total Employers</div>
            <div className="bal-num">{streams.length}</div>
          </div>
        </div>
      )}

      {/* ALL SALARY STREAMS */}
      {autoLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--muted)",
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "10px" }}>⏳</div>
          Loading your salary streams...
        </div>
      ) : streams.length > 0 ? (
        <div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            💼 Your Salary Streams ({streams.length})
          </div>
          {streams.map((s) => (
            <StreamCard key={s.employerAddress} stream={s} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "44px", marginBottom: "14px" }}>👷</div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "16px",
              marginBottom: "6px",
            }}
          >
            No active salary streams found
          </p>
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>
            Use the lookup below if you were recently added by an employer
          </p>
        </div>
      )}

      {/* MANUAL LOOKUP */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div className="card-title">🔍 Manual Employer Lookup</div>
        <div className="card-sub">
          Enter your employer's connected wallet address to look up your salary
          stream directly.
        </div>
        <input
          className="inp"
          placeholder="Employer Wallet Address (0x...)"
          value={employerAddr}
          onChange={(e) => {
            setEmployerAddr(e.target.value);
            setManualErr("");
            setManualResult(null);
          }}
        />
        {manualErr && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--danger)",
              marginTop: "-8px",
              marginBottom: "12px",
              fontWeight: 600,
            }}
          >
            ⚠ {manualErr}
          </div>
        )}
        <button
          className="btn-gold"
          onClick={checkEmployment}
          disabled={loading}
        >
          {loading ? "Looking up..." : "Check Employment →"}
        </button>
        {manualResult && (
          <div style={{ marginTop: "20px" }}>
            <StreamCard stream={manualResult} />
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkerDashboard;
