/**
 * What there is to set, in the order a reader meets it: the range, what
 * happens when the range does not start at the beginning, where the spiral
 * starts and which way it turns.
 */
export const PARAMETERS = [
  {
    term: "from · to",
    // The library's ceiling: 91 squares in Swift and Kotlin, 78 wherever the
    // numbers are JavaScript's, React Native included: the 79th term is past
    // the integers JavaScript holds exactly.
    values: ["1", "91"],
    says: "The range to lay out: any two positions on the Fibonacci sequence, from 1 to 91.*",
    note: "* 1 to 78 in React and React Native.",
  },
  {
    term: "skip",
    values: ["from 3"],
    says: "Start above 1 and the squares before it are skipped. They fold into one open cell, for a layout that is not a plain run.",
  },
  {
    term: "placement",
    values: ["right", "bottom", "left", "top"],
    says: "The side the spiral starts from.",
  },
  {
    term: "clockwise",
    values: ["true", "false"],
    says: "Which way the spiral turns: clockwise, or counter-clockwise.",
  },
] as const;

type Parameter = { term: string; values: readonly string[]; says: string; note?: string };

/** The library's parameters, as a reference to read. */
export function Parameters() {
  return (
    <div className="cell parameters">
      <h2 className="parameters__heading">The parameters</h2>
      <dl className="parameters__list">
        {PARAMETERS.map(({ term, values, says, note }: Parameter) => (
          <div key={term} className="parameters__item">
            <dt>
              <code>{term}</code>
            </dt>
            {/* Two descriptions of one term: what it takes, then what it does. */}
            <dd className="parameters__takes">
              <ul aria-label={`Values for ${term}`}>
                {values.map((value) => (
                  <li key={value}>
                    <code>{value}</code>
                  </li>
                ))}
              </ul>
            </dd>
            <dd className="parameters__says">
              {says}
              {/* The small print: set smaller and lighter, under what it qualifies. */}
              {note && <small className="parameters__note">{note}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
