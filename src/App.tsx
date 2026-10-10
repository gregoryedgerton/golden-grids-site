import { Dial } from "./dial/Dial";
import type { Cell } from "./dial/Dial";
import { site } from "./site";

/** Placeholder cells: the dial with nothing on it yet but its own name. */
const cells: Cell[] = [
  {
    id: "title",
    label: site.name,
    ground: "#14100c",
    content: (
      <div className="plain">
        <h1>{site.name}</h1>
        <p>
          <a href={site.npm}>
            {site.presenter} on npm, version {site.version}
          </a>
        </p>
      </div>
    ),
  },
  ...["#f6c62c", "#f0562e", "#7fa6d9", "#f7f2e8", "#c9781a", "#f6c62c", "#f0562e", "#7fa6d9", "#f7f2e8"].map(
    (ground, i): Cell => ({
      id: `cell-${i + 2}`,
      label: `Cell ${i + 2}`,
      ground,
      content: <p className="plain plain--number">{i + 2}</p>,
    }),
  ),
];

export function App() {
  return (
    <main>
      <Dial cells={cells} />
    </main>
  );
}
