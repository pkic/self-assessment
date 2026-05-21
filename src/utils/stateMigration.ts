import type {
  Assessment,
  AssessmentData,
  EnabledExtension,
  ExtensionData,
  MigrationResult,
  MigrationSummary,
  ProgressData,
  StructureSnapshot,
} from "../types/types";

const TRAILING_PUNCTUATION = ".,;:!?";

const normalize = (s: string): string => {
  const collapsed = s.toLowerCase().replace(/\s+/g, " ").trim();
  let end = collapsed.length;
  while (end > 0 && TRAILING_PUNCTUATION.includes(collapsed[end - 1])) end--;
  return collapsed.slice(0, end);
};

interface TargetCategory {
  newKey: string;
  moduleId: string;
  categoryName: string;
  requirements: Map<string, { newKey: string; requirementName: string }>;
}

const buildTargetIndex = (
  target: AssessmentData,
): Map<string, TargetCategory> => {
  const index = new Map<string, TargetCategory>();
  for (const module of target.modules) {
    for (const cat of module.categories) {
      const newKey = `${module.id}.${cat.id}`;
      const reqs = new Map<
        string,
        { newKey: string; requirementName: string }
      >();
      for (const req of cat.requirements ?? []) {
        reqs.set(normalize(req.description), {
          newKey: `${newKey}.${req.id}`,
          requirementName: req.description,
        });
      }
      index.set(`${module.id}|${normalize(cat.name)}`, {
        newKey,
        moduleId: module.id,
        categoryName: cat.name,
        requirements: reqs,
      });
    }
  }
  return index;
};

const buildSnapshotFromTarget = (target: AssessmentData): StructureSnapshot => {
  const byKey: StructureSnapshot["byKey"] = {};
  for (const module of target.modules) {
    for (const cat of module.categories) {
      byKey[`${module.id}.${cat.id}`] = {
        moduleId: module.id,
        categoryName: cat.name,
      };
      for (const req of cat.requirements ?? []) {
        byKey[`${module.id}.${cat.id}.${req.id}`] = {
          moduleId: module.id,
          categoryName: cat.name,
          requirementName: req.description,
        };
      }
    }
  }
  return { byKey };
};

export const migrate = (
  source: Assessment,
  target: AssessmentData,
  loadedExtensions: ExtensionData[] = [],
): MigrationResult => {
  const targetIndex = buildTargetIndex(target);
  const migratedProgress: Record<string, ProgressData> = {};
  const unmappedSet = new Set<string>();
  const mappedNewKeys = new Set<string>();
  let mapped = 0;

  // --- Core: category and requirement progress ---------------------------
  for (const [oldKey, progress] of Object.entries(source.progress)) {
    const snap = source.sourceStructure.byKey[oldKey];
    if (!snap) continue;
    const indexKey = `${snap.moduleId}|${normalize(snap.categoryName)}`;
    const cat = targetIndex.get(indexKey);
    if (!cat) {
      unmappedSet.add(snap.categoryName);
      continue;
    }
    if (!snap.requirementName) {
      migratedProgress[cat.newKey] = progress;
      mappedNewKeys.add(cat.newKey);
      mapped += 1;
      continue;
    }
    const reqEntry = cat.requirements.get(normalize(snap.requirementName));
    if (!reqEntry) {
      unmappedSet.add(`${snap.categoryName} / ${snap.requirementName}`);
      continue;
    }
    migratedProgress[reqEntry.newKey] = progress;
    mappedNewKeys.add(reqEntry.newKey);
    mapped += 1;
  }

  // --- Extensions: progress entries scoped to an extension --------------
  for (const [oldKey, progress] of Object.entries(source.progress)) {
    const extSnap = source.sourceStructure.extensionScopes?.[oldKey];
    if (!extSnap) continue;

    const loaded = loadedExtensions.find(
      (e) => e.extension.id === extSnap.extensionId,
    );
    if (!loaded) {
      // Extension not loaded — preserve under its original key so an export
      // round-trips. The widget surfaces a 'preserved but hidden' notice.
      migratedProgress[oldKey] = progress;
      mappedNewKeys.add(oldKey);
      continue;
    }

    const indexKey = `${extSnap.moduleId}|${normalize(extSnap.categoryName)}`;
    const cat = targetIndex.get(indexKey);
    if (!cat) {
      unmappedSet.add(`${loaded.extension.name} / ${extSnap.categoryName}`);
      continue;
    }
    const newKey = `${loaded.extension.id}.${cat.newKey}`;
    migratedProgress[newKey] = progress;
    mappedNewKeys.add(newKey);
    mapped += 1;
  }

  // --- addedInTarget: target keys with no source counterpart ------------
  const addedInTarget: string[] = [];
  for (const [, cat] of targetIndex) {
    if (!mappedNewKeys.has(cat.newKey)) {
      addedInTarget.push(cat.categoryName);
    }
    for (const [, req] of cat.requirements) {
      if (!mappedNewKeys.has(req.newKey)) {
        addedInTarget.push(`${cat.categoryName} / ${req.requirementName}`);
      }
    }
  }
  for (const loaded of loadedExtensions) {
    for (const m of loaded.relevance.modules) {
      for (const c of m.categories) {
        const newKey = `${loaded.extension.id}.${m.id}.${c.id}`;
        if (!mappedNewKeys.has(newKey)) {
          const coreCat = target.modules
            .find((tm) => tm.id === m.id)
            ?.categories.find((tc) => tc.id === c.id);
          const name = coreCat?.name ?? c.id;
          addedInTarget.push(`${loaded.extension.name} / ${name}`);
        }
      }
    }
  }

  const summary: MigrationSummary = {
    mapped,
    addedInTarget,
    unmappedFromSource: Array.from(unmappedSet),
    reclassifiedLevel1ToZero: 0,
  };

  // --- enabledExtensions: bump version to loaded; preserve unloaded -----
  const migratedEnabledExtensions: EnabledExtension[] = [];
  for (const enabled of source.enabledExtensions) {
    const loaded = loadedExtensions.find((e) => e.extension.id === enabled.id);
    if (loaded) {
      migratedEnabledExtensions.push({
        id: loaded.extension.id,
        version: loaded.extension.version,
      });
    } else {
      migratedEnabledExtensions.push(enabled);
    }
  }

  return {
    migratedProgress,
    migratedEnabledExtensions,
    newSourceStructure: buildSnapshotFromTarget(target),
    summary,
  };
};
