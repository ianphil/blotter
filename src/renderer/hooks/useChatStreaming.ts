import { useEffect, useCallback, useRef } from 'react';
import { useAppState, useAppDispatch } from '../lib/store';
import { generateId } from '../lib/utils';

export function useChatStreaming() {
  const { conversationId, isStreaming, selectedModel, agentStatus } = useAppState();
  const dispatch = useAppDispatch();
  const currentMessageId = useRef<string | null>(null);
  const modelsLoaded = useRef(false);

  useEffect(() => {
    const unsub = window.electronAPI.chat.onEvent((messageId, event) => {
      dispatch({ type: 'CHAT_EVENT', payload: { messageId, event } });
      if (event.type === 'done' || event.type === 'error') {
        currentMessageId.current = null;
      }
    });

    return () => { unsub(); };
  }, [dispatch]);

  // Fetch models when agent connects (mind path set)
  useEffect(() => {
    if (!agentStatus.connected) {
      modelsLoaded.current = false;
      return;
    }
    if (modelsLoaded.current) return;

    const loadModels = async () => {
      try {
        const models = await window.electronAPI.chat.listModels();
        dispatch({ type: 'SET_AVAILABLE_MODELS', payload: models });
        modelsLoaded.current = true;

        // Validate persisted selection against available models
        const persisted = localStorage.getItem('genesis-ui:selectedModel');
        const valid = persisted && models.some(m => m.id === persisted);
        if (!valid && models.length > 0) {
          dispatch({ type: 'SET_SELECTED_MODEL', payload: models[0].id });
        }
      } catch (err) {
        console.error('Failed to load models:', err);
      }
    };
    loadModels();
  }, [agentStatus.connected, dispatch]);

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming || !content.trim()) return;

    const userMessage = {
      id: generateId(),
      content: content.trim(),
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_USER_MESSAGE', payload: userMessage });

    const assistantId = generateId();
    currentMessageId.current = assistantId;
    dispatch({
      type: 'ADD_ASSISTANT_MESSAGE',
      payload: { id: assistantId, timestamp: Date.now() },
    });

    await window.electronAPI.chat.send(conversationId, content.trim(), assistantId, selectedModel ?? undefined);
  }, [conversationId, isStreaming, selectedModel, dispatch]);

  const stopStreaming = useCallback(async () => {
    if (currentMessageId.current) {
      await window.electronAPI.chat.stop(conversationId, currentMessageId.current);
    }
  }, [conversationId]);

  return { sendMessage, stopStreaming, isStreaming };
}
