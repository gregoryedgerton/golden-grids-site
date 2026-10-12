/**
 * What there is to set, in the order a reader meets it: the range, where the
 * spiral starts and which way it turns. Skipping is not a parameter. It is
 * what a range does when it starts above 1, so the range's own description
 * says it.
 *
 * The names are set in capitals, by the owner's direction: they are headings
 * here. In code the props are `from`, `to`, `placement` and `clockwise`, and
 * the values under each name are written as code takes them.
 */
export const PARAMETERS = [
  {
    term: "FROM – TO",
    // One value, a range: indexes on the Fibonacci sequence. It starts at 0,
    // which the library accepts. Index 0 is the sequence's zero and draws no
    // box, so from 0 to 1 is a grid of one box. (GoldenGrid renders a single
    // box without complaint; the floor of two squares is for the layout
    // functions the dial calls.) Its ceiling is 91 in Swift and Kotlin and 78
    // wherever the numbers are JavaScript's, React Native included: the 79th
    // term is past the integers JavaScript holds exactly. The asterisk on the
    // range points at the note under it.
    values: ["0 – 91*"],
    note: "* 0 – 78 in React and React Native.",
    // The owner's words.
    says: "Determines number of boxes a grid contains using Fibonacci indexes for box count and values for box proportions. Grid cells are always squares except when the sequence is skipped. If a grid starts at index 4 then previous indexes are combined into a single rectangular box.",
  },
  {
    term: "PLACEMENT",
    values: ["right", "bottom", "left", "top"],
    says: "The side the spiral starts from.",
  },
  {
    term: "CLOCKWISE",
    values: ["true", "false"],
    says: "Which way the spiral turns: clockwise, or counter-clockwise.",
  },
] as const;

type Parameter = { term: string; values: readonly string[]; says: string; note?: string };

/** The library's parameters, as a reference to read. */
export function Parameters() {
  return (
    <div className="cell parameters">
      <h2 className="parameters__heading">Parameters</h2>
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
              {/* The small print, right under the value its asterisk is on: smaller and lighter. */}
              {note && <small className="parameters__note">{note}</small>}
            </dd>
            <dd className="parameters__says">{says}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
