import { StudentImportError, StudentImportItem } from '../core/models';

const HEADERS = {
  civilId: 'الرقم المدني',
  fullName: 'اسم الطالب',
  birthDate: 'تاريخ الميلاد',
  gender: 'الجنس',
  guardianPhone: 'رقم ولي الأمر',
  status: 'الحالة',
  notes: 'ملاحظات'
} as const;

const HEADER_ALIASES: Record<keyof typeof HEADERS, string[]> = {
  civilId: ['الرقم المدني', 'رقم مدني', 'civilid', 'civil id'],
  fullName: ['اسم الطالب', 'الاسم', 'fullname', 'full name', 'name'],
  birthDate: ['تاريخ الميلاد', 'الميلاد', 'birthdate', 'birth date', 'dob'],
  gender: ['الجنس', 'gender', 'sex'],
  guardianPhone: ['رقم ولي الأمر', 'رقم ولي الامر', 'هاتف ولي الأمر', 'guardianphone', 'phone'],
  status: ['الحالة', 'status'],
  notes: ['ملاحظات', 'notes', 'note']
};

const TEMPLATE_ROWS = 200;

export interface StudentExcelParseResult {
  students: StudentImportItem[];
  errors: StudentImportError[];
}

export async function downloadStudentImportTemplate(className: string): Promise<void> {
  const exceljs = await import('exceljs') as unknown as { Workbook?: new () => any; default?: { Workbook: new () => any } };
  const WorkbookCtor = exceljs.Workbook ?? exceljs.default?.Workbook;
  if (!WorkbookCtor) {
    throw new Error('ExcelJS is not available');
  }
  const workbook: any = new WorkbookCtor();
  workbook.creator = 'نظام مؤشر الأداء المدرسي';

  const dataStart = 3;
  const lastRow = dataStart + TEMPLATE_ROWS - 1;
  const sheet = workbook.addWorksheet('الطلاب', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }] });
  sheet.columns = [
    { width: 18 },
    { width: 28 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 28 }
  ];

  sheet.getCell('A1').value = 'الجنس';
  sheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('B1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  sheet.getCell('B1').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('B1').font = { bold: true };
  sheet.dataValidations.add('B1', {
    type: 'list',
    allowBlank: false,
    formulae: ['"ذكر,أنثى"'],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'الجنس',
    error: 'اختر ذكر أو أنثى',
    showInputMessage: true,
    promptTitle: 'الجنس',
    prompt: 'يُطبَّق على عمود الجنس لكل الطلاب'
  });
  sheet.mergeCells('C1:G1');
  sheet.getCell('C1').value = 'اختر الجنس مرة واحدة، ويُنسخ تلقائياً إلى كل الصفوف. الحالة الافتراضية نشط ويمكن تغييرها لكل طالب.';
  sheet.getCell('C1').font = { italic: true, color: { argb: 'FF6B7280' } };
  sheet.getRow(1).height = 24;

  const columnHeaders = [
    HEADERS.civilId,
    HEADERS.fullName,
    HEADERS.birthDate,
    HEADERS.gender,
    HEADERS.guardianPhone,
    HEADERS.status,
    HEADERS.notes
  ];
  columnHeaders.forEach((title, index) => {
    const cell = sheet.getRow(2).getCell(index + 1);
    cell.value = title;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  sheet.getRow(2).height = 22;

  for (let row = dataStart; row <= lastRow; row++) {
    sheet.getCell(`A${row}`).numFmt = '@';
    sheet.getCell(`C${row}`).numFmt = 'yyyy-mm-dd';
    sheet.getCell(`D${row}`).value = { formula: '$B$1' };
    sheet.getCell(`D${row}`).alignment = { horizontal: 'center' };
    sheet.getCell(`E${row}`).numFmt = '@';
    sheet.getCell(`F${row}`).value = 'نشط';
    sheet.getCell(`F${row}`).alignment = { horizontal: 'center' };
  }

  sheet.dataValidations.add(`A${dataStart}:A${lastRow}`, {
    type: 'custom',
    allowBlank: true,
    formulae: [`AND(LEN(A${dataStart})=12,ISNUMBER(VALUE(A${dataStart})))`],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'الرقم المدني',
    error: 'يجب إدخال الرقم المدني من 12 خانة رقمية',
    showInputMessage: true,
    promptTitle: 'الرقم المدني',
    prompt: '12 رقماً'
  });

  sheet.dataValidations.add(`C${dataStart}:C${lastRow}`, {
    type: 'date',
    operator: 'between',
    allowBlank: true,
    formulae: [new Date(1990, 0, 1), new Date()],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'تاريخ الميلاد',
    error: 'اختر تاريخ ميلاد صالح من التقويم',
    showInputMessage: true,
    promptTitle: 'تاريخ الميلاد',
    prompt: 'اختر التاريخ من التقويم'
  });

  sheet.dataValidations.add(`E${dataStart}:E${lastRow}`, {
    type: 'custom',
    allowBlank: true,
    formulae: [`AND(LEN(E${dataStart})=8,ISNUMBER(VALUE(E${dataStart})))`],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'رقم ولي الأمر',
    error: 'يجب إدخال رقم ولي الأمر من 8 أرقام',
    showInputMessage: true,
    promptTitle: 'رقم ولي الأمر',
    prompt: '8 أرقام'
  });

  sheet.dataValidations.add(`F${dataStart}:F${lastRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"نشط,موقوف,منقول"'],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'الحالة',
    error: 'اختر نشط أو موقوف أو منقول',
    showInputMessage: true,
    promptTitle: 'الحالة',
    prompt: 'الافتراضي: نشط — يمكن تغييرها لكل طالب'
  });

  const guide = workbook.addWorksheet('تعليمات', { views: [{ rightToLeft: true }] });
  guide.getColumn(1).width = 92;
  const guideLines = [
    'تعليمات تعبئة قالب الطلاب',
    '',
    '1. اختر الجنس مرة واحدة من أعلى الورقة (ذكر أو أنثى). يُنسخ تلقائياً إلى عمود الجنس لكل الصفوف.',
    '2. الحالة الافتراضية نشط، ويمكن تغييرها لكل طالب: نشط أو موقوف أو منقول.',
    '3. الرقم المدني: 12 رقماً.',
    '4. تاريخ الميلاد: اختر التاريخ من تقويم الخلية.',
    '5. رقم ولي الأمر: 8 أرقام.',
    '6. لا تغيّر عناوين الأعمدة.',
    '7. الصفوف الفارغة تُتجاهل تلقائياً.'
  ];
  guideLines.forEach((line, index) => {
    guide.getCell(index + 1, 1).value = line;
  });
  guide.getCell(1, 1).font = { bold: true, size: 14 };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer as ArrayBuffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `قالب-طلاب-${sanitizeFileName(className)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function parseStudentImportFile(file: File): Promise<StudentExcelParseResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = pickStudentsSheet(workbook.SheetNames);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { students: [], errors: [{ row: 1, message: 'الملف لا يحتوي على ورقة بيانات' }] };
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false
  });
  if (!rows.length) {
    return { students: [], errors: [{ row: 1, message: 'الملف فارغ. استخدم قالب الطلاب ثم أعد الرفع' }] };
  }

  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) {
    return { students: [], errors: [{ row: 1, message: 'تعذر التعرف على أعمدة القالب. حمّل القالب ولا تغيّر عناوين الأعمدة' }] };
  }

  const columnMap = mapColumns(rows[headerIndex]);
  if (columnMap.civilId === undefined || columnMap.fullName === undefined) {
    return { students: [], errors: [{ row: headerIndex + 1, message: 'أعمدة الرقم المدني واسم الطالب مطلوبة' }] };
  }

  const sheetGender = findSheetGender(rows, headerIndex);
  const students: StudentImportItem[] = [];
  const errors: StudentImportError[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const excelRow = i + 1;
    const row = rows[i] ?? [];
    const civilId = normalizeDigits(cellText(row[columnMap.civilId]));
    const fullName = cellText(row[columnMap.fullName]);
    const phone = normalizeDigits(cellText(row[columnMap.guardianPhone ?? -1]));
    if (!civilId && !fullName && !cellText(row[columnMap.birthDate ?? -1]) && !phone) {
      continue;
    }

    const birthParsed = parseBirthDate(row[columnMap.birthDate ?? -1]);
    if (birthParsed.error) {
      errors.push({ row: excelRow, civilId: civilId || undefined, message: birthParsed.error });
      continue;
    }

    const rowGender = columnMap.gender !== undefined ? cellText(row[columnMap.gender]) : '';
    const genderParsed = parseGender(rowGender || sheetGender || '');
    if (genderParsed.error) {
      errors.push({
        row: excelRow,
        civilId: civilId || undefined,
        message: sheetGender ? genderParsed.error : 'حدد الجنس مرة واحدة من أعلى القالب (ذكر أو أنثى)'
      });
      continue;
    }

    const rowStatus = columnMap.status !== undefined ? cellText(row[columnMap.status]) : '';
    const statusParsed = parseStatus(rowStatus);
    if (statusParsed.error) {
      errors.push({ row: excelRow, civilId: civilId || undefined, message: statusParsed.error });
      continue;
    }

    if (!civilId || !fullName) {
      errors.push({
        row: excelRow,
        civilId: civilId || undefined,
        message: !civilId ? 'الرقم المدني مطلوب' : 'اسم الطالب مطلوب'
      });
      continue;
    }
    if (!/^\d{12}$/.test(civilId)) {
      errors.push({ row: excelRow, civilId, message: 'الرقم المدني يجب أن يتكون من 12 رقماً' });
      continue;
    }
    if (phone && !/^\d{8}$/.test(phone)) {
      errors.push({ row: excelRow, civilId, message: 'رقم ولي الأمر يجب أن يتكون من 8 أرقام' });
      continue;
    }

    students.push({
      row: excelRow,
      civilId,
      fullName,
      birthDate: birthParsed.value,
      gender: genderParsed.value,
      guardianPhone: phone || undefined,
      status: statusParsed.value,
      notes: cellText(row[columnMap.notes ?? -1]) || undefined
    });
  }

  return { students, errors };
}

function pickStudentsSheet(names: string[]): string {
  return names.find(name => name.trim() === 'الطلاب') ?? names.find(name => name.trim() !== 'تعليمات') ?? names[0];
}

function findHeaderRow(rows: (string | number | Date | null | undefined)[][]): number {
  const max = Math.min(rows.length, 10);
  for (let i = 0; i < max; i++) {
    const map = mapColumns(rows[i] ?? []);
    if (map.civilId !== undefined && map.fullName !== undefined) {
      return i;
    }
  }
  return -1;
}

function findSheetGender(rows: (string | number | Date | null | undefined)[][], headerIndex: number): string {
  for (let i = 0; i < headerIndex; i++) {
    const row = rows[i] ?? [];
    for (let column = 0; column < row.length; column++) {
      const label = normalizeHeader(cellText(row[column]));
      if (label !== 'الجنس' && label !== 'gender') continue;
      for (let next = column + 1; next < row.length; next++) {
        const value = cellText(row[next]);
        if (value && normalizeHeader(value) !== 'الحالة' && normalizeHeader(value) !== 'status') {
          return value;
        }
      }
    }
  }
  return '';
}

function mapColumns(headerRow: (string | number | Date | null | undefined)[]): Partial<Record<keyof typeof HEADERS, number>> {
  const map: Partial<Record<keyof typeof HEADERS, number>> = {};
  headerRow.forEach((cell, index) => {
    const key = matchHeader(cellText(cell));
    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });
  return map;
}

function matchHeader(value: string): keyof typeof HEADERS | null {
  const normalized = normalizeHeader(value);
  if (!normalized) return null;
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof typeof HEADERS, string[]][]) {
    if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
      return field;
    }
  }
  return null;
}

