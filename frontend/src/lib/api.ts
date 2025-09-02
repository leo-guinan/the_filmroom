/**
 * Get the API URL based on environment
 * Ensures HTTPS is used in production
 */
export function getApiUrl(): string {
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // In production (detected by window.location), always use HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    // If we're on the production domain, use the production API
    if (window.location.hostname === 'filmroom.leoasaservice.com') {
      return 'https://coachapi.leoasaservice.com'
    }
    // For other HTTPS sites, construct HTTPS API URL
    return `https://${window.location.hostname}:8000`
  }
  
  // Default to localhost for development
  return 'http://localhost:8000'
}

/**
 * Make an authenticated API request
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = localStorage.getItem('access_token')
  const apiUrl = getApiUrl()
  
  const headers = {
    ...options.headers,
    'Authorization': accessToken ? `Bearer ${accessToken}` : '',
  }
  
  return fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  })
}