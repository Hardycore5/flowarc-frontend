export const FLOWARC_ADDRESS = "0x13120b7D8E0baaf49E21435609BE2459Ec851B67";
export const PAYSLIP_NFT_ADDRESS = "0x5468B8a06Bf904E7D27f75c329206B31d00d83B9";
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

export const FLOWARC_ABI = [
  "function registerEmployer(string calldata companyName) external",
  "function depositFunds(uint256 amount) external",
  "function withdrawFunds(uint256 amount) external",
  "function addWorker(address workerAddress, string calldata name, uint256 monthlySalary) external",
  "function removeWorker(address workerAddress) external",
  "function claimSalary(address employer) external",
  "function getEarnedAmount(address employer, address workerAddress) external view returns (uint256)",
  "function getEmployerWorkers(address employer) external view returns (address[])",
  "function getWorkerDetails(address employer, address workerAddress) external view returns (string memory name, uint256 salaryPerSecond, uint256 lastClaimed, uint256 startTime, bool active, uint256 earned)",
  "function employers(address) external view returns (string memory companyName, uint256 balance, bool registered)",
  "event EmployerRegistered(address indexed employer, string companyName)",
  "event WorkerAdded(address indexed employer, address indexed worker, string name, uint256 salaryPerSecond)",
  "event WorkerRemoved(address indexed employer, address indexed worker)",
  "event FundsDeposited(address indexed employer, uint256 amount)",
  "event FundsWithdrawn(address indexed employer, uint256 amount)",
  "event SalaryClaimed(address indexed employer, address indexed worker, uint256 amount, uint256 payslipTokenId)",
];

export const PAYSLIP_ABI = [
  "function getWorkerPayslips(address worker) external view returns (uint256[])",
  "function getPayslip(uint256 tokenId) external view returns (address employer, address worker, uint256 amount, uint256 timestamp, string memory companyName)",
  "function balanceOf(address worker) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
];

export const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];
