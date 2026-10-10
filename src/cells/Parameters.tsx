/**
 * What there is to set, in the order a reader meets it: the range, where the
 * spiral starts and which way it turns. Skipping is not a parameter. It is
 * what a range does when it starts above 1, so it is a byline of the range.
 */
export const PARAMETERS = [
  {
    term: "from · to",
    // One value, a range: positions on the Fibonacci sequence. It starts at
    // 0, which the library accepts. Position 0 is the sequence's zero and
    // draws no cell, so from 0 to 1 is a grid of one cell and from 0 to 5 is
    // five, not six. (GoldenGrid renders a single cell without complaint; the
    // floor of two squares is for the layout functions the dial calls.) Its
    // ceiling is 91 in Swift and Kotlin and 78 wherever the numbers are
    // JavaScript's, React Native included: the 79th term is past the integers
    // JavaScript holds exactly.
    values: ["0 – 91"],
    says: "Two positions on the Fibonacci sequence: where the grid starts and where it ends. Each position from 1 up is a cell, sized by its number in the sequence. Position 0 is the sequence’s zero and draws nothing, so 0 – 1 is a single cell.*",
    byline: "Grid cells are always squared except when the sequence is skipped. If a grid starts at 3 then cells 1 and 2 are combined into a single rectangular cell.",
    note: "* 0 – 78 in React and React Native.",
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

type Parameter = { term: string; values: readonly string[]; says: string; byline?: string; note?: string };

/** The library's parameters, as a reference to read. */
export function Parameters() {
  return (
    <div className="cell parameters">
      <h2 className="parameters__heading">The parameters</h2>
      <dl className="parameters__list">
        {PARAMETERS.map(({ term, values, says, byline, note }: Parameter) => (
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
              {/* What follows from the parameter, under it and a step quieter. */}
              {byline && (
                <span className="parameters__byline">{byline}</span>
              )}
              {/* The small print: set smaller and lighter, at the foot of the row. */}
              {note && <small className="parameters__note">{note}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
