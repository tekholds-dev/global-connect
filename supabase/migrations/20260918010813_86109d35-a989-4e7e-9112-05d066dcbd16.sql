CREATE TABLE public.ecosystems (
  slug text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.ecosystems TO anon, authenticated;
GRANT ALL ON public.ecosystems TO service_role;
ALTER TABLE public.ecosystems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ecosystems are public" ON public.ecosystems FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.ecosystems (slug, name, color, lat, lng, sort_order) VALUES
  ('solana', 'SOLANA', '#14F195', 37.77, -122.42, 1),
  ('ethereum', 'ETHEREUM', '#8A9CFF', 47.37, 8.54, 2),
  ('pump', 'PUMP', '#7CFF4F', 1.35, 103.82, 3),
  ('base', 'BASE', '#3C8CFF', 40.71, -74.01, 4),
  ('feeless', 'FEELESS', '#FFFFFF', 25.20, 55.27, 5);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  wallet_address text NOT NULL,
  chain text NOT NULL CHECK (chain IN ('solana','evm')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  location_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$'),
  CONSTRAINT bio_len CHECK (bio IS NULL OR char_length(bio) <= 160),
  CONSTRAINT display_len CHECK (display_name IS NULL OR char_length(display_name) <= 40)
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.wallet_identities (
  address text NOT NULL,
  chain text NOT NULL CHECK (chain IN ('solana','evm')),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, address)
);
GRANT ALL ON public.wallet_identities TO service_role;
ALTER TABLE public.wallet_identities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wallet_nonces (
  nonce text PRIMARY KEY,
  address text NOT NULL,
  chain text NOT NULL,
  expires_at timestamptz NOT NULL
);
GRANT ALL ON public.wallet_nonces TO service_role;
ALTER TABLE public.wallet_nonces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_slug text NOT NULL REFERENCES public.ecosystems(slug),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_eco_created ON public.messages (ecosystem_slug, created_at DESC);
GRANT SELECT ON public.messages TO anon;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages are public" ON public.messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users post as themselves" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are public" ON public.follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);