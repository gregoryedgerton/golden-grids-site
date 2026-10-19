import { clock } from "../dial/clock";
import type { Cell } from "../dial/Dial";
import { prefersReducedMotion } from "../dial/motion";
import type { Study } from "../studies";
import { Closing } from "./Closing";
import { Gallery } from "./Gallery";
import { Parameters } from "./Parameters";
import { createStatement } from "./statement";
import { StudyCell } from "./StudyCell";
import { Title } from "./Title";
import { Vision } from "./Vision";

/**
 * Everything on the dial, in order: the introduction, the gallery, the
 * studies, and the closing disclaimer, which is always last.
 */
export function buildCells(studies: Study[]): Cell[] {
  // One statement for as long as these cells are the dial's. The cell that
  // shows it is mounted only while it is near the focus, and what the
  // statement has said must not go when the cell does.
  const statement = createStatement({ reduced: prefersReducedMotion, clock });
  return [
    { id: "title", label: "Golden Grids", ground: "#14100c", content: <Title /> },
    { id: "vision", label: "What is this?", ground: "#7fa6d9", content: <Vision /> },
    { id: "parameters", label: "Parameters", ground: "#f7f2e8", content: <Parameters /> },
    { id: "gallery", label: "Case Studies", ground: "#f0562e", content: <Gallery statement={statement} /> },
    ...studies.map(
      (study): Cell => ({
        id: `study-${study.number}`,
        label: study.brand,
        ground: study.colors.ground,
        content: <StudyCell study={study} />,
      }),
    ),
    { id: "closing", label: "For the record", ground: "#14100c", content: <Closing /> },
  ];
}
