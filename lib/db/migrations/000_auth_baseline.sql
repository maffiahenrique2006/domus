CREATE TABLE IF NOT EXISTS users (
 id serial PRIMARY KEY, google_id text NOT NULL UNIQUE, email text NOT NULL UNIQUE,
 name text NOT NULL, picture_url text, plan text NOT NULL DEFAULT 'free',
 stripe_customer_id text, stripe_subscription_id text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token text PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
