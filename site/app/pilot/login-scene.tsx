'use client';
import { useState } from 'react';
import { BrandMark, Icon } from './brand';
import './login-scene.css';

/** A visual introduction; the floating labels describe the existing care journey. */
export function LoginScene({ imageSrc = './media/care-consultation.webp' }: { imageSrc?: string }) {
  const [paused, setPaused] = useState(false);
  return <section className={`login-scene ${paused ? 'is-paused' : ''}`} aria-label="همراهی سلامت‌بان">
    <div className="login-scene-art">
      <div className="login-scene-media" aria-hidden="true">
        <svg className="login-scene-fallback" viewBox="0 0 600 580" fill="none">
          <defs><linearGradient id="login-care-wash" x1="80" y1="20" x2="570" y2="580" gradientUnits="userSpaceOnUse"><stop stopColor="#dceaff"/><stop offset="1" stopColor="#f6faff"/></linearGradient><linearGradient id="login-coat" x1="200" y1="290" x2="400" y2="570" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#dce8f9"/></linearGradient></defs>
          <rect width="600" height="580" fill="url(#login-care-wash)"/>
          <circle cx="325" cy="236" r="182" fill="#c6ddff" fillOpacity=".48"/>
          <path d="M28 455c50-110 128-160 220-126s90 155 210 111 142 85 142 140H0Z" fill="#b5d1f8" fillOpacity=".37"/>
          <path d="M329 176c0-42-24-77-67-77-40 0-63 36-63 77v74h130Z" fill="#335680"/>
          <ellipse cx="265" cy="209" rx="50" ry="65" fill="#efd8cc"/>
          <path d="M209 201c-8-83 115-100 115 0-16-12-28-31-31-53-26 26-58 41-84 53Z" fill="#335680"/>
          <path d="M178 332c13-48 45-71 85-71s79 23 92 71l39 239H138Z" fill="url(#login-coat)"/>
          <path d="m245 270 18 27 23-27 12 121h-70Z" fill="#467fd6"/>
          <path d="m245 270-32 26 22 40-19 17 42 76 5-132m23-27 32 26-22 40 19 17-52 76" stroke="#c1d3ee" strokeWidth="3" strokeLinejoin="round"/>
          <path d="M230 296v56a34 34 0 0 0 68 0v-56m-34 90v19c0 31 53 29 53-5v-18" stroke="#5e86bf" strokeWidth="7" strokeLinecap="round"/><circle cx="317" cy="373" r="13" fill="#f4f8ff" stroke="#5e86bf" strokeWidth="7"/>
          <path d="M404 352c-38 0-72 31-76 74l-10 145h178l-19-147c-5-43-32-72-73-72Z" fill="#6c9de8"/>
          <ellipse cx="403" cy="304" rx="45" ry="56" fill="#efd8cc"/><path d="M355 298c-4-47 20-77 49-77 39 0 62 39 50 82-17-8-27-19-34-37-17 19-39 29-65 32Z" fill="#24486f"/>
          <path d="M365 397c28 26 54 35 76 69m-227-37c30 13 59 13 87 3" stroke="#f7faff" strokeWidth="23" strokeLinecap="round"/>
        </svg>
        {/* Fixed intrinsic dimensions reserve the photograph before decoding. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-scene-photo" src={imageSrc} width="1672" height="941" alt="" fetchPriority="high" decoding="async" onError={event => { event.currentTarget.style.visibility = 'hidden'; }}/>
        <span className="login-scene-photo-wash"/>
      </div>
      <div className="login-scene-chip login-scene-chip-doctor" aria-hidden="true"><span className="login-scene-chip-icon"><Icon name="doctor" size={22}/></span><div><strong>با همراهی پزشک</strong><small>از شناخت تا قدم بعد</small></div><span className="login-scene-chip-check"><Icon name="check" size={13}/></span></div>
      <div className="login-scene-chip login-scene-chip-path" aria-hidden="true"><span className="login-scene-chip-icon"><Icon name="route" size={21}/></span><div><strong>مسیرِ خود شما</strong><small>روشن، ساده، قدم به قدم</small></div></div>
      <span className="login-scene-seal" aria-hidden="true"><BrandMark/></span>
      <span className="login-scene-spark login-scene-spark-one" aria-hidden="true">+</span><span className="login-scene-spark login-scene-spark-two" aria-hidden="true">+</span>
      <button type="button" className="login-scene-motion" aria-pressed={paused} aria-label={paused ? 'پخش حرکت گرافیکی' : 'توقف حرکت گرافیکی'} onClick={() => setPaused(value => !value)}><svg viewBox="0 0 20 20" aria-hidden="true">{paused ? <path d="m6 3 10 7-10 7Z" fill="currentColor"/> : <path d="M7 4v12m6-12v12" stroke="currentColor" strokeWidth="2"/>}</svg><span>{paused ? 'پخش حرکت' : 'توقف حرکت'}</span></button>
    </div>

  </section>;
}
