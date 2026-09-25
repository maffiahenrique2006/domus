-- Additive migration. Legacy demonstration records are intentionally preserved,
-- never assigned to a tenant automatically and no longer exposed by API routes.
CREATE TABLE IF NOT EXISTS legal_companies (
 id uuid PRIMARY KEY, name text NOT NULL DEFAULT 'Meu escritório',
 revision integer NOT NULL DEFAULT 0, configuration jsonb,
 configuration_version integer NOT NULL DEFAULT 0,
 interview jsonb NOT NULL DEFAULT '[]', proposal jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS legal_memberships (
 user_id integer PRIMARY KEY REFERENCES users(id),
 company_id uuid NOT NULL REFERENCES legal_companies(id),
 role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','member'))
);
CREATE TABLE IF NOT EXISTS legal_configuration_versions (
 company_id uuid NOT NULL REFERENCES legal_companies(id), version integer NOT NULL,
 configuration jsonb NOT NULL, approved_by integer NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id, version)
);
CREATE TABLE IF NOT EXISTS legal_clients (
 company_id uuid NOT NULL REFERENCES legal_companies(id), id text NOT NULL,
 name text NOT NULL, email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
 PRIMARY KEY(company_id,id), UNIQUE(company_id,name)
);
CREATE TABLE IF NOT EXISTS legal_demands (
 company_id uuid NOT NULL REFERENCES legal_companies(id), id text NOT NULL,
 client_id text NOT NULL, status text NOT NULL,
 payload jsonb NOT NULL, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,client_id) REFERENCES legal_clients(company_id,id),
 CHECK(status IN ('nova','em_analise','aguardando_cliente','aprovada','convertida','cancelada'))
);
CREATE TABLE IF NOT EXISTS legal_projects (
 company_id uuid NOT NULL REFERENCES legal_companies(id), id text NOT NULL,
 client_id text NOT NULL, demand_id text, payload jsonb NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,demand_id),
 FOREIGN KEY(company_id,client_id) REFERENCES legal_clients(company_id,id),
 FOREIGN KEY(company_id,demand_id) REFERENCES legal_demands(company_id,id)
);
CREATE TABLE IF NOT EXISTS legal_tasks (
 company_id uuid NOT NULL, project_id text NOT NULL, id text NOT NULL,
 payload jsonb NOT NULL, PRIMARY KEY(company_id,project_id,id),
 FOREIGN KEY(company_id,project_id) REFERENCES legal_projects(company_id,id)
);
CREATE TABLE IF NOT EXISTS legal_financial_entries (
 company_id uuid NOT NULL REFERENCES legal_companies(id), id text NOT NULL,
 project_id text, amount numeric(14,2) NOT NULL CHECK(amount>0),
 type text NOT NULL CHECK(type IN ('receber','pagar')),
 status text NOT NULL CHECK(status IN ('pendente','vencido','pago','recebido')),
 payload jsonb NOT NULL, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,project_id) REFERENCES legal_projects(company_id,id)
);
CREATE TABLE IF NOT EXISTS legal_chat_messages (
 id serial PRIMARY KEY, company_id uuid NOT NULL REFERENCES legal_companies(id),
 user_id integer NOT NULL REFERENCES users(id), role text NOT NULL CHECK(role IN ('user','assistant')),
 content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legal_chat_scope ON legal_chat_messages(company_id,user_id,id);
CREATE TABLE IF NOT EXISTS legal_ai_usage (
 id serial PRIMARY KEY, company_id uuid NOT NULL REFERENCES legal_companies(id),
 user_id integer NOT NULL REFERENCES users(id), purpose text NOT NULL,
 response_id text NOT NULL UNIQUE, model text NOT NULL,
 input_tokens integer NOT NULL CHECK(input_tokens>=0),
 output_tokens integer NOT NULL CHECK(output_tokens>=0),
 total_tokens integer NOT NULL CHECK(total_tokens>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legal_usage_scope ON legal_ai_usage(company_id,created_at);
CREATE TABLE IF NOT EXISTS legal_ai_daily_quota (
 company_id uuid NOT NULL REFERENCES legal_companies(id), day date NOT NULL,
 calls integer NOT NULL DEFAULT 0 CHECK(calls>=0), PRIMARY KEY(company_id,day)
);
