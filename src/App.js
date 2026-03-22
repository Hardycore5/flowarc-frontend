import { useState } from "react";
import { ethers } from "ethers";
import { FLOWARC_ADDRESS, PAYSLIP_NFT_ADDRESS, FLOWARC_ABI, PAYSLIP_ABI, USDC_ABI, USDC_ADDRESS } from "./contracts/abis";
import EmployerDashboard from "./components/EmployerDashboard";
import WorkerDashboard from "./components/WorkerDashboard";
import PayslipViewer from "./components/PayslipViewer";
import TransactionHistory from "./components/TransactionHistory";

const ARC_CHAIN_ID = "0x4cef52";

const WALLETS = [
  { id: "metamask",  name: "MetaMask",       icon: "🦊", desc: "Most popular Web3 wallet",        check: () => window.ethereum?.isMetaMask && !window.ethereum?.isRabby },
  { id: "rabby",     name: "Rabby Wallet",   icon: "🐰", desc: "Security-first wallet by DeBank",  check: () => window.ethereum?.isRabby },
  { id: "coinbase",  name: "Coinbase Wallet",icon: "🔵", desc: "Official Coinbase wallet",         check: () => window.ethereum?.isCoinbaseWallet },
  { id: "zerion",    name: "Zerion",         icon: "⚡", desc: "DeFi-native smart wallet",        check: () => window.ethereum?.isZerion },
  { id: "brave",     name: "Brave Wallet",   icon: "🦁", desc: "Built into Brave Browser",        check: () => window.ethereum?.isBraveWallet },
  { id: "injected",  name: "Browser Wallet", icon: "🌐", desc: "Use your current browser wallet", check: () => !!window.ethereum },
];

