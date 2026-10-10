import type { Cell } from "../dial/Dial";
import type { Study } from "../studies";
import { Gallery } from "./Gallery";
import { Parameters } from "./Parameters";
import { Signup } from "./Signup";
import { StudyCell } from "./StudyCell";
import { Title } from "./Title";
import { Vision } from "./Vision";

/**
 * Everything on the dial, in order: the introduction, the gallery, and the
 * sign-up, which is always last and appears nowhere else.
 */
export function buildCells(studies: Study[], subscribe: string): Cell[] {
  return [
    { id: "title", label: "Golden Grids", ground: "#14100c", content: <Title /> },
    { id: "vision", label: "4platforms", ground: "#7fa6d9", content: <Vision /> },
    { id: "parameters", label: "The parameters", ground: "#f7f2e8", content: <Parameters /> },
    { id: "gallery", label: "The studies", ground: "#f0562e", content: <Gallery count={studies.length} /> },
    ...studies.map(
      (study): Cell => ({
        id: `study-${study.number}`,
        label: `Study ${study.number}: ${study.brand}`,
        ground: study.colors.ground,
        content: <StudyCell study={study} />,
      }),
    ),
    { id: "signup", label: "The mailing list", ground: "#14100c", content: <Signup action={subscribe} /> },
  ];
}
