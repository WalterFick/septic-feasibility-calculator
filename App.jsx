import React, { useMemo, useState } from 'react'

const FIELD_OPTIONS = {
  projectType: [
    ['addition', 'Addition / remodel'],
    ['bedroom_increase', 'Bedroom increase'],
    ['adu', 'ADU / second dwelling'],
    ['unknown', 'Other / unknown'],
  ],
  septicAge: [
    ['under20', 'Under 20 years'],
    ['20to25', '20-25 years'],
    ['over25', 'Over 25 years'],
    ['unknown', 'Unknown'],
  ],
  tankAdequate: [
    ['yes', 'Appears adequate'],
    ['no', 'Appears undersized'],
    ['unknown', 'Unknown / not confirmed'],
  ],
  lotSize: [
    ['normal', 'Normal / unconstrained'],
    ['small', 'Small / somewhat constrained'],
    ['verySmall', 'Very small / highly constrained'],
    ['unknown', 'Unknown'],
  ],
  reserveArea: [
    ['yes', 'Available'],
    ['no', 'Not available'],
    ['unknown', 'Unknown'],
  ],
  siteConditions: [
    ['normal', 'Normal'],
    ['moderate', 'Moderate risk'],
    ['severe', 'Severe risk'],
  ],
}

const initialState = {
  clientName: '',
  propertyAddress: '',
  projectType: 'addition',
  currentBedrooms: '3',
  proposedBedrooms: '3',
  septicAge: 'unknown',
  tankSizeKnown: 'no',
  tankAdequate: 'unknown',
  lotSize: 'unknown',
  drainFieldKnown: 'no',
  reserveArea: 'unknown',
  siteConditions: 'normal',
  priorIssues: 'no',
  additionalDwelling: 'no',
}

function scoreResult(form) {
  const current = Number(form.currentBedrooms) || 0
  const proposed = Number(form.proposedBedrooms) || 0
  let score = 0
  const reasons = []

  if (proposed > current) {
    score += 3
    reasons.push('Bedroom count is increasing.')
  }
  if (form.additionalDwelling === 'yes') {
    score += 3
    reasons.push('Project adds an ADU, second dwelling, or major occupancy increase.')
  }
  if (form.septicAge === '20to25') {
    score += 2
    reasons.push('Septic system is approximately 20-25 years old.')
  }
  if (form.septicAge === 'over25') {
    score += 3
    reasons.push('Septic system is more than 25 years old.')
  }
  if (form.septicAge === 'unknown') {
    score += 2
    reasons.push('Septic age is unknown.')
  }
  if (form.tankSizeKnown === 'no') {
    score += 2
    reasons.push('Tank size is unknown.')
  }
  if (form.tankSizeKnown === 'yes' && form.tankAdequate === 'no') {
    score += 3
    reasons.push('Known tank appears undersized for the proposed load.')
  }
  if (form.tankSizeKnown === 'yes' && form.tankAdequate === 'unknown') {
    score += 1
    reasons.push('Tank is known, but adequacy is not yet confirmed.')
  }
  if (form.lotSize === 'small') {
    score += 2
    reasons.push('Lot size is small or constrained.')
  }
  if (form.lotSize === 'verySmall') {
    score += 3
    reasons.push('Lot size is very constrained.')
  }
  if (form.drainFieldKnown === 'no') {
    score += 2
    reasons.push('Drain field location is unknown.')
  }
  if (form.reserveArea === 'no') {
    score += 2
    reasons.push('No clear reserve drain field area is available.')
  }
  if (form.reserveArea === 'unknown') {
    score += 1
    reasons.push('Reserve area availability is unknown.')
  }
  if (form.siteConditions === 'moderate') {
    score += 2
    reasons.push('Site has moderate risk factors such as slope or intermittent wetness.')
  }
  if (form.siteConditions === 'severe') {
    score += 3
    reasons.push('Site has severe constraints such as high water table, poor soils, or major slope issues.')
  }
  if (form.priorIssues === 'yes') {
    score += 3
    reasons.push('Property has a history of septic issues, backups, or slow drainage.')
  }

  let likelihood = 'Low'
  let band = '0-4 points'
  let recommendation = 'Likely worth pursuing existing septic evaluation first.'
  let meter = 25

  if (score >= 9) {
    likelihood = 'High'
    band = '9+ points'
    recommendation = 'High likelihood a new septic system will be required. Consider quoting replacement upfront to avoid delays.'
    meter = 90
  } else if (score >= 5) {
    likelihood = 'Moderate'
    band = '5-8 points'
    recommendation = 'Borderline case. Present both options early: evaluation path and new-system path.'
    meter = 60
  }

  const internalSummary = [
    `Client: ${form.clientName || 'N/A'}`,
    `Property: ${form.propertyAddress || 'N/A'}`,
    `Project type: ${labelFor('projectType', form.projectType)}`,
    `Risk score: ${score}`,
    `Likelihood new septic required: ${likelihood}`,
    `Recommended path: ${recommendation}`,
    '',
    'Primary factors:',
    ...(reasons.length ? reasons.map((r) => `- ${r}`) : ['- No major risk factors identified from current inputs.'])
  ].join('\n')

  const clientSummary = `Septic pre-screen result${form.clientName ? ` for ${form.clientName}` : ''}${form.propertyAddress ? ` at ${form.propertyAddress}` : ''}: the project currently scores ${score}, which indicates a ${likelihood.toLowerCase()} likelihood that a new septic system will be required. Based on the information available today, the recommended next step is: ${recommendation}`

  return { score, reasons, likelihood, band, recommendation, meter, internalSummary, clientSummary }
}

