import React, { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";
import { FaMusic } from "react-icons/fa";

// Create styled SVG play/pause icons
const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{
        filter: "drop-shadow(0 0 3px rgba(156, 39, 176, 0.8))"
    }}>
        <path d="M8 5v14l11-7z" fill="#9c27b0" />
        <path d="M8 5v14l11-7z" fill="white" fillOpacity="0.3" />
    </svg>
);

const PauseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{
        filter: "drop-shadow(0 0 3px rgba(156, 39, 176, 0.8))"
    }}>
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="#9c27b0" />
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="white" fillOpacity="0.3" />
    </svg>
);

function PlaylistRecommendation({ tracks, emotion, genre, userId, onBackClick, isLoggedIn, onRegenerate, playlistId }) {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.7); // Default volume at 70%
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    const [localTracks, setLocalTracks] = useState(tracks || []);
    const [allReviewed, setAllReviewed] = useState(false);
    const [showFinalPlaylist, setShowFinalPlaylist] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playerColor, setPlayerColor] = useState("#181818");
    const [playerTextColor, setPlayerTextColor] = useState("white");
    const audioRef = useRef(new Audio());
    const volumeControlRef = useRef(null);
    const playerVolumeControlRef = useRef(null);
    const [showPlayerVolumeControl, setShowPlayerVolumeControl] = useState(false);
    const canvasRef = useRef(document.createElement('canvas'));
    
    // Just display the tracks without focusing on playback
    console.log(`PlaylistRecommendation received ${tracks?.length} tracks`);
    
    // Initialize local tracks when tracks prop changes
    useEffect(() => {
        if (tracks && tracks.length > 0) {
            setLocalTracks(tracks);
            setAllReviewed(false);
            setShowFinalPlaylist(false);
        }
    }, [tracks]);
    
    // Extract dominant color from album artwork
    const extractDominantColor = (imageUrl, callback) => {
        if (!imageUrl) {
            callback("#181818", "white");
            return;
        }
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                let r = 0, g = 0, b = 0;
                let pixelCount = 0;
                
                // Sample pixels to get average color
                for (let i = 0; i < data.length; i += 16) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    pixelCount++;
                }
                
                // Calculate average color
                r = Math.floor(r / pixelCount);
                g = Math.floor(g / pixelCount);
                b = Math.floor(b / pixelCount);
                
                // Darken the color for better readability
                const darkenFactor = 0.7;
                r = Math.floor(r * darkenFactor);
                g = Math.floor(g * darkenFactor);
                b = Math.floor(b * darkenFactor);
                
                const color = `rgb(${r}, ${g}, ${b})`;
                
                // Calculate brightness to determine text color
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                const textColor = brightness > 128 ? "black" : "white";
                
                callback(color, textColor);
            } catch (error) {
                console.error("Error extracting color:", error);
                callback("#181818", "white");
            }
        };
        
        img.onerror = () => {
            console.error("Error loading image for color extraction");
            callback("#181818", "white");
        };
        
        img.src = imageUrl;
    };
    
    // Update color when track changes
    useEffect(() => {
        if (localTracks && localTracks.length > 0 && localTracks[currentTrackIndex]) {
            const currentTrack = localTracks[currentTrackIndex];
            if (currentTrack.img) {
                extractDominantColor(currentTrack.img, (color, textColor) => {
                    setPlayerColor(color);
                    setPlayerTextColor(textColor);
                });
            } else {
                setPlayerColor("#181818");
                setPlayerTextColor("white");
            }
        }
    }, [currentTrackIndex, localTracks]);
    
    // Check if all tracks have been visited
    useEffect(() => {
        if (localTracks.length > 0) {
            const allVisited = localTracks.every(track => track.hasOwnProperty('liked'));
            setAllReviewed(allVisited);
        }
    }, [localTracks]);
    
    // Handle audio playback and time updates
    useEffect(() => {
        const audio = audioRef.current;
        
        // Set up the audio source when track changes
        if (localTracks && localTracks.length > 0 && localTracks[currentTrackIndex]) {
            const currentTrack = localTracks[currentTrackIndex];
            console.log(`Loading track: ${currentTrack.title}`);
            
            // Only update the source if it's different
            if (audio.src !== currentTrack.preview) {
                audio.src = currentTrack.preview;
                audio.load();
                setCurrentTime(0);
            }
            
            // Play or pause based on isPlaying state
            if (isPlaying) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Audio playback error:", error);
                        setIsPlaying(false);
                    });
                }
            } else {
                audio.pause();
            }

            // Set up time update event
            const handleTimeUpdate = () => {
                setCurrentTime(audio.currentTime);
                if (!duration && audio.duration) {
                    setDuration(audio.duration);
                }
            };

            // Set up ended event
            const handleEnded = () => {
                if (currentTrackIndex < localTracks.length - 1) {
                    // Go to next track
                    setCurrentTrackIndex(currentTrackIndex + 1);
                } else {
                    // End of playlist
                    setIsPlaying(false);
                    setCurrentTime(0);
                }
            };
            
            // Handle global stop event
            const handleGlobalStop = () => {
                console.log("Audio playback: Received stop-all-audio event");
                audio.pause();
                audio.currentTime = 0;
                setIsPlaying(false);
                setCurrentTime(0);
            };

            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('ended', handleEnded);
            audio.addEventListener('loadedmetadata', () => {
                setDuration(audio.duration || 0);
            });
            window.addEventListener('app:stop-all-audio', handleGlobalStop);
            
            // Clean up event listeners
            return () => {
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('loadedmetadata', () => {});
                window.removeEventListener('app:stop-all-audio', handleGlobalStop);
                audio.pause();
                audio.currentTime = 0;
            };
        }
        
        return () => {
            audio.pause();
            audio.currentTime = 0;
        };
    }, [currentTrackIndex, isPlaying, localTracks, duration]);
    
    // Handle volume changes
    useEffect(() => {
        const audio = audioRef.current;
        audio.volume = volume;
    }, [volume]);
    
    // Close volume control when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (volumeControlRef.current && !volumeControlRef.current.contains(event.target) && 
                !event.target.classList.contains('volume-button')) {
                setShowVolumeControl(false);
            }
            
            if (playerVolumeControlRef.current && !playerVolumeControlRef.current.contains(event.target) && 
                !event.target.classList.contains('player-volume-button')) {
                setShowPlayerVolumeControl(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const handlePlayPause = (index) => {
        if (currentTrackIndex === index) {
            // Toggle play/pause for current track
            setIsPlaying(!isPlaying);
        } else {
            // Change to new track and play it
            setCurrentTrackIndex(index);
            setIsPlaying(true);
        }
    };
    
    const handleVolumeChange = (e) => {
        setVolume(parseFloat(e.target.value));
    };
    
    const toggleVolumeControl = () => {
        setShowVolumeControl(!showVolumeControl);
    };
    
    const togglePlayerVolumeControl = () => {
        setShowPlayerVolumeControl(!showPlayerVolumeControl);
    };
    
    const formatTime = (timeInSeconds) => {
        if (!timeInSeconds) return "0:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };
    
    const handleSeek = (e) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        audioRef.current.currentTime = newTime;
    };
    
    const handleLike = async (track, index) => {
        // Mark the track as liked/unliked locally
        const updatedTracks = localTracks.map((t, i) => 
            i === index ? { ...t, liked: t.liked === true ? false : true } : t
        );
        setLocalTracks(updatedTracks);
        
        // If logged in, also update in Supabase
        if (isLoggedIn && userId) {
            try {
                // Update Supabase if the user is logged in
                if (track.liked) {
                    // If track was already liked, remove from liked_tracks
                    await supabase
                        .from('liked_tracks')
                        .delete()
                        .eq('user_id', userId)
                        .eq('track_id', track.id.toString());
                    
                    console.log(`Removed track ${track.id} from liked tracks`);
                } else {
                    // If track wasn't liked, add to liked_tracks
                    const trackData = {
                        user_id: userId,
                        track_id: track.id.toString(),
                        track_title: track.title,
                        track_artist: track.artist,
                        track_img: track.img,
                        track_preview: track.preview,
                        emotion: emotion,
                        genre: genre
                    };
                    
                    // If we have a playlist ID, associate this liked track with it
                    if (playlistId) {
                        trackData.playlist_id = playlistId;
                    }
                    
                    await supabase
                        .from('liked_tracks')
                        .insert(trackData);
                    
                    console.log(`Added track ${track.id} to liked tracks`);
                }
            } catch (error) {
                console.error("Error updating like status:", error);
                alert("Failed to update like status. Please try again.");
            }
        }
    };

    const regeneratePlaylist = () => {
        console.log("Regenerating playlist...");
        // Completely stop any playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = ''; // Remove the source
        }
        setIsPlaying(false);
        setCurrentTime(0);
        
        if (onRegenerate) {
            onRegenerate();
        }
    };
    
    const handleCreatePlaylist = () => {
        setShowFinalPlaylist(true);
        setIsPlaying(false);
    };
    
    const handleBackToMain = () => {
        setShowFinalPlaylist(false);
    };

    const handleBackToGenreSelection = () => {
        // Explicitly stop any playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = ''; // Remove the source
        }
        setIsPlaying(false);
        setCurrentTime(0);
        
        // Call the provided onBackClick function to navigate back to genre selection
        if (onBackClick) {
            onBackClick();
        }
    };

    // Add function to export to Spotify via TuneMyMusic
    const exportToSpotify = () => {
        const likedTracks = localTracks.filter(track => track.liked === true);
        
        if (likedTracks.length === 0) {
            alert("Please like some tracks first to export them to Spotify");
            return;
        }

        try {
            // Create a CSV string with headers that TuneMyMusic expects
            const csvContent = "Track Name,Artist Name\n" + 
                likedTracks.map(track => {
                    // Properly escape fields to handle commas in titles or artist names
                    const escapedTitle = `"${track.title.replace(/"/g, '""')}"`;
                    const escapedArtist = `"${track.artist.replace(/"/g, '""')}"`;
                    return `${escapedTitle},${escapedArtist}`;
                }).join('\n');
            
            // Create a Blob with the CSV data
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Create a download link and trigger it
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const playlistName = `MoodTunez_${emotion}_${genre}`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${playlistName}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Instructions message
            const instructionsMsg = 'CSV file has been downloaded!\n\nTo create your Spotify playlist:\n\n1. Go to TuneMyMusic.com\n2. Click "Let\'s Start"\n3. Select "File Upload" as source\n4. Upload the CSV file you just downloaded\n5. Select Spotify as destination\n6. Follow TuneMyMusic\'s instructions to complete the transfer';
            
            // Show first alert with instructions - clicking OK will open TuneMyMusic
            setTimeout(() => {
                alert(instructionsMsg + '\n\nClick OK to open TuneMyMusic (instructions will remain visible)');
                
                // Open TuneMyMusic in a new tab
                window.open('https://www.tunemymusic.com/transfer', '_blank');
                
                // Show second alert to acknowledge instructions
                setTimeout(() => {
                    alert(instructionsMsg + '\n\nClick OK to acknowledge these instructions');
                }, 500);
            }, 500);
            
        } catch (error) {
            console.error("Error exporting to Spotify:", error);
            alert("Failed to prepare Spotify export. Please try again later.");
        }
    };

    // Player Bar Component with dynamic coloring
    const PlayerBar = () => {
        if (!localTracks || localTracks.length === 0 || !localTracks[currentTrackIndex]) return null;
        
        const currentTrack = localTracks[currentTrackIndex];
        // Always show the player if a track has been selected, even when paused
        const hasSelectedTrack = currentTrack !== undefined;
        
        if (!hasSelectedTrack) return null;
        
        // Create gradient background for better visual effect
        const gradientBg = `linear-gradient(to bottom, ${playerColor} 0%, #121212 100%)`;
        
        return (
            <div style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                height: "80px",
                background: gradientBg,
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                zIndex: 100,
                transition: "background 0.5s ease",
                boxShadow: "0 -4px 10px rgba(0,0,0,0.3)" // Add shadow for separation
            }}>
                {/* Track info */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    width: "30%",
                    minWidth: "120px", // Ensure minimum width on small screens
                    maxWidth: "250px" // Limit on large screens
                }}>
                    <img 
                        src={currentTrack.img || 'https://placehold.co/50x50?text=No+Image'} 
                        alt={currentTrack.title} 
                        style={{
                            width: "50px", // Slightly smaller on all screens
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            marginRight: "12px",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                            flexShrink: 0 // Prevent image from shrinking
                        }}
                    />
                    <div style={{
                        overflow: "hidden"
                    }}>
                        <div style={{
                            fontWeight: "bold",
                            fontSize: "14px",
                            color: "white",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            transition: "color 0.5s ease"
                        }}>{currentTrack.title}</div>
                        <div style={{
                            fontSize: "12px",
                            color: "#aaa",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            transition: "color 0.5s ease"
                        }}>{currentTrack.artist}</div>
                    </div>
                </div>
                
                {/* Player controls - optimize for smaller screens */}
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "200px" // Ensure minimum width on small screens
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                        flexWrap: "wrap", // Allow wrapping on very small screens
                        justifyContent: "center"
                    }}>
                        {/* Make controls more compact on smaller screens */}
                        <button 
                            onClick={() => {
                                // Previous track logic
                                if (currentTime > 3) {
                                    audioRef.current.currentTime = 0;
                                    setCurrentTime(0);
                                } else if (currentTrackIndex > 0) {
                                    setCurrentTrackIndex(currentTrackIndex - 1);
                                }
                            }}
                            style={{
                                backgroundColor: "transparent",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "28px", // Slightly smaller
                                height: "28px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "14px", // Smaller font
                                transition: "all 0.3s ease",
                                marginRight: "8px", // Less margin
                                filter: "drop-shadow(0 0 2px #9c27b0)"
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                            </svg>
                        </button>
                        
                        <button 
                            onClick={() => {
                                // Go back 5 seconds
                                const newTime = Math.max(0, currentTime - 5);
                                audioRef.current.currentTime = newTime;
                                setCurrentTime(newTime);
                            }}
                            style={{
                                backgroundColor: "transparent",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "28px",
                                height: "28px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "14px",
                                transition: "all 0.3s ease",
                                marginRight: "8px",
                                filter: "drop-shadow(0 0 2px #9c27b0)"
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
                            </svg>
                        </button>
                        
                        <button 
                            onClick={() => handlePlayPause(currentTrackIndex)}
                            style={{
                                backgroundColor: "#9c27b0",
                                color: "white",
                                border: "2px solid white",
                                borderRadius: "50%",
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "18px",
                                transition: "all 0.5s ease",
                                marginRight: "8px",
                                boxShadow: "0 0 8px #9c27b0",
                                padding: "0"
                            }}
                        >
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        
                        <button 
                            onClick={() => {
                                // Skip forward 5 seconds
                                const newTime = Math.min(duration || 30, currentTime + 5);
                                audioRef.current.currentTime = newTime;
                                setCurrentTime(newTime);
                            }}
                            style={{
                                backgroundColor: "transparent",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "28px",
                                height: "28px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "14px",
                                transition: "all 0.3s ease",
                                filter: "drop-shadow(0 0 2px #9c27b0)"
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                            </svg>
                        </button>
                        
                        <button 
                            onClick={() => {
                                // Skip to next track
                                if (currentTrackIndex < localTracks.length - 1) {
                                    setCurrentTrackIndex(currentTrackIndex + 1);
                                }
                            }}
                            style={{
                                backgroundColor: "transparent",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "28px",
                                height: "28px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "14px",
                                transition: "all 0.3s ease",
                                filter: "drop-shadow(0 0 2px #9c27b0)"
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        justifyContent: "center"
                    }}>
                        <span style={{
                            color: "#aaa",
                            fontSize: "12px",
                            marginRight: "10px",
                            width: "40px",
                            textAlign: "right",
                            transition: "color 0.5s ease"
                        }}>{formatTime(currentTime)}</span>
                        
                        <input 
                            type="range"
                            min="0"
                            max={duration || 30}
                            step="0.1"
                            value={currentTime}
                            onChange={handleSeek}
                            style={{
                                flex: 1,
                                maxWidth: "400px",
                                height: "4px",
                                borderRadius: "2px",
                                background: `linear-gradient(to right, #9c27b0 0%, #9c27b0 ${(currentTime / (duration || 30)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 30)) * 100}%, rgba(255,255,255,0.3) 100%)`,
                                outline: "none",
                                appearance: "none",
                                cursor: "pointer",
                                transition: "background 0.5s ease"
                            }}
                        />
                        
                        <span style={{
                            color: "#aaa",
                            fontSize: "12px",
                            marginLeft: "10px",
                            width: "40px",
                            transition: "color 0.5s ease"
                        }}>{formatTime(duration || 30)}</span>
                    </div>
                </div>
                
                {/* Volume control - hide on very small screens */}
                <div style={{
                    width: "20%",
                    display: "flex",
                    justifyContent: "flex-end",
                    position: "relative",
                    "@media (max-width: 600px)": { // Will be ignored in inline styles but good to note
                        display: "none"
                    },
                    minWidth: "40px" // Ensure minimum width
                }}>
                    <button 
                        className="player-volume-button"
                        onClick={togglePlayerVolumeControl}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            filter: "drop-shadow(0 0 2px #9c27b0)"
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            {volume === 0 ? (
                                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                            ) : volume < 0.3 ? (
                                <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
                            ) : volume < 0.7 ? (
                                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                            ) : (
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            )}
                        </svg>
                    </button>
                    
                    {showPlayerVolumeControl && (
                        <div 
                            ref={playerVolumeControlRef}
                            style={{
                                position: "absolute",
                                bottom: "100%",
                                right: "0",
                                backgroundColor: "#222",
                                border: "2px solid #9c27b0",
                                padding: "15px",
                                borderRadius: "8px",
                                boxShadow: "0 0 10px #9c27b0",
                                marginBottom: "10px",
                                zIndex: 101,
                                width: "150px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center"
                            }}
                        >
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                width: "100%",
                                marginBottom: "10px"
                            }}>
                                <span style={{
                                    color: "white",
                                    fontSize: "12px",
                                    textShadow: "0 0 1px #9c27b0"
                                }}>Volume</span>
                                <span style={{ 
                                    color: "white", 
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    textShadow: "0 0 1px #9c27b0"
                                }}>
                                    {Math.round(volume * 100)}%
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                value={volume}
                                onChange={handleVolumeChange}
                                style={{
                                    width: "100%",
                                    height: "6px",
                                    borderRadius: "3px",
                                    appearance: "none",
                                    background: `linear-gradient(to right, #9c27b0 0%, #9c27b0 ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%, rgba(255,255,255,0.3) 100%)`,
                                    outline: "none",
                                    cursor: "pointer",
                                    boxShadow: "0 0 3px #9c27b0"
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Add CSS to handle the positioning for mobile devices
    const mobileStyle = {
        "@media (max-height: 700px)": {
            maxHeight: "75vh" // Lower height on small screens
        }
    };

    // Add global unmount cleanup effect
    useEffect(() => {
        // Cleanup function to ensure audio stops when component unmounts
        return () => {
            console.log("PlaylistRecommendation unmounting - stopping audio");
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.src = '';
                setIsPlaying(false);
            }
        };
    }, []);

    // Add this style for the glowing RGB effect
    const glowingIconStyle = {
        fontSize: "28px",
        color: "white",
        animation: "glowingRGB 3s infinite ease-in-out",
        filter: "drop-shadow(0 0 5px #ff00ff) drop-shadow(0 0 8px #00ffff)",
        transition: "transform 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
        borderRadius: "50%",
        background: "rgba(0,0,0,0.2)",
        cursor: "pointer",
        transform: "scale(1)",
        transformOrigin: "center",
        boxShadow: "0 0 15px rgba(156, 39, 176, 0.5)",
    };

    // Add this to your stylesheet or include it in your component
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            @keyframes glowingRGB {
                0% { color: #ff0000; filter: drop-shadow(0 0 5px #ff0000); }
                20% { color: #ff00ff; filter: drop-shadow(0 0 5px #ff00ff); }
                40% { color: #0000ff; filter: drop-shadow(0 0 5px #0000ff); }
                60% { color: #00ffff; filter: drop-shadow(0 0 5px #00ffff); }
                80% { color: #00ff00; filter: drop-shadow(0 0 5px #00ff00); }
                100% { color: #ff0000; filter: drop-shadow(0 0 5px #ff0000); }
            }
            
            .music-icon-back:hover {
                transform: scale(1.2) rotate(10deg);
            }
        `;
        document.head.appendChild(styleElement);
        
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    if (!localTracks || localTracks.length === 0) {
        return (
            <div className="no-results">
                <p>No tracks found for {emotion} {genre}.</p>
                <button onClick={onBackClick}>Go Back</button>
            </div>
        );
    }
    
    // If showing the final playlist with liked songs
    if (showFinalPlaylist) {
        const likedTracks = localTracks.filter(track => track.liked === true);
        
        return (
            <>
                <div className="playlist-container" style={{
                    maxWidth: "800px",
                    margin: "0 auto 50px",
                    padding: "20px",
                    backgroundColor: "#1e1e1e",
                    color: "#fff",
                    borderRadius: "8px",
                    maxHeight: "85vh",
                    overflowY: "auto",
                    position: "relative",
                    marginBottom: "120px", // Always reserve space for player
                    paddingBottom: "30px",
                    ...mobileStyle // Apply mobile styles
                }}>
                    <div className="playlist-header" style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                        borderBottom: "1px solid #333",
                        paddingBottom: "10px",
                        position: "sticky",
                        top: 0,
                        backgroundColor: "#1e1e1e",
                        zIndex: 2
                    }}>
                        <div 
                            className="music-icon-back"
                            onClick={handleBackToMain} 
                            style={glowingIconStyle}
                        >
                            <FaMusic />
                        </div>
                        
                        <h3 style={{
                            margin: 0,
                            flex: 1,
                            textAlign: "center",
                            fontSize: "24px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            background: "linear-gradient(45deg, #f06, #9f6)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            textShadow: "0 0 5px rgba(255,255,255,0.2)"
                        }}>Your {emotion} {genre} Playlist</h3>
                        
                        <button 
                            onClick={exportToSpotify}
                            style={{
                                backgroundColor: "#1DB954", // Spotify green
                                border: "none",
                                padding: "8px 15px",
                                borderRadius: "4px",
                                color: "white",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                fontWeight: "bold"
                            }}
                        >
                            <span style={{ marginRight: "5px" }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,2C6.477,2 2,6.477 2,12C2,17.523 6.477,22 12,22C17.523,22 22,17.523 22,12C22,6.477 17.523,2 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M15,6H9V8H15V6M16,10H8V12H16V10M16.4,15L15,16.4L13.6,15L12.9,15.7L14.3,17.1L12.9,18.5L13.6,19.2L15,17.8L16.4,19.2L17.1,18.5L15.7,17.1L17.1,15.7L16.4,15Z" />
                                </svg>
                            </span>
                            Export via TuneMyMusic
                        </button>
                    </div>
                    
                    <div className="playlist-tracks" style={{
                        display: "flex",
                        flexDirection: "column",
                        paddingBottom: "30px"
                    }}>
                        <h3 style={{
                            marginBottom: "15px",
                            fontSize: "18px",
                            position: "sticky",
                            top: "70px",
                            backgroundColor: "#1e1e1e",
                            zIndex: 1,
                            paddingTop: "10px",
                            paddingBottom: "10px"
                        }}>Liked Tracks ({likedTracks.length})</h3>
                        
                        {likedTracks.length === 0 ? (
                            <div style={{
                                padding: "20px",
                                textAlign: "center",
                                backgroundColor: "#222",
                                borderRadius: "8px"
                            }}>
                                <p>You haven't liked any tracks yet.</p>
                                <button 
                                    onClick={handleBackToMain}
                                    style={{
                                        background: "#333",
                                        border: "none",
                                        padding: "8px 15px",
                                        borderRadius: "4px",
                                        color: "white",
                                        cursor: "pointer",
                                        marginTop: "10px"
                                    }}
                                >
                                    Go Back and Like Some Tracks
                                </button>
                            </div>
                        ) : (
                            <ul style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0,
                                overflowY: "auto",
                                maxHeight: "65vh",
                                paddingRight: "5px",
                                paddingBottom: "30px"
                            }}>
                                {likedTracks.map((track, index) => (
                                    <li 
                                        key={track.id} 
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "12px",
                                            margin: "8px 0",
                                            backgroundColor: "#222",
                                            borderRadius: "6px",
                                            cursor: "pointer"
                                        }}
                                        onClick={() => {
                                            // Find index in main tracks array
                                            const mainIndex = localTracks.findIndex(t => t.id === track.id);
                                            if (mainIndex !== -1) {
                                                handlePlayPause(mainIndex);
                                            }
                                        }}
                                    >
                                        <div className="track-image" style={{
                                            width: "60px",
                                            height: "60px",
                                            marginRight: "15px",
                                            flexShrink: 0
                                        }}>
                                            <img 
                                                src={track.img || 'https://placehold.co/50x50?text=No+Image'} 
                                                alt={track.title} 
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    borderRadius: "4px"
                                                }}
                                                onError={(e) => {
                                                    e.target.src = 'https://placehold.co/50x50?text=No+Image';
                                                }}
                                            />
                                        </div>
                                        <div className="track-info" style={{
                                            flex: 1,
                                            overflow: "hidden"
                                        }}>
                                            <span className="track-title" style={{
                                                display: "block",
                                                fontWeight: "bold",
                                                fontSize: "16px",
                                                marginBottom: "5px",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis"
                                            }}>{track.title}</span>
                                            <span className="track-artist" style={{
                                                display: "block",
                                                fontSize: "14px",
                                                color: "#aaa",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis"
                                            }}>{track.artist}</span>
                                        </div>
                                        <div style={{
                                            marginLeft: "10px",
                                            color: "#ff4d4f",
                                            fontSize: "20px"
                                        }}>
                                            ❤️
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <PlayerBar />
                <div style={{ height: "60px" }} /> {/* Extra space at bottom */}
            </>
        );
    }

    return (
        <>
            <div className="playlist-container" style={{
                maxWidth: "800px",
                margin: "0 auto 50px",
                padding: "20px",
                backgroundColor: "#1e1e1e",
                color: "#fff",
                borderRadius: "8px",
                maxHeight: "85vh",
                overflowY: "auto",
                position: "relative",
                marginBottom: "120px", // Always reserve space for player
                paddingBottom: "40px", // More padding
                ...mobileStyle // Apply mobile styles
            }}>
                <div className="playlist-header" style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    borderBottom: "1px solid #333",
                    paddingBottom: "10px",
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#1e1e1e",
                    zIndex: 2
                }}>
                    <div 
                        className="music-icon-back"
                        onClick={handleBackToGenreSelection} 
                        style={glowingIconStyle}
                    >
                        <FaMusic />
                    </div>
                    
                    <div className="playlist-title">
                        <h2 style={{margin: "0"}}>{emotion} {genre} Playlist</h2>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'relative', marginRight: '15px' }}>
                            <button 
                                className="volume-button"
                                onClick={toggleVolumeControl}
                                style={{
                                    backgroundColor: "#333",
                                    border: "none",
                                    padding: "8px 15px",
                                    borderRadius: "4px",
                                    color: "white",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{filter: "drop-shadow(0 0 2px #9c27b0)"}}>
                                    {volume === 0 ? (
                                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                                    ) : volume < 0.3 ? (
                                        <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
                                    ) : volume < 0.7 ? (
                                        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                                    ) : (
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                    )}
                                </svg>
                            </button>
                            
                            {showVolumeControl && (
                                <div 
                                    ref={volumeControlRef}
                                    style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: '#222',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        boxShadow: '0 0 10px #9c27b0',
                                        border: '2px solid #9c27b0',
                                        marginBottom: '10px',
                                        zIndex: 10,
                                        width: '150px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        marginBottom: '10px'
                                    }}>
                                        <span style={{
                                            color: 'white',
                                            fontSize: '12px',
                                            textShadow: "0 0 1px #9c27b0"
                                        }}>Volume</span>
                                        <span style={{ 
                                            color: 'white', 
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            textShadow: "0 0 1px #9c27b0"
                                        }}>
                                            {Math.round(volume * 100)}%
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.01" 
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        style={{
                                            width: '100%',
                                            height: '6px',
                                            borderRadius: '3px',
                                            appearance: 'none',
                                            background: `linear-gradient(to right, #9c27b0 0%, #9c27b0 ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%, rgba(255,255,255,0.3) 100%)`,
                                            outline: 'none',
                                            cursor: 'pointer',
                                            boxShadow: '0 0 3px #9c27b0'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        
                        <button className="regenerate-button" onClick={regeneratePlaylist} style={{
                            background: "#333",
                            border: "none",
                            padding: "8px 15px",
                            borderRadius: "4px",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px"
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{filter: "drop-shadow(0 0 2px #9c27b0)"}}>
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 9h7V2l-2.35 4.35z"/>
                            </svg>
                            Regenerate
                        </button>
                    </div>
                </div>
                
                <div className="playlist-tracks" style={{
                    display: "flex",
                    flexDirection: "column",
                    paddingBottom: "30px"
                }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px',
                        position: "sticky",
                        top: "70px",
                        backgroundColor: "#1e1e1e",
                        zIndex: 1,
                        paddingTop: "10px",
                        paddingBottom: "10px"
                    }}>
                        <h3 style={{
                            fontSize: "18px",
                            margin: 0
                        }}>Tracks ({localTracks.length})</h3>
                        
                        {allReviewed && (
                            <button 
                                onClick={handleCreatePlaylist}
                                style={{
                                    background: "#9c27b0",
                                    border: "none",
                                    padding: "8px 15px",
                                    borderRadius: "4px",
                                    color: "white",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    boxShadow: "0 0 8px #9c27b0"
                                }}
                            >
                                ✅ Done - Create Playlist
                            </button>
                        )}
                    </div>
                    
                    <ul style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        overflowY: "auto",
                        maxHeight: "65vh",
                        paddingRight: "5px",
                        paddingBottom: "30px"
                    }}>
                        {localTracks.map((track, index) => (
                            <li 
                                key={track.id} 
                                className={index === currentTrackIndex ? "active" : ""}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "12px",
                                    margin: "8px 0",
                                    backgroundColor: index === currentTrackIndex ? "#333" : "#222",
                                    borderRadius: "6px",
                                    transition: "background-color 0.3s",
                                    cursor: "pointer"
                                }}
                                onClick={() => handlePlayPause(index)}
                            >
                                <div className="track-image" style={{
                                    width: "60px",
                                    height: "60px",
                                    marginRight: "15px",
                                    flexShrink: 0,
                                    position: "relative"
                                }}>
                                    <img 
                                        src={track.img || 'https://placehold.co/50x50?text=No+Image'} 
                                        alt={track.title} 
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            borderRadius: "4px"
                                        }}
                                        onError={(e) => {
                                            e.target.src = 'https://placehold.co/50x50?text=No+Image';
                                        }}
                                    />
                                    {index === currentTrackIndex && (
                                        <div style={{
                                            position: "absolute",
                                            top: "50%",
                                            left: "50%",
                                            transform: "translate(-50%, -50%)",
                                            backgroundColor: "rgba(0,0,0,0.7)",
                                            borderRadius: "50%",
                                            width: "24px",
                                            height: "24px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}>
                                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                        </div>
                                    )}
                                </div>
                                <div className="track-info" style={{
                                    flex: 1,
                                    overflow: "hidden"
                                }}>
                                    <span className="track-title" style={{
                                        display: "block",
                                        fontWeight: "bold",
                                        fontSize: "16px",
                                        marginBottom: "5px",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>{track.title}</span>
                                    <span className="track-artist" style={{
                                        display: "block",
                                        fontSize: "14px",
                                        color: "#aaa",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>{track.artist}</span>
                                </div>
                                <div className="track-actions" style={{
                                    marginLeft: "10px",
                                    display: "flex",
                                    alignItems: "center"
                                }}>
                                    <button 
                                        className={`play-button`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePlayPause(index);
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "white",
                                            marginRight: "10px",
                                            padding: "0",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        {index === currentTrackIndex && isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                    <button 
                                        className={`like-button ${track.liked ? 'liked' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLike(track, index);
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            fontSize: "20px", 
                                            cursor: "pointer",
                                            color: "white",
                                            marginRight: "10px"
                                        }}
                                    >
                                        {track.liked ? '❤️' : '🤍'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <PlayerBar />
        </>
    );
}

export default PlaylistRecommendation;