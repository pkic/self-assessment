import type {
  ActionPlans,
  Assessment,
  AssessmentData,
  EnabledExtension,
  ExtensionData,
  MigrationResult,
  MigrationSummary,
  ProgressData,
  RequirementProgress,
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
    const explicit = source.sourceStructure.extensionScopes?.[oldKey];

    // A core category/requirement key is already handled by the loop above
    // and is present in byKey; never reprocess it here. This also guards
    // against a pathological extension id that shadows a core key (e.g. an
    // extension literally named "G"). An explicit extension scope still wins.
    if (!explicit && source.sourceStructure.byKey[oldKey]) continue;

    // An extension progress key is `${extId}.${coreCategoryKey}`. Match
    // against the assessment's own enabledExtensions, preferring the LONGEST
    // matching id so a dotted or prefix extension id can't misclassify the key.
    const owner = source.enabledExtensions
      .filter((e) => oldKey.startsWith(`${e.id}.`))
      .sort((a, b) => b.id.length - a.id.length)[0];

    // Prefer an explicit scope snapshot; otherwise derive it from data we
    // already have. extensionScopes is never populated by
    // buildStructureSnapshot, so real assessments arrive without it — but the
    // extension key's core portion (e.g. "G.1") is in byKey, giving us the
    // {moduleId, categoryName} the name-match below needs.
    let extSnap = explicit;
    if (!extSnap && owner) {
      const coreKey = oldKey.slice(owner.id.length + 1);
      const coreSnap = source.sourceStructure.byKey[coreKey];
      if (coreSnap) {
        extSnap = {
          extensionId: owner.id,
          extensionVersion: owner.version,
          moduleId: coreSnap.moduleId,
          categoryName: coreSnap.categoryName,
        };
      }
    }

    if (!extSnap) {
      // Not an extension entry (core entries are handled by the loop above),
      // or an extension entry we can't resolve to a target category. An
      // identifiable-but-unresolvable extension entry is preserved under its
      // original key so migration never silently drops assessed data.
      if (owner) {
        migratedProgress[oldKey] = progress;
        mappedNewKeys.add(oldKey);
      }
      continue;
    }

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

  // --- Full-assessment: requirement progress by category+requirement name -
  const migratedRequirementProgress: Record<string, RequirementProgress> = {};
  const orphanedEntries: NonNullable<MigrationResult["orphanedEntries"]> = [];
  let requirementsMapped = 0;
  let requirementsUnmapped = 0;
  for (const [oldKey, rp] of Object.entries(source.requirementProgress ?? {})) {
    const snap = source.sourceStructure.byKey[oldKey];
    const catEntry = snap
      ? targetIndex.get(`${snap.moduleId}|${normalize(snap.categoryName)}`)
      : undefined;
    const reqEntry =
      catEntry && snap?.requirementName
        ? catEntry.requirements.get(normalize(snap.requirementName))
        : undefined;
    if (reqEntry) {
      migratedRequirementProgress[reqEntry.newKey] = rp;
      requirementsMapped += 1;
    } else {
      const hasContent = !!(rp.notes || rp.evidence || rp.applicabilityReason);
      if (hasContent) {
        orphanedEntries.push({
          originalKey: oldKey,
          requirementName: snap?.requirementName,
          payload: rp,
        });
      }
      requirementsUnmapped += 1;
    }
  }

  // --- Full-assessment: action-plan category keys remapped by name --------
  let actionPlansRemapped = 0;
  let migratedActionPlans: ActionPlans | undefined;
  if (source.actionPlans?.categories) {
    const cats: NonNullable<ActionPlans["categories"]> = {};
    for (const [oldCatKey, plan] of Object.entries(
      source.actionPlans.categories,
    )) {
      const snap = source.sourceStructure.byKey[oldCatKey];
      const catEntry = snap
        ? targetIndex.get(`${snap.moduleId}|${normalize(snap.categoryName)}`)
        : undefined;
      const mappedKey = catEntry ? catEntry.newKey : oldCatKey;
      cats[mappedKey] = plan;
      if (catEntry) actionPlansRemapped += 1;
    }
    migratedActionPlans = { categories: cats };
  }

  const summary: MigrationSummary = {
    mapped,
    addedInTarget,
    unmappedFromSource: Array.from(unmappedSet),
    reclassifiedLevel1ToZero: 0,
    requirementsMapped,
    requirementsUnmapped,
    actionPlansRemapped,
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
    ...(Object.keys(migratedRequirementProgress).length > 0
      ? { migratedRequirementProgress }
      : {}),
    ...(migratedActionPlans ? { migratedActionPlans } : {}),
    ...(orphanedEntries.length > 0 ? { orphanedEntries } : {}),
    migratedEnabledExtensions,
    newSourceStructure: buildSnapshotFromTarget(target),
    summary,
  };
};