function labelFor(group, value) {
  return FIELD_OPTIONS[group]?.find(([v]) => v === value)?.[1] || value
}

function copyText(text) {
  return navigator.clipboard.writeText(text)
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([val, text]) => (
          <option key={val} value={val}>{text}</option>
        ))}
      </select>
    </label>
  )
}

function RadioField({ label, value, onChange, yesText = 'Yes', noText = 'No' }) {
  return (
    <div className="field radio-wrap">
      <span>{label}</span>
      <div className="radio-row">
        <label><input type="radio" checked={value === 'yes'} onChange={() => onChange('yes')} /> {yesText}</label>
        <label><input type="radio" checked={value === 'no'} onChange={() => onChange('no')} /> {noText}</label>
      </div>
    </div>
  )
}

export default function App() {
  const [form, setForm] = useState(initialState)
  const [copyStatus, setCopyStatus] = useState('')
  const result = useMemo(() => scoreResult(form), [form])

  const update = (key, value) => setForm((s) => ({ ...s, [key]: value }))

  async function handleCopy(text, label) {
    try {
      await copyText(text)
      setCopyStatus(`${label} copied.`)
      window.setTimeout(() => setCopyStatus(''), 1800)
    } catch {
      setCopyStatus('Copy failed.')
      window.setTimeout(() => setCopyStatus(''), 1800)
    }
  }

  const riskClass = result.likelihood === 'High' ? 'risk-high' : result.likelihood === 'Moderate' ? 'risk-moderate' : 'risk-low'

  return (
    <div className="page">
      <div className="container">
        <header className="hero card">
          <div>
            <div className="eyebrow">Team Septic Pre-Screen Tool</div>
            <h1>Septic Feasibility Web App</h1>
            <p>
              Use this internal screening tool before ordering a formal septic evaluation to estimate
              whether a client is likely to connect to the existing septic system or should be guided
              toward a new septic system earlier.
            </p>
          </div>
          <div className="hero-grid">
            <div><strong>Best time to use</strong><span>First client call or intake review</span></div>
            <div><strong>Time required</strong><span>About 2-3 minutes</span></div>
            <div><strong>Outcome</strong><span>Clear next-step recommendation</span></div>
          </div>
        </header>

        <section className="layout">
          <div className="card form-card">
            <h2>Project intake</h2>
            <p className="subtle">Fill in what your team already knows. Unknown values are okay.</p>
            <div className="form-grid">
              <label className="field">
                <span>Client name</span>
                <input value={form.clientName} onChange={(e) => update('clientName', e.target.value)} placeholder="John Smith" />
              </label>
              <label className="field">
                <span>Property address</span>
                <input value={form.propertyAddress} onChange={(e) => update('propertyAddress', e.target.value)} placeholder="123 Main St" />
              </label>
              <SelectField label="Project type" value={form.projectType} onChange={(v) => update('projectType', v)} options={FIELD_OPTIONS.projectType} />
              <SelectField label="Septic age" value={form.septicAge} onChange={(v) => update('septicAge', v)} options={FIELD_OPTIONS.septicAge} />
              <label className="field">
                <span>Current bedroom count</span>
                <input type="number" min="0" value={form.currentBedrooms} onChange={(e) => update('currentBedrooms', e.target.value)} />
              </label>
              <label className="field">
                <span>Proposed bedroom count</span>
                <input type="number" min="0" value={form.proposedBedrooms} onChange={(e) => update('proposedBedrooms', e.target.value)} />
              </label>
              <RadioField label="Is tank size known?" value={form.tankSizeKnown} onChange={(v) => update('tankSizeKnown', v)} />
              <SelectField label="Tank adequacy for proposed load" value={form.tankAdequate} onChange={(v) => update('tankAdequate', v)} options={FIELD_OPTIONS.tankAdequate} />
              <SelectField label="Lot size / site constraint" value={form.lotSize} onChange={(v) => update('lotSize', v)} options={FIELD_OPTIONS.lotSize} />
              <RadioField label="Drain field location known?" value={form.drainFieldKnown} onChange={(v) => update('drainFieldKnown', v)} />
              <SelectField label="Reserve drain field area" value={form.reserveArea} onChange={(v) => update('reserveArea', v)} options={FIELD_OPTIONS.reserveArea} />
              <SelectField label="Site conditions" value={form.siteConditions} onChange={(v) => update('siteConditions', v)} options={FIELD_OPTIONS.siteConditions} />
              <RadioField label="Prior septic issues?" value={form.priorIssues} onChange={(v) => update('priorIssues', v)} />
              <RadioField label="ADU / second dwelling / major occupancy increase?" value={form.additionalDwelling} onChange={(v) => update('additionalDwelling', v)} />
            </div>
          </div>

          <div className="side-col">
            <div className={`card summary-card ${riskClass}`}>
              <div className="summary-top">
                <div>
                  <div className="subtle">Risk score</div>
                  <div className="score">{result.score}</div>
                </div>
                <div className="badge">{result.likelihood} likelihood</div>
              </div>
              <div className="meter"><div style={{ width: `${result.meter}%` }} /></div>
              <div className="recommendation">
                <strong>{result.band}</strong>
                <p>{result.recommendation}</p>
              </div>
              <div className="button-stack">
                <button onClick={() => handleCopy(result.internalSummary, 'Internal summary')}>Copy internal summary</button>
                <button className="secondary" onClick={() => handleCopy(result.clientSummary, 'Client summary')}>Copy client-ready note</button>
              </div>
              {copyStatus ? <div className="copy-status">{copyStatus}</div> : null}
            </div>

            <div className="card">
              <h3>Why the score landed here</h3>
              <div className="reasons">
                {result.reasons.length ? result.reasons.map((reason) => (
                  <div key={reason} className="reason-item">{reason}</div>
                )) : <div className="reason-item">No major risk factors identified from the current inputs.</div>}
              </div>
            </div>

            <div className="card">
              <h3>Copyable assessment note</h3>
              <textarea readOnly value={result.internalSummary} className="note-box" />
            </div>

            <div className="card">
              <h3>Team guidance</h3>
              <ul className="guidance">
                <li><strong>0-4 points:</strong> Existing septic may be viable. Proceed with evaluation first.</li>
                <li><strong>5-8 points:</strong> Borderline. Present both paths to the client early.</li>
                <li><strong>9+ points:</strong> Strong candidate for a new septic system. Consider quoting replacement upfront.</li>
              </ul>
              <p className="fine-print">This app is an internal screening tool, not an engineering design or Department of Health determination.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
