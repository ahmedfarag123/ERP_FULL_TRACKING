CREATE INDEX idx_mv_account_balances_code ON public.mv_account_balances USING btree (account_code);
CREATE INDEX idx_mv_account_balances_type ON public.mv_account_balances USING btree (account_type);
CREATE UNIQUE INDEX idx_mv_account_balances_id ON public.mv_account_balances USING btree (account_id);
CREATE UNIQUE INDEX idx_mv_agent_monthly_facts ON public.mv_agent_monthly_facts USING btree (user_id, month_start);
