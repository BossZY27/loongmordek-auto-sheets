const fs = require('fs');

const samplePath = process.argv[2] || 'loongmordek-auto-sheets/sample-ai-content.txt';
const raw = fs.readFileSync(samplePath, 'utf8');

const TIMEZONE = 'Asia/Bangkok';
const REVIEW_STATUS = 'รอตรวจ';

function parseAiContent(rawContent) {
  const simplified = tryParseSimplifiedAiContent(rawContent);
  if (simplified) return simplified;

  return {
    facebook: parsePlatform(rawContent, '1. Facebook', '2. Instagram', 'Facebook Hashtags:'),
    instagram: parsePlatform(rawContent, '2. Instagram', '3. TikTok', 'Instagram Hashtags:'),
    tiktok: parsePlatform(rawContent, '3. TikTok', '4. YouTube', 'TikTok Hashtags:'),
    youtube: parsePlatform(rawContent, '4. YouTube', '', 'YouTube Hashtags:')
  };
}

function tryParseSimplifiedAiContent(rawContent) {
  try {
    return {
      facebook: parseNamedPlatform(rawContent, 'Facebook', ['Instagram Caption']),
      instagram: parseNamedPlatform(rawContent, 'Instagram', ['TikTok Caption']),
      tiktok: parseNamedPlatform(rawContent, 'TikTok', ['YouTube Caption']),
      youtube: parseNamedPlatform(rawContent, 'YouTube', [])
    };
  } catch (error) {
    return null;
  }
}

function parseNamedPlatform(rawContent, platformName, nextCaptionLabels) {
  return {
    caption: cleanText(extractNamedBlock(rawContent, `${platformName} Caption`, [`${platformName} Hashtags`])),
    hashtag: cleanText(extractNamedBlock(rawContent, `${platformName} Hashtags`, nextCaptionLabels))
  };
}

function extractNamedBlock(rawContent, startLabel, endLabels) {
  const lower = rawContent.toLowerCase();
  const start = findHeadingLabel(lower, startLabel.toLowerCase(), 0);
  if (start < 0) throw new Error('ไม่พบหัวข้อ ' + startLabel);

  const contentStart = findLineEnd(rawContent, start);
  let end = rawContent.length;
  endLabels.forEach((endLabel) => {
    const found = findHeadingLabel(lower, endLabel.toLowerCase(), contentStart);
    if (found >= 0 && found < end) end = found;
  });

  return rawContent.substring(contentStart, end);
}

function findHeadingLabel(lowerRaw, lowerLabel, fromIndex) {
  const direct = lowerRaw.indexOf(lowerLabel, fromIndex);
  if (direct >= 0) return findHeadingLineStartFromLower(lowerRaw, fromIndex, direct);
  return -1;
}

function findHeadingLineStartFromLower(lowerRaw, sectionStart, markerIndex) {
  const previousLineBreak = lowerRaw.lastIndexOf('\n', markerIndex);
  if (previousLineBreak > sectionStart) return previousLineBreak + 1;
  return markerIndex;
}

function findLineEnd(rawContent, startIndex) {
  const lineEnd = rawContent.indexOf('\n', startIndex);
  if (lineEnd < 0) return rawContent.length;
  return lineEnd + 1;
}

function parsePlatform(rawContent, startMarker, nextMarker, hashtagMarker) {
  const lower = rawContent.toLowerCase();
  const start = lower.indexOf(startMarker.toLowerCase());
  if (start < 0) throw new Error('ไม่พบหัวข้อ ' + startMarker);

  let end = rawContent.length;
  if (nextMarker) {
    const next = lower.indexOf(nextMarker.toLowerCase(), start + startMarker.length);
    if (next > start) end = findHeadingLineStart(rawContent, start, next);
  }

  const section = rawContent.substring(start, end);
  const sectionLower = section.toLowerCase();
  const captionMarker = 'caption:';
  const captionIndex = sectionLower.indexOf(captionMarker);
  const hashtagIndex = sectionLower.indexOf(hashtagMarker.toLowerCase());

  if (captionIndex < 0) throw new Error('ไม่พบ Caption ในหัวข้อ ' + startMarker);
  if (hashtagIndex < 0) throw new Error('ไม่พบ Hashtags ในหัวข้อ ' + startMarker);
  if (hashtagIndex <= captionIndex) throw new Error('ลำดับ Caption/Hashtags ไม่ถูกต้องในหัวข้อ ' + startMarker);

  return {
    caption: cleanText(section.substring(captionIndex + captionMarker.length, hashtagIndex)),
    hashtag: cleanText(section.substring(hashtagIndex + hashtagMarker.length))
  };
}

function findHeadingLineStart(rawContent, sectionStart, markerIndex) {
  const previousLineBreak = rawContent.lastIndexOf('\n', markerIndex);
  if (previousLineBreak > sectionStart) return previousLineBreak;
  return markerIndex;
}

function cleanText(value) {
  return String(value || '')
    .split('**').join('')
    .split('---').join('')
    .trim();
}

function parseScheduleDate(value) {
  const parts = String(value || '').split('/');
  if (parts.length < 4) throw new Error('Start Time ต้องเป็นรูปแบบ DD/MM/YYYY/ HH:mm');
  const day = Number(parts[0].trim());
  const month = Number(parts[1].trim()) - 1;
  const year = Number(parts[2].trim());
  const timeParts = parts[3].trim().split(':');
  const hour = Number(timeParts[0].trim());
  const minute = Number(timeParts[1].trim());
  return new Date(year, month, day, hour, minute, 0, 0);
}

function formatBangkok(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year}/ ${parts.hour}:${parts.minute}`;
}

function buildRows(parsed) {
  const startDate = parseScheduleDate('15/07/2026/ 12:00');
  const intervalMinutes = 5;
  const fileId = '1qFxa4RaQZYrJbsSTJcTBe9zSwaWs_6-5';
  const videoName = 'ทดสอบ Auto Sheets - ไม่โพสต์จริง';
  const platforms = [
    { key: 'facebook', label: 'Facebook', flags: [1, 0, 0, 0] },
    { key: 'instagram', label: 'Instagram', flags: [0, 1, 0, 0] },
    { key: 'tiktok', label: 'TikTok', flags: [0, 0, 1, 0] },
    { key: 'youtube', label: 'YouTube Shorts', flags: [0, 0, 0, 1] }
  ];

  return platforms.map((platform, platformIndex) => {
    const scheduledDate = new Date(startDate.getTime() + intervalMinutes * platformIndex * 60 * 1000);
    const item = parsed[platform.key];
    return {
      status: REVIEW_STATUS,
      scheduleData: formatBangkok(scheduledDate),
      videoName: `${videoName} - ${platform.label}`,
      fileId,
      captionPreview: item.caption.slice(0, 80),
      hashtagPreview: item.hashtag.slice(0, 80),
      facebook: platform.flags[0],
      instagram: platform.flags[1],
      tiktok: platform.flags[2],
      youtubeShorts: platform.flags[3]
    };
  });
}

const parsed = parseAiContent(raw);
const rows = buildRows(parsed);
console.log(JSON.stringify({ ok: true, generatedRows: rows.length, rows }, null, 2));
