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
    
    const allResults: { id: string; name: string; success: boolean; newStatus: string; error?: any }[] = [];
    
    // 1. Find employees with status "Serving Notice Period" where date_of_exit <= today
    const { data: noticePeriodEmployees, error: fetchError1 } = await supabase
      .from('employees')
      .select('id, name, date_of_exit')
      .eq('status', 'Serving Notice Period')
      .not('date_of_exit', 'is', null)
      .lte('date_of_exit', today);

    if (fetchError1) {
      console.error('Error fetching notice period employees:', fetchError1);
      throw fetchError1;
    }

    console.log(`Found ${noticePeriodEmployees?.length || 0} employees to transition to Inactive`);

    // Update notice period employees to Inactive
    if (noticePeriodEmployees && noticePeriodEmployees.length > 0) {
      for (const employee of noticePeriodEmployees) {
        console.log(`Updating employee ${employee.name} (ID: ${employee.id}) to Inactive`);
        
        const { error: updateError } = await supabase
          .from('employees')
          .update({ status: 'Inactive' })
          .eq('id', employee.id);

        if (updateError) {
          console.error(`Error updating employee ${employee.id}:`, updateError);
          allResults.push({ id: employee.id, name: employee.name, success: false, newStatus: 'Inactive', error: updateError });
        } else {
          allResults.push({ id: employee.id, name: employee.name, success: true, newStatus: 'Inactive' });
        }
      }
    }

    // 2. Find employees with status "To Be Onboarded" where doj <= today
    const { data: toBeOnboardedEmployees, error: fetchError2 } = await supabase
      .from('employees')
      .select('id, name, doj')
      .eq('status', 'To Be Onboarded')
      .lte('doj', today);

    if (fetchError2) {
      console.error('Error fetching to-be-onboarded employees:', fetchError2);
      throw fetchError2;
    }

    console.log(`Found ${toBeOnboardedEmployees?.length || 0} employees to transition to Active`);

    // Update to-be-onboarded employees to Active
    if (toBeOnboardedEmployees && toBeOnboardedEmployees.length > 0) {
      for (const employee of toBeOnboardedEmployees) {
        console.log(`Updating employee ${employee.name} (ID: ${employee.id}) to Active`);
        
        const { error: updateError } = await supabase
          .from('employees')
          .update({ status: 'Active' })
          .eq('id', employee.id);

        if (updateError) {
          console.error(`Error updating employee ${employee.id}:`, updateError);
          allResults.push({ id: employee.id, name: employee.name, success: false, newStatus: 'Active', error: updateError });
        } else {
          allResults.push({ id: employee.id, name: employee.name, success: true, newStatus: 'Active' });
        }
      }
    }

    const successCount = allResults.filter(r => r.success).length;
    console.log(`Successfully updated ${successCount} of ${allResults.length} employees`);

    if (allResults.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Updated ${successCount} employees`,
          results: allResults
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
