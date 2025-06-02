import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FaMusic, FaSpinner, FaLock, FaEnvelope } from 'react-icons/fa';
import '../App.css';

function PasswordReset({ onSuccess, onCancel, initialStep = 'email' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [resetStep, setResetStep] = useState(initialStep);

    useEffect(() => {
        // When initialStep changes, update the resetStep
        setResetStep(initialStep);
        
        // If we're on the password step directly from a link,
        // we'll already have an active session for reset
        if (initialStep === 'password') {
            console.log("Password reset form opened from reset link");
            // Check if we have a session for password reset
            checkResetSession();
        }
    }, [initialStep]);
    
    const checkResetSession = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error("Error getting session:", error);
                setError("Unable to verify reset session. Please try the reset link again or request a new one.");
                return;
            }
            
            if (!data.session) {
                console.warn("No active session for password reset");
                setError("Your password reset session is not active. Please use the reset link from your email or request a new one.");
                return;
            }
            
            console.log("Active reset session detected");
        } catch (err) {
            console.error("Error in checkResetSession:", err);
            setError("An error occurred while verifying your reset session. Please try again.");
        }
    };

    const validateEmailForm = () => {
        // Valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return false;
        }
        return true;
    };

    const validatePasswordForm = () => {
        // Password must be at least 6 characters
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }

        // Passwords must match
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return false;
        }

        return true;
    };

    const handleSendResetEmail = async (e) => {
        e.preventDefault();
        
        if (!validateEmailForm()) {
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log("Sending password reset email to:", email);
            
            // Using redirectTo with hash fragment to better handle the token
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });

            if (error) {
                console.error("Error sending reset email:", error);
                throw error;
            }
            
            setSuccessMessage(`Password reset email sent to ${email}. Please check your inbox and click the link to reset your password.`);
        } catch (error) {
            console.error("Password reset email error:", error);
            
            // More user-friendly error messages
            if (error.message && error.message.includes("email")) {
                setError("We couldn't find an account with that email. Please check the email address and try again.");
            } else {
                setError(error.message || "Failed to send reset email. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (!validatePasswordForm()) {
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log("Attempting to update password");
            
            // Update password
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                console.error("Password update error:", error);
                throw error;
            }
            
            console.log("Password reset successful");
            setSuccessMessage("Your password has been reset successfully! You can now log in with your new password.");
            
            // Clear URL hash after successful password reset
            if (window.location.hash) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            // After 3 seconds, redirect to login
            setTimeout(() => {
                if (onSuccess) {
                    console.log("Redirecting to login page");
                    onSuccess();
                }
            }, 3000);
            
        } catch (error) {
            console.error("Password reset error details:", error);
            
            if (error.message && error.message.includes("token")) {
                setError("Your session has expired. Please request a new password reset link and try again immediately.");
            } else {
                setError(error.message || "Failed to reset password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Check if we're on the email step or password step
    const renderEmailStep = () => (
        <form onSubmit={handleSendResetEmail} className="auth-form">
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Enter your email address"
                />
            </div>
            
            <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
            >
                {loading ? (
                    <span className="loading-spinner">
                        <FaSpinner className="spinner-icon" /> Sending email...
                    </span>
                ) : (
                    <>
                        <FaEnvelope style={{ marginRight: '8px' }} /> 
                        Send Reset Link
                    </>
                )}
            </button>
            
            <button 
                type="button"
                className="auth-button secondary"
                onClick={onCancel}
                disabled={loading}
                style={{ marginTop: '10px', background: 'transparent', border: '1px solid #bb86fc' }}
            >
                Cancel
            </button>
        </form>
    );

    const renderPasswordStep = () => (
        <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="At least 6 characters"
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Re-enter password"
                />
            </div>
            
            <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
            >
                {loading ? (
                    <span className="loading-spinner">
                        <FaSpinner className="spinner-icon" /> Resetting password...
                    </span>
                ) : (
                    <>
                        <FaLock style={{ marginRight: '8px' }} /> 
                        Reset Password
                    </>
                )}
            </button>
            
            <button 
                type="button"
                className="auth-button secondary"
                onClick={onCancel}
                disabled={loading}
                style={{ marginTop: '10px', background: 'transparent', border: '1px solid #bb86fc' }}
            >
                Cancel
            </button>
        </form>
    );

    return (
        <div className="auth-container">
            <div className="page-title">
                MOOD TU<span className="music-letter"><FaMusic /></span>EZ
            </div>
            
            <div className="auth-card">
                <h2>{resetStep === 'email' ? 'Reset Your Password' : 'Create New Password'}</h2>
                
                {error && <div className="auth-error">{error}</div>}
                {successMessage && <div className="auth-success">{successMessage}</div>}
                
                {/* Only show form if there's no success message */}
                {!successMessage && (
                    <>
                        {resetStep === 'email' ? renderEmailStep() : renderPasswordStep()}
                    </>
                )}
                
                {/* Show continue button if there's a success message */}
                {successMessage && (
                    <div className="auth-links" style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button 
                            onClick={onSuccess} 
                            className="auth-button"
                        >
                            Continue to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PasswordReset; 