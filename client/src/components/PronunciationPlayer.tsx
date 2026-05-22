// 发音播放组件 - 使用 Web Speech API 播放英文发音，显示完整音标
import { useState, useCallback, useEffect } from 'react';

interface PronunciationPlayerProps {
  text: string;
}

type AccentType = 'us' | 'uk';

const MAX_RETRIES = 3;
const LOAD_TIMEOUT = 10000; // 10秒超时

// 音标缓存，避免重复请求
const phoneticCache = new Map<string, { us?: string; uk?: string }>();

/**
 * 从免费 Dictionary API 获取单个单词的音标
 */
async function fetchWordPhonetic(word: string): Promise<{ us?: string; uk?: string }> {
  const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
  if (!cleanWord) return {};

  // 检查缓存
  if (phoneticCache.has(cleanWord)) {
    return phoneticCache.get(cleanWord)!;
  }

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
    if (!res.ok) {
      phoneticCache.set(cleanWord, {});
      return {};
    }

    const data = await res.json();
    const entry = data[0];
    if (!entry?.phonetics && !entry?.phonetic) {
      phoneticCache.set(cleanWord, {});
      return {};
    }

    let us: string | undefined;
    let uk: string | undefined;

    if (entry.phonetics) {
      for (const p of entry.phonetics) {
        if (p.text) {
          if (p.audio?.includes('-us') || p.audio?.includes('us.mp3')) {
            us = p.text;
          } else if (p.audio?.includes('-uk') || p.audio?.includes('uk.mp3')) {
            uk = p.text;
          } else if (!us) {
            us = p.text;
          }
        }
      }
    }

    if (!us && uk) us = uk;
    if (!uk && us) uk = us;
    if (!us && !uk && entry.phonetic) {
      us = entry.phonetic;
      uk = entry.phonetic;
    }

    const result = { us, uk };
    phoneticCache.set(cleanWord, result);
    return result;
  } catch {
    phoneticCache.set(cleanWord, {});
    return {};
  }
}

/**
 * 获取整个文本（词组/句子）中所有单词的音标，拼接成完整音标行
 */
async function fetchFullPhonetic(text: string): Promise<{ us?: string; uk?: string }> {
  const words = text.trim().split(/\s+/);
  
  // 并发请求所有单词的音标
  const results = await Promise.all(words.map(w => fetchWordPhonetic(w)));

  const usParts: string[] = [];
  const ukParts: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const r = results[i];
    // 去掉音标两端的 / 符号，最后统一加
    const usText = r.us?.replace(/^\/|\/$/g, '') || '';
    const ukText = r.uk?.replace(/^\/|\/$/g, '') || '';
    usParts.push(usText || words[i].toLowerCase());
    ukParts.push(ukText || words[i].toLowerCase());
  }

  const usJoined = usParts.length > 0 ? `/${usParts.join(' ')}/` : undefined;
  const ukJoined = ukParts.length > 0 ? `/${ukParts.join(' ')}/` : undefined;

  return { us: usJoined, uk: ukJoined };
}

/**
 * 发音播放组件
 * 支持美式英语和英式英语切换，默认美式英语
 * 音标独立一行显示在文本和播放按钮之间
 */
export function PronunciationPlayer({ text }: PronunciationPlayerProps) {
  const [accent, setAccent] = useState<AccentType>('us');
  const [isPlaying, setIsPlaying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [phonetics, setPhonetics] = useState<{ us?: string; uk?: string }>({});
  const [loading, setLoading] = useState(false);

  // 获取完整音标
  useEffect(() => {
    setPhonetics({});
    setLoading(true);
    fetchFullPhonetic(text).then(result => {
      setPhonetics(result);
      setLoading(false);
    });
  }, [text]);

  const speak = useCallback(async (retriesLeft: number = MAX_RETRIES) => {
    if (!window.speechSynthesis) {
      setError('浏览器不支持语音合成');
      return;
    }

    setIsPlaying(true);
    setError(null);

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent === 'us' ? 'en-US' : 'en-GB';
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const targetLang = accent === 'us' ? 'en-US' : 'en-GB';
      const voice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith('en'));
      if (voice) {
        utterance.voice = voice;
      }

      const timeoutId = setTimeout(() => {
        window.speechSynthesis.cancel();
        if (retriesLeft > 1) {
          setRetryCount(prev => prev + 1);
          speak(retriesLeft - 1);
        } else {
          setError('发音暂时不可用');
          setIsPlaying(false);
        }
      }, LOAD_TIMEOUT);

      utterance.onend = () => {
        clearTimeout(timeoutId);
        setIsPlaying(false);
        setRetryCount(0);
      };

      utterance.onerror = () => {
        clearTimeout(timeoutId);
        if (retriesLeft > 1) {
          setRetryCount(prev => prev + 1);
          speak(retriesLeft - 1);
        } else {
          setError('发音暂时不可用');
          setIsPlaying(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      if (retriesLeft > 1) {
        setRetryCount(prev => prev + 1);
        speak(retriesLeft - 1);
      } else {
        setError('发音暂时不可用');
        setIsPlaying(false);
      }
    }
  }, [text, accent]);

  const handlePlay = () => {
    setRetryCount(0);
    speak(MAX_RETRIES);
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    speak(MAX_RETRIES);
  };

  return (
    <div className="pronunciation-player" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* 音标 */}
      {!loading && phonetics[accent] && (
        <span
          className="phonetic"
          style={{
            fontSize: '14px',
            color: '#6b7280',
            fontFamily: "'Times New Roman', serif",
            letterSpacing: '0.5px',
          }}
        >
          {phonetics[accent]}
        </span>
      )}
      {loading && (
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>...</span>
      )}

      {/* 播放按钮 */}
      <button
        onClick={handlePlay}
        disabled={isPlaying}
        className="play-btn"
        title="播放发音"
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          background: isPlaying ? '#e0e0e0' : '#fff',
          cursor: isPlaying ? 'not-allowed' : 'pointer',
        }}
      >
        {isPlaying ? '🔊' : '🔈'} 播放
      </button>

      <select
        value={accent}
        onChange={(e) => setAccent(e.target.value as AccentType)}
        className="accent-select"
        title="选择发音"
        style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
      >
        <option value="us">美式</option>
        <option value="uk">英式</option>
      </select>

      {retryCount > 0 && retryCount < MAX_RETRIES && (
        <span style={{ fontSize: '12px', color: '#666' }}>重试中 ({retryCount}/{MAX_RETRIES})...</span>
      )}

      {error && (
        <span style={{ fontSize: '12px', color: '#e53e3e' }}>
          {error}
          {error !== '发音暂时不可用' && (
            <button onClick={handleRetry} style={{ marginLeft: '4px', fontSize: '12px' }}>重试</button>
          )}
        </span>
      )}
    </div>
  );
}

export default PronunciationPlayer;
