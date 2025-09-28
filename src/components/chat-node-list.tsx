import React, { useEffect, useMemo, useRef } from 'react';
import { siteOrigin } from '@src/config/types';
import { useContextMenu } from '@src/hooks/use-context-menu';
import { useSize } from '@src/hooks/use-size';
import { userTriggerType } from '@src/hooks/use-trigger-type';
import { cn } from '@src/utils/cn';
import { findClosestDivIndex } from '@src/utils/find-closest-div-index';
import { throttle } from '@src/utils/throttle';
import { ChevronDown } from 'lucide-react';
import { useChatNode } from '../hooks/use-chat-node';
import { useSearch } from '../hooks/use-search';

interface ChatNodeProps {
  children?: React.ReactNode;
}

const chatlistItemHeight = 40;

export const ChatNodeList: React.FC<ChatNodeProps> = () => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const { size: contextMenuSize } = useSize();
  const { isVisible: isContextMenuVisible } = useContextMenu();
  const { triggerType, setTriggerType } = userTriggerType();
  const { isExpanded, setIsExpanded } = useChatNode();
  const { searchTerm } = useSearch();
  const {
    clickNodeIndex,
    setClickNodeIndex,
    nodes: roleNodes,
    role,
  } = useChatNode();
  const scrollContainer = useMemo(() => {
    const parent: Partial<Record<typeof siteOrigin, Element>> = {
      chatGPT: document.getElementsByClassName(
        ' [scrollbar-gutter:stable_both-edges]'
      )[0],
      gemini:
        document.querySelector('[data-test-id="chat-history-container"]') ||
        undefined,
      deepSeek: document.getElementsByClassName('_0f72b0b')[0],
      claude: document.getElementsByClassName('overflow-y-scroll')[0],
    };

    return parent[siteOrigin];
  }, [roleNodes]);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filterNodes = useMemo(
    () =>
      roleNodes.filter((node) =>
        node.textContent?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [roleNodes, searchTerm]
  );

  const scrollToNode = (
    node: HTMLElement,
    index: number,
    block: ScrollLogicalPosition
  ) => {
    // Fix: click message not work when the scrollbar is at the bottom in grok, and panel click not work either
    node?.scrollIntoView({ behavior: 'instant', block });
    setClickNodeIndex(index); // Update the state to mark this node as clicked
  };

  const calculateContentHeight = (index: number) => {
    const calculateInvisibleHeight = (index: number) => {
      return itemRefs.current[index]?.getElementsByClassName(
        'chat-text-content-invisible'
      )[0].clientHeight!;
    };
    return {
      invisible: calculateInvisibleHeight(index),
      expandable: calculateInvisibleHeight(index) > chatlistItemHeight,
    };
  };

  const handleExpandClick =
    (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!calculateContentHeight(index).expandable) return;
      setIsExpanded((prev) =>
        prev.map((_, i) => (i === index ? !prev[i] : false))
      );
    };

  useEffect(() => {
    if (!isContextMenuVisible) {
      setIsExpanded(new Array(roleNodes.length).fill(false));
    }
  }, [isContextMenuVisible, roleNodes.length, setIsExpanded]);

  useEffect(() => {
    setIsExpanded(new Array(roleNodes.length).fill(false));
  }, [role, roleNodes.length, setIsExpanded]);

  useEffect(() => {
    itemRefs.current[clickNodeIndex as number]?.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
    });
  }, [clickNodeIndex]);

  useEffect(() => {
    setClickNodeIndex(roleNodes.length > 1 ? roleNodes.length - 1 : 0);
    setIsExpanded(new Array(roleNodes.length).fill(false));
  }, [roleNodes.length, setClickNodeIndex, setIsExpanded]);

  // Scroll to the closest node when the context menu is opened
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const handleScroll = throttle(() => {
      if (triggerType === 'window-scroll') {
        setClickNodeIndex(findClosestDivIndex(roleNodes));
      }
      setTriggerType('window-scroll');
    }, 200);

    scrollContainer?.addEventListener('scroll', handleScroll, { signal });

    return () => {
      controller.abort();
    };
  }, [
    scrollContainer,
    roleNodes,
    setClickNodeIndex,
    setTriggerType,
    triggerType,
  ]);
  // TODO: save role or not??
  return (
    <div
      ref={listRef}
      className={cn(
        'grid h-fit grid-cols-1 gap-2 overflow-y-auto pr-2 dark:text-zinc-50'
      )}
    >
      {filterNodes.map((node, index) => (
        <div
          data-message-id={node.dataset.messageId}
          key={index}
          ref={(el) => (itemRefs.current[index] = el)}
          className={cn(
            'relative cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-[height] duration-200',
            'box-content flex justify-between',
            'text-zinc-950 dark:text-zinc-50',
            { 'bg-gray-200 dark:bg-zinc-900': clickNodeIndex === index },
            { 'font-medium': !isExpanded[index] }
          )}
          style={{
            maxHeight: contextMenuSize.height / 2,
            height: isExpanded[index]
              ? calculateContentHeight(index).invisible + 10
              : chatlistItemHeight,
          }}
        >
          <div
            className={cn(
              'chat-text-content-invisible',
              'invisible absolute flex w-full justify-between border text-sm'
            )}
          >
            <div className={cn('py-2 pl-3')}>{node.textContent || ''}</div>
            <div className='h-10 w-8'></div>
          </div>

          <div
            className={cn(
              'chat-text-content-visible',
              'flex flex-1 justify-between overflow-y-auto py-2 pl-3 text-sm'
            )}
            onClick={() => {
              if (isExpanded[index]) return;
              setTriggerType('context-menu-click');
              scrollToNode(node, index, role === 'user' ? 'center' : 'start');
            }}
          >
            <div
              className={cn(
                'w-full text-ellipsis whitespace-nowrap pr-1 text-sm transition',
                isExpanded[index]
                  ? 'cursor-auto select-text overflow-y-auto whitespace-pre-wrap'
                  : 'overflow-hidden whitespace-nowrap'
              )}
              title={isExpanded[index] ? '' : node.textContent ?? ''}
              onClick={(e) => {
                if (isExpanded[index]) {
                  e.stopPropagation();
                }
              }}
            >
              {node.textContent || ''}
            </div>
            <div className='sticky border-r border-zinc-400' />
          </div>

          <div
            className={cn(
              `z-[90] h-10 w-8 origin-center transform select-none transition duration-200`,
              'flex items-center justify-center',
              isExpanded[index] ? 'rotate-180' : '',
              calculateContentHeight(index).expandable
                ? 'cursor-pointer opacity-100'
                : 'cursor-auto opacity-40'
            )}
            onClick={handleExpandClick(index)}
          >
            <ChevronDown className='scale-75' />
            {isExpanded[index] && (
              <div
                className='absolute bottom-0 h-28 w-full'
                onClick={handleExpandClick(index)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
