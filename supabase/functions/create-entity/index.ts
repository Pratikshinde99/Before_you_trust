import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * POST /create-entity
 * 
 * Create a new entity if not already exists
 * 
 * Request Body: {
 *   type: "person" | "business" | "phone" | "website" | "service",
 *   name: string (2-100 chars),
 *   identifier: string (2-255 chars) - phone, URL, address, etc.
 * }
 * 
 * Response: {
 *   id: uuid,
 *   type: string,
 *   name: string,
 *   identifier: string,
 *   created_at: timestamp,
 *   is_new: boolean
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
    const { type, name, identifier } = body;

    // Validation
    const validTypes = ['person', 'business', 'phone', 'website', 'service'];
    if (!type || !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return new Response(
        JSON.stringify({ error: 'Name must be 2-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!identifier || typeof identifier !== 'string' || identifier.trim().length < 2 || identifier.trim().length > 255) {
      return new Response(
        JSON.stringify({ error: 'Identifier must be 2-255 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const normalizedIdentifier = identifier.toLowerCase().trim().replace(/\s+/g, '');

    // Check if entity already exists
    const { data: existing } = await supabase
      .from('entities')
      .select('id, type, name, identifier, created_at')
      .eq('type', type)
      .eq('normalized_identifier', normalizedIdentifier)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ...existing, is_new: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new entity
    const { data, error } = await supabase
      .from('entities')
      .insert({
        type,
        name: name.trim(),
        identifier: identifier.trim(),
        normalized_identifier: normalizedIdentifier
      })
      .select('id, type, name, identifier, created_at')
      .single();

    if (error) {
      console.error('Create entity error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create entity' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ...data, is_new: true }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
