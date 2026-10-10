/**
 * What each line of a fitted drawing fills its own letters with: one colour,
 * or colours side by side, each given with the share of the line it starts
 * and ends at.
 */
export function fills(container: Element) {
  return [...container.querySelectorAll("text.fit__face")].map((face) => {
    const fill = face.getAttribute("fill");
    const id = /^url\(#(.+)\)$/.exec(fill ?? "")?.[1];
    if (!id) return fill;
    const gradient = container.querySelector(`[id="${id}"]`) as Element;
    return [...gradient.querySelectorAll("stop")].map((stop): [number, string] => [
      Number(Number(stop.getAttribute("offset")).toFixed(4)),
      stop.getAttribute("stop-color") as string,
    ]);
  });
}
