import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jzctaiureulokihnlhds.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y3RhaXVyZXVsb2tpaG5saGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MTczMDksImV4cCI6MjA2MTk5MzMwOX0.MaL69r4IIwoXCJQY67oUY18uYBcK716QIy828ZpCFGc";

// Initialize Supabase client
console.log("Initializing Supabase client with URL:", supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the connection to make sure it's working
const testSupabaseConnection = async () => {
    try {
        console.log("Testing Supabase connection...");
        const { data, error } = await supabase.from('user_history').select('count(*)').limit(1);
        
        if (error) {
            console.error("Error testing Supabase connection:", error);
            return false;
        }
        
        console.log("Supabase connection test successful:", data);
        return true;
    } catch (error) {
        console.error("Exception during Supabase connection test:", error);
        return false;
    }
};

// Perform the test immediately 
testSupabaseConnection().then(success => {
    console.log("Supabase connection test result:", success ? "SUCCESS" : "FAILED");
});

// Initialize storage bucket for avatars
const initAvatarStorage = async () => {
    try {
        console.log("Initializing avatar storage...");
        // Check if the bucket exists
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error("Error checking for avatars bucket:", bucketsError);
            return false;
        }
        
        console.log("Available buckets:", buckets.map(b => b.name).join(', '));
        const avatarBucketExists = buckets.some(bucket => bucket.name === 'avatars');
        
        if (!avatarBucketExists) {
            console.log("Creating avatars bucket...");
            
            // Create the avatars bucket with public access
            const { data, error: createBucketError } = await supabase.storage.createBucket('avatars', {
                public: true, // Allow public access to files
                fileSizeLimit: 2097152, // 2MB limit
                allowedMimeTypes: [
                    'image/png',
                    'image/jpeg',
                    'image/gif',
                    'image/webp'
                ]
            });
            
            if (createBucketError) {
                console.error("Error creating avatars bucket:", createBucketError);
                return false;
            }
            
            console.log("Avatars bucket created successfully:", data);
            
            // Set public bucket policy
            const { error: policyError } = await supabase.storage.from('avatars').createSignedUrl('dummy.txt', 1);
            if (policyError && !policyError.message.includes('not found')) {
                console.error("Error setting bucket policy:", policyError);
            }
            
            return true;
        } else {
            console.log("Avatars bucket already exists.");
            return true;
        }
    } catch (error) {
        console.error("Error initializing avatar storage:", error);
        return false;
    }
};

// Run initialization with logging
console.log("Starting avatar storage initialization...");
initAvatarStorage()
    .then(success => {
        console.log("Avatar storage initialization:", success ? "SUCCESS" : "FAILED");
    })
    .catch(err => {
        console.error("Unhandled error in avatar storage initialization:", err);
    });

// Reset Supabase connection and all related local storage
export const resetSupabaseConnection = async () => {
    // Clear all Supabase-related items from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('skip_profile_creation'))) {
            keysToRemove.push(key);
        }
    }
    
    // Remove collected keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Sign out from current session if any
    await supabase.auth.signOut();
    
    console.log("Supabase connection reset complete. All related local storage items cleared.");
    
    // Re-initialize the client connection
    return testSupabaseConnection();
};

// Skip profile creation for now
export const skipProfileCreation = () => {
    // Store in localStorage that we should skip profile creation
    localStorage.setItem('skip_profile_creation', 'true');
};

// Check if we should skip profile creation
export const shouldSkipProfileCreation = () => {
    return localStorage.getItem('skip_profile_creation') === 'true';
};
