import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Session } from '../types';

const FAQ_ITEMS = [
  {
    q: 'Do we have to pay to join the sessions?',
    a: 'Nope. It\'s totally FREE. You only need to register yourself and secure your slot before it\'s full and closed.',
  },
  {
    q: 'How is the mechanism going to be?',
    a: 'We will discuss a particular topic for 1 hour in English and there will be several breakout rooms consisting of around 5 people with 1 moderator each to build a conducive environment.',
  },
  {
    q: 'How about the level of English?',
    a: 'We\'re mostly from beginner to intermediate level. Don\'t worry about it too much — our purpose is to increase your confidence to speak in English.',
  },
  {
    q: 'What are the topics that will be discussed?',
    a: 'We usually discuss topics related to our daily life so the participants can engage easily with the conversation.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    api.getUpcomingSessions().then(setSessions).catch(() => {});
  }, []);

  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-logo-block">
            <img src="/logo.png" alt="ChitChatClub" className="landing-logo-img" />
          </div>
          <h1>
            Practice English with <span className="highlight">Real Conversations</span>
          </h1>
          <p className="landing-subtitle">
            Build your confidence in English through real conversations with real people.
            Small groups, fun topics, and a safe space where making mistakes is part of the journey.
          </p>
          <div className="landing-cta-group">
            {isLoggedIn ? (
              <Link to="/sessions" className="btn btn-accent btn-lg">
                Browse Sessions
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-accent btn-lg">
                  Join for Free
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  I already have an account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Sessions */}
      {sessions.length > 0 && (
        <section className="landing-section">
          <h2 className="landing-section-title">Upcoming Sessions</h2>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            Here's what's coming up — register now to secure your spot before it fills up!
          </p>
          <div className="landing-sessions">
            {sessions.map((s) => {
              const spotsLeft = s.maxParticipants - s.currentRegistrations;
              const isFull = spotsLeft <= 0;
              const isLow = !isFull && spotsLeft <= 5;
              const startDate = new Date(s.startDateTime);
              return (
                <div key={s.id} className="landing-session-card">
                  <div className="landing-session-date">
                    <span className="landing-session-month">
                      {startDate.toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="landing-session-day">
                      {startDate.getDate()}
                    </span>
                    <span className="landing-session-time">
                      {startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="landing-session-info">
                    <h3>{s.title}</h3>
                    {s.description && (
                      <p className="landing-session-desc">{s.description}</p>
                    )}
                    <div className="landing-session-meta">
                      <span>{s.durationMinutes} min</span>
                      <span
                        className="landing-session-spots"
                        style={{
                          color: isFull ? '#6b7280' : isLow ? '#92400e' : '#1e40af',
                          background: isFull ? '#f3f4f6' : isLow ? '#fef3c7' : '#eff6ff',
                        }}
                      >
                        {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <Link to={isLoggedIn ? '/sessions' : '/register'} className="btn btn-accent">
              {isLoggedIn ? 'View All Sessions' : 'Register to Join a Session'}
            </Link>
          </div>
        </section>
      )}

      {/* Why real conversations */}
      <section className="landing-section landing-section-highlight">
        <h2 className="landing-section-title">Why Real Conversations?</h2>
        <p className="landing-section-subtitle">
          Language apps teach you words. We teach you how to actually use them.
        </p>
        <div className="landing-reasons">
          <div className="landing-reason-card">
            <div className="landing-reason-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3>Practice with Real People</h3>
            <p>
              No scripts, no bots. Have natural conversations with real humans who are
              on the same journey as you. That's how fluency actually happens.
            </p>
          </div>
          <div className="landing-reason-card">
            <div className="landing-reason-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3>Meet New People</h3>
            <p>
              Every session is a chance to connect with someone new. Make friends,
              share stories, and build a community of learners who support each other.
            </p>
          </div>
          <div className="landing-reason-card">
            <div className="landing-reason-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h3>Get Honest Feedback</h3>
            <p>
              After each session, peers can share feedback with you. Find out what you're
              doing well and where you can improve — from people who actually talked with you.
            </p>
          </div>
          <div className="landing-reason-card">
            <div className="landing-reason-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </div>
            <h3>No Pressure, Just Fun</h3>
            <p>
              We talk about everyday topics — travel, food, hobbies, life goals.
              Mistakes are welcome here. The more you enjoy it, the more naturally you'll speak.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <h2 className="landing-section-title">How It Works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3>Register &amp; Pick a Session</h3>
            <p>Create your free account, tell us your English level, and sign up for an upcoming session.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3>Get Matched into a Room</h3>
            <p>We group you into a small breakout room (~5 people) with others at a similar level, led by a friendly moderator.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3>Speak, Learn, Grow</h3>
            <p>Discuss a fun topic for 1 hour in English. No judgment, just practice — the more you enjoy it, the faster you grow.</p>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="landing-section landing-section-highlight">
        <h2 className="landing-section-title">At a Glance</h2>
        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-icon">&#x1F4AC;</span>
            <strong>Real Conversations</strong>
            <p>Talk with real people, not chatbots or recordings.</p>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-icon">&#x1F91D;</span>
            <strong>Small Groups</strong>
            <p>~5 people per room so everyone gets a chance to speak.</p>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-icon">&#x1F393;</span>
            <strong>All Levels Welcome</strong>
            <p>Beginner to advanced — we match you with the right group.</p>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-icon">&#x1F4B0;</span>
            <strong>100% Free</strong>
            <p>No fees, no subscriptions. Practice English at zero cost.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section">
        <h2 className="landing-section-title">Frequently Asked Questions</h2>
        <div className="landing-faq">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="landing-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-section landing-bottom-cta">
        <h2>Your next conversation is waiting.</h2>
        <p>
          Join a community of learners who practice English by actually speaking it —
          with real people, about real topics, in a supportive environment.
        </p>
        <Link to={isLoggedIn ? '/sessions' : '/register'} className="btn btn-accent btn-lg">
          {isLoggedIn ? 'Browse Sessions' : 'Create Your Free Account'}
        </Link>
      </section>
    </div>
  );
}