function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function cellText(value: string | number | Date | null | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value).trim();
  }
  const text = String(value).trim();
  if (text.startsWith('=')) return '';
  return text;
}

function normalizeDigits(value: string): string {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return value
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/[\s-]/g, '');
}

function parseBirthDate(value: string | number | Date | null | undefined): { value?: string; error?: string } {
  if (value == null || value === '') return {};
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { value: toIsoDate(value) };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (isNaN(utc.getTime())) {
      return { error: 'تاريخ الميلاد غير صالح' };
    }
    return { value: toIsoDateUtc(utc) };
  }
  const text = String(value).trim();
  if (!text) return {};
  const iso = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(text);
  if (iso) {
    return { value: `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}` };
  }
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (dmy) {
    return { value: `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}` };
  }
  return { error: 'تاريخ الميلاد غير صالح. اختر التاريخ من تقويم الخلية' };
}

function parseGender(value: string): { value: string; error?: string } {
  if (!value) return { value: 'MALE', error: 'الجنس مطلوب. اختر ذكر أو أنثى' };
  const normalized = value.trim();
  if (['MALE', 'ذكر', 'ذ', 'M', 'm'].includes(normalized) || normalized.toUpperCase() === 'MALE') {
    return { value: 'MALE' };
  }
  if (['FEMALE', 'أنثى', 'انثى', 'أنثي', 'انثي', 'F', 'f'].includes(normalized) || normalized.toUpperCase() === 'FEMALE') {
    return { value: 'FEMALE' };
  }
  return { value: 'MALE', error: 'الجنس غير صحيح. اختر ذكر أو أنثى من القائمة' };
}

function parseStatus(value: string): { value: string; error?: string } {
  if (!value) return { value: 'ACTIVE' };
  const normalized = value.trim();
  if (normalized === 'نشط' || normalized.toUpperCase() === 'ACTIVE') return { value: 'ACTIVE' };
  if (normalized === 'منقول' || normalized.toUpperCase() === 'TRANSFERRED') return { value: 'TRANSFERRED' };
  if (normalized === 'موقوف' || normalized.toUpperCase() === 'SUSPENDED') return { value: 'SUSPENDED' };
  return { value: 'ACTIVE', error: 'الحالة غير صحيحة. اختر نشط أو منقول أو موقوف' };
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toIsoDateUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function pad(value: string | number): string {
  return String(value).padStart(2, '0');
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  return cleaned || 'فصل';
}
