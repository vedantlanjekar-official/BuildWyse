import { QueryState } from '@/components/QueryState'
import { AvatarCropDialog } from '@/components/profile/AvatarCropDialog'
import { PaymentMethodsSection } from '@/components/profile/PaymentMethodsSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { userService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Fingerprint,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Singapore',
  'United Arab Emirates',
  'Germany',
  'Other',
]

const GOV_ID_OPTIONS = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
] as const

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Other',
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`h-full overflow-hidden rounded-3xl border border-[#dce6e3] bg-white/90 shadow-[0_18px_50px_rgba(13,42,40,0.06)] backdrop-blur ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eef3f1] px-6 py-5 sm:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">{eyebrow}</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-[#0d2a28]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7c78]">{description}</p>
        </div>
        {action}
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-7">{children}</div>
    </section>
  )
}

export function ProfilePage() {
  const queryClient = useQueryClient()
  const setProfile = useAuthStore((s) => s.setProfile)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const govIdInputRef = useRef<HTMLInputElement>(null)
  const govIdFileRef = useRef<File | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => userService.me() as Promise<Profile>,
  })

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('India')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [govIdType, setGovIdType] = useState<(typeof GOV_ID_OPTIONS)[number]['value']>('aadhaar')
  const [govIdNumber, setGovIdNumber] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [emailDebug, setEmailDebug] = useState<string | null>(null)
  const [phoneDebug, setPhoneDebug] = useState<string | null>(null)
  const [govIdFileName, setGovIdFileName] = useState<string | null>(null)
  const [govIdPreview, setGovIdPreview] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setFullName(data.full_name ?? '')
    setPhone(data.phone ?? '')
    setCountry(data.country || 'India')
    setAddressLine1(data.address_line1 ?? data.address ?? '')
    setAddressLine2(data.address_line2 ?? '')
    setState(data.state ?? '')
    setCity(data.city ?? '')
    setPincode(data.pincode ?? '')
    setGovIdType((data.government_id_type as (typeof GOV_ID_OPTIONS)[number]['value']) || 'aadhaar')
    const rawId = data.government_id_number || data.aadhaar_number || ''
    setGovIdNumber(rawId.includes('X') || rawId.includes('•') ? '' : rawId)
    setGovIdPreview(data.government_id_url ?? null)
    setProfile(data)
  }, [data, setProfile])

  const location = useLocation()
  useEffect(() => {
    if (location.hash !== '#verification') return
    const el = document.getElementById('verification')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, data])

  const checklist = useMemo(() => {
    if (!data) return []
    const addressOk = Boolean(data.address_line1 && data.city && data.state && data.pincode)
    return [
      { label: 'Photo', ok: Boolean(data.avatar_url) },
      { label: 'Name', ok: Boolean(data.full_name) },
      { label: 'Email OTP', ok: Boolean(data.email_verified) },
      { label: 'Phone OTP', ok: Boolean(data.phone_verified) },
      { label: 'Country', ok: Boolean(data.country) },
      { label: 'Address', ok: addressOk },
      { label: 'Gov ID', ok: Boolean(data.government_id_verified) },
    ]
  }, [data])

  const progress = checklist.length
    ? Math.round((checklist.filter((item) => item.ok).length / checklist.length) * 100)
    : 0

  const invalidate = async (profile?: Profile) => {
    await queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    if (profile) setProfile(profile)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      userService.updateMe({
        full_name: fullName.trim(),
        phone: phone.trim(),
        country,
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
        state: state.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
      }) as Promise<Profile>,
    onSuccess: async (profile) => {
      await invalidate(profile)
    },
  })

  const avatarMutation = useMutation({
    mutationFn: async (file: File) =>
      userService.uploadAvatar({
        filename: file.name,
        content_type: file.type || 'image/jpeg',
        data_base64: await fileToBase64(file),
      }) as Promise<Profile>,
    onSuccess: async (profile) => {
      setCropOpen(false)
      setCropSrc(null)
      await invalidate(profile)
    },
  })

  const sendEmailOtp = useMutation({
    mutationFn: () => userService.sendOtp('email'),
    onSuccess: (res) => setEmailDebug(res.debug_code ?? null),
  })

  const sendPhoneOtp = useMutation({
    mutationFn: async () => {
      if (phone.trim() && phone.trim() !== data?.phone) {
        await userService.updateMe({ phone: phone.trim() })
      }
      return userService.sendOtp('phone')
    },
    onSuccess: (res) => setPhoneDebug(res.debug_code ?? null),
  })

  const verifyEmailOtp = useMutation({
    mutationFn: () => userService.verifyOtp('email', emailOtp.trim()) as Promise<Profile>,
    onSuccess: async (profile) => {
      setEmailOtp('')
      setEmailDebug(null)
      await invalidate(profile)
    },
  })

  const verifyPhoneOtp = useMutation({
    mutationFn: () => userService.verifyOtp('phone', phoneOtp.trim()) as Promise<Profile>,
    onSuccess: async (profile) => {
      setPhoneOtp('')
      setPhoneDebug(null)
      await invalidate(profile)
    },
  })

  const govIdMutation = useMutation({
    mutationFn: async (file: File) =>
      userService.submitGovernmentId({
        id_type: govIdType,
        id_number: govIdNumber.trim(),
        filename: file.name,
        content_type: file.type || 'image/jpeg',
        data_base64: await fileToBase64(file),
      }) as Promise<Profile>,
    onSuccess: async (profile) => {
      await invalidate(profile)
    },
  })

  const onAvatarPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const src = await fileToBase64(file)
    setCropSrc(src)
    setCropOpen(true)
  }

  const onGovIdPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    govIdFileRef.current = file
    setGovIdFileName(file.name)
    void fileToBase64(file).then(setGovIdPreview)
    event.target.value = ''
  }

  const submitGovId = () => {
    const file = govIdFileRef.current
    if (!file || !govIdNumber.trim()) return
    govIdMutation.mutate(file)
  }

  const govIdLabel = GOV_ID_OPTIONS.find((item) => item.value === govIdType)?.label || 'Government ID'
  const idPlaceholder =
    govIdType === 'aadhaar'
      ? '12-digit Aadhaar number'
      : govIdType === 'pan'
        ? 'ABCDE1234F'
        : govIdType === 'passport'
          ? 'Passport number'
          : 'Document number'

  return (
    <div className="relative -mx-4 min-h-full overflow-hidden lg:-mx-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(143,212,197,0.28),transparent_55%),linear-gradient(180deg,#102f2c_0%,#102f2c_38%,transparent_38%)]" />

      <div className="relative w-full space-y-6 px-4 pb-10 lg:px-8">
        <QueryState isLoading={isLoading} isError={isError} error={error} data={data}>
          {(profile) => (
            <>
              <div
                id="verification"
                className="scroll-mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#0d2a28] text-white shadow-[0_30px_80px_rgba(13,42,40,0.35)]"
              >
                <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8fd4c5]">Client profile</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                        {profile.full_name || 'Complete your identity'}
                      </h1>
                      {profile.is_fully_verified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8fd4c5] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0d2a28]">
                          <BadgeCheck className="h-4 w-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                          <ShieldCheck className="h-4 w-4" />
                          {profile.verification_status}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
                      Verify email, phone, and government ID to unlock your full BuildWyse client badge.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Verification progress</span>
                      <span className="font-semibold text-[#8fd4c5]">{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8fd4c5,#c4a574)] transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-5 flex gap-2">
                      {checklist.map((item) => (
                        <div
                          key={item.label}
                          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/10 px-2 py-2.5 text-center text-[10px] leading-tight text-white/80 sm:text-xs"
                        >
                          <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${item.ok ? 'text-[#8fd4c5]' : 'text-white/25'}`} />
                          <span className="line-clamp-2">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
                <SectionCard
                  eyebrow="Identity"
                  title="Profile photo"
                  description="Upload a portrait, then crop it to a clean square before saving."
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-[#d7e0e4] bg-[#f4f7f6] shadow-inner">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.full_name || 'Profile'} className="h-full w-full object-cover" />
                        ) : (
                          <UserRound className="h-14 w-14 text-[#9aaba6]" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-1 right-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0d2a28] text-white shadow-lg transition hover:bg-[#16403c]"
                        aria-label="Upload profile photo"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onAvatarPick(e)} />
                    </div>
                    <p className="mt-5 text-sm font-medium text-[#0d2a28]">{profile.full_name || 'Add your name'}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#6b7c78]">{profile.account_type}</p>
                    <Button
                      variant="outline"
                      className="mt-5 rounded-xl"
                      disabled={avatarMutation.isPending}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {avatarMutation.isPending ? 'Uploading…' : 'Upload image'}
                    </Button>
                  </div>
                </SectionCard>

                <div className="grid gap-6">
                  <SectionCard
                    eyebrow="Basics"
                    title="Personal details"
                    description="Name, location, and structured address for your BuildWyse workspace."
                    action={
                      <Button
                        className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                      >
                        {saveMutation.isPending ? 'Saving…' : 'Save details'}
                      </Button>
                    }
                  >
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      <label className="block md:col-span-2 xl:col-span-2">
                        <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          <UserRound className="h-3.5 w-3.5" /> Name
                        </span>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl" placeholder="Your full name" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          Type of account
                        </span>
                        <Input value={profile.account_type} disabled className="h-11 rounded-xl capitalize" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          <MapPin className="h-3.5 w-3.5" /> Country
                        </span>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="flex h-11 w-full rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        >
                          {COUNTRIES.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block md:col-span-2 xl:col-span-2">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          Address line 1
                        </span>
                        <Input
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          className="h-11 rounded-xl"
                          placeholder="House / street / landmark"
                        />
                      </label>

                      <label className="block md:col-span-2 xl:col-span-3">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          Address line 2
                        </span>
                        <Input
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          className="h-11 rounded-xl"
                          placeholder="Apartment, area, locality (optional)"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          State
                        </span>
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="flex h-11 w-full rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        >
                          <option value="">Select state</option>
                          {INDIAN_STATES.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          City
                        </span>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-11 rounded-xl" placeholder="City" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          Pincode
                        </span>
                        <Input
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="h-11 rounded-xl"
                          placeholder="6-digit PIN"
                        />
                      </label>
                    </div>
                  </SectionCard>

                  <SectionCard
                    eyebrow="Contact verification"
                    title="Email & phone OTP"
                    description="Both channels must be verified with a one-time code."
                  >
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="rounded-2xl border border-[#e5ecea] bg-[#f8fbfa] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#0d2a28]">
                            <Mail className="h-4 w-4 text-[var(--color-primary)]" />
                            Email ID
                          </div>
                          {profile.email_verified ? <CheckCircle2 className="h-5 w-5 text-[#1f7a6c]" aria-label="Verified" /> : null}
                        </div>
                        <p className="mt-3 break-all text-sm text-[#3d524e]">{profile.email}</p>
                        {!profile.email_verified ? (
                          <div className="mt-4 space-y-3">
                            <Button
                              variant="outline"
                              className="w-full rounded-xl"
                              disabled={sendEmailOtp.isPending}
                              onClick={() => sendEmailOtp.mutate()}
                            >
                              {sendEmailOtp.isPending ? 'Sending…' : 'Send email OTP'}
                            </Button>
                            {emailDebug ? <p className="text-xs text-[#6b7c78]">Dev code: {emailDebug}</p> : null}
                            <div className="flex gap-2">
                              <Input
                                value={emailOtp}
                                onChange={(e) => setEmailOtp(e.target.value)}
                                placeholder="6-digit OTP"
                                className="h-11 rounded-xl"
                              />
                              <Button
                                className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                                disabled={verifyEmailOtp.isPending || emailOtp.trim().length < 4}
                                onClick={() => verifyEmailOtp.mutate()}
                              >
                                Verify
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-[#e5ecea] bg-[#f8fbfa] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#0d2a28]">
                            <Phone className="h-4 w-4 text-[var(--color-primary)]" />
                            Contact number
                          </div>
                          {profile.phone_verified ? <CheckCircle2 className="h-5 w-5 text-[#1f7a6c]" aria-label="Verified" /> : null}
                        </div>
                        {profile.phone ? (
                          <p className="mt-3 text-sm text-[#3d524e]">{profile.phone}</p>
                        ) : (
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 XXXXX XXXXX"
                            className="mt-3 h-11 rounded-xl bg-white"
                          />
                        )}
                        {!profile.phone_verified && (profile.phone || phone.trim()) ? (
                          <div className="mt-4 space-y-3">
                            <Button
                              variant="outline"
                              className="w-full rounded-xl"
                              disabled={sendPhoneOtp.isPending}
                              onClick={() => sendPhoneOtp.mutate()}
                            >
                              {sendPhoneOtp.isPending ? 'Sending…' : 'Send phone OTP'}
                            </Button>
                            {phoneDebug ? <p className="text-xs text-[#6b7c78]">Dev code: {phoneDebug}</p> : null}
                            <div className="flex gap-2">
                              <Input
                                value={phoneOtp}
                                onChange={(e) => setPhoneOtp(e.target.value)}
                                placeholder="6-digit OTP"
                                className="h-11 rounded-xl"
                              />
                              <Button
                                className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                                disabled={verifyPhoneOtp.isPending || phoneOtp.trim().length < 4}
                                onClick={() => verifyPhoneOtp.mutate()}
                              >
                                Verify
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    eyebrow="Government ID"
                    title="Official identity document"
                    description="Select an official ID type, enter the document number, and upload a clear scan."
                    action={
                      profile.government_id_verified ? (
                        <CheckCircle2 className="h-5 w-5 text-[#1f7a6c]" aria-label="Verified" />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                          <Fingerprint className="h-3.5 w-3.5" /> Required for full badge
                        </span>
                      )
                    }
                  >
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                            Government ID type
                          </span>
                          <select
                            value={govIdType}
                            onChange={(e) => setGovIdType(e.target.value as (typeof GOV_ID_OPTIONS)[number]['value'])}
                            disabled={Boolean(profile.government_id_verified)}
                            className="flex h-11 w-full rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-60"
                          >
                            {GOV_ID_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">
                            <IdCard className="h-3.5 w-3.5" /> {govIdLabel} number
                          </span>
                          <Input
                            value={profile.government_id_verified ? profile.government_id_number || profile.aadhaar_number || '' : govIdNumber}
                            onChange={(e) => setGovIdNumber(e.target.value)}
                            placeholder={idPlaceholder}
                            className="h-11 rounded-xl tracking-[0.08em]"
                            disabled={Boolean(profile.government_id_verified)}
                          />
                        </label>
                        {!profile.government_id_verified ? (
                          <div className="flex flex-wrap gap-3">
                            <Button variant="outline" className="rounded-xl" onClick={() => govIdInputRef.current?.click()}>
                              {govIdFileName ? 'Change image' : `Upload ${govIdLabel} image`}
                            </Button>
                            <Button
                              className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                              disabled={govIdMutation.isPending}
                              onClick={submitGovId}
                            >
                              {govIdMutation.isPending ? 'Verifying…' : 'Submit & verify'}
                            </Button>
                            <input
                              ref={govIdInputRef}
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={onGovIdPick}
                            />
                          </div>
                        ) : null}
                        {govIdFileName ? <p className="text-xs text-[#6b7c78]">Selected: {govIdFileName}</p> : null}
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-dashed border-[#c9d7d3] bg-[#f7faf9]">
                        {govIdPreview ? (
                          <img src={govIdPreview} alt={`${govIdLabel} preview`} className="h-48 w-full object-cover" />
                        ) : (
                          <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-[#6b7c78]">
                            <IdCard className="h-8 w-8 text-[#9aaba6]" />
                            {govIdLabel} preview
                          </div>
                        )}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    eyebrow="Verification"
                    title="Account verification"
                    description="Verified accounts unlock payments, certificates, and full platform features."
                  >
                    <div className="space-y-4">
                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm ${
                          profile.is_fully_verified || profile.verification_status === 'verified'
                            ? 'border-[#8fd4c5]/40 bg-[#8fd4c5]/15 text-[#0d2a28]'
                            : 'border-[#dce6e3] bg-[#f7faf9] text-[#3d4f4a]'
                        }`}
                      >
                        Status:{' '}
                        <strong className="capitalize">
                          {profile.is_fully_verified ? 'verified' : profile.verification_status || 'pending'}
                        </strong>
                      </div>
                      <p className="text-sm text-[#6b7c78]">
                        Complete email, phone, and government ID checks in the sections above. Progress is tracked in the
                        profile header.
                      </p>
                      <div className="flex gap-2">
                        {checklist.map((item) => (
                          <div
                            key={`verify-${item.label}`}
                            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#e2ebe8] bg-white px-2 py-2.5 text-center text-[11px] text-[#3d4f4a]"
                          >
                            <CheckCircle2
                              className={`h-3.5 w-3.5 shrink-0 ${item.ok ? 'text-[#1a5c55]' : 'text-[#c5d0cc]'}`}
                            />
                            <span className="line-clamp-1">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    eyebrow="Payments"
                    title="Payment methods"
                    description="Add multiple bank accounts and cards. Choose one card for auto-pay."
                  >
                    <PaymentMethodsSection />
                  </SectionCard>
                </div>
              </div>

              <AvatarCropDialog
                open={cropOpen}
                imageSrc={cropSrc}
                confirming={avatarMutation.isPending}
                onOpenChange={(open) => {
                  setCropOpen(open)
                  if (!open) setCropSrc(null)
                }}
                onConfirm={(file) => avatarMutation.mutate(file)}
              />
            </>
          )}
        </QueryState>
      </div>
    </div>
  )
}
