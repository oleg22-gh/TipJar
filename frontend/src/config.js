// TipJar deployment + ABI

export const CONTRACT_ADDRESS = "0xB07C55a05510B1585DB53847F47537570ee69a5c";

// Sepolia testnet
export const CHAIN = {
  id: 11155111,
  hex: "0xaa36a7",
  name: "Sepolia",
  rpc: "https://ethereum-sepolia-rpc.publicnode.com",
  explorer: "https://sepolia.etherscan.io",
};

export const ABI = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "addTip",
    inputs: [{ name: "_message", type: "string" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getTips",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "from", type: "address" },
          { name: "message", type: "string" },
          { name: "tipAmount", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "NewTip",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "message", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
];