function App() {
  const [address, setAddress]           = useState("");
  const [flowArc, setFlowArc]           = useState(null);
  const [payslipNFT, setPayslipNFT]     = useState(null);
  const [usdc, setUsdc]                 = useState(null);
  const [isEmployer, setIsEmployer]     = useState(false);
  const [activeTab, setActiveTab]       = useState("employer");
  
  const [notification, setNotification] = useState(null);
  const [showMenu, setShowMenu]         = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(null);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const switchToArc = async () => {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_ID }] });
      return true;
    } catch (e) {
      if (e.code === 4902) {
        try {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: ARC_CHAIN_ID, chainName: "Arc Testnet", rpcUrls: ["https://rpc.testnet.arc.network"], nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, blockExplorerUrls: ["https://testnet.arcscan.app"] }] });
          return true;
        } catch { notify("Failed to add Arc Testnet", "error"); return false; }
      }
      notify("Please switch to Arc Testnet", "error"); return false;
    }
  };

  const connectWithWallet = async (wallet) => {
    if (!window.ethereum) {
      window.open(
        wallet.id === "metamask"  ? "https://metamask.io/download/"  :
        wallet.id === "rabby"     ? "https://rabby.io/"              :
        wallet.id === "coinbase"  ? "https://www.coinbase.com/wallet" :
        wallet.id === "zerion"    ? "https://zerion.io/"             :
        "https://metamask.io/download/", "_blank"
      );
      return;
    }
    setConnectingWallet(wallet.id);
    setLoading(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const switched = await switchToArc();
      if (!switched) { setLoading(false); setConnectingWallet(null); return; }
      const _provider = new ethers.providers.Web3Provider(window.ethereum);
      const _signer   = _provider.getSigner();
      const _address  = await _signer.getAddress();
      const _flowArc    = new ethers.Contract(FLOWARC_ADDRESS, FLOWARC_ABI, _signer);
      const _payslipNFT = new ethers.Contract(PAYSLIP_NFT_ADDRESS, PAYSLIP_ABI, _signer);
      const _usdc       = new ethers.Contract(USDC_ADDRESS, USDC_ABI, _signer);
      const employerData = await _flowArc.employers(_address);
      setIsEmployer(employerData.registered);
      setAddress(_address); setFlowArc(_flowArc);
      setPayslipNFT(_payslipNFT); setUsdc(_usdc);
      setShowWalletModal(false);
      notify(`Connected with ${wallet.name}!`);
    } catch (e) { notify(e.message, "error"); }
    setLoading(false); setConnectingWallet(null);
  };

  const disconnectWallet = () => {
    setAddress(""); setFlowArc(null); setPayslipNFT(null);
    setUsdc(null); setIsEmployer(false); setShowMenu(false);
    setActiveTab("employer");
    notify("Wallet disconnected");
  };

  const shortAddress = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : "";

  const detectedWallets = WALLETS.filter(w => w.check());
  const undetectedWallets = WALLETS.filter(w => !w.check());

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --gold: #F0C060; --gold-light: #F7D98A; --gold-dim: rgba(240,192,96,0.12);
          --dark: #07070F; --dark2: #0D0D1A; --dark3: #131325;
          --border: rgba(240,192,96,0.15); --border-hover: rgba(240,192,96,0.35);
          --text: #EAE6F2; --muted: #6A657E;
          --success: #4ADE80; --danger: #F87171;
        }
        body { background: var(--dark); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; overflow-x: hidden; }
        .app-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(ellipse 70% 50% at 5% 0%, rgba(240,192,96,0.09) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 95% 100%, rgba(100,60,200,0.09) 0%, transparent 55%), #07070F; }
        .grid-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: linear-gradient(rgba(240,192,96,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(240,192,96,0.04) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%); }
        .app-wrap { position: relative; z-index: 1; min-height: 100vh; }

        /* HEADER */
        .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px;
          border-bottom: 1px solid var(--border); background: rgba(7,7,15,0.88);
          backdrop-filter: blur(24px); position: sticky; top: 0; z-index: 100; }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-icon { width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #F0C060 0%, #B06010 100%);
          display: flex; align-items: center; justify-content: center; font-size: 20px;
          box-shadow: 0 0 24px rgba(240,192,96,0.35), inset 0 1px 0 rgba(255,255,255,0.2); }
        .logo-name { font-family: 'Syne', sans-serif; font-size: 23px; font-weight: 800; letter-spacing: -0.5px;
          background: linear-gradient(90deg, #F0C060, #F7D98A, #D09040);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .logo-badge { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: var(--gold); background: var(--gold-dim); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; }

        /* WALLET */
        .wallet-area { position: relative; }
        .wallet-pill { display: flex; align-items: center; gap: 10px; background: var(--dark3);
          border: 1px solid var(--border); border-radius: 50px; padding: 9px 18px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; color: var(--text); }
        .wallet-pill:hover { border-color: var(--border-hover); background: rgba(240,192,96,0.06); }
        .wallet-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success);
          box-shadow: 0 0 8px rgba(74,222,128,0.7); animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .chevron { font-size: 10px; color: var(--muted); transition: transform 0.2s; }
        .chevron.open { transform: rotate(180deg); }
        .wallet-dropdown { position: absolute; top: calc(100% + 10px); right: 0; background: var(--dark3);
          border: 1px solid var(--border); border-radius: 16px; overflow: hidden; min-width: 220px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7); animation: dropIn 0.15s ease; z-index: 200; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .dropdown-addr { padding: 14px 18px; font-size: 12px; color: var(--muted); border-bottom: 1px solid var(--border); font-family: monospace; font-weight: 600; background: var(--dark); }
        .dropdown-item { padding: 13px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s;
          display: flex; align-items: center; gap: 10px; border: none; width: 100%; text-align: left;
          font-family: 'DM Sans', sans-serif; background: transparent; }
        .dropdown-item:hover { background: var(--gold-dim); }
        .dropdown-disconnect { color: var(--danger); }
        .dropdown-switch { color: var(--text); }
        .connect-btn { background: linear-gradient(135deg, #F0C060, #B06010); color: #080808; border: none;
          border-radius: 50px; padding: 11px 28px; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: all 0.2s; font-family: 'DM Sans', sans-serif; box-shadow: 0 4px 20px rgba(240,192,96,0.25); }
        .connect-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(240,192,96,0.4); }
        .connect-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* WALLET MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 500;
          display: flex; align-items: center; justify-content: center; padding: 20px;
          backdrop-filter: blur(8px); animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal { background: var(--dark2); border: 1px solid var(--border); border-radius: 24px;
          width: 100%; max-width: 440px; overflow: hidden; animation: slideUp 0.25s ease; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px;
          border-bottom: 1px solid var(--border); }
        .modal-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; }
        .modal-close { background: var(--dark3); border: 1px solid var(--border); border-radius: 8px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--muted); font-size: 16px; transition: all 0.15s; }
        .modal-close:hover { color: var(--text); border-color: var(--border-hover); }
        .modal-body { padding: 20px 28px 28px; }
        .wallet-section-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px;
          font-weight: 700; margin-bottom: 12px; margin-top: 20px; }
        .wallet-section-label:first-child { margin-top: 0; }
        .wallet-option { display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          background: var(--dark); border: 1px solid var(--border); border-radius: 14px;
          cursor: pointer; transition: all 0.18s; margin-bottom: 8px; }
        .wallet-option:hover { border-color: var(--border-hover); background: rgba(240,192,96,0.04); }
        .wallet-option.connecting { border-color: var(--gold); background: var(--gold-dim); }
        .wallet-option.undetected { opacity: 0.55; }
        .wallet-option.undetected:hover { opacity: 0.85; }
        .wallet-icon { font-size: 28px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          background: var(--dark2); border-radius: 12px; border: 1px solid var(--border); flex-shrink: 0; }
        .wallet-info { flex: 1; }
        .wallet-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 3px; }
        .wallet-desc { font-size: 12px; color: var(--muted); }
        .wallet-status-detected { font-size: 11px; color: var(--success); font-weight: 700; background: rgba(74,222,128,0.1);
          border: 1px solid rgba(74,222,128,0.2); padding: 3px 10px; border-radius: 20px; flex-shrink: 0; }
        .wallet-status-install { font-size: 11px; color: var(--muted); font-weight: 700; background: var(--dark3);
          border: 1px solid var(--border); padding: 3px 10px; border-radius: 20px; flex-shrink: 0; }
        .modal-footer { padding: 0 28px 24px; text-align: center; }
        .modal-footer-text { font-size: 12px; color: var(--muted); line-height: 1.6; }

        /* NOTIFICATION */
        .notif { position: fixed; top: 80px; right: 24px; z-index: 999; padding: 14px 20px 14px 16px;
          border-radius: 12px; font-size: 14px; font-weight: 600; animation: slideIn 0.25s ease;
          max-width: 340px; display: flex; align-items: center; gap: 10px;
          backdrop-filter: blur(20px); border: 1px solid; }
        @keyframes slideIn { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
        .notif-success { background: rgba(74,222,128,0.12); color: var(--success); border-color: rgba(74,222,128,0.25); }
        .notif-error   { background: rgba(248,113,113,0.12); color: var(--danger);  border-color: rgba(248,113,113,0.25); }

        /* HERO */
        .hero { min-height: calc(100vh - 81px); display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center; padding: 60px 24px; }
        .hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700;
          letter-spacing: 2.5px; text-transform: uppercase; color: var(--gold); margin-bottom: 28px;
          padding: 6px 16px; background: var(--gold-dim); border: 1px solid var(--border); border-radius: 20px; }
        .hero-title { font-family: 'Syne', sans-serif; font-size: clamp(44px, 7vw, 86px);
          font-weight: 800; line-height: 1.0; letter-spacing: -2.5px; margin-bottom: 24px; max-width: 860px; }
        .gold-text { background: linear-gradient(90deg, #F0C060, #F7D98A, #D09040);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-sub { font-size: 17px; line-height: 1.75; color: var(--muted); max-width: 520px; margin-bottom: 44px; }
        .hero-btn { background: linear-gradient(135deg, #F0C060, #B06010); color: #080808; border: none;
          border-radius: 14px; padding: 16px 44px; font-size: 16px; font-weight: 700; cursor: pointer;
          transition: all 0.25s; font-family: 'DM Sans', sans-serif; box-shadow: 0 8px 32px rgba(240,192,96,0.3); margin-bottom: 72px; }
        .hero-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(240,192,96,0.45); }
        .hero-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .hero-features { display: flex; border: 1px solid var(--border); border-radius: 20px; overflow: hidden;
          background: rgba(13,13,26,0.7); backdrop-filter: blur(12px); }
        .hero-feat { padding: 26px 36px; text-align: center; border-right: 1px solid var(--border); transition: background 0.2s; }
        .hero-feat:last-child { border-right: none; }
        .hero-feat:hover { background: var(--gold-dim); }
        .feat-icon { font-size: 22px; margin-bottom: 8px; }
        .feat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }

        /* DASHBOARD */
        .dashboard { max-width: 980px; margin: 0 auto; padding: 44px 24px 80px; }
        .tabs-row { display: flex; gap: 4px; margin-bottom: 36px; background: var(--dark2);
          border: 1px solid var(--border); border-radius: 14px; padding: 5px; width: fit-content; }
        .tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 26px; border-radius: 10px;
          border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.18s;
          color: var(--muted); background: transparent; font-family: 'DM Sans', sans-serif; }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { background: linear-gradient(135deg, #F0C060, #B06010); color: #080808; box-shadow: 0 4px 16px rgba(240,192,96,0.25); }

        /* CARDS */
        .card { background: var(--dark2); border: 1px solid var(--border); border-radius: 20px; padding: 28px; margin-bottom: 20px; transition: border-color 0.2s; }
        .card:hover { border-color: var(--border-hover); }
        .card-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 6px; }
        .card-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; line-height: 1.55; }

        /* BALANCE CARD */
        .balance-card { display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(135deg, #161024 0%, #0C0E20 50%, #0E0A1A 100%);
          border: 1px solid rgba(240,192,96,0.22); border-radius: 22px; padding: 32px 40px;
          margin-bottom: 22px; position: relative; overflow: hidden; }
        .balance-card::before { content: ''; position: absolute; top: -80px; right: -80px; width: 240px; height: 240px;
          border-radius: 50%; background: radial-gradient(circle, rgba(240,192,96,0.14) 0%, transparent 65%); pointer-events: none; }
        .bal-item { position: relative; z-index: 1; }
        .bal-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; font-weight: 700; }
        .bal-num { font-family: "Syne", sans-serif; font-size: 36px; font-weight: 800; color: var(--text); line-height: 1; }
        .bal-unit { font-size: 15px; color: var(--gold); font-weight: 600; font-family: 'DM Sans', sans-serif; }
        .bal-divider { width: 1px; height: 56px; background: rgba(240,192,96,0.15); position: relative; z-index: 1; }

        /* INPUTS */
        .inp { width: 100%; background: var(--dark); border: 1px solid var(--border); border-radius: 12px;
          padding: 13px 16px; color: var(--text); font-size: 14px; margin-bottom: 12px;
          font-family: 'DM Sans', sans-serif; transition: border-color 0.2s, box-shadow 0.2s; outline: none; }
        .inp:focus { border-color: rgba(240,192,96,0.5); box-shadow: 0 0 0 3px rgba(240,192,96,0.06); }
        .inp::placeholder { color: var(--muted); }

        /* BUTTONS */
        .btn-gold { width: 100%; background: linear-gradient(135deg, #F0C060, #B06010); color: #080808;
          border: none; border-radius: 12px; padding: 14px; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn-gold:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(240,192,96,0.35); }
        .btn-gold:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-danger { width: 100%; background: #2A0A0A; color: #F87171;
          border: 1px solid rgba(248,113,113,0.5); border-radius: 12px; padding: 14px;
          font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn-danger:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.55); }
        .btn-danger:disabled { opacity: 0.45; cursor: not-allowed; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }

        /* WORKER */
        .worker-row { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px;
          background: var(--dark); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 10px; transition: border-color 0.2s; }
        .worker-row:hover { border-color: var(--border-hover); }
        .w-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 5px; }
        .w-addr { font-size: 12px; color: var(--muted); font-family: monospace; }
        .w-salary { font-size: 13px; color: var(--gold); margin-top: 5px; font-weight: 600; }
        .w-earned { font-size: 13px; color: var(--success); margin-bottom: 8px; font-weight: 600; }
        .badge-inactive { font-size: 10px; background: rgba(248,113,113,0.12); color: var(--danger);
          border: 1px solid rgba(248,113,113,0.3); padding: 2px 8px; border-radius: 20px; margin-left: 8px; font-weight: 700; }
        .btn-remove { background: rgba(248,113,113,0.08); color: var(--danger); border: 1px solid rgba(248,113,113,0.25);
          border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn-remove:hover { background: rgba(248,113,113,0.18); }

        /* EARNED */
        .earned-card { display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(135deg, #08160F, #0B1820);
          border: 1px solid rgba(74,222,128,0.18); border-radius: 22px; padding: 32px 36px; margin-bottom: 22px; position: relative; overflow: hidden; }
        .earned-card::before { content: ''; position: absolute; bottom: -50px; left: -30px; width: 180px; height: 180px;
          border-radius: 50%; background: radial-gradient(circle, rgba(74,222,128,0.09) 0%, transparent 65%); }
        .earned-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; font-weight: 700; }
        .earned-num { font-family: 'Syne', sans-serif; font-size: 44px; font-weight: 800; color: var(--success); line-height: 1; display: flex; align-items: baseline; gap: 8px; }
        .earned-unit { font-size: 18px; color: var(--muted); font-weight: 400; }
        .stream-badge { display: inline-flex; align-items: center; gap: 7px; margin-top: 12px; font-size: 12px; color: var(--success); font-weight: 700; }
        .stream-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px rgba(74,222,128,0.6); animation: blink 1.5s infinite; }
        .btn-claim { background: linear-gradient(135deg, #4ADE80, #16A34A); color: #fff; border: none;
          border-radius: 14px; padding: 18px 36px; font-size: 16px; font-weight: 700; cursor: pointer;
          transition: all 0.25s; font-family: 'DM Sans', sans-serif; box-shadow: 0 8px 28px rgba(74,222,128,0.25); white-space: nowrap; }
        .btn-claim:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(74,222,128,0.4); }
        .btn-claim:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

        /* INFO GRID */
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .info-card { background: var(--dark); border: 1px solid var(--border); border-radius: 14px; padding: 18px; transition: border-color 0.2s; }
        .info-card:hover { border-color: var(--border-hover); }
        .info-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 700; }
        .info-value { font-size: 15px; font-weight: 600; color: var(--text); }

        /* STATS */
        .stats-header { display: flex; gap: 16px; margin-bottom: 24px; }
        .stat-pill { flex: 1; background: var(--dark2); border: 1px solid var(--border); border-radius: 16px; padding: 22px 24px; text-align: center; transition: border-color 0.2s; }
        .stat-pill:hover { border-color: var(--border-hover); }
        .stat-pill-num { font-family: "Syne", sans-serif; font-size: 30px; font-weight: 800; color: var(--gold); }
        .stat-pill-label { font-size: 11px; color: var(--muted); margin-top: 5px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }

        /* PAYSLIP */
        .payslip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .payslip-card { background: var(--dark2); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; transition: all 0.25s; }
        .payslip-card:hover { transform: translateY(-3px); border-color: var(--border-hover); box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
        .payslip-top { background: linear-gradient(135deg, #18102A, #0E1028); padding: 18px 22px;
          display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
        .nft-tag { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 800; color: var(--gold); background: var(--gold-dim); border: 1px solid var(--border); padding: 4px 12px; border-radius: 20px; }
        .soul-tag { font-size: 11px; color: var(--muted); font-weight: 600; }
        .payslip-body { padding: 22px; }
        .payslip-co { font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 700; margin-bottom: 18px; }
        .payslip-amt-box { background: var(--dark); border: 1px solid rgba(74,222,128,0.2); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        .payslip-amt-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 5px; font-weight: 700; }
        .payslip-amt { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: var(--success); display: flex; align-items: baseline; gap: 5px; }
        .payslip-amt .unit { font-size: 12px; color: var(--muted); font-weight: 400; }
        .d-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--border); }
        .d-row:last-child { border-bottom: none; }
        .d-key { font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .d-val { font-size: 12px; color: var(--text); font-weight: 500; font-family: monospace; }
        .payslip-foot { display: flex; justify-content: space-between; align-items: center; padding: 14px 22px; border-top: 1px solid var(--border); background: var(--dark); }
        .v-badge { font-size: 12px; color: var(--success); font-weight: 600; }
        .exp-btn { font-size: 12px; color: var(--gold); background: none; border: none; cursor: pointer; font-weight: 700; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s; }
        .exp-btn:hover { opacity: 0.65; }

        /* REGISTER */
        .register-wrap { max-width: 460px; margin: 70px auto; }
        .register-card { background: var(--dark2); border: 1px solid var(--border); border-radius: 24px; padding: 48px; text-align: center; }
        .reg-icon { font-size: 44px; margin-bottom: 18px; }
        .reg-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; margin-bottom: 10px; }
        .reg-sub { font-size: 14px; color: var(--muted); margin-bottom: 30px; line-height: 1.65; }
        .empty { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 14px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        * { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
      `}</style>

      <div className="app-bg" />
      <div className="grid-bg" />
      <div className="app-wrap">

        {/* HEADER */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">⚡</div>
            <span className="logo-name">FlowArc</span>
            <span className="logo-badge">Testnet</span>
          </div>
          {address ? (
            <div className="wallet-area">
              <div className="wallet-pill" onClick={() => setShowMenu(!showMenu)}>
                <div className="wallet-dot" />
                {shortAddress(address)}
                <span className={`chevron ${showMenu ? "open" : ""}`}>▼</span>
              </div>
              {showMenu && (
                <div className="wallet-dropdown">
                  <div className="dropdown-addr">{address}</div>
                  <button className="dropdown-item dropdown-switch" onClick={() => { setShowMenu(false); setShowWalletModal(true); }}>
                    🔄 Switch Wallet
                  </button>
                  <button className="dropdown-item dropdown-disconnect" onClick={disconnectWallet}>
                    🔌 Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="connect-btn" onClick={() => setShowWalletModal(true)}>
              Connect Wallet
            </button>
          )}
        </header>

        {/* NOTIFICATION */}
        {notification && (
          <div className={`notif ${notification.type === "error" ? "notif-error" : "notif-success"}`}>
            <span>{notification.type === "error" ? "⚠" : "✓"}</span>
            {notification.msg}
          </div>
        )}

        {/* WALLET MODAL */}
        {showWalletModal && (
          <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Connect Wallet</div>
                <button className="modal-close" onClick={() => setShowWalletModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                {detectedWallets.length > 0 && (
                  <>
                    <div className="wallet-section-label">Detected Wallets</div>
                    {detectedWallets.map(w => (
                      <div key={w.id} className={`wallet-option ${connectingWallet === w.id ? "connecting" : ""}`} onClick={() => connectWithWallet(w)}>
                        <div className="wallet-icon">{w.icon}</div>
                        <div className="wallet-info">
                          <div className="wallet-name">{w.name}</div>
                          <div className="wallet-desc">{connectingWallet === w.id ? "Connecting..." : w.desc}</div>
                        </div>
                        <div className="wallet-status-detected">Detected</div>
                      </div>
                    ))}
                  </>
                )}
                {undetectedWallets.length > 0 && (
                  <>
                    <div className="wallet-section-label">Install a Wallet</div>
                    {undetectedWallets.map(w => (
                      <div key={w.id} className="wallet-option undetected" onClick={() => connectWithWallet(w)}>
                        <div className="wallet-icon">{w.icon}</div>
                        <div className="wallet-info">
                          <div className="wallet-name">{w.name}</div>
                          <div className="wallet-desc">{w.desc}</div>
                        </div>
                        <div className="wallet-status-install">Install</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <p className="modal-footer-text">By connecting, you agree to interact with Arc Testnet smart contracts. New to Web3? <span style={{color:"var(--gold)", cursor:"pointer"}} onClick={() => window.open("https://metamask.io","_blank")}>Get MetaMask →</span></p>
              </div>
            </div>
          </div>
        )}

        {/* HERO */}
        {!address && (
          <section className="hero">
            <div className="hero-eyebrow">⚡ Built on Arc Testnet</div>
            <h1 className="hero-title">Payroll for the<br /><span className="gold-text">Onchain Economy</span></h1>
            <p className="hero-sub">Stream USDC salaries per second, manage workers trustlessly, and mint soulbound payslip NFTs — all onchain.</p>
            <button className="hero-btn" onClick={() => setShowWalletModal(true)}>Launch App →</button>
            <div className="hero-features">
              <div className="hero-feat"><div className="feat-icon">⚡</div><div className="feat-label">Real-time Streaming</div></div>
              <div className="hero-feat"><div className="feat-icon">🎫</div><div className="feat-label">Payslip NFTs</div></div>
              <div className="hero-feat"><div className="feat-icon">🔒</div><div className="feat-label">Fully Onchain</div></div>
              <div className="hero-feat"><div className="feat-icon">💵</div><div className="feat-label">USDC Native</div></div>
            </div>
          </section>
        )}

        {/* DASHBOARD */}
        {address && (
          <main className="dashboard">
            <div className="tabs-row">
              {[{key:"employer",label:"Employer",icon:"👔"},{key:"worker",label:"Worker",icon:"👷"},{key:"payslips",label:"Payslips",icon:"🎫"},{key:"history",label:"History",icon:"📊"}].map(t => (
                <button key={t.key} className={`tab-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            {activeTab === "employer" && <EmployerDashboard flowArc={flowArc} usdc={usdc} address={address} isEmployer={isEmployer} setIsEmployer={setIsEmployer} notify={notify} />}
            {activeTab === "worker"   && <WorkerDashboard   flowArc={flowArc} address={address} notify={notify} />}
            {activeTab === "payslips" && <PayslipViewer payslipNFT={payslipNFT} address={address} notify={notify} />}
            {activeTab === "history"  && <TransactionHistory address={address} notify={notify} />}
          </main>
        )}
      </div>
    </>
  );
}

export default App;
