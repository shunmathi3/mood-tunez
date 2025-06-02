import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FaMusic, FaSpinner } from 'react-icons/fa';
import '../App.css';

function Login({ toggleView, onForgotPassword, onSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const validateForm = () => {
        // Valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return false;
        }

        // Password must be provided
        if (!password && !showForgotPassword) {
            setError("Please enter your password");
            return false;
        }

        return true;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log("Attempting to login with:", { email });
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("Login error from Supabase:", error);
                throw error;
            }
            
            console.log("Login successful:", data);
            
            // Check if there's a user but no session
            if (data?.user && !data?.session) {
                setError("Account exists but may require email verification. Please check your email.");
            } else {
                setSuccessMessage("Login successful!");
                // Automatically redirect to main menu after successful login
                setTimeout(() => {
                    if (onSuccess) {
                        console.log("Redirecting to main menu");
                        onSuccess();
                    }
                }, 1000); // Short delay to show success message
            }
        } catch (error) {
            console.error("Login error details:", error);
            
            // More user-friendly error messages
            if (error.message.includes("Invalid login credentials")) {
                setError("Invalid email or password. Please check your credentials and try again.");
            } else {
                setError(error.message || "Failed to sign in. Please check your credentials and try again.");
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            
            if (error) throw error;
            
            setSuccessMessage("Password reset email sent. Please check your inbox.");
        } catch (error) {
            console.error("Password reset error:", error);
            setError(error.message || "Failed to send reset email. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="page-title">
                MOOD TU<span className="music-letter"><FaMusic /></span>EZ
            </div>
            
            <div className="auth-card">
                <h2>{showForgotPassword ? 'Reset Password' : 'Login'}</h2>
                
                {error && <div className="auth-error">{error}</div>}
                {successMessage && <div className="auth-success">{successMessage}</div>}
                
                <form onSubmit={showForgotPassword ? handleResetPassword : handleLogin} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="your@email.com"
                        />
                    </div>
                    
                    {!showForgotPassword && (
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                placeholder="Your password"
                            />
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-spinner">
                                <FaSpinner className="spinner-icon" /> 
                                {showForgotPassword ? 'Sending reset email...' : 'Signing in...'}
                            </span>
                        ) : (
                            showForgotPassword ? 'Send Reset Email' : 'Sign In'
                        )}
                    </button>
                </form>
                
                <div className="auth-links">
                    <button 
                        onClick={() => setShowForgotPassword(!showForgotPassword)} 
                        className="auth-link" 
                        disabled={loading}
                        type="button"
                    >
                        {showForgotPassword ? 'Back to Login' : 'Forgot Password?'}
                    </button>
                </div>
                
                <div className="auth-footer">
                    Don't have an account?{' '}
                    <button onClick={toggleView} className="auth-link" disabled={loading}>
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login; 