
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'not_contacted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'proposal';

CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'note',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_contacts TO authenticated;
GRANT ALL ON public.lead_contacts TO service_role;

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lead contacts" ON public.lead_contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lead contacts" ON public.lead_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lead contacts" ON public.lead_contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own lead contacts" ON public.lead_contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS lead_contacts_lead_id_idx ON public.lead_contacts(lead_id, created_at DESC);
