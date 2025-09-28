import { useEffect, useState } from 'react';
import { siteOrigin } from '@src/config/types';
import { ChatNodeRoleType } from './use-chat-node';

export function useGetElementByOrigin(role: ChatNodeRoleType): Element[] {
  const [elements, setElements] = useState<Element[]>([]);

  useEffect(() => {
    const attributes: Partial<Record<typeof siteOrigin, string>> = {
      chatGPT: `[data-message-author-role="${role}"]`,
    };

    const classNames: Partial<Record<typeof siteOrigin, string>> = {
      gemini: role === 'user' ? 'query-content' : 'model-response-text',
      deepSeek: role === 'user' ? '_9663006' : '_43c05b5',
      claude: role === 'user' ? '!font-user-message' : 'font-claude-response',
    };

    const getElementsByAttribute = () => {
      return Array.from(
        document.querySelectorAll<HTMLElement>(attributes[siteOrigin] || '')
      );
    };

    const getElementsByClassName = () => {
      const foundElements = Array.from(
        document.getElementsByClassName(classNames[siteOrigin] || '')
      );

      return foundElements;
    };

    const updateElements = () => {
      setElements(
        siteOrigin === 'chatGPT'
          ? getElementsByAttribute()
          : getElementsByClassName()
      );
    };

    updateElements();

    const observer = new MutationObserver(updateElements);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [role]);

  return elements;
}
