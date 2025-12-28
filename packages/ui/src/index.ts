import typescriptLogo from "./typescript.svg";
import { add } from "shared";
import { render } from "core";
export { render } from "core";

export const renderContent = (title: string) => {
  render(
    document.querySelector<HTMLDivElement>("#app"),
    `
    <div>
      <h1>${title}</h1>
      <a href="https://vite.dev" target="_blank">
        <img src="/vite.svg" class="logo" alt="Vite logo" />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank">
        <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
      </a>
      <h1>Vite + TypeScript</h1>
      <div class="card">
        <button id="counter" type="button"></button>
      </div>
      <p class="read-the-docs">
        Click on the Vite and TypeScript logos to learn more
      </p>
    </div>
  `,
  );
};

export const renderCounter = () => {
  const element = document.querySelector<HTMLButtonElement>("#counter");

  let counter = 0;
  const setCounter = (count: number) => {
    counter = count;
    render(element, `count is ${counter}`);
  };
  element?.addEventListener("click", () => setCounter(add(counter)));
  setCounter(0);
};
