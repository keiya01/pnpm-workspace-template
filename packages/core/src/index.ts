export const render = (element: HTMLElement | null, html: string) => {
  if (!element) return;
  element.innerHTML = html;
};
