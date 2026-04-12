import { useState, useRef, useEffect } from 'react'
import {
  loginUser,
  registerUser,
  sendVerificationCode,
  verifyCode,
  markUserVerified,
  emailExists,
  EMAIL_CONFIGURED,
} from '../utils/auth'

// ─── Left panel decoration ────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-[46%] bg-[#1a3a5c] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0">
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-8 w-32 h-32 bg-white/5 rounded-full" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-14">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-lg tracking-tight">UniRide</p>
            <p className="text-white/50 text-xs">Carpooling universitario</p>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white leading-tight mb-4">
          Comparte el camino,<br />
          <span className="text-white/50">comparte la U.</span>
        </h1>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs">
          Conecta con compañeros que van en tu misma dirección. Publica rutas, gestiona cupos y viaja seguro.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-3">
        {[
          { num: '2,400+', label: 'Estudiantes activos' },
          { num: '98%',    label: 'Viajes completados'  },
          { num: '4.8★',  label: 'Calificación media'  },
        ].map((s) => (
          <div key={s.label} className="bg-white/10 rounded-xl p-3.5">
            <p className="text-white font-bold text-xl">{s.num}</p>
            <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepDot({ active, done }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300
      ${done  ? 'bg-[#1a3a5c] text-white' :
        active ? 'bg-[#1a3a5c] text-white ring-4 ring-[#1a3a5c]/20' :
                 'bg-slate-100 text-slate-400'}`}
    >
      {done ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : active ? '●' : '○'}
    </div>
  )
}

function Steps({ current, total }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <StepDot active={current === i + 1} done={current > i + 1} />
          {i < total - 1 && (
            <div className={`h-px w-8 transition-all duration-500 ${current > i + 1 ? 'bg-[#1a3a5c]' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function OTPInput({ value, onChange }) {
  const refs = Array.from({ length: 6 }, () => useRef(null))
  const digits = (value + '      ').slice(0, 6).split('')

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = digits.map((d, idx) => (idx === i ? char : d === ' ' ? '' : d))
    onChange(arr.join('').trimEnd())
    if (char && i < 5) refs[i + 1].current?.focus()
  }

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const arr = digits.map((d, idx) => (idx === i ? '' : d === ' ' ? '' : d))
      onChange(arr.join('').trimEnd())
      if (i > 0) refs[i - 1].current?.focus()
    }
    if (e.key === 'ArrowLeft'  && i > 0) refs[i - 1].current?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs[i + 1].current?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    refs[Math.min(pasted.length, 5)].current?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i} ref={refs[i]}
          type="text" inputMode="numeric" maxLength={1}
          value={d.trim()}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          style={{ height: '52px' }}
          className={`w-11 text-center text-xl font-semibold border rounded-xl outline-none transition-all
            ${d.trim() ? 'border-[#1a3a5c] bg-[#1a3a5c]/5 text-[#1a3a5c]' : 'border-slate-200 bg-white text-slate-800'}
            focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20`}
        />
      ))}
    </div>
  )
}

function Countdown({ seconds, onExpire }) {
  const [rem, setRem] = useState(seconds)
  useEffect(() => {
    setRem(seconds)
    const iv = setInterval(() => setRem((r) => { if (r <= 1) { clearInterval(iv); onExpire(); return 0 } return r - 1 }), 1000)
    return () => clearInterval(iv)
  }, [seconds])
  const m = String(Math.floor(rem / 60)).padStart(2, '0')
  const s = String(rem % 60).padStart(2, '0')
  return <span className={`font-mono font-medium ${rem < 60 ? 'text-rose-500' : 'text-[#1a3a5c]'}`}>{m}:{s}</span>
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
      </svg>
      {msg}
    </div>
  )
}

