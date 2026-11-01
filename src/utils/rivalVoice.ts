import { VoiceLanguage, RivalAnnouncement } from '../types/game';

export type VoiceEvent = 
  | 'place_1'
  | 'place_2'
  | 'place_3'
  | 'place_4'
  | 'lead_taken'
  | 'overtaken'
  | 'nice_overtake'
  | 'ten_seconds'
  | 'final_stretch'
  | 'race_finish'
  | 'test_voice';

interface VoiceLine {
  english: string;
  urdu: string;
  roman_urdu: string;
}

export const RIVAL_LINES: Record<VoiceEvent, VoiceLine> = {
  place_1: {
    english: "Amazing! You're leading the race. Keep that champion energy!",
    urdu: "زبردست! تم ریس میں پہلے نمبر پر ہو، ایسے ہی آگے بڑھتے رہو!",
    roman_urdu: "Zabardast! Tum race mein pehle number par ho, aise hi aage barhte raho!"
  },
  place_2: {
    english: "You're in second! The lead is right there. You can catch up!",
    urdu: "تم دوسرے نمبر پر ہو! بس تھوڑی سی اور محنت، پہلا نمبر تمہارا ہو سکتا ہے!",
    roman_urdu: "Tum doosre number par ho! Bas thori si aur mehnat, pehla number tumhara ho sakta hai!"
  },
  place_3: {
    english: "Third place! Come on, bhai! You can do better. Let's catch the next racer!",
    urdu: "تیسرے نمبر پر ہو، بھائی! چلو، تھوڑی اور رفتار بڑھاؤ، اگلا ریسر تمہارا انتظار کر رہا ہے!",
    roman_urdu: "Teesre number par ho, bhai! Chalo, thori aur speed barhao, agla racer tumhara intezar kar raha hai!"
  },
  place_4: {
    english: "You're in fourth, but don't give up! This race isn't over yet!",
    urdu: "تم چوتھے نمبر پر ہو، لیکن ہمت مت ہارو! ریس ابھی ختم نہیں ہوئی!",
    roman_urdu: "Tum chauthe number par ho, lekin himmat mat haaro! Race abhi khatam nahi hui!"
  },
  lead_taken: {
    english: "You're leading! Keep it up!",
    urdu: "تم آگے نکل گئے! زبردست، رفتار برقرار رکھو!",
    roman_urdu: "Tum aage nikal gaye! Zabardast, speed barkarar rakho!"
  },
  overtaken: {
    english: "Someone just passed you. You can catch them!",
    urdu: "کوئی تم سے آگے نکل گیا! ہمت مت ہارو، تم پکڑ سکتے ہو!",
    roman_urdu: "Koi tum se aage nikal gaya! Himmat mat haaro, tum pakar sakte ho!"
  },
  nice_overtake: {
    english: "Nice overtake! Great work!",
    urdu: "شاندار اوورٹیک! بہترین کام!",
    roman_urdu: "Shandaar overtake! Behtareen kaam!"
  },
  ten_seconds: {
    english: "Only ten seconds left!",
    urdu: "صرف دس سیکنڈ باقی ہیں!",
    roman_urdu: "Sirf das second baqi hain!"
  },
  final_stretch: {
    english: "Final stretch! Give it your best!",
    urdu: "آخری مرحلہ! اپنا پورا زور لگا دو!",
    roman_urdu: "Aakhri marhala! Apna poora zor laga do!"
  },
  race_finish: {
    english: "Race complete! What a fierce competition!",
    urdu: "ریس ختم! کیا شاندار مقابلہ تھا!",
    roman_urdu: "Race khatam! Kya shandaar muqabla tha!"
  },
  test_voice: {
    english: "RIVAL VOICE is ready for TypeIgnite! Type with fire and race to your best!",
    urdu: "ٹائپ اگنائٹ کے لیے رائیول وائس تیار ہے! تیز ٹائپ کرو اور ریس جیتو!",
    roman_urdu: "TypeIgnite ke liye RIVAL VOICE tayyar hai! Tez type karo aur race jeeto!"
  }
};

class RivalVoiceManager {
  private lastAnnouncementTime: number = 0;
  private lastEvent: VoiceEvent | null = null;
  private lastEventTime: Record<string, number> = {};
  private onAnnouncementCallback: ((announcement: RivalAnnouncement | null) => void) | null = null;
  private captionTimeout: any = null;

  public setAnnouncementCallback(cb: (announcement: RivalAnnouncement | null) => void) {
    this.onAnnouncementCallback = cb;
  }

  /**
   * Speak a line with strict cooldowns, priority, and on-screen caption updates.
   */
  public trigger(
    event: VoiceEvent,
    language: VoiceLanguage,
    muted: boolean,
    force: boolean = false
  ): void {
    const now = Date.now();
    const cooldown = force ? 1500 : 5500;
    
    // Cooldown check for generic announcements
    if (!force && (now - this.lastAnnouncementTime < cooldown)) {
      return;
    }

    // Don't repeat the exact same event within 12 seconds unless forced
    const lastTimeForEvent = this.lastEventTime[event] || 0;
    if (!force && now - lastTimeForEvent < 12000) {
      return;
    }

    const lineObj = RIVAL_LINES[event];
    if (!lineObj) return;

    const text = lineObj[language] || lineObj.english;
    this.lastAnnouncementTime = now;
    this.lastEvent = event;
    this.lastEventTime[event] = now;

    // Send announcement to UI caption
    const announcement: RivalAnnouncement = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      language,
      speaker: 'RIVAL VOICE™',
      priority: force ? 'high' : 'normal',
      timestamp: now,
    };

    if (this.onAnnouncementCallback) {
      this.onAnnouncementCallback(announcement);
      if (this.captionTimeout) clearTimeout(this.captionTimeout);
      this.captionTimeout = setTimeout(() => {
        if (this.onAnnouncementCallback) this.onAnnouncementCallback(null);
      }, 5000);
    }

    // Synthesize audio if speech is available and not muted
    if (!muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop current speech to avoid overlap
        
        // For spoken synthesis: if Urdu is selected and browser has Urdu voice, use ur text.
        // If Roman Urdu or if Urdu voice not installed, speak phonetically
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05; // Energetic racing commentator tempo
        utterance.pitch = 1.05;

        const voices = window.speechSynthesis.getVoices();
        if (language === 'urdu') {
          const urduVoice = voices.find(v => v.lang.startsWith('ur') || v.lang.includes('PK'));
          if (urduVoice) {
            utterance.voice = urduVoice;
            utterance.lang = urduVoice.lang;
          } else {
            // If Urdu voice is not installed in the OS, speak the Roman Urdu line so pronunciation is clear
            utterance.text = lineObj.roman_urdu;
            utterance.lang = 'en-US';
          }
        } else if (language === 'roman_urdu') {
          utterance.lang = 'en-US';
          utterance.text = lineObj.roman_urdu;
        } else {
          utterance.lang = 'en-US';
        }

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }

  public stopAll(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    if (this.captionTimeout) clearTimeout(this.captionTimeout);
    if (this.onAnnouncementCallback) {
      this.onAnnouncementCallback(null);
    }
  }
}

export const rivalVoice = new RivalVoiceManager();
