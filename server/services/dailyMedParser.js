const { DOMParser } = require('@xmldom/xmldom');
const sanitizeHtml = require('sanitize-html');

const SECTION_DEFINITIONS = [
  { key: 'boxedWarning', title: 'Boxed warning', codes: ['34066-1'], patterns: [/boxed warning/i] },
  { key: 'indications', title: 'Indications and usage', codes: ['34067-9'], patterns: [/indications?\s*(?:and|&)\s*usage/i] },
  { key: 'dosage', title: 'Dosage and administration', codes: ['34068-7'], patterns: [/dosage\s*(?:and|&)\s*administration/i] },
  { key: 'dosageForms', title: 'Dosage forms and strengths', codes: ['43678-2'], patterns: [/dosage forms?\s*(?:and|&)\s*strengths/i] },
  { key: 'contraindications', title: 'Contraindications', codes: ['34070-3'], patterns: [/contraindications?/i] },
  { key: 'warnings', title: 'Warnings and precautions', codes: ['43685-7'], patterns: [/warnings?\s*(?:and|&)\s*precautions/i] },
  { key: 'adverseReactions', title: 'Adverse reactions', codes: ['34084-4'], patterns: [/adverse reactions?/i] },
  { key: 'drugInteractions', title: 'Official label drug interactions', codes: ['34073-7'], patterns: [/drug interactions?/i] },
  { key: 'specificPopulations', title: 'Use in specific populations', codes: ['43684-0'], patterns: [/use in specific populations/i] },
  { key: 'pregnancy', title: 'Pregnancy', codes: ['42228-7'], patterns: [/pregnancy/i] },
  { key: 'pediatric', title: 'Pediatric use', codes: ['34081-0'], patterns: [/pediatric use/i] },
  { key: 'geriatric', title: 'Geriatric use', codes: ['34082-8'], patterns: [/geriatric use/i] },
  { key: 'overdosage', title: 'Overdosage', codes: ['34088-5'], patterns: [/overdosage/i] },
  { key: 'clinicalPharmacology', title: 'Clinical pharmacology', codes: ['34090-1'], patterns: [/clinical pharmacology/i] },
  { key: 'patientCounseling', title: 'Patient counseling information', codes: ['34076-0'], patterns: [/patient counseling information/i] },
  { key: 'storage', title: 'How supplied, storage, and handling', codes: ['34069-5'], patterns: [/how supplied/i, /storage and handling/i] },
];

const DOSAGE_FORM_PATTERN = /\b(TABLET(?:,\s*[A-Z ]+)?|CAPSULE(?:,\s*[A-Z ]+)?|INJECTION|SOLUTION|SUSPENSION|CREAM|OINTMENT|GEL|PATCH|SPRAY|POWDER|LOTION|SHAMPOO|SUPPOSITORY|AEROSOL|FILM|GRANULE|KIT)\b/i;

function localName(node) {
  return String(node?.localName || node?.nodeName || '').split(':').pop();
}

function elementChildren(node) {
  const children = [];
  for (let child = node?.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) children.push(child);
  }
  return children;
}

function directChild(node, name) {
  return elementChildren(node).find((child) => localName(child) === name) || null;
}

function descendants(node, name) {
  const matches = [];
  function visit(current) {
    for (const child of elementChildren(current)) {
      if (!name || localName(child) === name) matches.push(child);
      visit(child);
    }
  }
  visit(node);
  return matches;
}

function normalizedText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, 'and');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeCellAttributes(node) {
  const attributes = [];
  for (const name of ['colspan', 'rowspan']) {
    const value = node.getAttribute?.(name);
    if (value && /^\d{1,2}$/.test(value)) attributes.push(`${name}="${value}"`);
  }
  return attributes.length ? ` ${attributes.join(' ')}` : '';
}

