const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function getToken() {
  return localStorage.getItem('uniride_token')
}

export function setToken(token) {
  localStorage.setItem('uniride_token', token)
}

export function removeToken() {
  localStorage.removeItem('uniride_token')
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const options = { method, headers }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, options)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(' ') : 'Error del servidor')
    throw new Error(message)
  }
  return data
}

export async function apiRegister(payload) {
  return request('POST', '/auth/register', payload, false)
}

export async function apiLogin(payload) {
  return request('POST', '/auth/login', payload, false)
}

export async function apiLogout() {
  return request('POST', '/auth/logout')
}

export async function apiMe() {
  return request('GET', '/auth/me')
}

export async function apiGetTrips() {
  return request('GET', '/trips')
}

export async function apiGetTrip(id) {
  return request('GET', `/trips/${id}`)
}

export async function apiSearchTrips(params) {
  const qs = new URLSearchParams(params).toString()
  return request('GET', `/trips/search?${qs}`)
}

export async function apiCreateTrip(payload) {
  return request('POST', '/trips', payload)
}

export async function apiMyTripsDriver() {
  return request('GET', '/trips/my')
}

export async function apiUpdateTripStatus(id, status) {
  return request('PATCH', `/trips/${id}/status`, { status })
}

export async function apiJoinTrip(tripId, pickupPoint = null) {
  return request('POST', `/trips/${tripId}/join`, { pickup_point: pickupPoint })
}

export async function apiLeaveTrip(tripId, reason = null) {
  return request('DELETE', `/trips/${tripId}/leave`, { reason })
}

export async function apiMyTripsPassenger() {
  return request('GET', '/passenger/my-trips')
}

export async function apiCreateVehicle(payload) {
  return request('POST', '/vehicles', payload)
}

export async function apiGetMyVehicle() {
  return request('GET', '/vehicles/my')
}

export async function apiRateTrip(tripId, payload) {
  return request('POST', `/trips/${tripId}/rate`, payload)
}

export async function apiGetUserRatings(userId) {
  return request('GET', `/users/${userId}/ratings`)
}

export async function apiGetNotifications() {
  return request('GET', '/notifications')
}

export async function apiMarkNotificationRead(id) {
  return request('PATCH', `/notifications/${id}/read`)
}

export async function apiMarkAllNotificationsRead() {
  return request('PATCH', '/notifications/read-all')
}

export async function apiGetDashboard() {
  return request('GET', '/report/dashboard')
}
