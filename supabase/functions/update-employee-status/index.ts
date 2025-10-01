import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting employee status update check...');

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Find all employees with status "Serving Notice Period" where date_of_exit <= today
    const { data: employeesToUpdate, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, date_of_exit')
      .eq('status', 'Serving Notice Period')
      .not('date_of_exit', 'is', null)
      .lte('date_of_exit', today);

    if (fetchError) {
      console.error('Error fetching employees:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${employeesToUpdate?.length || 0} employees to update`);

    if (employeesToUpdate && employeesToUpdate.length > 0) {
      // Update each employee's status to "Inactive"
      const updatePromises = employeesToUpdate.map(async (employee) => {
        console.log(`Updating employee ${employee.name} (ID: ${employee.id}) to Inactive`);
        
        const { error: updateError } = await supabase
          .from('employees')
          .update({ status: 'Inactive' })
          .eq('id', employee.id);

        if (updateError) {
          console.error(`Error updating employee ${employee.id}:`, updateError);
          return { id: employee.id, success: false, error: updateError };
        }

        return { id: employee.id, name: employee.name, success: true };
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.success).length;

      console.log(`Successfully updated ${successCount} of ${results.length} employees`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Updated ${successCount} employees to Inactive status`,
          results
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'No employees to update',
        count: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in update-employee-status function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
