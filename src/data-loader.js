// Loads the exam definition and its question/study files from data/.
// Everything exam-specific is JSON, so questions can be added or edited
// without touching any code.

export async function loadData(base = 'data/') {
  const exam = await getJson(base + 'exam.json');
  const [questionSets, studySets, importedSets] = await Promise.all([
    Promise.all(exam.questionFiles.map((f) => getJson(base + f))),
    Promise.all((exam.studyFiles ?? []).map((f) => getJson(base + f))),
    Promise.all((exam.importedFiles ?? []).map((f) => getJson(base + f))),
  ]);
  return { exam, questions: questionSets.flat(), study: Object.assign({}, ...studySets), imported: importedSets.flat() };
}

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}
