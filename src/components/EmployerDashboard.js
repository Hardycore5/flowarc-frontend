import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { FLOWARC_ADDRESS } from "../contracts/abis";

function EmployerDashboard({
  flowArc,
  usdc,
  address,
  isEmployer,
  setIsEmployer,
  notify,
}) {
  const [companyName, setCompanyName] = useState("");
  const [balance, setBalance] = useState("0");
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [workers, setWorkers] = useState([]);
  const [deletedWorkers, setDeletedWorkers] = useState(() => {
    try {
      const key = `flowarc_deleted_workers_${address}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [workerAddr, setWorkerAddr] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerSalary, setWorkerSalary] = useState("");
  const [loading, setLoading] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [skeletonLoad, setSkeletonLoad] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [reactivating, setReactivating] = useState(null);
  const [errors, setErrors] = useState({});

  // Top up state
  const [topUpWorker, setTopUpWorker] = useState(null);
  const [topUpAmt, setTopUpAmt] = useState("");
  const [topUpNote, setTopUpNote] = useState("");
  const [topUpError, setTopUpError] = useState("");

  const loadData = useCallback(async () => {
    if (!flowArc || !address) return;
    try {
      const emp = await flowArc.employers(address);
      if (emp.registered) {
        setBalance(ethers.utils.formatUnits(emp.balance, 6));
        const addrs = await flowArc.getEmployerWorkers(address);
        const uniqueAddrs = [
          ...new Map(addrs.map((a) => [a.toLowerCase(), a])).values(),
        ];
        const data = await Promise.all(
          uniqueAddrs.map(async (a) => {
            const d = await flowArc.getWorkerDetails(address, a);
            return {
              address: a,
              name: d.name,
              active: d.active,
              earned: ethers.utils.formatUnits(d.earned, 6),
              monthlySalary: ethers.utils.formatUnits(
                d.salaryPerSecond.mul(30 * 24 * 3600),
                6,
              ),
              salaryPerSecond: d.salaryPerSecond,
            };
          }),
        );
        setWorkers(data);
      }
      if (usdc) {
        const b = await usdc.balanceOf(address);
        setUsdcBalance(ethers.utils.formatUnits(b, 6));
      }
    } catch (e) {
      console.error(e);
    }
    setSkeletonLoad(false);
  }, [flowArc, usdc, address]);

  useEffect(() => {
    loadData();
    const i = setInterval(loadData, 15000);
    return () => clearInterval(i);
  }, [loadData]);

  const validate = (fields) => {
    const errs = {};
    if (fields.companyName !== undefined && !fields.companyName)
      errs.companyName = "Company name is required";
    if (
      fields.depositAmt !== undefined &&
      (!fields.depositAmt || parseFloat(fields.depositAmt) <= 0)
    )
      errs.depositAmt = "Enter a valid amount";
    if (
      fields.withdrawAmt !== undefined &&
      (!fields.withdrawAmt || parseFloat(fields.withdrawAmt) <= 0)
    )
      errs.withdrawAmt = "Enter a valid amount";
    if (
      fields.workerAddr !== undefined &&
      !ethers.utils.isAddress(fields.workerAddr)
    )
      errs.workerAddr = "Invalid wallet address";
    if (fields.workerName !== undefined && !fields.workerName)
      errs.workerName = "Worker name is required";
    if (
      fields.workerSalary !== undefined &&
      (!fields.workerSalary || parseFloat(fields.workerSalary) <= 0)
    )
      errs.workerSalary = "Enter a valid salary";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const registerEmployer = async () => {
    if (!validate({ companyName })) return;
    setLoading(true);
    try {
      const tx = await flowArc.registerEmployer(companyName);
      await tx.wait();
      setIsEmployer(true);
      notify(`"${companyName}" registered!`);
      loadData();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  const depositFunds = async () => {
    if (!validate({ depositAmt })) return;
    setLoading(true);
    try {
      const amount = ethers.utils.parseUnits(depositAmt, 6);
      const allowance = await usdc.allowance(address, FLOWARC_ADDRESS);
      if (allowance.lt(amount)) {
        const t = await usdc.approve(
          FLOWARC_ADDRESS,
          ethers.constants.MaxUint256,
        );
        await t.wait();
      }
      const tx = await flowArc.depositFunds(amount);
      await tx.wait();
      notify(`Deposited ${depositAmt} USDC!`);
      setDepositAmt("");
      loadData();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  const withdrawFunds = async () => {
    if (!validate({ withdrawAmt })) return;
    setLoading(true);
    try {
      const tx = await flowArc.withdrawFunds(
        ethers.utils.parseUnits(withdrawAmt, 6),
      );
      await tx.wait();
      notify(`Withdrawn ${withdrawAmt} USDC!`);
      setWithdrawAmt("");
      loadData();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  const addWorker = async () => {
    if (!validate({ workerAddr, workerName, workerSalary })) return;
    setLoading(true);
    try {
      const tx = await flowArc.addWorker(
        workerAddr,
        workerName,
        ethers.utils.parseUnits(workerSalary, 6),
      );
      await tx.wait();
      notify(`"${workerName}" added!`);
      setWorkerAddr("");
      setWorkerName("");
      setWorkerSalary("");
      loadData();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  const removeWorker = async () => {
    if (!confirmRemove) return;
    setLoading(true);
    try {
      const tx = await flowArc.removeWorker(confirmRemove.address);
      await tx.wait();
      notify(`${confirmRemove.name} removed!`);
      setConfirmRemove(null);
      loadData();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  const deleteWorker = () => {
    if (!confirmDelete) return;
    const key = `flowarc_deleted_workers_${address}`;
    const updated = [...deletedWorkers, confirmDelete.address];
    setDeletedWorkers(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    notify(`${confirmDelete.name} deleted from dashboard!`);
    setConfirmDelete(null);
  };

  const reactivateWorker = async (worker) => {
    setReactivating(worker.address);
    setLoading(true);
    try {
      const monthlySalary = ethers.utils.parseUnits(
        parseFloat(worker.monthlySalary).toFixed(6),
        6,
      );
      const tx = await flowArc.addWorker(
        worker.address,
        worker.name,
        monthlySalary,
      );
      await tx.wait();
      notify(`${worker.name} reactivated!`);
      loadData();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
    setReactivating(null);
  };

  // Top up — sends USDC directly from employer wallet to worker as bonus/remuneration
  const topUpSalary = async () => {
    if (!topUpAmt || parseFloat(topUpAmt) <= 0) {
      setTopUpError("Enter a valid amount");
      return;
    }
    setTopUpError("");
    setLoading(true);
    try {
      const amount = ethers.utils.parseUnits(topUpAmt, 6);
      const walletBal = await usdc.balanceOf(address);
      if (walletBal.lt(amount)) {
        setTopUpError("Insufficient wallet balance");
        setLoading(false);
        return;
      }
      const tx = await usdc.transfer(topUpWorker.address, amount);
      await tx.wait();
      notify(`💸 ${topUpAmt} USDC sent to ${topUpWorker.name}!`);
      setTopUpWorker(null);
      setTopUpAmt("");
      setTopUpNote("");
      loadData();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  const closeTopUp = () => {
    setTopUpWorker(null);
    setTopUpAmt("");
    setTopUpNote("");
    setTopUpError("");
  };

  const visibleWorkers = workers.filter(
    (w) => !deletedWorkers.includes(w.address),
  );

  const Skeleton = ({ w, h }) => (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: "8px",
        background:
          "linear-gradient(90deg, #131325 25%, #1a1a35 50%, #131325 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );

  if (!isEmployer)
    return (
      <div style={{ maxWidth: "460px", margin: "70px auto" }}>
        <div className="register-card">
          <div className="reg-icon">🏢</div>
          <div className="reg-title">Register Your Company</div>
          <div className="reg-sub">
            Set up your payroll vault to start streaming USDC salaries to your
            workers onchain.
          </div>
          <input
            className={`inp ${errors.companyName ? "inp-error" : ""}`}
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setErrors({});
            }}
          />
          {errors.companyName && (
            <div className="err-msg">⚠ {errors.companyName}</div>
          )}
          <button
            className="btn-gold"
            onClick={registerEmployer}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register Company →"}
          </button>
        </div>
      </div>
    );

  return (
    <div>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .inp-error { border-color: rgba(248,113,113,0.6) !important; box-shadow: 0 0 0 3px rgba(248,113,113,0.08) !important; }
        .err-msg { font-size: 12px; color: var(--danger); margin-top: -8px; margin-bottom: 12px; font-weight: 600; display: flex; align-items: center; gap: 5px; }
        .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .confirm-box { background: var(--dark2); border: 1px solid rgba(248,113,113,0.3); border-radius: 20px; padding: 36px; max-width: 400px; width: 100%; text-align: center; animation: slideUp 0.2s ease; }
        .topup-box { background: var(--dark2); border: 1px solid rgba(240,192,96,0.3); border-radius: 20px; padding: 36px; max-width: 420px; width: 100%; animation: slideUp 0.2s ease; }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .confirm-icon { font-size: 40px; margin-bottom: 16px; }
        .confirm-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; margin-bottom: 8px; }
        .confirm-sub { font-size: 14px; color: var(--muted); margin-bottom: 28px; line-height: 1.6; }
        .confirm-btns { display: flex; gap: 12px; }
        .confirm-cancel { flex: 1; background: var(--dark); border: 1px solid var(--border); color: var(--muted); border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .confirm-cancel:hover { border-color: var(--border-hover); color: var(--text); }
        .confirm-danger { flex: 1; background: rgba(248,113,113,0.15); color: var(--danger); border: 1px solid rgba(248,113,113,0.4); border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .confirm-danger:hover { background: rgba(248,113,113,0.25); }
        .copy-btn { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 13px; padding: 2px 6px; border-radius: 4px; transition: color 0.2s; }
        .copy-btn:hover { color: var(--gold); }
        .btn-reactivate { background: rgba(74,222,128,0.1); color: var(--success); border: 1px solid rgba(74,222,128,0.3); border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn-reactivate:hover { background: rgba(74,222,128,0.2); }
        .btn-reactivate:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-delete { background: rgba(100,100,120,0.12); color: var(--muted); border: 1px solid rgba(100,100,120,0.25); border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn-delete:hover { background: rgba(248,113,113,0.1); color: var(--danger); border-color: rgba(248,113,113,0.3); }
        .btn-topup { background: rgba(240,192,96,0.1); color: var(--gold); border: 1px solid rgba(240,192,96,0.3); border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn-topup:hover { background: rgba(240,192,96,0.2); border-color: rgba(240,192,96,0.5); }
        .btn-topup:disabled { opacity: 0.45; cursor: not-allowed; }
        .worker-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
        .topup-worker-info { display: flex; align-items: center; gap: 14px; background: var(--dark); border: 1px solid var(--border); border-radius: 14px; padding: 14px 18px; margin-bottom: 16px; }
        .topup-avatar { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, rgba(240,192,96,0.2), rgba(240,192,96,0.05)); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .topup-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }
        .topup-addr { font-size: 11px; color: var(--muted); font-family: monospace; margin-top: 3px; }
        .topup-inp-wrap { position: relative; margin-bottom: 12px; }
        .topup-inp-wrap .inp { padding-right: 64px; margin-bottom: 0; }
        .topup-currency { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--gold); font-weight: 700; pointer-events: none; }
        .topup-err { font-size: 12px; color: var(--danger); margin-top: 6px; margin-bottom: 10px; font-weight: 600; }
        .btn-send { width: 100%; background: linear-gradient(135deg, #F0C060, #B06010); color: #080808; border: none; border-radius: 12px; padding: 14px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; margin-top: 6px; }
        .btn-send:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(240,192,96,0.35); }
        .btn-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .topup-bal { font-size: 12px; color: var(--muted); margin-bottom: 14px; }
        .topup-bal span { color: var(--gold); font-weight: 700; }
      `}</style>

      {/* CONFIRM REMOVE MODAL */}
      {confirmRemove && (
        <div className="confirm-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <div className="confirm-title">Remove Worker?</div>
            <div className="confirm-sub">
              Are you sure you want to remove{" "}
              <strong>{confirmRemove.name}</strong>? They will no longer be able
              to claim salary. You can reactivate them later.
            </div>
            <div className="confirm-btns">
              <button
                className="confirm-cancel"
                onClick={() => setConfirmRemove(null)}
              >
                Cancel
              </button>
              <button
                className="confirm-danger"
                onClick={removeWorker}
                disabled={loading}
              >
                {loading ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <div className="confirm-title">Delete from Dashboard?</div>
            <div className="confirm-sub">
              This will permanently remove <strong>{confirmDelete.name}</strong>{" "}
              from your dashboard view. Their onchain record remains intact.
            </div>
            <div className="confirm-btns">
              <button
                className="confirm-cancel"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button className="confirm-danger" onClick={deleteWorker}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP UP MODAL */}
      {topUpWorker && (
        <div className="confirm-overlay" onClick={closeTopUp}>
          <div className="topup-box" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "20px",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "20px",
                    fontWeight: 800,
                  }}
                >
                  💸 Top Up Salary
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  Send a one-time bonus or remuneration
                </div>
              </div>
              <button
                onClick={closeTopUp}
                style={{
                  background: "var(--dark3)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Worker Info */}
            <div className="topup-worker-info">
              <div className="topup-avatar">👷</div>
              <div>
                <div className="topup-name">{topUpWorker.name}</div>
                <div className="topup-addr">
                  {topUpWorker.address.slice(0, 14)}...
                  {topUpWorker.address.slice(-6)}
                </div>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="topup-bal">
              Your wallet balance:{" "}
              <span>{parseFloat(usdcBalance).toFixed(2)} USDC</span>
            </div>

            {/* Amount */}
            <div className="topup-inp-wrap">
              <input
                className="inp"
                placeholder="Amount to send"
                type="number"
                value={topUpAmt}
                onChange={(e) => {
                  setTopUpAmt(e.target.value);
                  setTopUpError("");
                }}
              />
              <span className="topup-currency">USDC</span>
            </div>
            {topUpError && <div className="topup-err">⚠ {topUpError}</div>}

            {/* Optional Note */}
            <input
              className="inp"
              placeholder="Note (optional) — e.g. Q3 Bonus, Performance Award"
              value={topUpNote}
              onChange={(e) => setTopUpNote(e.target.value)}
            />

            <button
              className="btn-send"
              onClick={topUpSalary}
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : `Send ${topUpAmt ? parseFloat(topUpAmt).toFixed(2) : "0.00"} USDC →`}
            </button>
          </div>
        </div>
      )}

      {/* BALANCE CARD */}
      {skeletonLoad ? (
        <div className="balance-card" style={{ gap: "40px" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <Skeleton w="100px" h="12px" />
            <Skeleton w="160px" h="36px" />
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <Skeleton w="100px" h="12px" />
            <Skeleton w="140px" h="36px" />
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <Skeleton w="100px" h="12px" />
            <Skeleton w="60px" h="36px" />
          </div>
        </div>
      ) : (
        <div className="balance-card">
          <div className="bal-item">
            <div className="bal-label">Payroll Vault</div>
            <div className="bal-num">
              {parseFloat(balance).toFixed(2)}
              <span className="bal-unit">USDC</span>
            </div>
          </div>
          <div className="bal-divider" />
          <div className="bal-item">
            <div className="bal-label">Wallet Balance</div>
            <div className="bal-num">
              {parseFloat(usdcBalance).toFixed(2)}
              <span className="bal-unit">USDC</span>
            </div>
          </div>
          <div className="bal-divider" />
          <div className="bal-item">
            <div className="bal-label">Active Workers</div>
            <div className="bal-num">
              {workers.filter((w) => w.active).length}
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT / WITHDRAW */}
      <div className="two-col">
        <div className="card">
          <div className="card-title">💰 Deposit USDC</div>
          <div className="card-sub">Fund your payroll vault</div>
          <input
            className={`inp ${errors.depositAmt ? "inp-error" : ""}`}
            placeholder="Amount (USDC)"
            type="number"
            value={depositAmt}
            onChange={(e) => {
              setDepositAmt(e.target.value);
              setErrors((p) => ({ ...p, depositAmt: "" }));
            }}
          />
          {errors.depositAmt && (
            <div className="err-msg">⚠ {errors.depositAmt}</div>
          )}
          <button
            className="btn-gold"
            onClick={depositFunds}
            disabled={loading}
          >
            Deposit
          </button>
        </div>
        <div className="card">
          <div className="card-title">🏦 Withdraw USDC</div>
          <div className="card-sub">Withdraw from vault</div>
          <input
            className={`inp ${errors.withdrawAmt ? "inp-error" : ""}`}
            placeholder="Amount (USDC)"
            type="number"
            value={withdrawAmt}
            onChange={(e) => {
              setWithdrawAmt(e.target.value);
              setErrors((p) => ({ ...p, withdrawAmt: "" }));
            }}
          />
          {errors.withdrawAmt && (
            <div className="err-msg">⚠ {errors.withdrawAmt}</div>
          )}
          <button
            className="btn-danger"
            onClick={withdrawFunds}
            disabled={loading}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* ADD WORKER */}
      <div className="card">
        <div className="card-title">➕ Add Worker</div>
        <div className="card-sub">Register a new worker to your payroll</div>
        <input
          className={`inp ${errors.workerAddr ? "inp-error" : ""}`}
          placeholder="Wallet Address (0x...)"
          value={workerAddr}
          onChange={(e) => {
            setWorkerAddr(e.target.value);
            setErrors((p) => ({ ...p, workerAddr: "" }));
          }}
        />
        {errors.workerAddr && (
          <div className="err-msg">⚠ {errors.workerAddr}</div>
        )}
        <input
          className={`inp ${errors.workerName ? "inp-error" : ""}`}
          placeholder="Worker Name"
          value={workerName}
          onChange={(e) => {
            setWorkerName(e.target.value);
            setErrors((p) => ({ ...p, workerName: "" }));
          }}
        />
        {errors.workerName && (
          <div className="err-msg">⚠ {errors.workerName}</div>
        )}
        <input
          className={`inp ${errors.workerSalary ? "inp-error" : ""}`}
          placeholder="Monthly Salary (USDC)"
          type="number"
          value={workerSalary}
          onChange={(e) => {
            setWorkerSalary(e.target.value);
            setErrors((p) => ({ ...p, workerSalary: "" }));
          }}
        />
        {errors.workerSalary && (
          <div className="err-msg">⚠ {errors.workerSalary}</div>
        )}
        <button className="btn-gold" onClick={addWorker} disabled={loading}>
          {loading ? "Adding..." : "Add Worker →"}
        </button>
      </div>

      {/* WORKERS LIST */}
      <div className="card">
        <div className="card-title">👷 Workers</div>
        {skeletonLoad ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: "80px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(90deg, #131325 25%, #1a1a35 50%, #131325 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : visibleWorkers.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>👷</div>
            No workers added yet
          </div>
        ) : (
          visibleWorkers.map((w) => (
            <div key={w.address} className="worker-row">
              <div>
                <div className="w-name">
                  {w.name}
                  {!w.active && (
                    <span className="badge-inactive">Inactive</span>
                  )}
                </div>
                <div className="w-addr">
                  {w.address.slice(0, 10)}...{w.address.slice(-6)}
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(w.address);
                      notify("Address copied!");
                    }}
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
                <div className="w-salary">
                  Monthly: {parseFloat(w.monthlySalary).toFixed(2)} USDC
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="w-earned">
                  Earned: {parseFloat(w.earned).toFixed(4)} USDC
                </div>
                <div className="worker-actions">
                  {w.active ? (
                    <>
                      <button
                        className="btn-topup"
                        onClick={() => {
                          setTopUpWorker(w);
                          setTopUpAmt("");
                          setTopUpNote("");
                          setTopUpError("");
                        }}
                        disabled={loading}
                      >
                        💸 Top Up
                      </button>
                      <button
                        className="btn-remove"
                        onClick={() => setConfirmRemove(w)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-reactivate"
                        onClick={() => reactivateWorker(w)}
                        disabled={loading && reactivating === w.address}
                      >
                        {loading && reactivating === w.address
                          ? "Reactivating..."
                          : "⚡ Reactivate"}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => setConfirmDelete(w)}
                        disabled={loading}
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EmployerDashboard;
