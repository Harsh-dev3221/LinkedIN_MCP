-- ========================================
-- PostWizz Link Scraping Tables
-- Copy and paste this into your Supabase SQL editor
-- ========================================

-- Table for storing scraped content
CREATE TABLE IF NOT EXISTS public.scraped_content (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type::text = ANY (ARRAY['github'::character varying, 'article'::character varying, 'website'::character varying, 'documentation'::character varying, 'social'::character varying]::text[])),
    title TEXT,
    description TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status::text = ANY (ARRAY['success'::character varying, 'failed'::character varying, 'processing'::character varying]::text[])),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT scraped_content_pkey PRIMARY KEY (id),
    CONSTRAINT scraped_content_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Table for caching scraped content to avoid re-scraping
CREATE TABLE IF NOT EXISTS public.link_cache (
    url_hash VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,
    scraped_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT link_cache_pkey PRIMARY KEY (url_hash)
);

-- Table for user scraping preferences
CREATE TABLE IF NOT EXISTS public.user_scraping_preferences (
    user_id UUID NOT NULL,
    auto_scrape BOOLEAN DEFAULT true,
    max_links_per_post INTEGER DEFAULT 3 CHECK (max_links_per_post >= 0),
    preferred_content_types TEXT[] DEFAULT ARRAY['github', 'article', 'website'],
    max_content_length INTEGER DEFAULT 5000 CHECK (max_content_length >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_scraping_preferences_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_scraping_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraped_content_user_id ON public.scraped_content(user_id);
CREATE INDEX IF NOT EXISTS idx_scraped_content_url ON public.scraped_content(url);
CREATE INDEX IF NOT EXISTS idx_scraped_content_type ON public.scraped_content(type);
CREATE INDEX IF NOT EXISTS idx_scraped_content_created_at ON public.scraped_content(created_at);
CREATE INDEX IF NOT EXISTS idx_link_cache_expires_at ON public.link_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_link_cache_url ON public.link_cache(url);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_scraped_content_updated_at ON public.scraped_content;
CREATE TRIGGER update_scraped_content_updated_at
    BEFORE UPDATE ON public.scraped_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_scraping_preferences_updated_at ON public.user_scraping_preferences;
CREATE TRIGGER update_user_scraping_preferences_updated_at
    BEFORE UPDATE ON public.user_scraping_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.link_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default preferences for existing users
INSERT INTO public.user_scraping_preferences (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_scraping_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Create a view for easy analytics
CREATE OR REPLACE VIEW public.link_scraping_analytics AS
SELECT 
    u.id as user_id,
    COUNT(sc.id) as total_scraped,
    COUNT(CASE WHEN sc.type = 'github' THEN 1 END) as github_scraped,
    COUNT(CASE WHEN sc.type = 'article' THEN 1 END) as articles_scraped,
    COUNT(CASE WHEN sc.type = 'website' THEN 1 END) as websites_scraped,
    COUNT(CASE WHEN sc.status = 'success' THEN 1 END) as successful_scrapes,
    COUNT(CASE WHEN sc.status = 'failed' THEN 1 END) as failed_scrapes,
    MAX(sc.created_at) as last_scrape_date,
    usp.auto_scrape,
    usp.max_links_per_post,
    usp.preferred_content_types
FROM public.users u
LEFT JOIN public.scraped_content sc ON u.id = sc.user_id
LEFT JOIN public.user_scraping_preferences usp ON u.id = usp.user_id
GROUP BY u.id, usp.auto_scrape, usp.max_links_per_post, usp.preferred_content_types;

-- Success message
SELECT 'Link scraping tables created successfully! 🎉' as message;
