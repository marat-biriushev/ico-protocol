# Simple ICO Protocol

A simplified Initial Coin Offering (ICO) protocol: users purchase an ERC-20
token at a fixed price by sending ETH to the ICO contract within a limited
time window. After the ICO ends, the owner withdraws the collected ETH.

## Stack

- [Hardhat 3](https://hardhat.org/) + TypeScript — development environment
- [viem](https://viem.sh/) — contract interaction from scripts
- [Hardhat Ignition](https://hardhat.org/ignition) — declarative deployment
- [OpenZeppelin Contracts](https://www.openzeppelin.com/contracts) — ERC-20 and Ownable base contracts

## How it works

| Contract | Role |
|---|---|
| `MyToken` (ICOT) | ERC-20 token, 1,000,000 ICOT minted to the deployer |
| `SimpleICO` | Sells ICOT for ETH at a fixed rate within `[startTime, endTime]` |

The deployment module deploys the token, deploys the ICO contract, and then
transfers 500,000 ICOT to the ICO contract — that is its "inventory" for sale.

Purchase flow: a buyer either calls `buyTokens()` with ETH attached or simply
sends ETH to the contract address (the `receive()` function forwards to
`buyTokens()`). The contract computes `tokens = msg.value * rate` and
transfers them to the buyer. With `rate = 1000`, 1 ETH buys 1000 ICOT.

Since both ETH and the token use 18 decimals, the math works directly on wei:
`10^18 wei * 1000 = 1000 * 10^18` token units = exactly 1000 whole tokens.

The contract rejects a purchase when:

- the ICO has not started yet (`block.timestamp < startTime`),
- the ICO has already ended (`block.timestamp > endTime`),
- `msg.value` is zero,
- the remaining token inventory is smaller than the requested amount.

After `endTime` the owner (deployer) can call `withdraw()` to receive all
collected ETH. Withdrawal before the end is rejected.

## Project structure

```
contracts/
├── MyToken.sol          # ERC-20 token (ICOT), OpenZeppelin ERC20
└── SimpleICO.sol        # ICO contract: fixed price, time window, withdraw

ignition/modules/
└── ICOModule.ts         # Deploys token + ICO, funds the ICO with 500k ICOT

scripts/
├── buy.ts               # Two purchases: buyTokens() call and a plain ETH transfer
└── end-and-withdraw.ts  # Rejection demos, time travel past endTime, withdraw
```

## Requirements

- Node.js 22+
- npm

## Setup

```bash
git clone <repository URL>
cd ico-protocol
npm install
npx hardhat compile
```

## Running locally

### 1. Start a local node

In a separate terminal (keep it running):

```bash
npx hardhat node
```

### 2. Deploy with Hardhat Ignition

```bash
npx hardhat ignition deploy ignition/modules/ICOModule.ts --network localhost --reset
```

The ICO window is computed at deploy time: it opens immediately and lasts
24 hours. Expected output:

```
Batch #1
  Executed ICOModule#MyToken

Batch #2
  Executed ICOModule#SimpleICO

Batch #3
  Executed ICOModule#MyToken.transfer

[ ICOModule ] successfully deployed 🚀

Deployed Addresses

ICOModule#MyToken - 0x5FbDB2315678afecb367f032d93F642f64180aa3
ICOModule#SimpleICO - 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Addresses are saved to `ignition/deployments/chain-31337/deployed_addresses.json`;
the scripts read them from there automatically.

### 3. Buy tokens

```bash
npx hardhat run scripts/buy.ts --network localhost
```

The script buys twice from the buyer account (account #1): once by calling
`buyTokens()` with 1 ETH, once by sending 0.5 ETH directly to the contract
address to demonstrate the `receive()` path.

```
Баланс покупателя до: 0 ICOT
Куплено за 1 ETH через buyTokens()
Куплено за 0.5 ETH простым переводом ETH
Баланс покупателя после: 1500 ICOT
Собрано в ICO: 1.5 ETH
```

### 4. Rejections, ICO end, and withdrawal

```bash
npx hardhat run scripts/end-and-withdraw.ts --network localhost
```

The script demonstrates a zero-value rejection, fast-forwards the node's
clock by 25 hours (`testClient.increaseTime` — a local-node-only RPC method),
demonstrates the "ICO ended" rejection, and withdraws the collected ETH as
the owner:

```
Отказ при msg.value = 0: The contract function "buyTokens" reverted with the following reason:
send ETH to buy tokens
Время ноды промотано на 25 часов вперёд
Отказ после окончания ICO: The contract function "buyTokens" reverted with the following reason:
ICO has already ended
Владелец вывел: 1.499957485921425128 ETH (минус газ)
```

The withdrawn amount is slightly below 1.5 ETH because the owner also paid
gas for the `withdraw()` transaction itself; the contract held exactly 1.5 ETH.

### Testing the "not started yet" rejection

The module deploys the ICO already active, so this rejection is not shown in
the scripts. To verify it, temporarily set `startTime = BigInt(now + 3600)`
in `ignition/modules/ICOModule.ts`, redeploy with `--reset`, and run
`buy.ts` — every purchase fails with `ICO has not started yet`. Revert the
change and redeploy afterwards.

## Important: node state is not persistent

The Hardhat node keeps the blockchain in memory. Stopping and restarting it
gives you a brand-new empty chain — all contracts and balances are gone,
even though `ignition/deployments/` still exists on disk from the previous
session. After every node restart, redeploy first (step 2 with `--reset`)
before running any scripts.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `not enough tokens left for sale` | The ICO contract was not funded with tokens | The Ignition module does this via `m.call(token, "transfer", ...)`; redeploy with `--reset` |
| `ICO has already ended` right after deploy | Node clock was fast-forwarded by a previous `end-and-withdraw.ts` run | Restart the node and redeploy with `--reset` |
| Scripts fail to read `deployed_addresses.json` | Contracts not deployed yet | Run step 2 before steps 3–4 |
| Ignition reuses a stale journal | Deployment journal left over from a previous node session | Always deploy with `--reset` on a fresh node |

## License

MIT
