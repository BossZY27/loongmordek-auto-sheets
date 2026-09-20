const SPREADSHEET_ID = '14m9ItBiR4ZDgwfmsT4rmhj7jQi4FBoB9LEs28vkWRg8';
const INPUT_SHEET_NAME = 'AI Input';
const OUTPUT_SHEET_NAME = 'Loongmordek Content';
const READY_STATUS = 'รอแปลง';
const REVIEW_STATUS = 'รอตรวจ';
const DONE_STATUS = 'สร้างแล้ว';
const ERROR_STATUS = 'ผิดพลาด';
const STATUS_OPTIONS = [READY_STATUS, REVIEW_STATUS, 'รอคิว', DONE_STATUS, ERROR_STATUS];
const TIMEZONE = 'Asia/Bangkok';

function setupAiInputSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let inputSheet = ss.getSheetByName(INPUT_SHEET_NAME);
  if (!inputSheet) {
    inputSheet = ss.insertSheet(INPUT_SHEET_NAME);
  }

  const headers = [
    'Status',
    'AI Raw Content',
    'File ID',
    'Video Name',
    'Start Time',
    'Interval Minutes',
    'Output Status',
    'Error Message',
    'Created At'
  ];

  inputSheet.getRange('A2:I1000').clearDataValidations();
  inputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  inputSheet.setFrozenRows(1);
  inputSheet.getRange('A1:I1').setFontWeight('bold');
  inputSheet.getRange('A2:I2').setValues([[
    '',
    'วางข้อความ AI ทั้งก้อนที่นี่',
    'ใส่ File ID จาก Google Drive',
    'ชื่อคลิป',
    '15/07/2026/ 10:00',
    5,
    '',
    '',
    ''
  ]]);
  applyAiInputHelpers(inputSheet);
  inputSheet.autoResizeColumns(1, headers.length);
}

function applyAiInputHelpers(inputSheet) {
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();

  inputSheet.getRange('A2:A1000').setDataValidation(statusRule);
  inputSheet.getRange('F2:F1000').setNumberFormat('0');
  inputSheet.getRange('A1').setNote('เลือกสถานะจาก dropdown ถ้าข้อมูล B-E ครบ ระบบจะเติม รอแปลง ให้เองได้');
  inputSheet.getRange('F1').setNote('ถ้าเว้นว่าง ระบบจะเติม 5 นาทีให้อัตโนมัติ');
}

function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== INPUT_SHEET_NAME) return;

  const row = e.range.getRow();
  if (row < 2) return;

  autofillAiInputRow(sheet, row);
}

function autofillAiInputRow(sheet, row) {
  const values = sheet.getRange(row, 1, 1, 6).getValues()[0];
  const status = String(values[0] || '').trim();
  const rawContent = String(values[1] || '').trim();
  const fileId = String(values[2] || '').trim();
  const videoName = String(values[3] || '').trim();
  const startTime = String(values[4] || '').trim();
  const intervalMinutes = values[5];

  const hasAnyWorkingData = [rawContent, fileId, videoName, startTime].some(function(value) {
    return Boolean(value);
  });

  if (!hasAnyWorkingData) return;

  if (!intervalMinutes) {
    sheet.getRange(row, 6).setValue(5);
  }

  const hasRequiredData = rawContent && fileId && videoName && startTime;
  if (hasRequiredData && !status) {
    sheet.getRange(row, 1).setValue(READY_STATUS);
  }
}

