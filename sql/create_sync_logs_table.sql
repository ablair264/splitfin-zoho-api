-- Create sync_logs table to track sync operations
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
    details JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_sync_logs_company_id ON public.sync_logs(company_id);
CREATE INDEX idx_sync_logs_entity_type ON public.sync_logs(entity_type);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_synced_at ON public.sync_logs(synced_at DESC);
CREATE INDEX idx_sync_logs_company_entity ON public.sync_logs(company_id, entity_type, synced_at DESC);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage all sync logs" ON public.sync_logs
    FOR ALL USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sync_logs_updated_at BEFORE UPDATE ON public.sync_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.sync_logs TO service_role;
GRANT SELECT ON public.sync_logs TO authenticated;