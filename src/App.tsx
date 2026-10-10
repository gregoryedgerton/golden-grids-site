import { site } from "./site";

export function App() {
  return (
    <main className="app">
      <h1>{site.name}</h1>
      <p>
        <a href={site.npm}>
          {site.presenter} on npm, version {site.version}
        </a>
      </p>
    </main>
  );
}
