'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [associationId, setAssociationId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [legalName, setLegalName] = useState('')
  const [mailingAddress, setMailingAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [phone, setPhone] = useState('')
  const [assocEmail, setAssocEmail] = useState('')

  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Auth:', user?.id)
      if (!user) return
      setUserId(user.id)

      const profileRes = await supabase
        .from('profiles')
        .select('full_name, title')
        .eq('id', user.id)
      console.log('Profile:', profileRes.data, profileRes.error)
      if (profileRes.data && profileRes.data[0]) {
        setFullName(profileRes.data[0].full_name || '')
        setTitle(profileRes.data[0].title || '')
      }

      const memberRes = await supabase
        .from('association_memberships')
        .select('association_id')
        .eq('user_id', user.id)
      console.log('Memberships:', memberRes.data, memberRes.error)
      if (!memberRes.data || !memberRes.data[0]) return
      const assocId = memberRes.data[0].association_id
      setAssociationId(assocId)

      const assocRes = await supabase
        .from('associations')
        .select('legal_name, mailing_address, city, state, zip, phone, email')
        .eq('id', assocId)
      console.log('Association:', assocRes.data, assocRes.error)
      if (assocRes.data && assocRes.data[0]) {
        setLegalName(assocRes.data[0].legal_name || '')
        setMailingAddress(assocRes.data[0].mailing_address || '')
        setCity(assocRes.data[0].city || '')
        setState(assocRes.data[0].state || '')
        setZip(assocRes.data[0].zip || '')
        setPhone(assocRes.data[0].phone || '')
        setAssocEmail(assocRes.data[0].email || '')
      }
    }
    load()
  }, [])

  async function handleSave() {
    console.log('Save clicked. userId:', userId, 'associationId:', associationId)
    if (!userId || !associationId) {
      console.log('Bailing — missing userId or associationId')
      return
    }
    setSaving(true)
    setSaveMessage('')

    const [profileResult, assocResult] = await Promise.all([
      supabase
        .from('profiles')
        .update({ full_name: fullName, title })
        .eq('id', userId),
      supabase
        .from('associations')
        .update({
          legal_name: legalName,
          mailing_address: mailingAddress,
          city,
          state,
          zip,
          phone,
          email: assocEmail
        })
        .eq('id', associationId)
    ])

    console.log('Profile result:', profileResult)
    console.log('Assoc result:', assocResult)

    setSaving(false)

    if (profileResult.error || assocResult.error) {
      setSaveMessage('Error saving. Please try again.')
    } else {
      setSaveMessage('Settings saved.')
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Association profile and signer information used in generated documents.
          </p>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Association Profile</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={legalName}
              onChange={e => setLegalName(e.target.value)}
              placeholder="Pembrooke Place Homeowners Association, Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={mailingAddress}
              onChange={e => setMailingAddress(e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Westlake"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="OH"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={zip}
                onChange={e => setZip(e.target.value)}
                placeholder="44145"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(440) 555-0100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={assocEmail}
                onChange={e => setAssocEmail(e.target.value)}
                placeholder="info@pembrookeplace.org"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Your Profile</h2>
          <p className="text-sm text-gray-500">
            This name and title appear in the signature block of generated documents.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Community Manager"
            />
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saveMessage && (
            <span style={{color: 'green', fontSize: '0.875rem'}}>{saveMessage}</span>
        )}
        </div>
      </div>
    </div>
  )
}