export type ScoringStrategy<Model, State, Score, Parameters = unknown> = (
  model: Model,
  record: State,
  parameters: Parameters,
) => Score;

const strategies = new Map<
  string,
  ScoringStrategy<unknown, unknown, unknown>
>();

export const registerScoringStrategy = <Model, State, Score>(
  id: string,
  strategy: ScoringStrategy<Model, State, Score, Record<string, unknown>>,
): void => {
  if (strategies.has(id))
    throw new Error(`Scoring strategy already registered: ${id}`);
  strategies.set(id, strategy as ScoringStrategy<unknown, unknown, unknown>);
};

export const scoreWithStrategy = <Model, State, Score>(
  id: string,
  model: Model,
  record: State,
  parameters: Record<string, unknown> = {},
): Score => {
  const strategy = strategies.get(id);
  if (!strategy) throw new Error(`Unknown scoring strategy: ${id}`);
  return strategy(model, record, parameters) as Score;
};
