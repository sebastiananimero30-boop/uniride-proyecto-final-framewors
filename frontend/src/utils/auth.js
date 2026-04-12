import emailjs from '@emailjs/browser'
import { apiLogin, apiRegister, apiLogout, apiMe, setToken, getToken, removeToken } from '../services/api'


const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'

const EMAILJS_CONFIG = {
  serviceId:  import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'YOUR_SERVICE_ID',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID',
  publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'YOUR_PUBLIC_KEY',
}

const EMAIL_CONFIGURED =
  EMAILJS_CONFIG.serviceId  !== 'YOUR_SERVICE_ID' &&
  EMAILJS_CONFIG.templateId !== 'YOUR_TEMPLATE_ID' &&
  EMAILJS_CONFIG.publicKey  !== 'YOUR_PUBLIC_KEY'

export { EMAIL_CONFIGURED }


const MOCK_USERS = [
  { id: 1, email: 'sara.aranda@unal.edu.co', password: '123456', name: 'Sara Aranda',
    role: 'both', rating_avg: 4.8, avatar: 'SA', verified: true },
  { id: 2, email: 'carlos.m@unal.edu.co',    password: '123456', name: 'Carlos Mora',
    role: 'conductor', rating_avg: 4.7, avatar: 'CM', verified: true },
  { id: 3, email: 'diana.r@unal.edu.co',     password: '123456', name: 'Diana Ruiz',
    role: 'pasajero', rating_avg: 5.0, avatar: 'DR', verified: true },
]

const registeredUsers = [...MOCK_USERS]
const pendingCodes    = {}

function maskEmail(email) {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(0, local.length - 2))}@${domain}`
}

function buildAvatar(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}


export async function loginUser(email, password) {
  if (USE_BACKEND) {
    try {
      const res = await apiLogin({ email, password })
      if (res.token) setToken(res.token)
      const user = res.user || res
      user.avatar = buildAvatar(user.name || email)
      return { success: true, user }
    } catch (e) {
      return { success: false, reason: e.message || 'Correo o contraseña incorrectos.' }
    }
  }

  // Modo demo
  await new Promise((r) => setTimeout(r, 400))
  const user = registeredUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  )
  if (!user) return { success: false, reason: 'Correo o contraseña incorrectos.' }
  return { success: true, user }
}


export async function registerUser({ name, email, password, role }) {
  if (USE_BACKEND) {
    try {
      const backendRole = role === 'driver' ? 'conductor' : role === 'passenger' ? 'pasajero' : role
      const res = await apiRegister({
        name,
        email,
        password,
        password_confirmation: password,
        role: backendRole,
      })
      if (res.token) setToken(res.token)
      const user = res.user || res
      user.avatar = buildAvatar(user.name || name)
      return { success: true, user }
    } catch (e) {
      return { success: false, reason: e.message || 'Error al registrar.' }
    }
  }

  // Modo demo
  const exists = registeredUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())
  if (exists) return { success: false, reason: 'Este correo ya está registrado.' }
  const newUser = {
    id: registeredUsers.length + 1,
    email: email.toLowerCase(), password, name, role,
    rating_avg: null, avatar: buildAvatar(name), verified: false,
  }
  registeredUsers.push(newUser)
  return { success: true, user: newUser }
}


export async function logoutUser() {
  if (USE_BACKEND) {
    try { await apiLogout() } catch {}
    removeToken()
  }
}


export async function restoreSession() {
  if (!USE_BACKEND) return null
  const token = getToken()
  if (!token) return null
  try {
    const user = await apiMe()
    user.avatar = buildAvatar(user.name || '')
    return user
  } catch {
    removeToken()
    return null
  }
}


export function emailExists(email) {
  if (USE_BACKEND) return false
  return registeredUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function markUserVerified(email) {
  const user = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (user) user.verified = true
}

export function validateCredentials(email, password) {
  return registeredUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  ) || null
}


export async function sendVerificationCode(email, userName = '') {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  pendingCodes[email.toLowerCase()] = { code, expiresAt: Date.now() + 5 * 60 * 1000 }
  console.log(`[UniRide OTP] Código para ${email}: ${code}`)

  if (EMAIL_CONFIGURED) {
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId,
        { to_email: email, to_name: userName || email.split('@')[0], otp_code: code, app_name: 'UniRide', time: new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString('es-CO') },
        EMAILJS_CONFIG.publicKey
      )
      return { success: true, maskedEmail: maskEmail(email), method: 'email' }
    } catch (err) {
      console.error('[UniRide] EmailJS error:', err)
    }
  }

  await new Promise((r) => setTimeout(r, 900))
  return { success: true, maskedEmail: maskEmail(email), method: 'console' }
}

export function verifyCode(email, inputCode) {
  const entry = pendingCodes[email.toLowerCase()]
  if (!entry) return { valid: false, reason: 'No se encontró un código activo.' }
  if (Date.now() > entry.expiresAt) {
    delete pendingCodes[email.toLowerCase()]
    return { valid: false, reason: 'El código expiró. Solicita uno nuevo.' }
  }
  if (entry.code !== inputCode.trim()) return { valid: false, reason: 'Código incorrecto. Inténtalo de nuevo.' }
  delete pendingCodes[email.toLowerCase()]
  return { valid: true }
}
