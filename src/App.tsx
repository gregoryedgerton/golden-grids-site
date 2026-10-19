import { buildCells } from "./cells";
import { Dial } from "./dial/Dial";
import { studies } from "./studies";

const cells = buildCells(studies);

export function App() {
  return (
    <main>
      <Dial cells={cells} />
    </main>
  );
}
