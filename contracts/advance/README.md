# Seyf Soroban Advance Contract

Minimal Soroban contract for Seyf's yield-advance trust layer. This contract only models advance eligibility and cycle-level locking. It does not accept deposits and it does not expose any principal-withdrawal entrypoint.

## What it enforces

- `max_advance_mxn = projected_yield_mxn - 10% buffer - seyf_fee_flat_mxn`
- One active advance per cycle at contract level
- Reject advance requests above the computed maximum
- Emit lifecycle events for quote, execution, and denial paths

## Contract surface

- `calculate_advance(principal_mxn, rate_bps, days_elapsed, days_total, fee_flat_mxn) -> AdvanceQuote`
- `execute_advance(cycle_id, advance_requested_mxn, principal_mxn, rate_bps, days_elapsed, days_total, fee_flat_mxn) -> AdvanceOutcome`
- `get_advance_for_cycle(cycle_id) -> Option<AdvanceRecord>`
- `has_active_advance(cycle_id) -> bool`

`rate_bps` uses basis points, so `1200 = 12.00% APR`. All amounts are integer MXN units. No floating-point math is used.

## Toolchain

Based on the current Stellar smart-contract docs:

- Rust stable `1.84.0+`
- `wasm32v1-none` target
- Stellar CLI with Soroban support
- `soroban-sdk = "22"`

Local validation for this branch used:

- `rustc 1.93.0`
- `cargo 1.93.0`
- `stellar 25.0.0`

Install or update the prerequisites:

```bash
rustup update stable
rustup target add wasm32v1-none
curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
```

## Build and test

```bash
cd contracts/advance
cargo test
stellar contract build
```

The compiled Wasm should be generated at:

```text
contracts/advance/target/wasm32v1-none/release/seyf_advance_contract.wasm
```

## Testnet deploy

Generate and fund a testnet identity if you do not already have one:

```bash
stellar keys generate seyf-advance-deployer --network testnet --fund
stellar keys address seyf-advance-deployer
```

Deploy from `contracts/advance`:

```bash
stellar contract deploy \
  --source-account seyf-advance-deployer \
  --network testnet \
  --wasm target/wasm32v1-none/release/seyf_advance_contract.wasm
```

Optional invoke example after deploy:

```bash
stellar contract invoke \
  --source-account seyf-advance-deployer \
  --network testnet \
  --id <CONTRACT_ID> \
  -- \
  calculate_advance \
  --principal_mxn 100000 \
  --rate_bps 1200 \
  --days_elapsed 14 \
  --days_total 28 \
  --fee_flat_mxn 50
```

## Deployment record

- Network: `testnet`
- Contract alias: `seyf-advance-m05`
- Contract address: `CBLK5FUGBRAYLBZX3WIWTYEBLLW7G6P7JLWG2ZRKJHLSTF6DGCGCR4BL`
- Wasm hash: `767b6ace30e8e468029af71391b9bee7c1326c3af6ef307f3253615fc36dddff`
- Deployer identity: `alien-testnet-deployer`
- Deploy command used:

```bash
stellar contract deploy \
  --source-account alien-testnet-deployer \
  --network testnet \
  --alias seyf-advance-m05 \
  --wasm target/wasm32v1-none/release/seyf_advance_contract.wasm
```

- Deploy transaction hash: `19b5a5583784395889a8c385c3331ed6254815e21b4a7dbd94783be7d09011d4`
- Validation invoke:

```bash
stellar contract invoke \
  --source-account alien-testnet-deployer \
  --network testnet \
  --id CBLK5FUGBRAYLBZX3WIWTYEBLLW7G6P7JLWG2ZRKJHLSTF6DGCGCR4BL \
  -- \
  calculate_advance \
  --principal_mxn 100000 \
  --rate_bps 1200 \
  --days_elapsed 14 \
  --days_total 28 \
  --fee_flat_mxn 50
```

- Validation result: `projected_yield_mxn=6000`, `buffer_mxn=600`, `max_advance_mxn=5350`

## Events

- `AdvanceCalculated`: emitted by `calculate_advance` with the full `AdvanceQuote`
- `AdvanceExecuted`: emitted by `execute_advance` when an advance is approved
- `AdvanceDenied`: emitted by `execute_advance` when the request is invalid, above limit, or duplicate for the same cycle

## Integration test coverage

- Happy path: valid quote and first execution in a cycle
- Over limit: denied when `advance_requested_mxn > max_advance_mxn`
- Same cycle replay: denied when a second advance is attempted for the same cycle

## Review checklist before mainnet

- Verify integer rounding behavior is approved by product and treasury
- Confirm cycle identifiers are generated consistently by the off-chain engine
- Review storage growth strategy for historical cycle records
- Confirm the deployed interface and event schema are consumed correctly by backend/indexer code
- Run independent peer review focused on overflow safety, replay resistance, and denial-path handling
- Complete internal or third-party Soroban security review before any mainnet deployment
