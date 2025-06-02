import React, { useEffect, useState } from "react";
import "./App.css";
import LoadingScreen from "./LoadingScreen";
import PlaylistRecommendation from "./PlaylistRecommendation";
import { supabase } from "./supabaseClient";
import { fetchPlaylistTracks } from "./soundcloudClient";

function MusicRecommendations({ emotion, genre, onBackClick, session, selectedPlaylistId }) {
    console.log("MusicRecommendations rendered with:", { emotion, genre, selectedPlaylistId });
    
    const [tracks, setTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [playlistId, setPlaylistId] = useState(null);

    // Add safeguards in case null values are passed
    useEffect(() => {
        if (!emotion || !genre) {
            console.warn("Missing required props:", { emotion, genre });
            setError("Missing required information. Please go back and try again.");
            setIsLoading(false);
            return;
        }
        
        // Set up user ID from session
        if (session?.user) {
            setUserId(session.user.id);
        } else {
            setUserId(null);
        }
    }, [session, emotion, genre]);

    // Add regenerate handler function
    const handleRegenerate = () => {
        console.log("Regenerating playlist...");
        setIsLoading(true);
        setRefreshTrigger(prev => prev + 1); // Force a refresh
        setPlaylistId(null); // Reset playlist ID for new playlist
    };

    // Create a new playlist record in Supabase
    const createPlaylistRecord = async (userId, tracksList) => {
        if (!userId) return null;
        
        try {
            // Create a new playlist entry
            const playlistName = `${emotion} ${genre} - ${new Date().toLocaleDateString()}`;
            const { data: playlist, error: playlistError } = await supabase
                .from('saved_playlists')
                .insert([
                    {
                        user_id: userId,
                        name: playlistName,
                        emotion: emotion,
                        genre: genre,
                        created_at: new Date()
                    }
                ])
                .select();
                
            if (playlistError) throw playlistError;
            
            const newPlaylistId = playlist?.[0]?.id;
            
            if (!newPlaylistId) {
                throw new Error("Failed to get ID of newly created playlist");
            }
            
            console.log("Created new playlist record:", newPlaylistId);
            
            // Now add all tracks to the liked_tracks table linked to this playlist
            const tracksToInsert = tracksList.map(track => ({
                user_id: userId,
                playlist_id: newPlaylistId,
                track_id: track.id.toString(),
                track_title: track.title,
                track_artist: track.artist,
                track_img: track.img,
                track_preview: track.preview,
                emotion: emotion,
                genre: genre
            }));
            
            const { error: tracksError } = await supabase
                .from('liked_tracks')
                .insert(tracksToInsert);
                
            if (tracksError) throw tracksError;
            
            console.log(`Added ${tracksToInsert.length} tracks to playlist ${newPlaylistId}`);
            
            return newPlaylistId;
        } catch (error) {
            console.error("Error creating playlist record:", error);
            return null;
        }
    };

    // Load tracks from a saved playlist
    const loadPlaylistTracks = async (playlistId) => {
        if (!playlistId || !userId) return null;
        
        try {
            const { data: likedTracks, error } = await supabase
                .from('liked_tracks')
                .select('*')
                .eq('playlist_id', playlistId)
                .eq('user_id', userId);
                
            if (error) throw error;
            
            if (!likedTracks || likedTracks.length === 0) {
                throw new Error("No tracks found in this playlist");
            }
            
            console.log(`Loaded ${likedTracks.length} tracks from playlist ${playlistId}`);
            
            // Format tracks to match expected structure
            const formattedTracks = likedTracks.map(track => ({
                id: track.track_id,
                title: track.track_title,
                artist: track.track_artist,
                preview: track.track_preview,
                img: track.track_img,
                liked: true // All tracks in a saved playlist are liked by default
            }));
            
            return formattedTracks;
        } catch (error) {
            console.error("Error loading playlist tracks:", error);
            return null;
        }
    };

    // Fetch tracks from Deezer (or fallback) or load from saved playlist
    useEffect(() => {
        if (!emotion || !genre) return;
        
        const fetchTracks = async () => {
            try {
                setIsLoading(true);
                
                // If a playlist ID is provided, load tracks from that playlist
                if (selectedPlaylistId && userId) {
                    console.log(`Loading tracks from saved playlist: ${selectedPlaylistId}`);
                    const savedTracks = await loadPlaylistTracks(selectedPlaylistId);
                    
                    if (savedTracks && savedTracks.length > 0) {
                        setTracks(savedTracks);
                        setPlaylistId(selectedPlaylistId);
                        setIsLoading(false);
                        return;
                    }
                }
                
                // Otherwise fetch new tracks
                console.log(`Fetching tracks for emotion: ${emotion}, genre: ${genre}`);
                
                // Fetch tracks from the API
                const fetchedTracks = await fetchPlaylistTracks(emotion, genre);
                
                // Check if we received valid tracks
                if (!fetchedTracks || fetchedTracks.length === 0) {
                    throw new Error("No tracks found for the selected emotion and genre");
                }
                
                console.log(`Received ${fetchedTracks.length} tracks`);
                
                // Process tracks
                const processedTracks = fetchedTracks.map(track => ({
                    ...track,
                    liked: false // Set initial liked state to false
                }));
                
                setTracks(processedTracks);
                
                // If user is logged in, save this playlist to their account
                if (userId && !selectedPlaylistId) { // Only create a new playlist if not loading an existing one
                    const newPlaylistId = await createPlaylistRecord(userId, processedTracks);
                    setPlaylistId(newPlaylistId);
                }
            } catch (error) {
                console.error("Error fetching/loading tracks:", error);
                
                setError({
                    message: "Error getting tracks",
                    details: error.message || "There was a problem fetching tracks. Please try again or select a different genre.",
                    isDismissible: true
                });
            } finally {
                setIsLoading(false);
            }
        };

        // Execute the fetch
        fetchTracks();
    }, [emotion, genre, userId, refreshTrigger, selectedPlaylistId]);

    // Add listener for global stop audio event
    useEffect(() => {
        const handleAppReset = () => {
            console.log("MusicRecommendation: Received stop-all-audio event");
            setIsLoading(false); // Ensure loading is complete when navigating
        };
        
        window.addEventListener('app:stop-all-audio', handleAppReset);
        
        return () => {
            window.removeEventListener('app:stop-all-audio', handleAppReset);
            // Also ensure audio is stopped when component unmounts
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        };
    }, []);

    return (
        <div className="music-recommendations-container">
            {isLoading ? (
                <LoadingScreen onBackClick={onBackClick} />
            ) : (
                <PlaylistRecommendation
                    emotion={emotion}
                    genre={genre}
                    tracks={tracks}
                    userId={userId}
                    onBackClick={onBackClick}
                    isLoggedIn={!!session}
                    onRegenerate={handleRegenerate}
                    playlistId={playlistId || selectedPlaylistId}
                />
            )}
            
            {error && (
                <div className="notice-message">
                    <span>{error.message || error}</span>
                    {error.details && (
                        <p>{error.details}</p>
                    )}
                    {error.isDismissible && (
                        <button onClick={() => setError(null)}>Dismiss</button>
                    )}
                </div>
            )}
        </div>
    );
}

export default MusicRecommendations;