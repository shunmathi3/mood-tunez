import React, { useEffect } from "react";
import { FaMusic } from "react-icons/fa";
import "./App.css";

function LoadingScreen({ onBackClick }) {
    // Add the glowing icon style
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
        position: "absolute",
        top: "20px",
        left: "20px",
        zIndex: 1001,
    };

    // Add animation keyframes
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

    return (
        <div className="loading-screen-container">
            {/* Replace the Material Icon button with glowing RGB music icon */}
            <div 
                className="music-icon-back"
                onClick={onBackClick} 
                style={glowingIconStyle}
            >
                <FaMusic />
            </div>

            {/* Floating notes */}
            {[...Array(8)].map((_, i) => (
                <FaMusic
                    key={i}
                    className="floating-note"
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                    }}
                />
            ))}

            <div className="loading-screen-content">
                <h2 className="loading-screen-text">
                    Finding the soundtrack to<br />
                    <span className="highlight-word">your moment</span>
                    <span className="music-note-loading">
                        <FaMusic />
                    </span>
                    <span className="ellipsis-animation">...</span>
                </h2>
                <div className="loading-spinner"></div>
            </div>
        </div>
    );
}

export default LoadingScreen;