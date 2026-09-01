'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { ArrowLeft, GraduationCap, Mail, ShieldCheck, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  AcademicYearSelect,
  DepartmentSelect,
  PasswordField,
  PhoneInput,
  ProgramSelect,
  TextField,
  departmentPrograms,
} from '@/components/auth/StudentProfileFields';
import Image from 'next/image';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [countryCode, setCountryCode] = useState('+260');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!password) return { label: 'Empty', value: 0, color: 'bg-slate-500' };
    let score = 0;
    if (password.length >= 6) score += 35;
    if (password.length >= 10) score += 20;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;

    if (score < 40) return { label: 'Weak', value: 25, color: 'bg-rose-400' };
    if (score < 70) return { label: 'Medium', value: 60, color: 'bg-amber-400' };
    return { label: 'Strong', value: 100, color: 'bg-emerald-400' };
  }, [password]);

  const handleDepartmentChange = (nextDepartment: string) => {
    setDepartment(nextDepartment);
    const nextPrograms = departmentPrograms[nextDepartment] ?? [];
    if (nextPrograms.length > 0) {
      setProgram(nextPrograms[0]);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }

        if (!studentId.trim()) {
          throw new Error('Please enter your student ID');
        }

        if (!email.trim()) {
          throw new Error('Please enter your university email');
        }

        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const normalizedPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

        const registerResponse = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            studentId,
            email,
            password,
            department,
            program,
            year,
            phone: normalizedPhone,
          }),
        });

        const registerData = await registerResponse.json();
        if (!registerResponse.ok) {
          throw new Error(registerData.error || 'Registration failed');
        }

        setSuccess('Account created. Signing you in...');
      }

      const result = await signIn('credentials', {
        studentId: mode === 'register' ? studentId : studentId,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error('Invalid student ID or password. Please try again.');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed');
    } finally {
      setPending(false);
    }
  };

  if (status === 'loading') {
    return (
      <main className="portal-shell flex min-h-screen items-center justify-center p-4 text-gray-900">
        <div className="rounded-2xl border border-gray-300 bg-white px-6 py-4 text-sm text-gray-700">
          Preparing secure campus access...
        </div>
      </main>
    );
  }

  return (
    <main className="portal-shell flex min-h-screen items-center justify-center p-4 pb-28 text-gray-900 sm:p-6">
      <div className="w-full max-w-lg rounded-[30px] border border-gray-300 bg-white p-6 shadow-md backdrop-blur-md">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-700 transition hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="mb-6 flex items-center gap-3">
            {/* Logo Container */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gradient-to-br from-emerald-50 to-white p-1 shadow-sm ring-1 ring-emerald-100">
            <Image
             src="/images/unza_logo.jpg"
             width={50}
             height={50}
             alt="UNZA Logo"
             className="rounded-lg object-cover"
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">Campus navigator</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-2xl border border-gray-300 bg-gray-50 p-1">
          {(['login', 'register'] as AuthMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setError('');
                setSuccess('');
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === option
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <TextField
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="Enter full name"
                icon={<User className="h-3.5 w-3.5" />}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Student ID"
                  value={studentId}
                  onChange={setStudentId}
                  placeholder="e.g. 20240001"
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                />

                <AcademicYearSelect value={year} onChange={setYear} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DepartmentSelect value={department} onChange={handleDepartmentChange} />
                <ProgramSelect value={program} onChange={setProgram} department={department} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  placeholder="name@university.edu"
                  icon={<Mail className="h-3.5 w-3.5" />}
                />

                <PhoneInput
                  countryCode={countryCode}
                  phoneNumber={phoneNumber}
                  onCountryCodeChange={setCountryCode}
                  onPhoneNumberChange={setPhoneNumber}
                />
              </div>
            </>
          )}

          {!mode || mode === 'login' ? (
            <TextField
              label="Student ID"
              value={studentId}
              onChange={setStudentId}
              placeholder="Enter student ID"
              icon={<GraduationCap className="h-3.5 w-3.5" />}
            />
          ) : null}

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            showPassword={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
            placeholder="Enter your password"
          />

          {password ? (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-gray-600">
                <span>Password strength</span>
                <span>{passwordStrength.label}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-300">
                <div className={`${passwordStrength.color} h-full rounded-full transition-all duration-300`} style={{ width: `${passwordStrength.value}%` }} />
              </div>
            </div>
          ) : null}

          {mode === 'register' && (
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              showPassword={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
              placeholder="Re-enter your password"
            />
          )}

          {error && <p className="text-sm text-rose-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'login' ? 'Continue to dashboard' : 'Create account'}
          </button>
        </form>
      </div>
    </main>
  );
}
