import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { auth } from '../../firebase.js'
import { useAuth } from './AuthContext.jsx'
const schema = z.object({ email: z.string().email('أدخل بريدًا إلكترونيًا صحيحًا.'), password: z.string().min(6, 'كلمة المرور ٦ أحرف على الأقل.') })
export function LoginPage() { const { configured } = useAuth(); const [notice, setNotice] = useState(''); const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) }); const submit = async (values) => { setNotice(''); try { await signInWithEmailAndPassword(auth, values.email, values.password) } catch { setNotice('البريد الإلكتروني أو كلمة المرور غير صحيحين.') } }; return <main className="auth-page"><form className="auth-card" onSubmit={handleSubmit(submit)}><Link className="brand" to="/">✚ شفاء</Link><div><h1>أهلًا بعودتك</h1><p>سجّل الدخول للوصول إلى مساحة العمل الخاصة بك.</p></div>{!configured && <div className="alert">أضف متغيرات Firebase في <code>.env.local</code> للاتصال بالمشروع.</div>}<label>البريد الإلكتروني<input type="email" autoComplete="email" {...register('email')} /></label>{errors.email && <p className="field-error">{errors.email.message}</p>}<label>كلمة المرور<input type="password" autoComplete="current-password" {...register('password')} /></label>{errors.password && <p className="field-error">{errors.password.message}</p>}<button className="primary" disabled={isSubmitting || !configured}>{isSubmitting ? 'جارٍ الدخول…' : 'تسجيل الدخول'}</button><Link className="text-button" to="/forgot-password">نسيت كلمة المرور؟</Link>{notice && <p className="alert">{notice}</p>}<p className="auth-switch">ليس لديك حساب؟ <Link to="/register">إنشاء حساب</Link></p></form></main> }