function processAiInputRows() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const inputSheet = ss.getSheetByName(INPUT_SHEET_NAME);
  const outputSheet = ss.getSheetByName(OUTPUT_SHEET_NAME);
  if (!inputSheet || !outputSheet) throw new Error('Missing required sheet.');

  const lastRow = inputSheet.getLastRow();
  if (lastRow < 2) return;

  const rows = inputSheet.getRange(2, 1, lastRow - 1, 9).getValues();
  rows.forEach(function(row, index) {
    const sheetRow = index + 2;
    const status = String(row[0] || '').trim();
    const rawContent = String(row[1] || '').trim();
    const fileId = String(row[2] || '').trim();
    const videoName = String(row[3] || '').trim();
    const startTime = String(row[4] || '').trim();
    const intervalMinutes = Number(row[5] || 5);
    const outputStatus = String(row[6] || '').trim();

    if (status !== READY_STATUS || outputStatus === DONE_STATUS) return;

    try {
      if (!rawContent || !fileId || !videoName || !startTime) {
        throw new Error('กรุณาใส่ AI Raw Content, File ID, Video Name และ Start Time ให้ครบ');
      }

      const parsed = parseAiContent(rawContent);
      const startDate = parseScheduleDate(startTime);
      const platforms = [
        { key: 'facebook', label: 'Facebook', flags: [1, 0, 0, 0] },
        { key: 'instagram', label: 'Instagram', flags: [0, 1, 0, 0] },
        { key: 'tiktok', label: 'TikTok', flags: [0, 0, 1, 0] },
        { key: 'youtube', label: 'YouTube Shorts', flags: [0, 0, 0, 1] }
      ];

      const outputRows = platforms.map(function(platform, platformIndex) {
        const item = parsed[platform.key];
        const scheduledDate = new Date(startDate.getTime() + intervalMinutes * platformIndex * 60 * 1000);
        return [
          REVIEW_STATUS,
          Utilities.formatDate(scheduledDate, TIMEZONE, 'dd/MM/yyyy/ HH:mm'),
          videoName + ' - ' + platform.label,
          fileId,
          '',
          item.caption,
          item.hashtag,
          platform.flags[0],
          platform.flags[1],
          platform.flags[2],
          platform.flags[3],
          0,
          '', '', '', '', '', '', '',
          item.caption,
          item.caption,
          item.caption,
          item.caption,
          item.hashtag,
          item.hashtag,
          item.hashtag,
          item.hashtag
        ];
      });

      outputSheet.getRange(outputSheet.getLastRow() + 1, 1, outputRows.length, 27).setValues(outputRows);
      inputSheet.getRange(sheetRow, 7).setValue(DONE_STATUS);
      inputSheet.getRange(sheetRow, 8).setValue('สร้าง 4 แถวเรียบร้อย: Facebook, Instagram, TikTok, YouTube Shorts');
      inputSheet.getRange(sheetRow, 9).setValue(new Date());
    } catch (error) {
      inputSheet.getRange(sheetRow, 7).setValue(ERROR_STATUS);
      inputSheet.getRange(sheetRow, 8).setValue(error.message);
      inputSheet.getRange(sheetRow, 9).setValue(new Date());
    }
  });
}

function parseAiContent(raw) {
  const simplified = tryParseSimplifiedAiContent(raw);
  if (simplified) return simplified;

  return {
    facebook: parsePlatform(raw, '1. Facebook', '2. Instagram', 'Facebook Hashtags:'),
    instagram: parsePlatform(raw, '2. Instagram', '3. TikTok', 'Instagram Hashtags:'),
    tiktok: parsePlatform(raw, '3. TikTok', '4. YouTube', 'TikTok Hashtags:'),
    youtube: parsePlatform(raw, '4. YouTube', '', 'YouTube Hashtags:')
  };
}

function tryParseSimplifiedAiContent(raw) {
  try {
    return {
      facebook: parseNamedPlatform(raw, 'Facebook', ['Instagram Caption']),
      instagram: parseNamedPlatform(raw, 'Instagram', ['TikTok Caption']),
      tiktok: parseNamedPlatform(raw, 'TikTok', ['YouTube Caption']),
      youtube: parseNamedPlatform(raw, 'YouTube', [])
    };
  } catch (error) {
    return null;
  }
}

function parseNamedPlatform(raw, platformName, nextCaptionLabels) {
  const caption = extractNamedBlock(raw, platformName + ' Caption', [platformName + ' Hashtags']);
  const hashtag = extractNamedBlock(raw, platformName + ' Hashtags', nextCaptionLabels);
  return {
    caption: cleanText(caption),
    hashtag: cleanText(hashtag)
  };
}

