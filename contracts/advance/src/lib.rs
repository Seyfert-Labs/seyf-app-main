#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Env, Symbol};

const RATE_BPS_DENOMINATOR: i128 = 10_000;
const BUFFER_BPS: i128 = 1_000;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    AdvanceForCycle(u64),
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct AdvanceQuote {
    pub principal_mxn: i128,
    pub rate_bps: i128,
    pub days_elapsed: u32,
    pub days_total: u32,
    pub fee_flat_mxn: i128,
    pub projected_yield_mxn: i128,
    pub buffer_mxn: i128,
    pub max_advance_mxn: i128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct AdvanceRecord {
    pub cycle_id: u64,
    pub principal_mxn: i128,
    pub rate_bps: i128,
    pub days_elapsed: u32,
    pub days_total: u32,
    pub fee_flat_mxn: i128,
    pub requested_mxn: i128,
    pub approved_mxn: i128,
    pub projected_yield_mxn: i128,
    pub buffer_mxn: i128,
    pub max_advance_mxn: i128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct AdvanceDeniedEvent {
    pub cycle_id: u64,
    pub requested_mxn: i128,
    pub max_advance_mxn: i128,
    pub error_code: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum AdvanceOutcome {
    Executed(AdvanceRecord),
    Denied(AdvanceDeniedEvent),
}

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracttype]
#[repr(u32)]
pub enum AdvanceError {
    InvalidInput = 1,
    AdvanceAlreadyActiveForCycle = 2,
    AdvanceExceedsLimit = 3,
}

#[contract]
pub struct AdvanceContract;

#[contractimpl]
impl AdvanceContract {
    pub fn calculate_advance(
        env: Env,
        principal_mxn: i128,
        rate_bps: i128,
        days_elapsed: u32,
        days_total: u32,
        fee_flat_mxn: i128,
    ) -> AdvanceQuote {
        let quote = build_quote(
            principal_mxn,
            rate_bps,
            days_elapsed,
            days_total,
            fee_flat_mxn,
        );

        env.events()
            .publish((Symbol::new(&env, "AdvanceCalculated"),), quote.clone());

        quote
    }

    pub fn execute_advance(
        env: Env,
        cycle_id: u64,
        advance_requested_mxn: i128,
        principal_mxn: i128,
        rate_bps: i128,
        days_elapsed: u32,
        days_total: u32,
        fee_flat_mxn: i128,
    ) -> AdvanceOutcome {
        let quote = build_quote(
            principal_mxn,
            rate_bps,
            days_elapsed,
            days_total,
            fee_flat_mxn,
        );

        if advance_requested_mxn <= 0 {
            return deny(
                &env,
                cycle_id,
                advance_requested_mxn,
                quote.max_advance_mxn,
                AdvanceError::InvalidInput,
            );
        }

        let key = DataKey::AdvanceForCycle(cycle_id);
        if env.storage().persistent().has(&key) {
            return deny(
                &env,
                cycle_id,
                advance_requested_mxn,
                quote.max_advance_mxn,
                AdvanceError::AdvanceAlreadyActiveForCycle,
            );
        }

        if advance_requested_mxn > quote.max_advance_mxn {
            return deny(
                &env,
                cycle_id,
                advance_requested_mxn,
                quote.max_advance_mxn,
                AdvanceError::AdvanceExceedsLimit,
            );
        }

        let record = AdvanceRecord {
            cycle_id,
            principal_mxn,
            rate_bps,
            days_elapsed,
            days_total,
            fee_flat_mxn,
            requested_mxn: advance_requested_mxn,
            approved_mxn: advance_requested_mxn,
            projected_yield_mxn: quote.projected_yield_mxn,
            buffer_mxn: quote.buffer_mxn,
            max_advance_mxn: quote.max_advance_mxn,
        };

        env.storage().persistent().set(&key, &record);
        env.events()
            .publish((Symbol::new(&env, "AdvanceExecuted"), cycle_id), record.clone());

        AdvanceOutcome::Executed(record)
    }

    pub fn get_advance_for_cycle(env: Env, cycle_id: u64) -> Option<AdvanceRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::AdvanceForCycle(cycle_id))
    }

    pub fn has_active_advance(env: Env, cycle_id: u64) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::AdvanceForCycle(cycle_id))
    }
}

fn build_quote(
    principal_mxn: i128,
    rate_bps: i128,
    days_elapsed: u32,
    days_total: u32,
    fee_flat_mxn: i128,
) -> AdvanceQuote {
    validate_inputs(principal_mxn, rate_bps, days_elapsed, days_total, fee_flat_mxn);

    let projected_yield_mxn = principal_mxn
        .checked_mul(rate_bps)
        .and_then(|value| value.checked_mul(days_elapsed as i128))
        .expect("overflow while computing projected yield")
        / (RATE_BPS_DENOMINATOR * days_total as i128);

    let buffer_mxn = projected_yield_mxn
        .checked_mul(BUFFER_BPS)
        .expect("overflow while computing buffer")
        / RATE_BPS_DENOMINATOR;

    let max_after_buffer_mxn = projected_yield_mxn
        .checked_sub(buffer_mxn)
        .expect("buffer cannot exceed projected yield");

    let max_advance_mxn = if fee_flat_mxn >= max_after_buffer_mxn {
        0
    } else {
        max_after_buffer_mxn - fee_flat_mxn
    };

    AdvanceQuote {
        principal_mxn,
        rate_bps,
        days_elapsed,
        days_total,
        fee_flat_mxn,
        projected_yield_mxn,
        buffer_mxn,
        max_advance_mxn,
    }
}

fn validate_inputs(
    principal_mxn: i128,
    rate_bps: i128,
    days_elapsed: u32,
    days_total: u32,
    fee_flat_mxn: i128,
) {
    if principal_mxn <= 0
        || rate_bps < 0
        || fee_flat_mxn < 0
        || days_total == 0
        || days_elapsed > days_total
    {
        panic!("invalid advance inputs");
    }
}

fn deny(
    env: &Env,
    cycle_id: u64,
    requested_mxn: i128,
    max_advance_mxn: i128,
    error: AdvanceError,
) -> AdvanceOutcome {
    let denial = AdvanceDeniedEvent {
        cycle_id,
        requested_mxn,
        max_advance_mxn,
        error_code: error as u32,
    };

    env.events()
        .publish((Symbol::new(env, "AdvanceDenied"), cycle_id), denial.clone());

    AdvanceOutcome::Denied(denial)
}

#[cfg(test)]
mod test;
