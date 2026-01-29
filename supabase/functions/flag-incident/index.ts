import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * POST /flag-incident
 * 
 * Flag or dispute an incident report
 * 
 * Request Body: {
 *   incident_id: uuid,
 *   action: "dispute" | "flag_false" | "flag_duplicate",
 *   reason: string (10-500 chars),
 *   contact_email?: string (optional, for follow-up)
 * }
 * 
 * Response: {
 *   success: boolean,
 *   message: string,
 *   incident_id: uuid
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { incident_id, action, reason, contact_email } = body;

    // Validation
    const validActions = ['dispute', 'flag_false', 'flag_duplicate'];
    
    if (!incident_id) {
      return new Response(
        JSON.stringify({ error: 'incident_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(incident_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid incident_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
      return new Response(
        JSON.stringify({ error: 'Reason must be 10-500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Need service role to update
    );

    // Check incident exists and is not already rejected
    const { data: incident, error: fetchError } = await supabase
      .from('incident_reports')
      .select('id, status')
      .eq('id', incident_id)
      .maybeSingle();

    if (fetchError || !incident) {
      return new Response(
        JSON.stringify({ error: 'Incident not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (incident.status === 'rejected') {
      return new Response(
        JSON.stringify({ error: 'This incident has already been rejected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For disputes, update status to 'disputed'
    if (action === 'dispute') {
      const { error: updateError } = await supabase
        .from('incident_reports')
        .update({ 
          status: 'disputed',
          updated_at: new Date().toISOString()
        })
        .eq('id', incident_id);

      if (updateError) {
        console.error('Update incident error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update incident status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log the flag/dispute for moderation review
    // In a real system, this would go to a moderation queue table
    console.log(`Incident ${incident_id} flagged:`, {
      action,
      reason: reason.trim(),
      contact_email: contact_email || null,
      timestamp: new Date().toISOString()
    });

    const actionMessages = {
      dispute: 'Incident has been marked as disputed and will be reviewed by our team.',
      flag_false: 'Thank you for reporting. This incident will be reviewed for accuracy.',
      flag_duplicate: 'Thank you for reporting. We will check for duplicates.'
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: actionMessages[action as keyof typeof actionMessages],
        incident_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
