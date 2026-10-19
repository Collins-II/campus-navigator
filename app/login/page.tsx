'use client';

import { signIn, useSession } from 'next-auth/react';
import { GraduationCap, Mail, User } from 'lucide-react';
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
import { PageHeader } from '@/components/ui/PageHeader';

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
    if (!password) return { label: 'Empty', value: 0, color: 'bg-gray-400' };
    let score = 0;
    if (password.length >= 6) score += 35;
    if (password.length >= 10) score += 20;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;

    if (score < 40) return { label: 'Weak', value: 25, color: 'bg-rose-400' };
    if (score < 70) return { label: 'Medium', value: 60, color: 'bg-amber-400' };
    return { label: 'Strong', value: 100, color: 'bg-emerald-600' };
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
        throw new Error(
          result.error === 'CredentialsSignin'
            ? 'Invalid student ID or password. Please try again.'
            : 'Sign-in is temporarily unavailable. Please try again shortly.'
        );
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
      <main className="ui-page flex min-h-screen items-center justify-center p-4 text-gray-900">
        <div className="rounded-2xl border border-gray-300 bg-white px-6 py-4 text-sm text-gray-700">
          Preparing secure campus access...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-4 text-slate-900 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader title={mode === 'login' ? 'Sign in' : 'Join'} />
      </div>
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 pb-10 text-gray-900 shadow-sm">

        <div className="mb-5 grid grid-cols-2 border-2 border-black">
          {(['login', 'register'] as AuthMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setError('');
                setSuccess('');
              }}
              className={`px-3 py-3 text-xs font-black uppercase tracking-widest transition ${
                mode === option
                  ? 'bg-black text-white'
                  : 'text-black hover:bg-gray-100'
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

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-[#008236] px-4 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#016630] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'login' ? 'Continue to dashboard' : 'Create account'}
          </button>
        </form>
      </div>
    </main>
  );
}