function narrativeHtml(node) {
  if (!node) return '';
  if (node.nodeType === 3 || node.nodeType === 4) return escapeHtml(node.nodeValue);
  if (node.nodeType !== 1) return '';

  const name = localName(node);
  if (['script', 'style', 'iframe', 'object', 'embed'].includes(name)) return '';
  const inner = Array.from({ length: node.childNodes?.length || 0 }, (_, index) => node.childNodes.item(index))
    .map(narrativeHtml)
    .join('');

  if (name === 'paragraph') return `<p>${inner}</p>`;
  if (name === 'list') {
    const tag = /ordered/i.test(node.getAttribute?.('listType') || '') ? 'ol' : 'ul';
    return `<${tag}>${inner}</${tag}>`;
  }
  if (name === 'item') return `<li>${inner}</li>`;
  if (name === 'content') {
    const style = node.getAttribute?.('styleCode') || '';
    if (/bold/i.test(style)) return `<strong>${inner}</strong>`;
    if (/italic/i.test(style)) return `<em>${inner}</em>`;
    return `<span>${inner}</span>`;
  }
  if (['table', 'thead', 'tbody', 'tfoot', 'tr'].includes(name)) return `<${name}>${inner}</${name}>`;
  if (name === 'td' || name === 'th') return `<${name}${safeCellAttributes(node)}>${inner}</${name}>`;
  if (name === 'br') return '<br>';
  if (name === 'sup' || name === 'sub') return `<${name}>${inner}</${name}>`;
  if (name === 'caption') return `<strong>${inner}</strong>`;
  if (name === 'linkHtml' || name === 'link') {
    const href = node.getAttribute?.('href') || node.getAttribute?.('xlink:href') || '';
    return href ? `<a href="${escapeHtml(href)}">${inner}</a>` : inner;
  }
  if (name === 'renderMultimedia') return '';
  return inner;
}

function sanitizeNarrative(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'strong', 'em', 'span', 'sub', 'sup', 'br', 'a', 'h4', 'h5', 'blockquote',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https'],
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: { ...attributes, target: '_blank', rel: 'noopener noreferrer' },
      }),
    },
  }).trim();
}

function sectionTitle(section) {
  return normalizedText(directChild(section, 'title'));
}

function sectionCode(section) {
  return directChild(section, 'code')?.getAttribute?.('code') || '';
}

function renderSection(section, includeChildren = true) {
  const parts = [];
  const textNode = directChild(section, 'text');
  if (textNode) {
    parts.push(Array.from({ length: textNode.childNodes?.length || 0 }, (_, index) => textNode.childNodes.item(index))
      .map(narrativeHtml)
      .join(''));
  }
  if (includeChildren) {
    for (const component of elementChildren(section).filter((child) => localName(child) === 'component')) {
      const nested = directChild(component, 'section');
      if (!nested) continue;
      const title = sectionTitle(nested);
      if (title) parts.push(`<h4>${escapeHtml(title)}</h4>`);
      parts.push(renderSection(nested, true));
    }
  }
  return sanitizeNarrative(parts.join(''));
}

function plainTextFromHtml(html) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(value) {
  const raw = String(value || '');
  if (!/^\d{8}$/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function normalizeSearchResult(item) {
  const rawTitle = String(item?.title || '').replace(/\s+/g, ' ').trim();
  const labelerMatch = rawTitle.match(/\[([^\]]+)\]\s*$/);
  const labeler = labelerMatch?.[1]?.trim() || null;
  const withoutLabeler = rawTitle.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
  const parenthetical = withoutLabeler.match(/^(.+?)\s+\(([^)]+)\)\s+(.+)$/);
  const dosageMatch = withoutLabeler.match(DOSAGE_FORM_PATTERN);

  let brandName = null;
  let genericName = null;
  let dosageForm = null;

  if (parenthetical) {
    brandName = titleCase(parenthetical[1]);
    genericName = titleCase(parenthetical[2]);
    dosageForm = parenthetical[3].match(DOSAGE_FORM_PATTERN)?.[0] || parenthetical[3];
  } else if (dosageMatch) {
    genericName = titleCase(withoutLabeler.slice(0, dosageMatch.index).trim());
    dosageForm = dosageMatch[0];
  } else {
    genericName = titleCase(withoutLabeler);
  }

  const activeIngredients = genericName
    ? unique(genericName.split(/\s+(?:and|&)\s+/i).map((value) => value.trim()))
    : [];

  return {
    setId: String(item?.setid || item?.setId || '').toLowerCase(),
    drugName: brandName || genericName || titleCase(withoutLabeler),
    brandName,
    genericName,
    activeIngredients,
    dosageForm: dosageForm ? titleCase(dosageForm) : null,
    route: null,
    labeler,
    publishedDate: item?.published_date || item?.publishedDate || null,
    splVersion: Number(item?.spl_version || item?.splVersion || 0) || null,
    rawTitle,
  };
}

