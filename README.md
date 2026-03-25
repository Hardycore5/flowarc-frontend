# ⚡ FlowArc Frontend

> The official frontend for the FlowArc onchain payroll protocol — built with React and deployed on Vercel.

🌐 **Live App:** [flowarc-frontend.vercel.app](https://flowarc-frontend.vercel.app)
🔗 **Smart Contracts:** [github.com/Hardycore5/flowarc](https://github.com/Hardycore5/flowarc)

---

## What is FlowArc?

FlowArc is a decentralized payroll protocol on Arc Testnet. This frontend allows employers and workers to interact with the FlowArc smart contracts through a clean, modern UI — no coding required.

---

## Features

- 🦊 **Multi-wallet support** — MetaMask, Rabby, Coinbase Wallet, Zerion, Brave Wallet
- 🔄 **Auto network switching** — automatically prompts to switch to Arc Testnet
- 👔 **Employer Dashboard** — register company, deposit/withdraw USDC, add/remove workers
- 👷 **Worker Dashboard** — view earned salary in real time and claim USDC
- 🎫 **Payslip Viewer** — browse all soulbound Payslip NFTs earned from salary claims
- 📊 **Transaction History** — view past payroll transactions
- 🔔 **Live notifications** — real-time success and error feedback

---

## Tech Stack

| Layer              | Technology                               |
| ------------------ | ---------------------------------------- |
| Framework          | React                                    |
| Blockchain Library | ethers.js                                |
| Network            | Arc Testnet                              |
| Payment Token      | USDC                                     |
| Hosting            | Vercel                                   |
| Wallet Support     | MetaMask, Rabby, Coinbase, Zerion, Brave |

---

## Smart Contract Addresses (Arc Testnet)

| Contract   | Address                                    |
| ---------- | ------------------------------------------ |
| FlowArc    | 0x9F3bbf462dee5A0242786fd47037F96ABa82Ad5a |
| PayslipNFT | 0x5468B8a06Bf904E7D27f75c329206B31d00d83B9 |
| USDC       | 0x3600000000000000000000000000000000000000 |

---

## Getting Started

### Prerequisites

- Node.js and npm installed
- A Web3 wallet (MetaMask recommended)
- Arc Testnet added to your wallet
- Testnet USDC

### Installation

```bash
git clone https://github.com/Hardycore5/flowarc-frontend.git
cd flowarc-frontend
npm install
```

### Run Locally

```bash
npm start
```

App will be running at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

---

## How to Use

### As an Employer

1. Connect your wallet and switch to Arc Testnet
2. Click the **Employer** tab
3. Register your company with a name
4. Deposit USDC to fund your payroll
5. Add workers by entering their wallet address and monthly salary
6. Workers will be able to stream and claim their salary in real time

### As a Worker

1. Connect your wallet and switch to Arc Testnet
2. Click the **Worker** tab
3. Enter your employer's wallet address
4. View your earned salary accumulating in real time
5. Click **Claim** to receive your USDC and mint a soulbound Payslip NFT

### Viewing Payslips

- Go to the **Payslips** tab to see all your on-chain payslip NFTs
- Each payslip shows the company name, amount paid, and date

---

## Project Structure

```
src/
├── App.js                        # Main app, wallet connection, routing
├── index.js                      # Entry point
├── contracts/
│   └── abis.js                   # Contract addresses and ABIs
└── components/
    ├── EmployerDashboard.js       # Employer UI
    ├── WorkerDashboard.js         # Worker UI
    ├── PayslipViewer.js           # Payslip NFT browser
    └── TransactionHistory.js      # Transaction history
```

---

## Deployment

This app is deployed on Vercel. Every push to the `main` branch triggers an automatic redeployment.

To deploy your own instance:

1. Fork this repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Set the framework preset to **Create React App**
4. Click **Deploy**

---

## License

MIT
