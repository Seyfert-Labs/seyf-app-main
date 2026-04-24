extern crate std;

use soroban_sdk::Env;

use crate::{AdvanceContract, AdvanceContractClient, AdvanceError, AdvanceOutcome};

#[test]
fn happy_path_executes_single_advance_for_cycle() {
    let env = Env::default();
    let contract_id = env.register(AdvanceContract, ());
    let client = AdvanceContractClient::new(&env, &contract_id);

    let quote = client.calculate_advance(&100_000_i128, &1_200_i128, &14_u32, &28_u32, &50_i128);
    assert_eq!(quote.projected_yield_mxn, 6_000);
    assert_eq!(quote.buffer_mxn, 600);
    assert_eq!(quote.max_advance_mxn, 5_350);

    let outcome = client.execute_advance(
        &202604_u64,
        &400_i128,
        &100_000_i128,
        &1_200_i128,
        &14_u32,
        &28_u32,
        &50_i128,
    );

    match outcome {
        AdvanceOutcome::Executed(record) => {
            assert_eq!(record.approved_mxn, 400);
            assert_eq!(record.max_advance_mxn, 5_350);
        }
        _ => panic!("expected executed outcome"),
    }

    assert!(client.has_active_advance(&202604_u64));
}

#[test]
fn denies_advance_over_max_limit() {
    let env = Env::default();
    let contract_id = env.register(AdvanceContract, ());
    let client = AdvanceContractClient::new(&env, &contract_id);

    let outcome = client.execute_advance(
        &202604_u64,
        &5_351_i128,
        &100_000_i128,
        &1_200_i128,
        &14_u32,
        &28_u32,
        &50_i128,
    );

    match outcome {
        AdvanceOutcome::Denied(denied) => {
            assert_eq!(denied.max_advance_mxn, 5_350);
            assert_eq!(denied.error_code, AdvanceError::AdvanceExceedsLimit as u32);
        }
        _ => panic!("expected denied outcome"),
    }

    assert!(!client.has_active_advance(&202604_u64));
}

#[test]
fn denies_second_advance_in_same_cycle() {
    let env = Env::default();
    let contract_id = env.register(AdvanceContract, ());
    let client = AdvanceContractClient::new(&env, &contract_id);

    let first = client.execute_advance(
        &202604_u64,
        &300_i128,
        &100_000_i128,
        &1_200_i128,
        &14_u32,
        &28_u32,
        &50_i128,
    );
    assert!(matches!(first, AdvanceOutcome::Executed(_)));

    let second = client.execute_advance(
        &202604_u64,
        &200_i128,
        &100_000_i128,
        &1_200_i128,
        &14_u32,
        &28_u32,
        &50_i128,
    );

    match second {
        AdvanceOutcome::Denied(denied) => {
            assert_eq!(
                denied.error_code,
                AdvanceError::AdvanceAlreadyActiveForCycle as u32
            );
        }
        _ => panic!("expected duplicate-cycle denial"),
    }
}
