import { useCallback, useEffect, useMemo, useState } from "react";
import { Web3 } from "web3";
import { ABI, CONTRACT_ADDRESS, CHAIN } from "./config.js";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export default function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [owner, setOwner] = useState(null);
  const [tips, setTips] = useState([]);
  const [balance, setBalance] = useState("0");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const hasWallet = typeof window !== "undefined" && window.ethereum;
  const onRightChain = chainId === CHAIN.id;
  const isOwner =
    account && owner && account.toLowerCase() === owner.toLowerCase();

  // read-only web3 (works without wallet) for fetching tips
  const readWeb3 = useMemo(() => new Web3(CHAIN.rpc), []);
  const readContract = useMemo(
    () => new readWeb3.eth.Contract(ABI, CONTRACT_ADDRESS),
    [readWeb3]
  );

  const popToast = (emoji, text, kind = "ok") => {
    setToast({ emoji, text, kind });
    setTimeout(() => setToast(null), 4000);
  };

  // sum of every tip ever — historical, NOT what's left to withdraw
  const allTimeEth = useMemo(() => {
    const sum = tips.reduce((acc, t) => acc + BigInt(t.tipAmount), 0n);
    return Web3.utils.fromWei(sum.toString(), "ether");
  }, [tips]);

  const loadTips = useCallback(async () => {
    try {
      const result = await readContract.methods.getTips().call();
      setTips(
        result.map((t) => ({
          from: t.from,
          message: t.message,
          tipAmount: t.tipAmount.toString(),
        }))
      );
    } catch (e) {
      console.error("loadTips failed", e);
    }
  }, [readContract]);

  const loadOwner = useCallback(async () => {
    try {
      setOwner(await readContract.methods.owner().call());
    } catch (e) {
      console.error("loadOwner failed", e);
    }
  }, [readContract]);

  // real ETH currently sitting in the contract = what owner can withdraw
  const loadBalance = useCallback(async () => {
    try {
      const wei = await readWeb3.eth.getBalance(CONTRACT_ADDRESS);
      setBalance(Web3.utils.fromWei(wei.toString(), "ether"));
    } catch (e) {
      console.error("loadBalance failed", e);
    }
  }, [readWeb3]);

  useEffect(() => {
    loadTips();
    loadOwner();
    loadBalance();
    const id = setInterval(() => {
      loadTips();
      loadBalance();
    }, 15000);
    return () => clearInterval(id);
  }, [loadTips, loadOwner, loadBalance]);

  // wallet event wiring
  useEffect(() => {
    if (!hasWallet) return;
    const eth = window.ethereum;
    const onAccounts = (accs) => setAccount(accs[0] || null);
    const onChain = (cid) => setChainId(parseInt(cid, 16));
    eth.request({ method: "eth_chainId" }).then(onChain);
    eth.request({ method: "eth_accounts" }).then(onAccounts);
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, [hasWallet]);

  const connect = async () => {
    if (!hasWallet) {
      popToast("🦊", "No MetaMask found — install it first!", "err");
      return;
    }
    try {
      const accs = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accs[0]);
    } catch {
      popToast("🙅", "Connection rejected", "err");
    }
  };

  const switchChain = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN.hex }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN.hex,
              chainName: CHAIN.name,
              rpcUrls: [CHAIN.rpc],
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: [CHAIN.explorer],
            },
          ],
        });
      }
    }
  };

  // Send via MetaMask (sign + broadcast only); poll the receipt over the
  // CORS-friendly public RPC so web3.js never hits MetaMask's flaky node.
  const sendTx = async ({ data, value }) => {
    const params = { from: account, to: CONTRACT_ADDRESS, data };
    if (value) params.value = "0x" + BigInt(value).toString(16);

    const hash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [params],
    });

    let receipt = null;
    while (!receipt) {
      await new Promise((r) => setTimeout(r, 2500));
      receipt = await readWeb3.eth
        .getTransactionReceipt(hash)
        .catch(() => null);
    }
    if (!Number(receipt.status)) throw new Error("Transaction reverted");
    return receipt;
  };

  const sendTip = async (e) => {
    e.preventDefault();
    if (!account) return connect();
    if (!onRightChain) return switchChain();
    const value = Number(amount);
    if (!value || value <= 0) {
      popToast("🤨", "Tip must be more than 0 ETH", "err");
      return;
    }
    setBusy(true);
    try {
      const data = readContract.methods.addTip(message || "🪙").encodeABI();
      await sendTx({ data, value: Web3.utils.toWei(amount, "ether") });
      popToast("🎉", "Coin plopped into the jar!");
      setMessage("");
      loadTips();
      loadBalance();
    } catch (err) {
      popToast("💥", err?.message?.slice(0, 80) || "Tx failed", "err");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      const data = readContract.methods.withdraw().encodeABI();
      await sendTx({ data });
      popToast("💰", "Jar emptied into your wallet!");
      loadTips();
      loadBalance();
    } catch (err) {
      popToast("💥", err?.message?.slice(0, 80) || "Tx failed", "err");
    } finally {
      setBusy(false);
    }
  };

  // visual coins in the jar (capped so it doesn't overflow)
  const coinCount = Math.min(tips.length, 24);

  return (
    <div className="page">
      {toast && (
        <div className={`toast toast--${toast.kind}`}>
          <span className="toast__emoji">{toast.emoji}</span>
          {toast.text}
        </div>
      )}

      <header className="topbar">
        <div className="logo">🫙 TIPJAR</div>
        {account ? (
          <div className="wallet-pill">
            <span className="dot" /> {short(account)}
            {!onRightChain && (
              <button className="btn btn--mini" onClick={switchChain}>
                Switch to {CHAIN.name}!
              </button>
            )}
          </div>
        ) : (
          <button className="btn btn--connect" onClick={connect}>
            🦊 Connect Wallet
          </button>
        )}
      </header>

      <main className="layout">
        <section className="jar-card card">
          <h1 className="title">Plop a coin in the jar!</h1>
          <p className="subtitle">Leave a tip + a silly message on-chain ✨</p>

          <div className="jar-wrap">
            <div className="jar">
              <div className="jar__lid" />
              <div className="jar__body">
                <div className="coins">
                  {Array.from({ length: coinCount }).map((_, i) => (
                    <span
                      key={i}
                      className="coin"
                      style={{
                        left: `${8 + ((i * 37) % 78)}%`,
                        bottom: `${4 + Math.floor(i / 4) * 13}px`,
                        animationDelay: `${(i % 6) * 0.15}s`,
                      }}
                    >
                      🪙
                    </span>
                  ))}
                  {coinCount === 0 && <span className="empty">so empty…</span>}
                </div>
              </div>
            </div>
            <div className="totals">
              <div className="big-num">{Number(balance).toFixed(4)}</div>
              <div className="big-label">ETH in the jar</div>
              <div className="small-label">{tips.length} tips 🎈</div>
              <div className="small-label">
                {Number(allTimeEth).toFixed(4)} ETH all-time
              </div>
            </div>
          </div>

          <form className="tip-form" onSubmit={sendTip}>
            <input
              className="input"
              placeholder="Say something funny… 🤡"
              value={message}
              maxLength={120}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="amount-row">
              <input
                className="input input--amount"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="eth-tag">ETH</span>
            </div>
            <button className="btn btn--big" disabled={busy} type="submit">
              {busy ? "Plopping…" : "🪙 PLOP A TIP!"}
            </button>
          </form>

          {isOwner && (
            <button
              className="btn btn--cash"
              disabled={busy || Number(balance) === 0}
              onClick={withdraw}
            >
              💰 Cash out {Number(balance).toFixed(4)} ETH (owner)
            </button>
          )}
        </section>

        <section className="feed-card card">
          <div className="feed-head">
            <h2 className="feed-title">🎉 Wall of Tippers</h2>
            <button className="btn btn--mini" onClick={loadTips}>
              ↻ refresh
            </button>
          </div>
          <div className="feed">
            {tips.length === 0 && (
              <div className="feed-empty">
                Be the first to plop a coin! 🥹
              </div>
            )}
            {[...tips].reverse().map((t, i) => (
              <div className="tip-item" key={i}>
                <div className="tip-coin">🪙</div>
                <div className="tip-body">
                  <div className="tip-msg">{t.message || "—"}</div>
                  <a
                    className="tip-from"
                    href={`${CHAIN.explorer}/address/${t.from}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {short(t.from)}
                  </a>
                </div>
                <div className="tip-amount">
                  {Number(Web3.utils.fromWei(t.tipAmount, "ether")).toFixed(4)}
                  <span> ETH</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="foot">
        contract{" "}
        <a
          href={`${CHAIN.explorer}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          {short(CONTRACT_ADDRESS)}
        </a>{" "}
        · {CHAIN.name} testnet
      </footer>
    </div>
  );
}
