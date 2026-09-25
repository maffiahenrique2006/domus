CREATE TABLE IF NOT EXISTS domus_billing_state (
 user_id integer PRIMARY KEY REFERENCES users(id),
 checkout_id text,
 subscription_status text NOT NULL DEFAULT 'none',
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS domus_billing_events (
 event_id text PRIMARY KEY,
 event_type text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now()
);
