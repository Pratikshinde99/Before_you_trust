import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limit configurations (requests per hour)
export const RATE_LIMITS = {
  incident_submission: 10,  // Max 10 incident submissions per hour per IP
  entity_creation: 20,      // Max 20 entity creations per hour per IP
  ai_call: 30,              // Max 30 AI calls per hour per IP
  search: 100,              // Max 100 searches per hour per IP
};

/**
 * Creates a Supabase admin client with service role key
 */
export function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/**
 * Hashes an IP address for privacy
 */
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Gets the client IP from request headers
 */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Checks if the request is within rate limits
 * @returns true if within limits, false if exceeded
 */
export async function checkRateLimit(
  req: Request, 
  actionType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const supabaseAdmin = getAdminClient();
  const clientIp = getClientIp(req);
  const ipHash = await hashIp(clientIp);
  const limit = RATE_LIMITS[actionType];
  const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  
  // Count recent requests
  const { count, error } = await supabaseAdmin
    .from('submission_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('action_type', actionType)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow the request but log the error
    return { allowed: true, remaining: limit, resetAt: new Date(Date.now() + 60 * 60 * 1000) };
  }

  const currentCount = count || 0;
  const remaining = Math.max(0, limit - currentCount);
  const resetAt = new Date(Date.now() + 60 * 60 * 1000);

  return {
    allowed: currentCount < limit,
    remaining,
    resetAt
  };
}

/**
 * Records a rate limit event
 */
export async function recordRateLimitEvent(
  req: Request,
  actionType: keyof typeof RATE_LIMITS
): Promise<void> {
  const supabaseAdmin = getAdminClient();
  const clientIp = getClientIp(req);
  const ipHash = await hashIp(clientIp);

  const { error } = await supabaseAdmin
    .from('submission_rate_limits')
    .insert({
      ip_hash: ipHash,
      action_type: actionType
    });

  if (error) {
    console.error('Rate limit record error:', error);
  }
}

/**
 * Rate limit response headers
 */
export function rateLimitHeaders(remaining: number, resetAt: Date): Record<string, string> {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetAt.toISOString()
  };
}