function extractNamedBlock(raw, startLabel, endLabels) {
  const lower = raw.toLowerCase();
  const start = findHeadingLabel(lower, startLabel.toLowerCase(), 0);
  if (start < 0) throw new Error('ไม่พบหัวข้อ ' + startLabel);

  const contentStart = findLineEnd(raw, start);
  let end = raw.length;
  endLabels.forEach(function(endLabel) {
    const found = findHeadingLabel(lower, endLabel.toLowerCase(), contentStart);
    if (found >= 0 && found < end) end = found;
  });

  return raw.substring(contentStart, end);
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

function findLineEnd(raw, startIndex) {
  const lineEnd = raw.indexOf('\n', startIndex);
  if (lineEnd < 0) return raw.length;
  return lineEnd + 1;
}

function parsePlatform(raw, startMarker, nextMarker, hashtagMarker) {
  const lower = raw.toLowerCase();
  const start = lower.indexOf(startMarker.toLowerCase());
  if (start < 0) throw new Error('ไม่พบหัวข้อ ' + startMarker);

  let end = raw.length;
  if (nextMarker) {
    const next = lower.indexOf(nextMarker.toLowerCase(), start + startMarker.length);
    if (next > start) end = findHeadingLineStart(raw, start, next);
  }

  const section = raw.substring(start, end);
  const sectionLower = section.toLowerCase();
  const captionMarker = 'caption:';
  const captionIndex = sectionLower.indexOf(captionMarker);
  const hashtagIndex = sectionLower.indexOf(hashtagMarker.toLowerCase());

  if (captionIndex < 0) throw new Error('ไม่พบ Caption ในหัวข้อ ' + startMarker);
  if (hashtagIndex < 0) throw new Error('ไม่พบ Hashtags ในหัวข้อ ' + startMarker);
  if (hashtagIndex <= captionIndex) throw new Error('ลำดับ Caption/Hashtags ไม่ถูกต้องในหัวข้อ ' + startMarker);

  const caption = section.substring(captionIndex + captionMarker.length, hashtagIndex);
  const hashtag = section.substring(hashtagIndex + hashtagMarker.length);
  return {
    caption: cleanText(caption),
    hashtag: cleanText(hashtag)
  };
}

function findHeadingLineStart(raw, sectionStart, markerIndex) {
  const previousLineBreak = raw.lastIndexOf('\n', markerIndex);
  if (previousLineBreak > sectionStart) return previousLineBreak;
  return markerIndex;
}

function cleanText(value) {
  let text = String(value || '');
  text = text.split('**').join('');
  text = text.split('---').join('');
  return text.trim();
}

function parseScheduleDate(value) {
  const parts = String(value || '').split('/');
  if (parts.length < 4) throw new Error('Start Time ต้องเป็นรูปแบบ DD/MM/YYYY/ HH:mm เช่น 15/07/2026/ 10:00');
  const day = Number(parts[0].trim());
  const month = Number(parts[1].trim()) - 1;
  const year = Number(parts[2].trim());
  const timeParts = parts[3].trim().split(':');
  if (timeParts.length < 2) throw new Error('Start Time ต้องมีเวลา HH:mm เช่น 15/07/2026/ 10:00');
  const hour = Number(timeParts[0].trim());
  const minute = Number(timeParts[1].trim());
  if (!day || month < 0 || !year || isNaN(hour) || isNaN(minute)) {
    throw new Error('Start Time ไม่ถูกต้อง');
  }
  return new Date(year, month, day, hour, minute, 0, 0);
}

function installAutoSheetsTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function(trigger) { return trigger.getHandlerFunction() === 'processAiInputRows'; })
    .forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });

  ScriptApp.newTrigger('processAiInputRows')
    .timeBased()
    .everyMinutes(5)
    .create();
}
