#!/usr/bin/env node
// Lists every data/questions/*.json and data/study/*.json in data/exam.json,
// so adding a question file only takes dropping it into the folder.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const examPath = 'data/exam.json';
const exam = JSON.parse(readFileSync(examPath, 'utf8'));
import { existsSync } from 'node:fs';
const list = (dir) => (existsSync(`data/${dir}`) ? readdirSync(`data/${dir}`) : []).filter((f) => f.endsWith('.json')).sort((a, b) =>
  (a === 'official-samples.json' ? -1 : b === 'official-samples.json' ? 1 : a.localeCompare(b))).map((f) => `${dir}/${f}`);
exam.questionFiles = list('questions');
exam.studyFiles = list('study');
exam.importedFiles = list('imported');
writeFileSync(examPath, JSON.stringify(exam, null, 2) + '\n');
console.log(`${exam.questionFiles.length} question files, ${exam.studyFiles.length} study files, ${exam.importedFiles.length} imported sets`);