function normalizeSearchResponse(payload) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const metadata = payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  return {
    results: data.map(normalizeSearchResult).filter((item) => item.setId && item.drugName),
    pagination: {
      page: Math.max(1, Number(metadata.current_page || 1)),
      pageSize: Math.max(1, Number(metadata.elements_per_page || data.length || 1)),
      totalPages: Math.max(0, Number(metadata.total_pages || 0)),
      totalResults: Math.max(0, Number(metadata.total_elements || data.length || 0)),
      hasNextPage: metadata.next_page !== undefined && String(metadata.next_page) !== 'null',
    },
    databasePublishedAt: metadata.db_published_date || null,
  };
}

function parseDailyMedLabel(xml, requestedSetId) {
  const parserErrors = [];
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') parserErrors.push(message);
    },
  }).parseFromString(String(xml || ''), 'application/xml');

  if (!document?.documentElement || localName(document.documentElement) !== 'document' || parserErrors.length) {
    const error = new Error('DailyMed returned an unreadable drug label');
    error.code = 'DAILYMED_INVALID_XML';
    throw error;
  }

  const root = document.documentElement;
  const setId = (directChild(root, 'setId')?.getAttribute?.('root') || requestedSetId || '').toLowerCase();
  const productNodes = descendants(root, 'manufacturedProduct').filter((node) => directChild(node, 'formCode'));
  const productNames = unique(productNodes.map((node) => normalizedText(directChild(node, 'name'))));
  const genericNames = unique(productNodes.flatMap((node) => descendants(node, 'genericMedicine').map((generic) => normalizedText(directChild(generic, 'name')))));
  const parsedActiveIngredients = unique(productNodes.flatMap((node) => (
    elementChildren(node)
      .filter((child) => (
        localName(child) === 'ingredient'
        && /^ACTI(?:B|M|R)?$/i.test(child.getAttribute?.('classCode') || '')
      ))
      .map((ingredient) => normalizedText(directChild(directChild(ingredient, 'ingredientSubstance'), 'name')))
  )));
  const activeIngredients = parsedActiveIngredients.length ? parsedActiveIngredients : genericNames;
  const dosageForms = unique(productNodes.map((node) => directChild(node, 'formCode')?.getAttribute?.('displayName')));
  const routes = unique(descendants(root, 'routeCode').map((node) => node.getAttribute?.('displayName')));
  const authorOrganizations = descendants(root, 'author').flatMap((author) => (
    descendants(author, 'representedOrganization').map((organization) => normalizedText(directChild(organization, 'name')))
  ));
  const labelers = unique(authorOrganizations);
  const allSections = descendants(root, 'section');

  const sections = SECTION_DEFINITIONS.map((definition) => {
    const source = allSections.find((section) => definition.codes.includes(sectionCode(section)))
      || allSections.find((section) => definition.patterns.some((pattern) => pattern.test(sectionTitle(section))));
    if (!source) return null;
    const html = renderSection(source, true);
    const plainText = plainTextFromHtml(html);
    if (!plainText) return null;
    return {
      key: definition.key,
      title: definition.title,
      sourceTitle: sectionTitle(source) || definition.title,
      sourceCode: sectionCode(source) || null,
      html,
      plainText,
    };
  }).filter(Boolean);

  const documentCode = directChild(root, 'code');
  const productName = productNames[0] || genericNames[0] || activeIngredients[0] || 'Medication label';
  const brandName = productNames[0] && genericNames[0]
    && productNames[0].toLowerCase() !== genericNames[0].toLowerCase()
    ? productNames[0]
    : null;

  return {
    setId,
    drugName: productName,
    brandName,
    genericNames,
    activeIngredients,
    dosageForms,
    routes,
    labeler: labelers[0] || null,
    labelers,
    labelType: documentCode?.getAttribute?.('displayName') || null,
    splVersion: Number(directChild(root, 'versionNumber')?.getAttribute?.('value') || 0) || null,
    updatedDate: parseDate(directChild(root, 'effectiveTime')?.getAttribute?.('value')),
    sections,
    source: {
      name: 'NIH DailyMed',
      apiVersion: 'v2',
      labelUrl: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setId)}`,
    },
  };
}

module.exports = {
  SECTION_DEFINITIONS,
  normalizeSearchResult,
  normalizeSearchResponse,
  parseDailyMedLabel,
  plainTextFromHtml,
  sanitizeNarrative,
};
