import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import EmotionInput from "./EmotionInput";
import MusicRecommendations from "./MusicRecommendation";
import Login from "./Auth/Login";
import Register from "./Auth/Register";
import PasswordReset from "./Auth/PasswordReset";
import GenreSelection from "./GenreSelection";
import UserProfile from "./UserProfile";
import { supabase } from "./supabaseClient";
import { FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaMusic, FaArrowLeft, FaHistory, FaCamera } from 'react-icons/fa';

// App.jsx
function App() {
    const [selectedEmotion, setSelectedEmotion] = useState(null);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [session, setSession] = useState(null);
    const [authView, setAuthView] = useState('login'); // 'login' or 'register'
    const [showAuth, setShowAuth] = useState(false); // Whether to show auth screens
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [userHistory, setUserHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showProfile, setShowProfile] = useState(false); // Whether to show user profile
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(null); // For loading a saved playlist
    const [resetToken, setResetToken] = useState(null);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [resetStep, setResetStep] = useState(null);
    const profileMenuRef = useRef(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef(null);

    // Navigation bar with profile menu - MOVED UP before it's used
    const renderNavBar = () => (
        <div className="nav-bar">
            <div className="nav-title">
                {(selectedEmotion || selectedGenre || showProfile || resetToken || showPasswordReset) && (
                    <button 
                        onClick={handleBackClick} 
                        className="global-back-button"
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            marginRight: "10px",
                            display: "flex",
                            alignItems: "center",
                            fontSize: "16px"
                        }}
                    >
                        <FaArrowLeft style={{ marginRight: "5px" }} /> Back
                    </button>
                )}
                <span style={{ fontWeight: 'bold' }}>MOOD TU</span>
                <span className="music-symbol">
                    <FaMusic />
                </span>
                <span style={{ fontWeight: 'bold' }}>EZ</span>
            </div>
            <div className="nav-profile" ref={profileMenuRef}>
                <button 
                    className="profile-icon-button" 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    style={{
                        background: session?.user?.user_metadata?.avatar_url ? "transparent" : "rgba(255, 255, 255, 0.1)",
                        border: session?.user?.user_metadata?.avatar_url ? "2px solid #bb86fc" : "none",
                        color: "white",
                        padding: session?.user?.user_metadata?.avatar_url ? "0" : "8px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        width: "40px",
                        height: "40px",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {session?.user?.user_metadata?.avatar_url ? (
                        <img 
                            src={session.user.user_metadata.avatar_url} 
                            alt="Profile" 
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "50%"
                            }}
                        />
                    ) : (
                        <FaUser />
                    )}
                </button>
                
                {showProfileMenu && (
                    <div className="profile-menu">
                        {session ? (
                            <>
                                <div className="profile-menu-email">{session.user.email}</div>
                                <button 
                                    className="profile-menu-item" 
                                    onClick={() => {
                                        setShowProfileMenu(false);
                                        setShowProfile(true);
                                        setSelectedEmotion(null);
                                        setSelectedGenre(null);
                                    }}
                                >
                                    <FaHistory /> My Profile
                                </button>
                                <button 
                                    className="profile-menu-item" 
                                    onClick={handleLogout}
                                >
                                    <FaSignOutAlt /> Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    className="profile-menu-item"
                                    onClick={() => {
                                        setAuthView('login');
                                        setShowAuth(true);
                                        setShowProfileMenu(false);
                                    }}
                                >
                                    <FaSignInAlt /> Login
                                </button>
                                <button 
                                    className="profile-menu-item"
                                    onClick={() => {
                                        setAuthView('register');
                                        setShowAuth(true);
                                        setShowProfileMenu(false);
                                    }}
                                >
                                    <FaUserPlus /> Register
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    useEffect(() => {
        // Check if URL contains reset password intent
        const url = new URL(window.location.href);
        const type = url.searchParams.get('type');
        const hash = window.location.hash;
        
        console.log("URL check for reset:", { url: window.location.href, type, hash });
        
        // Check for reset token in hash (Supabase format)
        if (hash && hash.includes('type=recovery') || hash.includes('access_token=')) {
            console.log("Password reset token detected in hash");
            setShowPasswordReset(true);
            setResetStep('password');
            
            // Don't clean URL here as the token is needed for the reset
        }
        // Also check query param for our custom redirect
        else if (type === 'recovery') {
            console.log("Password reset requested via query param");
            setShowPasswordReset(true);
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                // Load user history once authenticated
                loadUserHistory(session.user.id);
            }
        });

        // Setup auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                if (session?.user) {
                    // Load user history when authentication state changes
                    loadUserHistory(session.user.id);
                } else {
                    // Clear history if logged out
                    setUserHistory([]);
                }
            }
        );

        // Add event listener to close profile menu when clicking outside
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            subscription.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Load user history from Supabase
    const loadUserHistory = async (userId) => {
        if (!userId) return;
        
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('user_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);
                
            if (error) throw error;
            
            setUserHistory(data || []);
        } catch (error) {
            console.error("Error loading user history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Record user selection in history
    const recordUserSelection = async (emotion, genre) => {
        if (!session?.user?.id) return;
        
        try {
            const { error } = await supabase
                .from('user_history')
                .insert([
                    {
                        user_id: session.user.id,
                        emotion: emotion,
                        genre: genre,
                        created_at: new Date()
                    }
                ]);
                
            if (error) throw error;
            
            // Refresh history
            loadUserHistory(session.user.id);
        } catch (error) {
            console.error("Error recording user selection:", error);
        }
    };

    const handleBackClick = () => {
        // Stop any audio that might be playing - use a more thorough approach
        try {
            // Stop all HTML audio elements
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
                try { audio.src = ''; } catch(e) { /* ignore */ }
            });
            
            // Dispatch global event to ensure any component with audio stops playback
            window.dispatchEvent(new CustomEvent('app:stop-all-audio'));
            
            console.log("Stopped all audio playback");
        } catch (e) {
            console.error("Error stopping audio:", e);
        }

        // Then handle navigation
        if (showPasswordReset) {
            setShowPasswordReset(false);
        } else if (resetToken) {
            setResetToken(null);
        } else if (showProfile) {
            setShowProfile(false);
            setSelectedPlaylistId(null);
        } else if (selectedGenre) {
            setSelectedGenre(null);
        } else if (selectedEmotion) {
            setSelectedEmotion(null);
        } else if (showAuth) {
            setShowAuth(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setShowProfileMenu(false);
        // Reset states
        setSelectedEmotion(null);
        setSelectedGenre(null);
        setUserHistory([]);
        setShowProfile(false);
    };

    const toggleAuthView = () => {
        setAuthView(authView === 'login' ? 'register' : 'login');
    };

    const handleEmotionGenreSelection = (emotion, genre) => {
        setSelectedEmotion(emotion);
        setSelectedGenre(genre);
        
        // Record this selection in user history if logged in
        if (session?.user) {
            recordUserSelection(emotion, genre);
        }
    };

    const handleSelectPlaylist = async (playlistId) => {
        try {
            setIsLoadingHistory(true);
            
            // Get playlist info to set emotion and genre
            const { data: playlist, error } = await supabase
                .from('saved_playlists')
                .select('*')
                .eq('id', playlistId)
                .single();
                
            if (error) throw error;
            
            if (playlist) {
                setSelectedEmotion(playlist.emotion);
                setSelectedGenre(playlist.genre);
                setSelectedPlaylistId(playlistId);
                setShowProfile(false);
            }
        } catch (error) {
            console.error("Error selecting playlist:", error);
            alert("Failed to load the selected playlist. Please try again.");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Show password reset form
    if (showPasswordReset) {
        return (
            <>
                {renderNavBar()}
                <div className="page-container with-nav">
                    <PasswordReset 
                        initialStep={resetStep || 'email'}
                        onSuccess={() => {
                            console.log("Password reset successful, returning to login");
                            setShowPasswordReset(false);
                            setResetStep(null);
                            setAuthView('login');
                            setShowAuth(true); // Show the auth modal with login view
                        }}
                        onCancel={() => {
                            console.log("Password reset cancelled");
                            setShowPasswordReset(false);
                            setResetStep(null);
                            // Clean URL if canceling from reset form
                            if (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token='))) {
                                window.history.replaceState({}, document.title, window.location.pathname);
                            }
                        }}
                    />
                </div>
            </>
        );
    }

    // Show authentication screens if requested
    if (showAuth) {
        return (
            <>
                <div className="nav-bar">
                    <div className="nav-title">
                        <button 
                            onClick={handleBackClick} 
                            className="global-back-button"
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                marginRight: "10px",
                                display: "flex",
                                alignItems: "center",
                                fontSize: "16px"
                            }}
                        >
                            <FaArrowLeft style={{ marginRight: "5px" }} /> Back
                        </button>
                        <span style={{ fontWeight: 'bold' }}>MOOD TU</span>
                        <span className="music-symbol">
                            <FaMusic />
                        </span>
                        <span style={{ fontWeight: 'bold' }}>EZ</span>
                    </div>
                    <div className="nav-profile" ref={profileMenuRef}>
                        <button 
                            className="profile-icon-button" 
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            style={{
                                background: session?.user?.user_metadata?.avatar_url ? "transparent" : "rgba(255, 255, 255, 0.1)",
                                border: session?.user?.user_metadata?.avatar_url ? "2px solid #bb86fc" : "none",
                                color: "white",
                                padding: session?.user?.user_metadata?.avatar_url ? "0" : "8px",
                                borderRadius: "50%",
                                cursor: "pointer",
                                width: "40px",
                                height: "40px",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            {session?.user?.user_metadata?.avatar_url ? (
                                <img 
                                    src={session.user.user_metadata.avatar_url} 
                                    alt="Profile" 
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%"
                                    }}
                                />
                            ) : (
                                <FaUser />
                            )}
                        </button>
                    </div>
                </div>
                <div className="page-container with-nav">
                    {authView === 'login' ? (
                        <Login 
                            toggleView={toggleAuthView} 
                            onForgotPassword={() => {
                                setShowAuth(false);
                                setShowPasswordReset(true);
                            }}
                            onSuccess={() => {
                                setShowAuth(false);
                                console.log("Login successful, navigating to main menu");
                            }}
                        />
                    ) : (
                        <Register toggleView={toggleAuthView} />
                    )}
                </div>
            </>
        );
    }

    // Show user profile if requested
    if (showProfile) {
        return (
            <>
                {renderNavBar()}
                <div className="page-container with-nav" style={{ padding: '20px', color: 'white' }}>
                    <div style={{ 
                        backgroundColor: "#222", 
                        padding: "30px", 
                        borderRadius: "8px",
                        marginBottom: "20px",
                        textAlign: "center"
                    }}>
                        <h2>Your Profile</h2>
                        
                        {session && session.user ? (
                            <div>
                                {/* Simple profile picture display */}
                                <div style={{ 
                                    width: "150px",
                                    height: "150px",
                                    margin: "20px auto",
                                    borderRadius: "50%",
                                    border: "3px solid #bb86fc",
                                    overflow: "hidden",
                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    {session.user.user_metadata?.avatar_url ? (
                                        <img 
                                            src={session.user.user_metadata.avatar_url} 
                                            alt="Profile" 
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover"
                                            }}
                                        />
                                    ) : (
                                        <FaUser style={{ fontSize: "60px", color: "white" }} />
                                    )}
                                </div>
                                
                                {/* Basic file input for profile picture */}
                                <div style={{ margin: "20px 0" }}>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            
                                            // Basic validation
                                            if (!file.type.startsWith('image/')) {
                                                alert("Please select an image file");
                                                return;
                                            }
                                            
                                            // Simple file size check
                                            if (file.size > 2 * 1024 * 1024) {
                                                alert("File size should be less than 2MB");
                                                return;
                                            }
                                            
                                            // Create a simple upload function
                                            const uploadPicture = async () => {
                                                try {
                                                    console.log("Starting simple upload approach...");
                                                    
                                                    // First convert the selected file to a data URL that we can use directly
                                                    const reader = new FileReader();
                                                    
                                                    // Create a promise to handle the FileReader async operation
                                                    const readFileAsDataURL = (file) => {
                                                        return new Promise((resolve, reject) => {
                                                            reader.onload = () => resolve(reader.result);
                                                            reader.onerror = () => reject(reader.error);
                                                            reader.readAsDataURL(file);
                                                        });
                                                    };
                                                    
                                                    // Get the data URL from the file
                                                    const dataUrl = await readFileAsDataURL(file);
                                                    console.log("File converted to data URL");
                                                    
                                                    // Store the image URL directly in the user's metadata without using Storage
                                                    const { error: updateError } = await supabase.auth.updateUser({
                                                        data: { 
                                                            avatar_url: dataUrl
                                                        }
                                                    });
                                                    
                                                    if (updateError) {
                                                        throw updateError;
                                                    }
                                                    
                                                    // Refresh session to see the change
                                                    const { data: { session: newSession } } = await supabase.auth.getSession();
                                                    setSession(newSession);
                                                    
                                                    alert("Profile picture updated successfully!");
                                                } catch (error) {
                                                    console.error("Error uploading picture:", error);
                                                    alert("Failed to upload picture: " + error.message);
                                                }
                                            };
                                            
                                            // Call the upload function
                                            uploadPicture();
                                        }}
                                    />
                                    <p style={{ fontSize: "14px", color: "#bb86fc", marginTop: "5px" }}>
                                        Select a file to update your profile picture
                                    </p>
                                </div>
                                
                                <div style={{ 
                                    padding: "20px",
                                    backgroundColor: "#333",
                                    borderRadius: "8px",
                                    maxWidth: "500px",
                                    margin: "20px auto",
                                    textAlign: "left"
                                }}>
                                    <h3>Account Information</h3>
                                    <p><strong>Email:</strong> {session.user.email}</p>
                                    <p><strong>User ID:</strong> {session.user.id}</p>
                                    <p><strong>Created:</strong> {new Date(session.user.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ) : (
                            <p>You need to be logged in to view your profile.</p>
                        )}
                        
                        <button 
                            onClick={handleBackClick} 
                            style={{
                                marginTop: "20px",
                                backgroundColor: "#bb86fc",
                                border: "none",
                                padding: "10px 20px",
                                borderRadius: "4px",
                                color: "black",
                                fontWeight: "bold",
                                cursor: "pointer"
                            }}
                        >
                            Back to Main Menu
                        </button>
                    </div>
                </div>
            </>
        );
    }

    const renderUserHistory = () => {
        if (isLoadingHistory) {
            return <div className="loading-history">Loading your history...</div>;
        }
        
        if (userHistory.length === 0) {
            return <div className="empty-history">You haven't created any playlists yet.</div>;
        }
        
        return (
            <div className="history-container">
                <h2>Your Recent Selections</h2>
                <div className="history-items">
                    {userHistory.map((item, index) => (
                        <div 
                            key={index} 
                            className="history-item"
                            onClick={() => handleEmotionGenreSelection(item.emotion, item.genre)}
                        >
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

    // Add error boundary to prevent white screen
    class ErrorBoundary extends React.Component {
        constructor(props) {
            super(props);
            this.state = { hasError: false, error: null, errorInfo: null };
        }
        
        componentDidCatch(error, errorInfo) {
            // Update state with the error details
            this.setState({ hasError: true, error, errorInfo });
            
            // Log the error with additional context from props
            console.error("React Error Boundary caught an error:", error, errorInfo);
            console.log("Error occurred with context:", {
                selectedEmotion: this.props.selectedEmotion,
                selectedGenre: this.props.selectedGenre,
                sessionActive: this.props.session ? true : false
            });
        }
        
        render() {
            if (this.state.hasError) {
                return (
                    <div className="error-boundary">
                        <h2>Something went wrong in the app</h2>
                        <p>We encountered an error processing your request. Please try the following:</p>
                        <ul>
                            <li>Reload the page to restart the app</li>
                            <li>Clear your browser cache and cookies</li>
                            <li>Try selecting a different genre or emotion</li>
                        </ul>
                        <button onClick={() => window.location.reload()}>Reload App</button>
                        <details>
                            <summary>Technical Error Details</summary>
                            <div className="error-info">
                                <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
                                {this.state.error && this.state.error.message && (
                                    <p><strong>Message:</strong> {this.state.error.message}</p>
                                )}
                                <p><strong>Component Stack:</strong></p>
                                <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                                <p><strong>Context:</strong></p>
                                <pre>
                                    Emotion: {this.props.selectedEmotion || 'Not selected'}<br />
                                    Genre: {this.props.selectedGenre || 'Not selected'}<br />
                                    Session: {this.props.session ? 'Active' : 'Not active'}
                                </pre>
                            </div>
                        </details>
                    </div>
                );
            }
            
            return this.props.children;
        }
    }

    return (
        <>
            {renderNavBar()}
            
            <ErrorBoundary 
                selectedEmotion={selectedEmotion}
                selectedGenre={selectedGenre}
                session={session}
            >
                {!selectedEmotion ? (
                    <div className="page-container with-nav">
                        {session && !isLoadingHistory && userHistory.length > 0 ? (
                            renderUserHistory()
                        ) : (
                            <EmotionInput onEmotionSubmit={setSelectedEmotion} />
                        )}
                    </div>
                ) : !selectedGenre ? (
                    <div className="black-background with-nav">
                        <GenreSelection 
                            emotion={selectedEmotion} 
                            onGenreSubmit={(genre) => {
                                console.log("Genre selected:", genre);
                                try {
                                    if (!genre) {
                                        console.error("Selected genre is null or undefined");
                                        alert("Invalid genre selection. Please try again.");
                                        return;
                                    }

                                    // Validate that it's one of the expected genres
                                    const validGenres = ["hip-hop", "rock", "country", "edm", "pop"];
                                    if (!validGenres.includes(genre)) {
                                        console.warn("Unexpected genre value:", genre);
                                    }

                                    // Set the genre state
                                    setSelectedGenre(genre);
                                    
                                    // Record this selection in user history if logged in
                                    if (session?.user) {
                                        recordUserSelection(selectedEmotion, genre);
                                    }
                                } catch (err) {
                                    console.error("Error setting genre:", err);
                                    alert("Error selecting genre. Please try again.");
                                }
                            }} 
                            onBackClick={handleBackClick}
                        />
                    </div>
                ) : (
                    <div className="black-background with-nav">
                        <MusicRecommendations
                            key={`${selectedEmotion}-${selectedGenre}-${Date.now()}`}
                            emotion={selectedEmotion}
                            genre={selectedGenre}
                            onBackClick={handleBackClick}
                            session={session}
                        />
                    </div>
                )}
            </ErrorBoundary>
        </>
    );
}

export default App;