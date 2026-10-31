-- =============================================================================
-- Financing rates to four decimal places.
-- =============================================================================
-- Rates are solved backwards from the dealership's quoted monthly payments, and
-- two decimals could not hold the solved rate: the calculator came out a few
-- pesos off the quote (₱172,384 against a quoted ₱172,380). With the down
-- payment and rate now fixed for visitors, the calculator has to reproduce the
-- quote exactly. Four decimals does, to the peso.

alter table public.financing_rates
  alter column interest_rate type numeric(7,4);
