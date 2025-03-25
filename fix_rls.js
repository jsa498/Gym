const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://splwyznoxpzttwgwgmpy.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbHd5em5veHB6dHR3Z3dnbXB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjI3MjY4MiwiZXhwIjoyMDU3ODQ4NjgyfQ.3klDTPwSVUoMl6M7i7kT1sBA90gYHKh0mmqGb7BwxGs";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function fixRlsPolicies() {
  try {
    console.log("Enabling Row Level Security on exercises table...");

    // Get current RLS settings
    const { data: exercises, error } = await supabase.from("exercises").select("*").limit(1);
    console.log("Exercises data:", exercises);
    console.log("Error:", error);

    // Create a custom RPC function
    const { data: policiesData, error: policiesError } = await supabase.from("users").select("auth_id").limit(1);
    console.log("Users data:", policiesData);
    console.log("Policies error:", policiesError);

    // Now try direct SQL through service role client
    console.log("Attempting to create RLS policies directly using the service role...");

    const { data: result, error: sqlError } = await supabase.rpc('create_sql', {
      command: `
        -- Add auth_id column to exercises table if it doesn't exist
        ALTER TABLE exercises ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);
        
        -- Update existing exercises with auth_id from users table
        UPDATE exercises e
        SET auth_id = u.auth_id
        FROM users u
        WHERE e.username = u.username AND u.auth_id IS NOT NULL AND e.auth_id IS NULL;
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS exercises_auth_id_idx ON exercises(auth_id);
        CREATE INDEX IF NOT EXISTS exercises_username_idx ON exercises(username);
        
        -- Enable RLS on exercises table
        ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies to recreate them
        DROP POLICY IF EXISTS "Users can view exercises for usernames they own" ON exercises;
        DROP POLICY IF EXISTS "Users can insert exercises for usernames they own" ON exercises;
        DROP POLICY IF EXISTS "Users can update exercises for usernames they own" ON exercises;
        DROP POLICY IF EXISTS "Users can delete exercises for usernames they own" ON exercises;
        
        -- Create policies that allow operations for exercises that belong to usernames owned by the authenticated user
        CREATE POLICY "Users can view exercises for usernames they own" 
        ON exercises FOR SELECT 
        USING (
          auth_id = auth.uid() 
          OR 
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.username = exercises.username 
            AND users.auth_id = auth.uid()
          )
        );
        
        CREATE POLICY "Users can insert exercises for usernames they own" 
        ON exercises FOR INSERT 
        WITH CHECK (
          auth_id = auth.uid() 
          OR 
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.username = exercises.username 
            AND users.auth_id = auth.uid()
          )
        );
        
        CREATE POLICY "Users can update exercises for usernames they own" 
        ON exercises FOR UPDATE 
        USING (
          auth_id = auth.uid() 
          OR 
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.username = exercises.username 
            AND users.auth_id = auth.uid()
          )
        );
        
        CREATE POLICY "Users can delete exercises for usernames they own" 
        ON exercises FOR DELETE 
        USING (
          auth_id = auth.uid() 
          OR 
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.username = exercises.username 
            AND users.auth_id = auth.uid()
          )
        );
      `
    });
    
    console.log("SQL Result:", result);
    console.log("SQL Error:", sqlError);

    // Fetch exercises to see a list
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('*')
      .order('position');
      
    console.log("Total exercises:", allExercises ? allExercises.length : 0);

    // Add auth_id to users in the exercises table
    if (exercises && exercises.length > 0) {
      // Found exercises, try to update them with auth_id from users table
      const { data: users, error: usersError } = await supabase.from("users").select("username, auth_id");
      console.log("Users:", users);
      console.log("Users error:", usersError);

      if (users && users.length > 0) {
        // Update each exercise with the auth_id from its username
        for (const user of users) {
          if (user.auth_id) {
            const { data: updateResult, error: updateError } = await supabase
              .from("exercises")
              .update({ auth_id: user.auth_id })
              .eq("username", user.username)
              .is("auth_id", null);
            console.log(`Updated exercises for user ${user.username}:`, updateResult);
            console.log(`Update error for user ${user.username}:`, updateError);
          }
        }
      }
    }

    // Final attempt - create temporary SQL helper function
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        sql: `
          -- Enable RLS for exercises table
          ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Users can manage their own exercises" 
          ON exercises FOR ALL 
          USING (
            auth_id = auth.uid() 
            OR 
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.username = exercises.username 
              AND users.auth_id = auth.uid()
            )
          );
        `
      });
      console.log("SQL execute result:", data);
      console.log("SQL execute error:", error);
    } catch (sqlExecError) {
      console.error("Error executing SQL:", sqlExecError);
    }
    
    console.log("RLS policy fix completed");
  } catch (error) {
    console.error("Error in fixRlsPolicies:", error);
  }
}

fixRlsPolicies();
