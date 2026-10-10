import { GoldenBox, GoldenGrid } from "@gifcommit/golden-grids";

/** The props, in the order of the boxes they sit in: largest first. */
export const PARAMETERS = [
  { name: "from · to", says: "The range of the Fibonacci sequence to lay out. One to five gives these five boxes." },
  { name: "placement", says: "Where the spiral starts: right, bottom, left or top." },
  { name: "clockwise", says: "Which way the spiral turns." },
  { name: "color", says: "A base colour, stepped across the boxes." },
  { name: "outline", says: "A border, drawn once on shared edges." },
] as const;

/** The library's parameters, set in a grid the library lays out. */
export function Parameters() {
  return (
    <div className="cell parameters">
      <h2 className="parameters__heading">Five parameters</h2>
      <div className="parameters__grid">
        {/* An odd count starting from the bottom lies on its side: eight wide, five tall. */}
        <GoldenGrid from={1} to={PARAMETERS.length} placement="bottom">
          {PARAMETERS.map(({ name, says }) => (
            <GoldenBox key={name} className="parameters__box">
              {/* The box is the container; what is in it is sized by the box. */}
              <div className="parameters__in">
                <h3>
                  <code>{name}</code>
                </h3>
                <p>{says}</p>
              </div>
            </GoldenBox>
          ))}
        </GoldenGrid>
      </div>
    </div>
  );
}
