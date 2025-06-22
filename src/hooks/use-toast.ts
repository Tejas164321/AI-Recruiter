
"use client"

// Inspired by the react-hot-toast library, this provides a simple, non-blocking notification system.
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// The maximum number of toasts visible at any time.
const TOAST_LIMIT = 1;
// A very long delay before a toast is removed from memory after being dismissed.
const TOAST_REMOVE_DELAY = 1000000;

/**
 * The internal representation of a toast, including its UI props and state.
 */
type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

// Defines the types of actions that can be dispatched to the toast reducer.
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

// A simple counter to generate unique IDs for toasts.
let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes;

// Defines the shape of actions that can be dispatched.
type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] }

// The shape of the state managed by the reducer.
interface State {
  toasts: ToasterToast[]
}

// A map to hold timeouts for removing toasts from memory.
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Schedules a toast to be removed from the state after a delay.
 * @param {string} toastId - The ID of the toast to remove.
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId: toastId })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
 * The reducer function that handles state changes for toasts.
 * @param {State} state - The current state.
 * @param {Action} action - The action to process.
 * @returns {State} The new state.
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Adds a new toast and ensures the list doesn't exceed the limit.
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };

    case "UPDATE_TOAST":
      // Updates an existing toast by its ID.
      return { ...state, toasts: state.toasts.map((t) => t.id === action.toast.id ? { ...t, ...action.toast } : t) };

    case "DISMISS_TOAST": {
      // Sets a toast's `open` prop to false to trigger its exit animation.
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => addToRemoveQueue(toast.id));
      }
      return { ...state, toasts: state.toasts.map((t) => t.id === toastId || toastId === undefined ? { ...t, open: false } : t) };
    }
    case "REMOVE_TOAST":
      // Removes a toast from the state entirely.
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
  }
}

// A list of listener functions that will be called when the state changes.
const listeners: Array<(state: State) => void> = [];
// The global state object for toasts.
let memoryState: State = { toasts: [] };

/**
 * Dispatches an action to the reducer and notifies all listeners of the state change.
 * @param {Action} action - The action to dispatch.
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

// The public interface for creating a toast.
type Toast = Omit<ToasterToast, "id">;

/**
 * Creates and displays a new toast.
 * @param {Toast} props - The properties of the toast to display.
 * @returns {{ id: string, dismiss: () => void, update: (props: ToasterToast) => void }} An object to control the toast.
 */
function toast({ ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

/**
 * The custom hook that components use to interact with the toast system.
 * It provides the current list of toasts and functions to create or dismiss them.
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    // Subscribe to state changes when the component mounts.
    listeners.push(setState);
    // Unsubscribe when the component unmounts.
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
