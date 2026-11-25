const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const moduleCache = new Map();
const repoRoot = process.cwd();

function resolveModule(request, parentFile) {
  if (request.endsWith('.json')) {
    return path.resolve(path.dirname(parentFile), request);
  }

  if (request.startsWith('.')) {
    const base = path.resolve(path.dirname(parentFile), request);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.json`]) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return request;
}

function loadModule(file) {
  if (moduleCache.has(file)) return moduleCache.get(file).exports;

  if (file.endsWith('.json')) {
    const exports = JSON.parse(fs.readFileSync(file, 'utf8'));
    moduleCache.set(file, { exports });
    return exports;
  }

  const mod = { exports: {} };
  moduleCache.set(file, mod);
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;

  const localRequire = (request) => {
    if (request === 'react-native') {
      return { Image: { resolveAssetSource: () => ({ uri: '' }) } };
    }
    if (request === './supabase') {
      return { supabase: {} };
    }
    if (request === './i18n') {
      return { getLocale: () => 'en' };
    }
    if (request === '../types') {
      return { MILLIONAIRE_GOLD_LADDER: Array.from({ length: 15 }, (_, i) => (i + 1) * 100) };
    }
    if (request === '../components/CountryShapeView') {
      return { hasCountryShape: () => true };
    }

    const resolved = resolveModule(request, file);
    if (resolved === request) return require(request);
    return loadModule(resolved);
  };

  vm.runInNewContext(code, {
    exports: mod.exports,
    module: mod,
    require: localRequire,
    console,
  }, { filename: file });

  return mod.exports;
}

function countryCodesFromQuestions(questions) {
  const codes = [];
  for (const question of questions) {
    if (question.country) codes.push(question.country.cca2);
    if (question.subjectCountry) codes.push(question.subjectCountry.cca2);
    if (question.options) {
      for (const option of question.options) {
        if (option?.cca2) codes.push(option.cca2);
      }
    }
    if (question.optionCountries) {
      for (const country of question.optionCountries) codes.push(country.cca2);
    }
  }
  return codes;
}

const countryData = loadModule(path.join(repoRoot, 'app/lib/countryData.ts'));
const difficulty = loadModule(path.join(repoRoot, 'app/lib/questionDifficulty.ts'));
const filters = loadModule(path.join(repoRoot, 'app/lib/quizCountryFilters.ts'));

const countries = countryData.getOfflineFullCountries();
assert.ok(countries.some((c) => c.cca2 === 'PS'), 'fixture includes Palestine');
assert.equal(filters.isQuizEligibleCountry(countries.find((c) => c.cca2 === 'PS')), false);

for (let i = 0; i < 100; i += 1) {
  const questions = [
    ...countryData.buildQuizQuestions(countries, 20, { reverseFirst: true }),
    ...countryData.buildCapitalsQuizQuestions(countries, 20, { reverseFirst: true }),
    ...countryData.buildBordersQuizQuestions(countries, 20),
    ...difficulty.buildMillionaireQuestions(countries),
    ...difficulty.buildNightmareQuestions(countries),
  ];
  assert.ok(!countryCodesFromQuestions(questions).includes('PS'), 'quiz builders must not emit Palestine');
}

console.log('PASS: Palestine is excluded from quiz subjects and answer options');