function SubmitBtn({ loading, label, loadingLabel, disabled }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full bg-[#1a3a5c] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#2a4f7c] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{loadingLabel}</>
      ) : label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login')

  const [step, setStep]               = useState(1)
  const [otp, setOtp]                 = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [codeMethod, setCodeMethod]   = useState('console')
  const [expired, setExpired]         = useState(false)
  const [resendCooldown, setResendCooldown] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [pendingUser, setPendingUser] = useState(null)

  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPwd, setShowLoginPwd]   = useState(false)

  const [regName, setRegName]         = useState('')
  const [regEmail, setRegEmail]       = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm]   = useState('')
  const [regRole, setRegRole]         = useState('both')
  const [showRegPwd, setShowRegPwd]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  function switchMode(m) {
    setMode(m); setStep(1); setError(''); setOtp('')
    setLoginEmail(''); setLoginPassword('')
    setRegName(''); setRegEmail(''); setRegPassword(''); setRegConfirm('')
    setFieldErrors({})
  }

  function validateRegister() {
    const errs = {}
    if (!regName.trim() || regName.trim().split(' ').length < 2)
      errs.name = 'Ingresa nombre y apellido'
    if (!regEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail))
      errs.email = 'Ingresa un correo válido'
    if (regPassword.length < 6)
      errs.password = 'Mínimo 6 caracteres'
    if (regPassword !== regConfirm)
      errs.confirm = 'Las contraseñas no coinciden'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function triggerSendCode(email, name = '') {
    setLoading(true)
    const result = await sendVerificationCode(email, name)
    setMaskedEmail(result.maskedEmail)
    setCodeMethod(result.method)
    setExpired(false); setOtp('')
    setLoading(false); setStep(2)
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────
  async function handleLoginSubmit(e) {
    e.preventDefault(); setError('')
    if (!loginEmail || !loginPassword) { setError('Completa todos los campos.'); return }
    setLoading(true)
    const result = await loginUser(loginEmail, loginPassword)
    setLoading(false)
    if (!result.success) { setError(result.reason); return }
    setPendingUser(result.user)
    await triggerSendCode(loginEmail, result.user.name)
  }

  // ── REGISTER ─────────────────────────────────────────────────────────────
  async function handleRegisterSubmit(e) {
    e.preventDefault(); setError('')
    if (!validateRegister()) return
    setLoading(true)
    const result = await registerUser({ name: regName.trim(), email: regEmail.toLowerCase(), password: regPassword, role: regRole })
    setLoading(false)
    if (!result.success) { setError(result.reason); return }
    setPendingUser(result.user)
    await triggerSendCode(regEmail, regName.trim())
  }

  // ── OTP ───────────────────────────────────────────────────────────────────
  async function handleOTPSubmit(e) {
    e.preventDefault(); setError('')
    const clean = otp.replace(/\s/g, '')
    if (clean.length < 6) { setError('Ingresa los 6 dígitos del código.'); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    const result = verifyCode(mode === 'login' ? loginEmail : regEmail, clean)
    setLoading(false)
    if (!result.valid) { setError(result.reason); setOtp(''); return }
    if (mode === 'register') markUserVerified(pendingUser.email)
    setStep(3)
    await new Promise((r) => setTimeout(r, 1100))
    onLogin(pendingUser)
  }

  async function handleResend() {
    if (resendCooldown) return
    setError(''); setOtp(''); setExpired(false); setResendCooldown(true)
    const email = mode === 'login' ? loginEmail : regEmail
    setLoading(true)
    const result = await sendVerificationCode(email, pendingUser?.name || '')
    setMaskedEmail(result.maskedEmail); setCodeMethod(result.method)
    setLoading(false)
    setTimeout(() => setResendCooldown(false), 30000)
  }

  function EyeBtn({ show, toggle }) {
    return (
      <button type="button" onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <LeftPanel />

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 overflow-auto">
        <div className="w-full max-w-md">

          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-[#1a3a5c] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <span className="font-semibold text-[#1a3a5c]">UniRide</span>
          </div>

          {step === 1 && (
            <div className="flex bg-slate-100 rounded-xl p-1 mb-8 gap-1">
              {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([m, label]) => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all duration-150
                    ${mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {step > 1 && <Steps current={step} total={3} />}

          {/* ── LOGIN ── */}
          {mode === 'login' && step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Bienvenido de vuelta</h2>
              <p className="text-slate-500 text-sm mb-7">Ingresa con tu correo y contraseña</p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Correo electrónico</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20 bg-white text-slate-800 placeholder-slate-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input type={showLoginPwd ? 'text' : 'password'} value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20 bg-white text-slate-800 placeholder-slate-400 transition-all"
                    />
                    <EyeBtn show={showLoginPwd} toggle={() => setShowLoginPwd(!showLoginPwd)} />
                  </div>
                </div>
                <ErrorBanner msg={error} />
                <SubmitBtn loading={loading} label="Continuar" loadingLabel="Verificando..." />
              </form>

              <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 mb-2">Cuentas de prueba (contraseña: 123456)</p>
                {[
                  ['sara.aranda@unal.edu.co', 'Conductor + Pasajero'],
                  ['carlos.m@unal.edu.co',    'Solo conductor'],
                  ['diana.r@unal.edu.co',     'Solo pasajera'],
                ].map(([mail, rol]) => (
                  <button key={mail} onClick={() => { setLoginEmail(mail); setLoginPassword('123456') }}
                    className="w-full text-left mb-1 last:mb-0 group"
                  >
                    <span className="text-xs text-slate-400 group-hover:text-[#1a3a5c] transition-colors">{mail}</span>
                    <span className="text-[10px] text-slate-300 ml-1.5">{rol}</span>
                  </button>
                ))}
                {!EMAIL_CONFIGURED && (
                  <p className="text-[10px] text-amber-600 mt-2 pt-2 border-t border-slate-200">
                    EmailJS no configurado — el código aparece en consola (F12)
                  </p>
                )}
              </div>

              <p className="text-center text-sm text-slate-400 mt-5">
                ¿No tienes cuenta?{' '}
                <button onClick={() => switchMode('register')} className="text-[#1a3a5c] font-medium hover:underline">
                  Regístrate gratis
                </button>
              </p>
            </div>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Crear cuenta</h2>
              <p className="text-slate-500 text-sm mb-7">Únete a la comunidad de carpooling</p>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre completo</label>
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Juan Pérez"
                    className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400
                      ${fieldErrors.name ? 'border-rose-300 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20'}`}
                  />
                  {fieldErrors.name && <p className="mt-1 text-xs text-rose-500">{fieldErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Correo electrónico</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="tu@correo.com"
                    className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400
                      ${fieldErrors.email ? 'border-rose-300 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20'}`}
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-rose-500">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input type={showRegPwd ? 'text' : 'password'} value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                      className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400
                        ${fieldErrors.password ? 'border-rose-300 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20'}`}
                    />
                    <EyeBtn show={showRegPwd} toggle={() => setShowRegPwd(!showRegPwd)} />
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-xs text-rose-500">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmar contraseña</label>
                  <input type={showRegPwd ? 'text' : 'password'} value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)} placeholder="Repite la contraseña"
                    className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400
                      ${fieldErrors.confirm ? 'border-rose-300 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20'}`}
                  />
                  {fieldErrors.confirm && <p className="mt-1 text-xs text-rose-500">{fieldErrors.confirm}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">¿Cómo vas a usar UniRide?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'driver',    label: 'Conductor',   icon: '🚗' },
                      { id: 'passenger', label: 'Pasajero',    icon: '🎒' },
                      { id: 'both',      label: 'Ambos roles', icon: '⇄'  },
                    ].map((r) => (
                      <button key={r.id} type="button" onClick={() => setRegRole(r.id)}
                        className={`py-3 px-2 border rounded-xl text-xs font-medium transition-all text-center
                          ${regRole === r.id ? 'border-[#1a3a5c] bg-[#1a3a5c]/5 text-[#1a3a5c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                      >
                        <div className="text-lg mb-1">{r.icon}</div>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <ErrorBanner msg={error} />
                <SubmitBtn loading={loading} label="Crear cuenta y verificar" loadingLabel="Registrando..." />
              </form>

              <p className="text-center text-sm text-slate-400 mt-5">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => switchMode('login')} className="text-[#1a3a5c] font-medium hover:underline">
                  Inicia sesión
                </button>
              </p>
            </div>
          )}

          {/* ── OTP ── */}
          {step === 2 && (
            <div>
              <div className="w-12 h-12 bg-[#1a3a5c]/10 rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-[#1a3a5c]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-1">Verificación en dos pasos</h2>
              <p className="text-slate-500 text-sm mb-1">
                {codeMethod === 'email' ? 'Te enviamos un código de 6 dígitos a' : 'Código generado para'}
              </p>
              <p className="text-[#1a3a5c] font-medium text-sm mb-1">{maskedEmail}</p>

              {codeMethod !== 'email' && (
                <div className="mb-5 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                  </svg>
                  <span>EmailJS no configurado — revisa la consola del navegador (F12) para ver el código</span>
                </div>
              )}

              <form onSubmit={handleOTPSubmit} className="space-y-5 mt-4">
                <OTPInput value={otp} onChange={setOtp} />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Expira en: {!expired
                    ? <Countdown seconds={300} onExpire={() => setExpired(true)} />
                    : <span className="text-rose-500 font-medium">Expirado</span>}
                  </span>
                </div>
                <ErrorBanner msg={error} />
                <SubmitBtn
                  loading={loading}
                  label="Verificar e ingresar"
                  loadingLabel="Verificando..."
                  disabled={otp.replace(/\s/g, '').length < 6}
                />
              </form>

              <div className="mt-5 flex items-center justify-between text-sm">
                <button onClick={() => { setStep(1); setOtp(''); setError('') }}
                  className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
                  </svg>
                  Volver
                </button>
                <button onClick={handleResend} disabled={resendCooldown && !expired}
                  className="text-xs text-[#1a3a5c] font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Reenviando...' : 'Reenviar código'}
                </button>
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {mode === 'register' ? '¡Cuenta creada!' : '¡Identidad verificada!'}
              </h2>
              <p className="text-slate-500 text-sm">Ingresando a tu panel...</p>
              <div className="mt-5 flex justify-center">
                <svg className="w-5 h-5 animate-spin text-[#1a3a5c]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
