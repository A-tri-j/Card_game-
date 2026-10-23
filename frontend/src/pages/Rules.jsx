import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Trophy,
  Gamepad2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Flame,
  Award,
  Sparkles,
  Layers,
  Crown,
  Globe,
} from "lucide-react";
import "../rules.css";

// Ultra-Premium Casino Playing Card Component
function LuxuryPlayingCard({
  rank,
  suit,
  suitColor = "suit-black",
  pointsText,
  isZero = false,
  isToken = false,
  isTrump = false,
  label,
  subLabel,
}) {
  return (
    <div
      className={`premium-playing-card ${!isZero ? "card-featured" : ""} ${
        isTrump ? "card-trump-special" : ""
      }`}
    >
      {/* Background Watermark Suit */}
      <span className={`card-watermark-suit ${suitColor}`}>{suit}</span>

      {/* Top-Left Corner Index */}
      <div className={`card-corner-index top-left ${suitColor}`}>
        <span className="corner-rank">{rank}</span>
        <span className="corner-suit">{suit}</span>
      </div>

      {/* Center Ornate Suit / Card Art */}
      <div className="card-center-art">
        <span className={`card-center-suit ${suitColor}`}>{suit}</span>
        {subLabel && <span className="card-center-badge-title">{subLabel}</span>}
      </div>

      {/* Bottom-Right Inverted Corner Index */}
      <div className={`card-corner-index bottom-right ${suitColor}`}>
        <span className="corner-rank">{rank}</span>
        <span className="corner-suit">{suit}</span>
      </div>

      {/* Metallic Gold / Token Embossed Point Pill */}
      <div
        className={`card-point-pill ${isZero ? "zero-pts" : ""} ${
          isToken ? "token-pts" : ""
        }`}
      >
        <span>{pointsText}</span>
      </div>

      {/* Bottom Description Label */}
      {label && <span className="card-caption-label">{label}</span>}
    </div>
  );
}

// Miniature Playing Card for Hierarchy Tracks
function MiniHierarchyCard({ rank, suit, suitColor = "suit-black", ptsText, topLabel }) {
  return (
    <div className="hierarchy-card-mini">
      <div className={`mini-rank-top ${suitColor}`}>
        <span>{rank}</span>
      </div>
      <div className={`mini-suit-center ${suitColor}`}>
        <span>{suit}</span>
      </div>
      <div className="mini-pts-bottom">
        <span>{topLabel || ptsText}</span>
      </div>
    </div>
  );
}

