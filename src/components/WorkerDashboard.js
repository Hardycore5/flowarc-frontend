import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

function WorkerDashboard({ flowArc, address, notify }) {
  const [employerAddr, setEmployerAddr] = useState("");
  const [streams, setStreams] = useState([]); // all employer streams
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(null); // employer address being claimed
  const [autoLoading, setAutoLoading] = useState(true);
  const [manualResult, setManualResult] = useState(null);
  const [manualErr, setManualErr] = useState("");

  // Load all salary streams for this worker by scanning WorkerAdded events
  const loadAllStreams = useCallback(async () => {
    if (!flowArc || !address) return;
    try {
      // Filter WorkerAdded events where worker == connected address
      const filter = flowArc.filters.WorkerAdded(null, address);
      const events = await flowArc.queryFilter(filter);

      // Deduplicate employer addresses
      const employerSet = [...new Set(events.map((e) => e.args.employer))];

      if (employerSet.length === 0) {
        setStreams([]);
        setAutoLoading(false);
        return;
      }

      const data = await Promise.all(
        employerSet.map(async (emp) => {
          try {
            const d = await flowArc.getWorkerDetails(emp, address);
            const empData = await flowArc.employers(emp);
            const earned = await flowArc.getEarnedAmount(emp, address);
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

      setStreams(data.filter(Boolean));
    } catch (e) {
      console.error(e);
    }
    setAutoLoading(false);
  }, [flowArc, address]);

  // Refresh earned amounts every 5 seconds
  const refreshEarned = useCallback(async () => {
    if (!flowArc || !address || streams.length === 0) return;
    try {
      const updated = await Promise.all(
        streams.map(async (s) => {
          try {
            const earned = await flowArc.getEarnedAmount(
              s.employerAddress,
              address,
            );
            return { ...s, earned: ethers.utils.formatUnits(earned, 6) };
          } catch {
            return s;
          }
        }),
      );
      setStreams(updated);
    } catch (e) {
      console.error(e);
    }
  }, [flowArc, address, streams]);

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

      if (!d.name) {
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
      loadAllStreams();
      setManualResult(null);
    } catch (e) {
      notify(e.reason || e.message, "error");
    }
    setClaiming(null);
  };

  // Total earned across all streams
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
        transition: "border-color 0.2s",
      }}
    >
      {/* Company Header */}
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
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* TOTAL SUMMARY — only show if streams exist */}
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
              color: "var(--text)",
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
            No salary streams found
          </p>
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>
            Use the lookup below if your employer recently added you
          </p>
        </div>
      )}

      {/* MANUAL LOOKUP */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div className="card-title">🔍 Manual Employer Lookup</div>
        <div className="card-sub">
          Each employer has a unique wallet address — entering it here lets you
          check your salary stream from that specific employer. Useful if you
          were recently added and your stream hasn't loaded yet.
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

        {/* Manual Result */}
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
