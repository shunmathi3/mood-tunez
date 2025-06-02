import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { FaMusic, FaPlay, FaSpinner, FaList, FaHistory, FaCamera, FaUser, FaCheck, FaTimes } from 'react-icons/fa';
import './App.css';

function UserProfile({ session, onBackClick, onSelectPlaylist }) {
    const [playlists, setPlaylists] = useState([]);
    const [likedTracks, setLikedTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'playlists', or 'history'
    const [error, setError] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef(null);

    // Debug logging for component mounting and session
    console.log("UserProfile component rendering", { 
        sessionExists: !!session,
        userId: session?.user?.id,
        hasUserMetadata: !!session?.user?.user_metadata
    });

    useEffect(() => {
        console.log("UserProfile useEffect running", { 
            sessionExists: !!session,
            userId: session?.user?.id
        });

        if (!session?.user) {
            console.error("No session or user found");
            setError("You must be logged in to view your profile");
            setIsLoading(false);
            return;
        }
        
        // Set the avatar URL from user metadata if available
        if (session.user.user_metadata?.avatar_url) {
            console.log("Found avatar URL in user metadata:", session.user.user_metadata.avatar_url);
            setAvatarUrl(session.user.user_metadata.avatar_url);
        } else {
            console.log("No avatar URL found in user metadata");
        }
        
        loadUserData();
    }, [session]);

    const loadUserData = async () => {
        setIsLoading(true);
        try {
            console.log("Loading user data for ID:", session.user.id);
            
            // Try a simple test query first to verify database connection
            const { data: testData, error: testError } = await supabase
                .from('user_history')
                .select('count(*)')
                .eq('user_id', session.user.id)
                .single();
                
            if (testError) {
                console.error("Test query error:", testError);
                throw new Error("Could not connect to database: " + testError.message);
            }
            
            console.log("Database connection test successful:", testData);
            
            // Load user's playlists
            const { data: playlistsData, error: playlistsError } = await supabase
                .from('saved_playlists')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
                
            if (playlistsError) {
                console.error("Error loading playlists:", playlistsError);
                throw playlistsError;
            }
            
            console.log("Loaded playlists:", playlistsData?.length || 0);
            setPlaylists(playlistsData || []);
            
            // Load user's liked tracks that aren't associated with a playlist
            const { data: tracksData, error: tracksError } = await supabase
                .from('liked_tracks')
                .select('*')
                .eq('user_id', session.user.id)
                .is('playlist_id', null)
                .order('created_at', { ascending: false });
                
            if (tracksError) {
                console.error("Error loading liked tracks:", tracksError);
                throw tracksError;
            }
            
            console.log("Loaded liked tracks:", tracksData?.length || 0);
            setLikedTracks(tracksData || []);
            
            // Load user's history
            const { data: historyData, error: historyError } = await supabase
                .from('user_history')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(20);
                
            if (historyError) {
                console.error("Error loading user history:", historyError);
                throw historyError;
            }
            
            console.log("Loaded user history:", historyData?.length || 0);
            setUserHistory(historyData || []);
        } catch (error) {
            console.error("Error loading user data:", error);
            setError("Failed to load your profile data: " + (error.message || "Unknown error"));
        } finally {
            setIsLoading(false);
            console.log("Finished loading user data");
        }
    };

    const handlePlayPlaylist = (playlistId) => {
        if (onSelectPlaylist) {
            onSelectPlaylist(playlistId);
        }
    };

    const handleAvatarClick = () => {
        // Trigger file input click
        if (fileInputRef.current) {
            fileInputRef.current.click();
        } else {
            console.error("File input ref is not available");
        }
    };

    const handleFileChange = async (e) => {
        // Get the selected file
        const file = e.target.files?.[0];
        if (!file) {
            console.log("No file selected");
            return;
        }

        console.log("File selected:", { name: file.name, type: file.type, size: file.size });

        // Check file type
        if (!file.type.startsWith('image/')) {
            setUploadError("Please select an image file");
            return;
        }

        // Check file size (limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setUploadError("File size exceeds 2MB limit");
            return;
        }

        setUploadingAvatar(true);
        setUploadError(null);
        setUploadSuccess(false);

        try {
            // Upload file to Supabase Storage
            const fileName = `avatar-${session.user.id}-${Date.now()}`;
            console.log("Uploading file to Supabase storage:", fileName);
            
            const { data, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error("Upload error:", uploadError);
                throw uploadError;
            }

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            console.log("File uploaded successfully, public URL:", publicUrl);

            // Update user metadata with the new avatar URL
            console.log("Updating user metadata with new avatar URL");
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) {
                console.error("User metadata update error:", updateError);
                throw updateError;
            }

            console.log("User metadata updated successfully");
            // Update local state
            setAvatarUrl(publicUrl);
            setUploadSuccess(true);
            
            // Show success message for 3 seconds
            setTimeout(() => {
                setUploadSuccess(false);
            }, 3000);

        } catch (error) {
            console.error("Error uploading avatar:", error);
            setUploadError("Failed to upload image: " + (error.message || "Unknown error"));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const renderPlaylists = () => {
        if (playlists.length === 0) {
            return (
                <div className="empty-playlists">
                    <p>You haven't saved any playlists yet.</p>
                    <p>When you generate playlists, they'll automatically be saved here!</p>
                </div>
            );
        }
        
        return (
            <div className="user-playlists">
                {playlists.map(playlist => (
                    <div key={playlist.id} className="playlist-card">
                        <div className="playlist-card-header">
                            <h3>{playlist.name}</h3>
                            <span className="playlist-date">
                                {new Date(playlist.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="playlist-card-content">
                            <div className="playlist-emotion-genre">
                                <span className="playlist-emotion">{playlist.emotion}</span>
                                <span className="playlist-genre">{playlist.genre}</span>
                            </div>
                            <button 
                                className="play-playlist-button"
                                onClick={() => handlePlayPlaylist(playlist.id)}
                            >
                                <FaPlay /> Play
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderLikedTracks = () => {
        if (likedTracks.length === 0) {
            return (
                <div className="empty-liked-tracks">
                    <p>You haven't liked any individual tracks yet.</p>
                    <p>Like tracks to create your custom playlists!</p>
                </div>
            );
        }
        
        return (
            <div className="user-liked-tracks">
                <h3>Your Liked Tracks</h3>
                <div className="tracks-list">
                    {likedTracks.map(track => (
                        <div key={track.id} className="liked-track-item">
                            <img 
                                src={track.track_img} 
                                alt={track.track_title} 
                                className="liked-track-image"
                                onError={(e) => {
                                    e.target.src = 'https://placehold.co/50x50?text=No+Image';
                                }}
                            />
                            <div className="liked-track-info">
                                <div className="liked-track-title">{track.track_title}</div>
                                <div className="liked-track-artist">{track.track_artist}</div>
                            </div>
                            <div className="liked-track-meta">
                                <div className="liked-track-emotion">{track.emotion}</div>
                                <div className="liked-track-genre">{track.genre}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderHistory = () => {
        if (userHistory.length === 0) {
            return (
                <div className="empty-history">
                    <p>Your listening history will appear here.</p>
                </div>
            );
        }
        
        return (
            <div className="user-history">
                <h3>Your Listening History</h3>
                <div className="history-items">
                    {userHistory.map((item, index) => (
                        <div key={index} className="history-item">
                            <div className="history-emotion">{item.emotion}</div>
                            <div className="history-genre">{item.genre}</div>
                            <div className="history-date">
                                {new Date(item.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderProfileSettings = () => {
        return (
            <div className="profile-settings-container">
                <div className="profile-avatar-section">
                    <div 
                        className="profile-avatar-wrapper"
                        onClick={handleAvatarClick}
                        style={{
                            position: "relative",
                            width: "150px",
                            height: "150px",
                            margin: "0 auto 20px",
                            borderRadius: "50%",
                            border: "3px solid #bb86fc",
                            overflow: "hidden",
                            cursor: "pointer",
                            backgroundColor: "rgba(255, 255, 255, 0.1)"
                        }}
                    >
                        {avatarUrl ? (
                            <img 
                                src={avatarUrl} 
                                alt="Profile" 
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover"
                                }}
                                onError={(e) => {
                                    console.error("Error loading avatar image");
                                    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"><path fill="%23FFFFFF" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 10c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z"/></svg>';
                                }}
                            />
                        ) : (
                            <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                width: "100%",
                                height: "100%",
                                fontSize: "50px",
                                color: "white"
                            }}>
                                <FaUser />
                            </div>
                        )}
                        <div 
                            className="avatar-upload-overlay"
                            style={{
                                position: "absolute",
                                bottom: "0",
                                left: "0",
                                right: "0",
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                color: "white",
                                padding: "8px 0",
                                textAlign: "center",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <FaCamera style={{ marginRight: "5px" }} /> Change
                        </div>
                    </div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    
                    {uploadingAvatar && (
                        <div className="upload-status">
                            <FaSpinner className="spinner-icon" /> Uploading...
                        </div>
                    )}
                    
                    {uploadError && (
                        <div className="upload-error">
                            <FaTimes style={{ marginRight: "5px", color: "#ff4d4d" }} /> {uploadError}
                        </div>
                    )}
                    
                    {uploadSuccess && (
                        <div className="upload-success">
                            <FaCheck style={{ marginRight: "5px", color: "#4caf50" }} /> Profile picture updated!
                        </div>
                    )}
                    
                    <div className="profile-info">
                        <h3>{session?.user?.email || "User"}</h3>
                        <p>User since {session?.user?.created_at ? new Date(session.user.created_at).toLocaleDateString() : "Unknown"}</p>
                    </div>
                </div>
            </div>
        );
    };

    // If there's an error rendering the component, show an error boundary
    if (error) {
        return (
            <div className="profile-error">
                <p>{error}</p>
                <button onClick={onBackClick} className="back-button">Go Back</button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="profile-loading">
                <FaSpinner className="spinner-icon" />
                <p>Loading your profile...</p>
            </div>
        );
    }

    // Try-catch around the entire render to prevent white screen on errors
    try {
        return (
            <div className="user-profile-container">
                <div className="profile-header">
                    <button onClick={onBackClick} className="profile-back-button">
                        ← Back
                    </button>
                    <h2>Your Profile</h2>
                    <div className="profile-email">{session?.user?.email || "User"}</div>
                </div>
                
                <div className="profile-tabs">
                    <button 
                        className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <FaUser /> Profile
                    </button>
                    <button 
                        className={`profile-tab ${activeTab === 'playlists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('playlists')}
                    >
                        <FaList /> Playlists & Liked Tracks
                    </button>
                    <button 
                        className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <FaHistory /> History
                    </button>
                </div>
                
                <div className="profile-content">
                    {activeTab === 'profile' ? (
                        renderProfileSettings()
                    ) : activeTab === 'playlists' ? (
                        <>
                            {renderPlaylists()}
                            {renderLikedTracks()}
                        </>
                    ) : (
                        renderHistory()
                    )}
                </div>
            </div>
        );
    } catch (err) {
        console.error("Error rendering UserProfile component:", err);
        return (
            <div className="profile-error">
                <p>Something went wrong while displaying your profile. Please try again.</p>
                <p>Error details: {err.message}</p>
                <button onClick={onBackClick} className="back-button">Go Back</button>
            </div>
        );
    }
}

export default UserProfile; 