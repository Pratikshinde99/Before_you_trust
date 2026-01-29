import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /upload-evidence
 * 
 * Securely upload evidence files to private storage bucket.
 * Files are NOT publicly accessible - only metadata is stored.
 * 
 * Request: multipart/form-data with:
 * - file: The file to upload
 * - incident_id: UUID of the incident this evidence belongs to
 * 
 * Response: {
 *   success: boolean,
 *   evidence_id: uuid,
 *   file_name: string,
 *   file_type: string,
 *   file_size: number,
 *   confidence_boost: string
 * }
 * 
 * SECURITY:
 * - Files stored in private bucket (no public access)
 * - Uses service role key for storage operations
 * - File URLs are internal paths, not accessible publicly
 * - Only file metadata is returned to client
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role for storage operations (private bucket)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const incidentId = formData.get('incident_id') as string | null;

    // Validate incident_id
    if (!incidentId) {
      return new Response(
        JSON.stringify({ error: 'incident_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(incidentId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid incident_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify incident exists and is in pending status
    const { data: incident, error: incidentError } = await supabaseAdmin
      .from('incident_reports')
      .select('id, status')
      .eq('id', incidentId)
      .maybeSingle();

    if (incidentError || !incident) {
      return new Response(
        JSON.stringify({ error: 'Incident not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow evidence for pending incidents
    if (incident.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Cannot add evidence to non-pending incidents' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF',
          allowed_types: ALLOWED_MIME_TYPES
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: 'File too large. Maximum size is 10MB',
          max_size_bytes: MAX_FILE_SIZE
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check evidence limit per incident (max 5 files)
    const { count: evidenceCount } = await supabaseAdmin
      .from('incident_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('incident_id', incidentId);

    if (evidenceCount && evidenceCount >= 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum 5 evidence files per incident' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure file path (not guessable)
    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const fileExtension = file.name.split('.').pop() || 'bin';
    const securePath = `${incidentId}/${timestamp}-${randomSuffix}.${fileExtension}`;

    // Upload to private bucket using service role
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('incident-evidence')
      .upload(securePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store metadata in database (NOT the actual file)
    // file_url is internal path, not publicly accessible
    const { data: evidence, error: dbError } = await supabaseAdmin
      .from('incident_evidence')
      .insert({
        incident_id: incidentId,
        file_url: securePath, // Internal path only
        file_type: fileExtension,
        file_name: file.name.slice(0, 255), // Sanitize filename length
        file_size_bytes: file.size,
        mime_type: file.type,
        is_verified: false
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Cleanup uploaded file on db error
      await supabaseAdmin.storage.from('incident-evidence').remove([securePath]);
      return new Response(
        JSON.stringify({ error: 'Failed to record evidence' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get updated confidence score
    const { data: updatedIncident } = await supabaseAdmin
      .from('incident_reports')
      .select('verification_confidence')
      .eq('id', incidentId)
      .single();

    console.log(`Evidence uploaded for incident ${incidentId}: ${file.name} (${file.size} bytes)`);

    return new Response(
      JSON.stringify({
        success: true,
        evidence_id: evidence.id,
        file_name: file.name,
        file_type: fileExtension,
        file_size: file.size,
        confidence_score: updatedIncident?.verification_confidence || 0,
        message: 'Evidence uploaded securely. Files are stored privately and not publicly accessible.'
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
