import type { ReactNode } from 'react';

export const departmentPrograms: Record<string, string[]> = {
  'Computer Science': ['BSc Computer Science', 'BSc Software Engineering', 'BSc Data Science', 'BSc Cybersecurity'],
  Engineering: ['BEng Civil Engineering', 'BEng Electrical Engineering', 'BEng Mechanical Engineering', 'BSc Architecture'],
  Business: ['BBA Finance', 'BBA Marketing', 'BCom Accounting', 'BSc Economics'],
  'Health Sciences': ['BSc Nursing', 'BSc Pharmacy', 'BSc Public Health', 'BSc Biomedical Science'],
  'Arts & Design': ['BA Graphic Design', 'BA Media Studies', 'BSc Interior Design', 'BFA Fine Arts'],
  Education: ['BEd Primary Education', 'BEd Secondary Education', 'BSc Educational Psychology', 'BA English Education'],
  'Social Sciences': ['BA Sociology', 'BA Political Science', 'BA Psychology', 'BSc Geography'],
  Law: ['LLB Law', 'BSc Legal Studies', 'BA Criminology', 'LLM Preparation'],
};

export const yearOptions = Array.from({ length: 7 }, (_, index) => String(new Date().getFullYear() - index));

export const countryCodes = [
  { label: '+260', value: '+260' },
  { label: '+27', value: '+27' },
  { label: '+256', value: '+256' },
  { label: '+233', value: '+233' },
  { label: '+1', value: '+1' },
  { label: '+44', value: '+44' },
  { label: '+91', value: '+91' },
];

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  icon?: ReactNode;
  className?: string;
};

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        {icon}
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 ${className}`}
      />
    </label>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-current">🔒</span>
        {label}
      </span>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 pr-11 text-sm text-white outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-white"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
  className = '',
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 ${className}`}
      >
        <option value="" className="bg-slate-900 text-slate-300">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900 text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AcademicYearSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return SelectField({
    label: 'Year',
    value,
    onChange,
    options: yearOptions.map((year) => ({ label: year, value: year })),
    icon: <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-current"></span>,
  });
}

export function DepartmentSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return SelectField({
    label: 'Department',
    value,
    onChange,
    options: Object.keys(departmentPrograms).map((department) => ({ label: department, value: department })),
    icon: <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-current"></span>,
  });
}

export function ProgramSelect({
  value,
  onChange,
  department,
}: {
  value: string;
  onChange: (value: string) => void;
  department: string;
}) {
  const options = (departmentPrograms[department] ?? []).map((program) => ({ label: program, value: program }));

  return SelectField({
    label: 'Program',
    value,
    onChange,
    options,
    icon: <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-current"></span>,
  });
}

export function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
}: {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-current">☎</span>
        Phone
      </span>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(event) => onCountryCodeChange(event.target.value)}
          className="w-28 rounded-2xl border border-slate-800 bg-slate-900/60 px-2 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
        >
          {countryCodes.map((code) => (
            <option key={code.value} value={code.value} className="bg-slate-900 text-white">
              {code.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(event) => onPhoneNumberChange(event.target.value.replace(/\D/g, '').slice(0, 12))}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
          placeholder="Enter phone number"
        />
      </div>
    </label>
  );
}
