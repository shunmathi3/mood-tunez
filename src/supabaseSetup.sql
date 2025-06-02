-- Create a secure schema for user related tables
CREATE SCHEMA IF NOT EXISTS moodtunez;

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create table for user profiles
CREATE TABLE IF NOT EXISTS moodtunez.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for saved playlists
CREATE TABLE IF NOT EXISTS moodtunez.saved_playlists (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    emotion TEXT NOT NULL,
    genre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for liked tracks
CREATE TABLE IF NOT EXISTS moodtunez.liked_tracks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    playlist_id INTEGER REFERENCES moodtunez.saved_playlists(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    track_artist TEXT NOT NULL,
    track_img TEXT,
    track_preview TEXT,
    emotion TEXT NOT NULL,
    genre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for user history
CREATE TABLE IF NOT EXISTS moodtunez.user_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    emotion TEXT NOT NULL,
    genre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies

-- User Profiles: Users can only read/update their own profile
ALTER TABLE moodtunez.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
    ON moodtunez.user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON moodtunez.user_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Saved Playlists: Users can only CRUD their own playlists
ALTER TABLE moodtunez.saved_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playlists" 
    ON moodtunez.saved_playlists FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists" 
    ON moodtunez.saved_playlists FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" 
    ON moodtunez.saved_playlists FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" 
    ON moodtunez.saved_playlists FOR DELETE 
    USING (auth.uid() = user_id);

-- Liked Tracks: Users can only CRUD their own liked tracks
ALTER TABLE moodtunez.liked_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own liked tracks" 
    ON moodtunez.liked_tracks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liked tracks" 
    ON moodtunez.liked_tracks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liked tracks" 
    ON moodtunez.liked_tracks FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liked tracks" 
    ON moodtunez.liked_tracks FOR DELETE 
    USING (auth.uid() = user_id);

-- User History: Users can only CRUD their own history
ALTER TABLE moodtunez.user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history" 
    ON moodtunez.user_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own history" 
    ON moodtunez.user_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create or replace trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION moodtunez.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON moodtunez.user_profiles
FOR EACH ROW
EXECUTE FUNCTION moodtunez.update_timestamp(); 