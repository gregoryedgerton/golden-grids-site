import { buildCells } from "./cells";
import { Dial } from "./dial/Dial";
import { site } from "./site";
import { studies } from "./studies";

const cells = buildCells(studies, site.subscribe);

export function App() {
  return (
    <main>
      <Dial cells={cells} />
    </main>
  );
}
