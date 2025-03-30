import { NextUIProvider } from '@nextui-org/react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

export function createNextUIProvider(containerId) {
  const containerElement = document.createElement('div');
  containerElement.id = containerId;
  document.body.append(containerElement);

  const root = createRoot(containerElement);

  root.render(createElement(NextUIProvider, null, null));

  return {
    container: containerElement,
    unmount: () => {
      root.unmount();
      if (containerElement.parentNode) {
        containerElement.remove();
      }
    }
  };
}