export default function Rules() {
  const { game } = useParams();
  const navigate = useNavigate();

  // Active game tab ("call-bridge" or "29")
  const activeTab = game === "29" ? "29" : "call-bridge";

  // Language state ("bn" or "en"), saved in localStorage
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("cardly_rules_lang") || "en";
  });

  const handleLangChange = (selectedLang) => {
    setLang(selectedLang);
    localStorage.setItem("cardly_rules_lang", selectedLang);
  };

  const handleTabChange = (newTab) => {
    navigate(`/rules/${newTab}`);
  };

  const isBn = lang === "bn";

  return (
    <div className="rules-page-container">
      {/* Header & Language Toggle */}
      <section className="rules-header-card">
        <div className="rules-header-info">
          <div className="rules-header-title">
            <BookOpen size={28} style={{ color: "var(--accent-gold)" }} />
            <span>{isBn ? "খেলার নিয়মাবলী ও পয়েন্ট সিস্টেম" : "Game Rules & Scoring Engine"}</span>
            <span className="rules-header-badge">
              <Sparkles size={12} /> {isBn ? "অফিসিয়াল রুলবুক" : "Official Rules"}
            </span>
          </div>
          <p className="rules-header-subtitle">
            {isBn
              ? "Cardly-র হার্ডকোর পয়েন্ট সিস্টেম এবং কার্ডের সম্পূর্ণ ব্যাখ্যা।"
              : "Comprehensive, hardcore point system and card hierarchy for Cardly."}
          </p>
        </div>

        {/* Language Switcher (be / eg) */}
        <div className="lang-toggle-wrap" role="group" aria-label="Language Selector">
          <button
            type="button"
            className={`lang-btn ${lang === "en" ? "active" : ""}`}
            onClick={() => handleLangChange("en")}
          >
            <Globe size={13} /> English
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === "bn" ? "active" : ""}`}
            onClick={() => handleLangChange("bn")}
          >
            🇧🇩 বাংলা
          </button>
        </div>
      </section>

      {/* Game Nav Tabs */}
      <nav className="rules-nav-tabs" aria-label="Game Tabs">
        <button
          type="button"
          className={`rules-tab-btn ${activeTab === "call-bridge" ? "active" : ""}`}
          onClick={() => handleTabChange("call-bridge")}
        >
          <span className="tab-icon-box tab-icon-purple">♠</span>
          <span>Call Bridge</span>
        </button>

        <button
          type="button"
          className={`rules-tab-btn ${activeTab === "29" ? "active" : ""}`}
          onClick={() => handleTabChange("29")}
        >
          <span className="tab-icon-box tab-icon-green">🏆</span>
          <span>29 (Twenty-Nine)</span>
        </button>
      </nav>

      {/* TAB 1: CALL BRIDGE RULES */}
      {activeTab === "call-bridge" && (
        <div className="rules-section-box">
          {/* Quick Overview Card */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Gamepad2 size={20} className="rule-card-icon" />
                <span>{isBn ? "কল ব্রিজ ওভারভিউ" : "Call Bridge Overview"}</span>
              </div>
              <span className="rule-card-tag">52 CARDS · 4 PLAYERS</span>
            </div>

            <p style={{ color: "var(--text)", lineHeight: 1.6, margin: 0 }}>
              {isBn
                ? "কল ব্রিজ ৪ জন খেলোয়াড়ের জনপ্রিয় ট্রিক-টেকিং কার্ড গেম। মোট ৫২টি তাস প্রতিটি খেলোয়াড়কে সমানভাবে ১৩টি করে বিলি করা হয়। স্পেডস (Spades ♠) হলো সর্বকালের স্থায়ী তুরুপ (Permanent Trump)।"
                : "Call Bridge is a strategic 4-player trick-taking card game played with a standard 52-card deck (13 cards dealt to each player). Spades (♠) is the permanent trump suit throughout the game."}
            </p>

            <div className="rules-callout">
              <Sparkles size={20} className="rules-callout-icon" />
              <div className="rules-callout-content">
                <strong>{isBn ? "স্থায়ী ট্রাম্প (Permanent Trump):" : "Permanent Trump Rule:"}</strong>
                <span>
                  {isBn
                    ? "স্পেডস (♠) সবসময় অন্য সব স্যুটের (♥, ♦, ♣) চেয়ে শক্তিশালী। যখন কোনো খেলোয়াড়ের কাছে লিড করা স্যুটের তাস থাকে না, তখন সে স্পেডস খেলে ট্রিকটি কেটে নিতে পারে।"
                    : "Spades (♠) beats any non-trump card regardless of rank. If a player cannot follow suit, playing a spade cuts and wins the trick."}
                </span>
              </div>
            </div>
          </article>

          {/* Call Bridge Permanent Trump Showcase */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Crown size={20} className="rule-card-icon" />
                <span>{isBn ? "স্থায়ী ট্রাম্প স্যুট (Spades ♠)" : "Permanent Trump Suite (Spades ♠)"}</span>
              </div>
              <span className="rule-card-tag" style={{ background: "rgba(121, 80, 242, 0.15)", color: "#c4b5fd" }}>
                PERMANENT TRUMP
              </span>
            </div>

            <div className="cards-showcase-grid">
              <LuxuryPlayingCard
                rank="A"
                suit="♠"
                suitColor="suit-black"
                pointsText={isBn ? "✦ তুরুপের রাজা ✦" : "✦ ACE OF TRUMPS ✦"}
                subLabel="SUPREME"
                label={isBn ? "সর্বোচ্চ শক্তিশালী ট্রাম্প কার্ড" : "Highest Power Trump in Game"}
                isTrump
              />
              <LuxuryPlayingCard
                rank="K"
                suit="♠"
                suitColor="suit-black"
                pointsText={isBn ? "✦ দ্বিতীয় ট্রাম্প ✦" : "✦ SECOND TRUMP ✦"}
                subLabel="HIGH TRUMP"
                label={isBn ? "এক্কার পরেই শক্তিশালী" : "Beaten only by Ace of Spades"}
                isTrump
              />
              <LuxuryPlayingCard
                rank="Q"
                suit="♠"
                suitColor="suit-black"
                pointsText={isBn ? "✦ তৃতীয় ট্রাম্প ✦" : "✦ THIRD TRUMP ✦"}
                subLabel="QUEEN"
                label={isBn ? "গুরুত্বপূর্ণ ট্রাম্প ট্রিক উইনার" : "Key Trick Winner & Cut Card"}
                isTrump
              />
              <LuxuryPlayingCard
                rank="J"
                suit="♠"
                suitColor="suit-black"
                pointsText={isBn ? "✦ চতুর্থ ট্রাম্প ✦" : "✦ FOURTH TRUMP ✦"}
                subLabel="JACK"
                label={isBn ? "তুরুপের জ্যাক" : "Solid Trick-Taking Power"}
                isTrump
              />
            </div>
          </article>

          {/* Card Hierarchy & Ranking with Visual Cards */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Layers size={20} className="rule-card-icon" />
                <span>{isBn ? "কার্ডের ক্রম ও শক্তিমত্তা" : "Card Hierarchy & Suit Power"}</span>
              </div>
              <span className="rule-card-tag">{isBn ? "উচ্চ থেকে নিম্ন" : "Highest to Lowest"}</span>
            </div>

            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
              {isBn
                ? "প্রতিটি স্যুটের ভেতরের পাওয়ার র‍্যাঙ্কিং (এক্কা সবচেয়ে বড়, দুই সবচেয়ে ছোট):"
                : "Power ranking within any suit (Ace highest down to 2 lowest):"}
            </p>

            <div className="hierarchy-track">
              {[
                { r: "A", s: "♠", c: "suit-black", t: "TOP" },
                { r: "K", s: "♥", c: "suit-crimson" },
                { r: "Q", s: "♦", c: "suit-crimson" },
                { r: "J", s: "♣", c: "suit-black" },
                { r: "10", s: "♠", c: "suit-black" },
                { r: "9", s: "♥", c: "suit-crimson" },
                { r: "8", s: "♦", c: "suit-crimson" },
                { r: "7", s: "♣", c: "suit-black" },
                { r: "6", s: "♠", c: "suit-black" },
                { r: "5", s: "♥", c: "suit-crimson" },
                { r: "4", s: "♦", c: "suit-crimson" },
                { r: "3", s: "♣", c: "suit-black" },
                { r: "2", s: "♠", c: "suit-black", t: "LOW" },
              ].map((card, idx, arr) => (
                <div key={card.r} className="hierarchy-item">
                  <MiniHierarchyCard
                    rank={card.r}
                    suit={card.s}
                    suitColor={card.c}
                    topLabel={card.t}
                    ptsText={card.r}
                  />
                  {idx < arr.length - 1 && <span className="hierarchy-arrow">›</span>}
                </div>
              ))}
            </div>
          </article>

          {/* Hardcore Point System Table */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Trophy size={20} className="rule-card-icon" />
                <span>{isBn ? "হার্ডকোর পয়েন্ট হিসাব সূত্র" : "Hardcore Scoring Calculation"}</span>
              </div>
              <span className="rule-card-tag">{isBn ? "কার্ডলির মূল লজিক" : "Cardly Engine Rule"}</span>
            </div>

            <div className="rules-table-wrap">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>{isBn ? "পরিস্থিতি (Condition)" : "Outcome Scenario"}</th>
                    <th>{isBn ? "শর্ত (Formula)" : "Mathematical Formula"}</th>
                    <th>{isBn ? "উদাহরণ (Example)" : "Concrete Example"}</th>
                    <th>{isBn ? "স্কোর (Score)" : "Points Awarded"}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={16} color="#34d399" />
                        <strong>{isBn ? "কল সফল (Made Call)" : "Call Made (Exact)"}</strong>
                      </div>
                    </td>
                    <td><code>Tricks == Call</code></td>
                    <td>{isBn ? "কল = ৪, ট্রিক জিতেছে = ৪" : "Call = 4, Tricks = 4"}</td>
                    <td><span className="score-badge-pos">+4.0</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Flame size={16} color="#e5b048" />
                        <strong>{isBn ? "ওভারট্রিক (Overtricks / বকশিশ)" : "Overtricks Made"}</strong>
                      </div>
                    </td>
                    <td><code>Call + (Tricks - Call) × 0.1</code></td>
                    <td>{isBn ? "কল = ৩, ট্রিক জিতেছে = ৫ (+২ অতিরিক্ত)" : "Call = 3, Tricks = 5 (+2 extra)"}</td>
                    <td><span className="score-badge-pos">+3.2</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <XCircle size={16} color="#f87171" />
                        <strong>{isBn ? "কল ব্যর্থ (Fell Short)" : "Call Failed / Short"}</strong>
                      </div>
                    </td>
                    <td><code>-Call</code></td>
                    <td>{isBn ? "কল = ৪, ট্রিক জিতেছে = ৩ (১ কম পড়েছে)" : "Call = 4, Tricks = 3 (1 short)"}</td>
                    <td><span className="score-badge-neg">-4.0</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="examples-grid">
              <div className="example-box">
                <div className="example-header">
                  <span>{isBn ? "উদাহরণ ১: নিখুঁত কল" : "Case 1: Exact Hit"}</span>
                  <span className="score-badge-pos">+5.0</span>
                </div>
                <div className="example-desc">
                  {isBn
                    ? "খেলোয়াড় ৫ কল করেছিল এবং ঠিক ৫টি ট্রিক নিয়েছে।"
                    : "Player bids 5 and takes exactly 5 tricks."}
                </div>
                <div className="example-result">
                  <code>Score = 5 + (5 - 5) * 0.1 = 5.0</code>
                </div>
              </div>

              <div className="example-box">
                <div className="example-header">
                  <span>{isBn ? "উদাহরণ ২: ওভারট্রিক লাভ" : "Case 2: Overtrick Bonus"}</span>
                  <span className="score-badge-pos">+4.3</span>
                </div>
                <div className="example-desc">
                  {isBn
                    ? "খেলোয়াড় ৪ কল করেছিল এবং ৭টি ট্রিক নিয়েছে (৩টি অতিরিক্ত)।"
                    : "Player bids 4 and takes 7 tricks (3 extra overtricks)."}
                </div>
                <div className="example-result">
                  <code>Score = 4 + (7 - 4) * 0.1 = 4.3</code>
                </div>
              </div>

              <div className="example-box">
                <div className="example-header">
                  <span>{isBn ? "উদাহরণ ৩: জরিমানা পেনাল্টি" : "Case 3: Penalty Deficit"}</span>
                  <span className="score-badge-neg">-6.0</span>
                </div>
                <div className="example-desc">
                  {isBn
                    ? "খেলোয়াড় ৬ কল করেছিল কিন্তু মাত্র ৫টি ট্রিক পেয়েছে।"
                    : "Player bids 6 but manages only 5 tricks."}
                </div>
                <div className="example-result">
                  <code>Score = -6.0 (Full negative call penalty)</code>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* TAB 2: 29 (TWENTY-NINE) RULES */}
      {activeTab === "29" && (
        <div className="rules-section-box">
          {/* Quick Overview Card */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Trophy size={20} className="rule-card-icon" />
                <span>{isBn ? "২৯ (টুয়েন্টি-নাইন) ওভারভিউ" : "29 (Twenty-Nine) Overview"}</span>
              </div>
              <span className="rule-card-tag">32 CARDS · 4 PLAYERS · 2 TEAMS</span>
            </div>

            <p style={{ color: "var(--text)", lineHeight: 1.6, margin: 0 }}>
              {isBn
                ? "২৯ হলো দক্ষিণ এশিয়ার অন্যতম জনপ্রিয় পার্টনারশিপ ট্রিক-টেকিং গেম। মুখোমুখি বসা ২ জন খেলোয়াড় মিলে একটি টিম (Home বনাম Away)। মোট ৩২টি তাস দিয়ে খেলা হয় (প্রতি স্যুটে ৮টি)। প্রতিটি হাতে মোট পয়েন্ট ২৯ (কার্ডের মোট মান ২৮ + শেষ ট্রিক নেওয়ার বোনাস ১)।"
                : "29 is a prestigious South Asian partnership trick-taking game played by 4 players in 2 fixed teams (Home vs Away). It uses 32 cards (8 from each suit). The total card points in every hand is exactly 29 (28 from face cards + 1 point for the 8th/last trick)."}
            </p>

            <div className="rules-callout">
              <ShieldAlert size={20} className="rules-callout-icon" />
              <div className="rules-callout-content">
                <strong>{isBn ? "ম্যাচ জয়ের টার্গেট নিয়ম:" : "Match Target & Victory Condition:"}</strong>
                <span>
                  {isBn
                    ? "ডিফল্ট টার্গেট +৬ পয়েন্ট। যে টিম প্রথম ধনাত্মক +৬ সেট পয়েন্টে পৌঁছাবে, তারা জয়ী হবে। নেগেটিভ স্কোর (যেমন -৬) হলে ম্যাচ শেষ হয় না!"
                    : "Default target is +6 set points. The first team to reach positive +6 wins the match. Dropping to a negative score (e.g. -6) does NOT end the match."}
                </span>
              </div>
            </div>
          </article>

          {/* Ultra-Premium Playing Cards Point Value Showcase */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Sparkles size={20} className="rule-card-icon" />
                <span>{isBn ? "কার্ডের পয়েন্ট মান (কার্ড ছবি ও হিসেব)" : "Card Point Values & Luxury Showcase"}</span>
              </div>
              <span className="rule-card-tag">{isBn ? "মোট ২৮ + ১ = ২৯ পয়েন্ট" : "Total 28 + 1 = 29 Pts"}</span>
            </div>

            <div className="cards-showcase-grid">
              <LuxuryPlayingCard
                rank="J"
                suit="♠"
                suitColor="suit-black"
                pointsText={isBn ? "✦ ৩ পয়েন্ট / প্রতিটি ✦" : "✦ 3 PTS EACH ✦"}
                subLabel="JACK"
                label={isBn ? "৪টি জ্যাক = ১২ পয়েন্ট (সর্বোচ্চ ট্রিক বিজেতা)" : "4 Jacks = 12 Points (Supreme Trick Card)"}
              />

              <LuxuryPlayingCard
                rank="9"
                suit="♥"
                suitColor="suit-crimson"
                pointsText={isBn ? "✦ ২ পয়েন্ট / প্রতিটি ✦" : "✦ 2 PTS EACH ✦"}
                subLabel="NINE"
                label={isBn ? "৪টি নাইন = ৮ পয়েন্ট (দ্বিতীয় প্রধান ট্রাম্প)" : "4 Nines = 8 Points (Heavy Trump Winner)"}
              />

              <LuxuryPlayingCard
                rank="A"
                suit="♦"
                suitColor="suit-crimson"
                pointsText={isBn ? "✦ ১ পয়েন্ট / প্রতিটি ✦" : "✦ 1 PT EACH ✦"}
                subLabel="ACE"
                label={isBn ? "৪টি এক্কা = ৪ পয়েন্ট (মূল পয়েন্ট ভ্যালু)" : "4 Aces = 4 Points (High Value Anchor)"}
              />

              <LuxuryPlayingCard
                rank="10"
                suit="♣"
                suitColor="suit-black"
                pointsText={isBn ? "✦ ১ পয়েন্ট / প্রতিটি ✦" : "✦ 1 PT EACH ✦"}
                subLabel="TEN"
                label={isBn ? "৪টি দশ = ৪ পয়েন্ট (পয়েন্ট কার্ড)" : "4 Tens = 4 Points (Strategic Point Card)"}
              />

              <LuxuryPlayingCard
                rank="K"
                suit="♥"
                suitColor="suit-crimson"
                pointsText={isBn ? "০ পয়েন্ট" : "0 POINTS"}
                isZero
                subLabel="KING & QUEEN"
                label={isBn ? "পেয়ার হলে +৪ কার্ড বোনাস" : "Royal Pair Bonus (+4 if Trump)"}
              />

              <LuxuryPlayingCard
                rank="7"
                suit="♦"
                suitColor="suit-crimson"
                pointsText={isBn ? "০ পয়েন্ট" : "0 POINTS"}
                isZero
                subLabel="7 & 8"
                label={isBn ? "কোনো পয়েন্ট নেই (ফিলিং কার্ড)" : "0 Points (Trick Defense)"}
              />

              <LuxuryPlayingCard
                rank="8th"
                suit="✦"
                suitColor="suit-gold"
                pointsText={isBn ? "✦ +১ বোনাস পয়েন্ট ✦" : "✦ +1 BONUS PT ✦"}
                isToken
                subLabel="LAST TRICK"
                label={isBn ? "৮ম বা শেষ ট্রিক জিতলে +১ পয়েন্ট (মোট ২৯)" : "Final Trick Winner = 1 Pt (Sum = 29)"}
              />
            </div>

            <div className="rules-callout" style={{ marginTop: 8 }}>
              <Award size={20} className="rules-callout-icon" />
              <div className="rules-callout-content">
                <strong>{isBn ? "পয়েন্টের গাণিতিক যোগফল:" : "Mathematical Points Breakdown:"}</strong>
                <span>
                  {isBn
                    ? "১২ (Jacks) + ৮ (Nines) + ৪ (Aces) + ৪ (Tens) + ১ (শেষ ট্রিক বোনাস) = সর্বমোট ২৯ পয়েন্ট!"
                    : "12 (Jacks) + 8 (Nines) + 4 (Aces) + 4 (Tens) + 1 (Last Trick Bonus) = exactly 29 Total Points."}
                </span>
              </div>
            </div>
          </article>

          {/* Trick Taking Hierarchy */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Layers size={20} className="rule-card-icon" />
                <span>{isBn ? "২৯ খেলায় ট্রিক পাওয়ার র‍্যাঙ্কিং" : "29 Trick-Taking Hierarchy"}</span>
              </div>
              <span className="rule-card-tag">{isBn ? "জেতার ক্ষমতা" : "Power Order"}</span>
            </div>

            <div className="hierarchy-track">
              {[
                { r: "J", s: "♠", c: "suit-black", pts: "3 pts" },
                { r: "9", s: "♥", c: "suit-crimson", pts: "2 pts" },
                { r: "A", s: "♦", c: "suit-crimson", pts: "1 pt" },
                { r: "10", s: "♣", c: "suit-black", pts: "1 pt" },
                { r: "K", s: "♠", c: "suit-black", pts: "0 pt" },
                { r: "Q", s: "♥", c: "suit-crimson", pts: "0 pt" },
                { r: "8", s: "♦", c: "suit-crimson", pts: "0 pt" },
                { r: "7", s: "♣", c: "suit-black", pts: "0 pt" },
              ].map((card, idx, arr) => (
                <div key={card.r} className="hierarchy-item">
                  <MiniHierarchyCard
                    rank={card.r}
                    suit={card.s}
                    suitColor={card.c}
                    ptsText={card.pts}
                  />
                  {idx < arr.length - 1 && <span className="hierarchy-arrow">›</span>}
                </div>
              ))}
            </div>
          </article>

          {/* Hardcore Scoring Rules Engine Table */}
          <article className="rule-card">
            <div className="rule-card-header">
              <div className="rule-card-title">
                <Award size={20} className="rule-card-icon" />
                <span>{isBn ? "হার্ডকোর মাল্টিপ্লায়ার ও সেট স্কোরিং টেবিল" : "Hardcore Multiplier & Set Scoring Table"}</span>
              </div>
              <span className="rule-card-tag">{isBn ? "কার্ডলি অফিশিয়াল রুল" : "Source of Truth"}</span>
            </div>

            <div className="rules-table-wrap">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>{isBn ? "মোড (Mode)" : "Mode"}</th>
                    <th>{isBn ? "কল সফল হলে (Caller Win)" : "Caller Reaches Call"}</th>
                    <th>{isBn ? "কল মিস হলে (Caller Fail)" : "Caller Misses Call"}</th>
                    <th>{isBn ? "বিপক্ষ স্কোর (Opponent Points)" : "Opponent Gain Rule"}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Normal</strong>
                    </td>
                    <td><span className="score-badge-pos">+1</span></td>
                    <td><span className="score-badge-neg">-1</span></td>
                    <td>
                      <span className="score-badge-pos">+1</span>{" "}
                      <small style={{ color: "var(--text-muted)" }}>
                        {isBn ? "(যদি বিপক্ষ পয়েন্ট ≥ কল হয়)" : "(Only if Opponent pts >= Call)"}
                      </small>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <strong style={{ color: "var(--accent-gold)" }}>Double</strong>
                    </td>
                    <td><span className="score-badge-pos">+2</span></td>
                    <td><span className="score-badge-neg">-2</span></td>
                    <td>
                      <span className="score-badge-pos">+1</span>{" "}
                      <small style={{ color: "var(--text-muted)" }}>
                        {isBn ? "(যদি বিপক্ষ পয়েন্ট ≥ কল হয়)" : "(Only if Opponent pts >= Call)"}
                      </small>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <strong style={{ color: "#f87171" }}>Redouble</strong>
                    </td>
                    <td><span className="score-badge-pos">+4</span></td>
                    <td><span className="score-badge-neg">-4</span></td>
                    <td>
                      <span className="score-badge-pos">+1</span>{" "}
                      <small style={{ color: "var(--text-muted)" }}>
                        {isBn ? "(যদি বিপক্ষ পয়েন্ট ≥ কল হয়)" : "(Only if Opponent pts >= Call)"}
                      </small>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <strong style={{ color: "#34d399" }}>Single Hand</strong>
                    </td>
                    <td>
                      <span className="score-badge-pos">+3</span>{" "}
                      <small style={{ color: "var(--text-muted)" }}>
                        {isBn ? "(সব ২৯ পয়েন্ট তুললে)" : "(Takes all 29 pts)"}
                      </small>
                    </td>
                    <td>
                      <span className="score-badge-neg">-3</span>{" "}
                      <small style={{ color: "var(--text-muted)" }}>
                        {isBn ? "(২৯ এর কম তুললে)" : "(Takes < 29 pts)"}
                      </small>
                    </td>
                    <td>
                      <span className="score-badge-pos">+1</span>{" "}
                      <small style={{ color: "var(--text-muted)" }}>
                        {isBn ? "(কেবল বিপক্ষ সব ২৯ তুললে, কলার ০)" : "(Only if Opponent takes all 29)"}
                      </small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Crucial Hardcore Rule Callout */}
            <div className="rules-callout">
              <ShieldAlert size={20} className="rules-callout-icon" />
              <div className="rules-callout-content">
                <strong>{isBn ? "গোল্ডেন রুল (অপরিবর্তনীয় নিয়ম):" : "Golden Rules (Strict Backend Engine):"}</strong>
                <ul style={{ margin: "4px 0 0 16px", padding: 0, lineHeight: 1.6 }}>
                  <li>
                    {isBn
                      ? "বিপক্ষ দল (Opponent) কখনো নেগেটিভ পয়েন্ট খাবে না (Opponent never goes negative)। বিপক্ষ কেবল ফ্ল্যাট +১ পেতে পারে যদি তারা কলারের সমপরিমাণ পয়েন্ট নিজেরা তোলে।"
                      : "The opponent team can NEVER receive negative points. Opponent only ever gains a flat +1 if they score points greater than or equal to the call."}
                  </li>
                  <li>
                    {isBn
                      ? "সিঙ্গেল হ্যান্ড (Single Hand) চালু করলে কল স্বয়ংক্রিয়ভাবে ২৯ হয়ে যায়। তাই এটি ডাবল বা রিডাবলের সাথে মিশ্রণ করা যায় না।"
                      : "Single Hand automatically fixes the call to 29. Therefore, Single Hand cannot be combined with Double or Redouble."}
                  </li>
                  <li>
                    {isBn
                      ? "রিডাবল (Redouble) কেবল বিপক্ষ দল ডাবল দেওয়ার পরেই ডাকা সম্ভব।"
                      : "Redouble can only be used after a Double has already been declared."}
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
